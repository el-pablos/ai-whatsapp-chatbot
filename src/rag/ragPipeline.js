/**
 * RAG Pipeline — main orchestrator for ingest + query flow
 *
 * Pipeline utama yang nyatuin semua RAG components:
 * Ingest: text → chunk → embed → store
 * Query: question → embed → retrieve → generate → answer
 *
 * @author Tama El Pablo
 */

const { generateEmbedding, generateBatchEmbeddings } = require('./embeddingService');
const { addVector, addBatch, clearStore, getStoreStats, deleteByFilter } = require('./vectorStore');
const { chunkText, chunkMarkdown, chunkConversation, estimateChunks } = require('./documentChunker');
const { retrieve, buildContext } = require('./ragRetriever');
const { generate, formatAnswer, generateWithCitations } = require('./ragGenerator');

const RAG_ENABLED = (process.env.RAG_ENABLED || 'true').toLowerCase() === 'true';
const MAX_INGEST_SIZE = parseInt(process.env.RAG_MAX_INGEST_SIZE, 10) || 500000; // 500KB

/**
 * Ingest a document into the RAG pipeline
 * chunk → embed → store
 *
 * @param {string} text - full document text
 * @param {object} [options={}]
 * @param {string} [options.documentId] - unique document identifier
 * @param {string} [options.source] - source name (file, url, etc.)
 * @param {string} [options.type='text'] - 'text' | 'markdown' | 'conversation'
 * @param {number} [options.chunkSize] - override default chunk size
 * @param {number} [options.overlap] - override default overlap
 * @param {object} [options.metadata={}] - additional metadata
 * @returns {Promise<{ success: boolean, documentId: string, chunksStored: number, error?: string }>}
 */
const ingest = async (text, options = {}) => {
    if (!RAG_ENABLED) {
        return { success: false, documentId: '', chunksStored: 0, error: 'RAG is disabled' };
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return { success: false, documentId: '', chunksStored: 0, error: 'Empty text' };
    }

    if (text.length > MAX_INGEST_SIZE) {
        return { success: false, documentId: '', chunksStored: 0, error: `Text too large (${text.length} > ${MAX_INGEST_SIZE})` };
    }

    const documentId = options.documentId || `doc_${Date.now()}`;
    const source = options.source || 'unknown';
    const type = options.type || 'text';
    const metadata = { ...options.metadata, source, type };

    try {
        // Step 1: Chunk the document
        let chunks;
        const chunkOpts = {
            documentId,
            chunkSize: options.chunkSize,
            overlap: options.overlap,
            metadata
        };

        switch (type) {
            case 'markdown':
                chunks = chunkMarkdown(text, chunkOpts);
                break;
            case 'conversation':
                chunks = chunkConversation(text, chunkOpts);
                break;
            default:
                chunks = chunkText(text, chunkOpts);
        }

        if (chunks.length === 0) {
            return { success: false, documentId, chunksStored: 0, error: 'No chunks produced' };
        }

        // Step 2: Generate embeddings for all chunks
        const texts = chunks.map(c => c.text);
        const embeddings = await generateBatchEmbeddings(texts);

        // Filter out zero vectors (failed embeddings)
        const validItems = [];
        let zeroVectors = 0;
        for (let i = 0; i < chunks.length; i++) {
            const isZero = embeddings[i].every(v => v === 0);
            if (isZero) {
                zeroVectors++;
                continue;
            }
            validItems.push({
                id: chunks[i].id,
                vector: embeddings[i],
                metadata: { ...chunks[i].metadata, text: chunks[i].text }
            });
        }

        if (validItems.length === 0) {
            return { success: false, documentId, chunksStored: 0, error: 'All embeddings failed' };
        }

        // Step 3: Store vectors
        const { added, failed } = addBatch(validItems);

        return {
            success: added > 0,
            documentId,
            chunksStored: added,
            chunksFailed: failed,
            totalChunks: chunks.length
        };
    } catch (err) {
        console.error('[RAGPipeline] Ingest failed:', err.message);
        return { success: false, documentId, chunksStored: 0, error: err.message };
    }
};

/**
 * Query the RAG pipeline
 * question → embed → retrieve → generate → answer
 *
 * @param {string} query - user question
 * @param {object} [options={}]
 * @param {number} [options.topK] - max context chunks
 * @param {boolean} [options.showStats=false] - show source stats in answer
 * @param {boolean} [options.citations=false] - include citations
 * @param {object} [options.filter={}] - metadata filter for retrieval
 * @returns {Promise<{ answer: string, stats: object, citations?: Array }>}
 */
const query = async (queryText, options = {}) => {
    if (!RAG_ENABLED) {
        return { answer: 'RAG fitur lagi dimatiin.', stats: {}, citations: [] };
    }

    if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
        return { answer: '', stats: {}, citations: [] };
    }

    try {
        // Step 1: Retrieve relevant chunks
        const retrieval = await retrieve(queryText, {
            topK: options.topK,
            filter: options.filter
        });

        // If no relevant docs found
        if (retrieval.chunks.length === 0) {
            return {
                answer: 'Gw ga nemu dokumen yang relevan buat jawab pertanyaan lu. Coba ingest dulu dokumennya.',
                stats: retrieval.stats,
                citations: []
            };
        }

        // Step 2: Generate answer
        if (options.citations) {
            // With citations
            const chunksWithText = retrieval.chunks.map(c => ({
                ...c,
                text: c.metadata?.text || ''
            }));

            const result = await generateWithCitations(queryText, chunksWithText, {
                language: options.language
            });

            return {
                answer: formatAnswer(result.answer, retrieval.stats, options.showStats),
                stats: retrieval.stats,
                citations: result.citations
            };
        }

        // Without citations
        const context = buildContext(retrieval.chunks, {
            getChunkText: (chunk) => chunk.metadata?.text || ''
        });

        const result = await generate(queryText, context, {
            language: options.language
        });

        return {
            answer: formatAnswer(result.answer, retrieval.stats, options.showStats),
            stats: retrieval.stats,
            citations: []
        };
    } catch (err) {
        console.error('[RAGPipeline] Query failed:', err.message);
        return {
            answer: 'Maaf, RAG pipeline error. Coba lagi ntar.',
            stats: {},
            citations: []
        };
    }
};

/**
 * Delete a document and all its chunks from the store
 *
 * @param {string} documentId
 * @returns {number} deleted chunk count
 */
const deleteDocument = (documentId) => {
    if (!documentId) return 0;
    return deleteByFilter({ documentId });
};

/**
 * Get pipeline status and stats
 *
 * @returns {{ enabled: boolean, storeStats: object, maxIngestSize: number }}
 */
const getStatus = () => {
    return {
        enabled: RAG_ENABLED,
        storeStats: getStoreStats(),
        maxIngestSize: MAX_INGEST_SIZE
    };
};

/**
 * Reset the entire pipeline (clear all stored vectors)
 */
const resetPipeline = () => {
    clearStore();
};

/**
 * Quick estimate of how many chunks a document will produce
 *
 * @param {string} text
 * @param {object} [options={}]
 * @returns {{ estimatedChunks: number, textLength: number, withinLimit: boolean }}
 */
const estimateIngest = (text, options = {}) => {
    if (!text) return { estimatedChunks: 0, textLength: 0, withinLimit: true };

    return {
        estimatedChunks: estimateChunks(text, options.chunkSize, options.overlap),
        textLength: text.length,
        withinLimit: text.length <= MAX_INGEST_SIZE
    };
};

module.exports = {
    ingest,
    query,
    deleteDocument,
    getStatus,
    resetPipeline,
    estimateIngest,
    RAG_ENABLED,
    MAX_INGEST_SIZE
};
