/**
 * RAG Retriever — retrieve relevant document chunks for a query
 *
 * Embed query → search vector store → return ranked context chunks.
 * Support reranking, deduplication, dan context window building.
 *
 * @author Tama El Pablo
 */

const { generateEmbedding } = require('./embeddingService');
const { search, getStoreStats } = require('./vectorStore');

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K, 10) || 5;
const MAX_CONTEXT_CHARS = parseInt(process.env.RAG_MAX_CONTEXT_CHARS, 10) || 6000;
const MIN_RELEVANCE_SCORE = parseFloat(process.env.RAG_MIN_RELEVANCE) || 0.35;

/**
 * Retrieve relevant chunks for a query
 *
 * @param {string} query - user question
 * @param {object} [options={}]
 * @param {number} [options.topK=5] - max results
 * @param {number} [options.minScore] - minimum relevance score
 * @param {object} [options.filter={}] - metadata filter
 * @returns {Promise<{ chunks: Array, query: string, stats: object }>}
 */
const retrieve = async (query, options = {}) => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return { chunks: [], query: '', stats: { searched: 0, found: 0 } };
    }

    const topK = options.topK || DEFAULT_TOP_K;
    const minScore = options.minScore ?? MIN_RELEVANCE_SCORE;
    const filter = options.filter || {};

    try {
    // Check if store has any vectors
    const storeStats = getStoreStats();
    if (storeStats.size === 0) {
        return {
            chunks: [],
            query,
            stats: { searched: 0, found: 0, storeEmpty: true }
        };
    }

    // Generate query embedding
    const queryVector = await generateEmbedding(query);

    // Check if embedding is valid (not all zeros)
    const isZero = queryVector.every(v => v === 0);
    if (isZero) {
        return {
            chunks: [],
            query,
            stats: { searched: storeStats.size, found: 0, embeddingFailed: true }
        };
    }

    // Search vector store
    const rawResults = search(queryVector, topK * 2, filter); // fetch extra for filtering

    // Filter by minimum relevance score
    const filtered = rawResults.filter(r => r.score >= minScore);

    // Deduplicate by content similarity (same documentId, adjacent chunks)
    const deduped = _deduplicateChunks(filtered);

    // Trim to topK
    const final = deduped.slice(0, topK);

    return {
        chunks: final,
        query,
        stats: {
            searched: storeStats.size,
            found: final.length,
            maxScore: final.length > 0 ? final[0].score : 0,
            minScore: final.length > 0 ? final[final.length - 1].score : 0
        }
    };
    } catch (err) {
        console.error('[RAGRetriever] Retrieve failed:', err.message);
        return { chunks: [], query, stats: { searched: 0, found: 0, error: err.message } };
    }
};

/**
 * Build context string from retrieved chunks
 * Joins chunks with separators, respecting max context size
 *
 * @param {Array<{ id: string, score: number, metadata: object }>} chunks
 * @param {object} [options={}]
 * @param {number} [options.maxChars] - max total context characters
 * @param {boolean} [options.includeScores=false] - include relevance scores
 * @param {Function} [options.getChunkText] - function to get text from chunk metadata
 * @returns {string}
 */
const buildContext = (chunks, options = {}) => {
    if (!chunks || chunks.length === 0) return '';

    const maxChars = options.maxChars || MAX_CONTEXT_CHARS;
    const includeScores = options.includeScores || false;
    const getChunkText = options.getChunkText || _defaultGetText;

    const parts = [];
    let totalChars = 0;

    for (const chunk of chunks) {
        const text = getChunkText(chunk);
        if (!text) continue;

        // Check if adding this chunk would exceed limit
        if (totalChars + text.length > maxChars && parts.length > 0) {
            // Add truncated version if there's room for meaningful content
            const remaining = maxChars - totalChars;
            if (remaining > 100) {
                const truncated = text.substring(0, remaining) + '...';
                const prefix = includeScores ? `[relevance: ${chunk.score.toFixed(2)}] ` : '';
                parts.push(prefix + truncated);
            }
            break;
        }

        const prefix = includeScores ? `[relevance: ${chunk.score.toFixed(2)}] ` : '';
        parts.push(prefix + text);
        totalChars += text.length;
    }

    return parts.join('\n\n---\n\n');
};

/**
 * Retrieve and build context in one call
 *
 * @param {string} query
 * @param {object} [options={}]
 * @returns {Promise<{ context: string, chunks: Array, stats: object }>}
 */
const retrieveContext = async (query, options = {}) => {
    const result = await retrieve(query, options);

    const context = buildContext(result.chunks, {
        maxChars: options.maxChars || MAX_CONTEXT_CHARS,
        includeScores: options.includeScores,
        getChunkText: options.getChunkText
    });

    return {
        context,
        chunks: result.chunks,
        stats: result.stats
    };
};

/**
 * Check if RAG has enough data to be useful
 *
 * @returns {{ ready: boolean, documentCount: number }}
 */
const isReady = () => {
    const stats = getStoreStats();
    return {
        ready: stats.size > 0,
        documentCount: stats.size
    };
};

// ─── Internal helpers ────────────────────────────────────────

/**
 * Default function to extract text from a chunk result
 * Looks in metadata.text or metadata.content
 */
const _defaultGetText = (chunk) => {
    if (!chunk) return '';
    if (chunk.text) return chunk.text;
    if (chunk.metadata) {
        return chunk.metadata.text || chunk.metadata.content || '';
    }
    return '';
};

/**
 * Deduplicate chunks that are from the same document and adjacent
 * Keeps the higher-scored one
 */
const _deduplicateChunks = (chunks) => {
    if (chunks.length <= 1) return chunks;

    const seen = new Set();
    const result = [];

    for (const chunk of chunks) {
        // Create a dedup key from documentId + chunkIndex
        const docId = chunk.metadata?.documentId || chunk.id;
        const chunkIdx = chunk.metadata?.chunkIndex;
        const key = chunkIdx !== undefined ? `${docId}_${chunkIdx}` : chunk.id;

        if (!seen.has(key)) {
            seen.add(key);
            result.push(chunk);
        }
    }

    return result;
};

module.exports = {
    retrieve,
    buildContext,
    retrieveContext,
    isReady,
    DEFAULT_TOP_K,
    MAX_CONTEXT_CHARS,
    MIN_RELEVANCE_SCORE
};
