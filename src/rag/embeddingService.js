/**
 * Embedding Service — generate text embeddings via Copilot API
 *
 * Pakai text-embedding-3-small model via Copilot API proxy.
 * Fallback ke brute-force cosine similarity kalo hnswlib ga available.
 *
 * @author Tama El Pablo
 */

const axios = require('axios');

const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_TIMEOUT = parseInt(process.env.EMBEDDING_TIMEOUT_MS, 10) || 30000;
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 20;

/**
 * Generate embedding for a single text
 *
 * @param {string} text
 * @returns {Promise<number[]>} embedding vector
 */
const generateEmbedding = async (text) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return new Array(EMBEDDING_DIMENSIONS).fill(0);
    }

    // Truncate to ~8000 tokens (~32000 chars approx)
    const truncated = text.substring(0, 32000);

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/embeddings`,
            {
                model: EMBEDDING_MODEL,
                input: truncated
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: EMBEDDING_TIMEOUT
            }
        );

        const embedding = response.data?.data?.[0]?.embedding;
        if (!embedding || !Array.isArray(embedding)) {
            console.error('[EmbeddingService] Invalid embedding response');
            return new Array(EMBEDDING_DIMENSIONS).fill(0);
        }

        return embedding;
    } catch (err) {
        console.error('[EmbeddingService] Embedding failed:', err.message);
        return new Array(EMBEDDING_DIMENSIONS).fill(0);
    }
};

/**
 * Generate embeddings for multiple texts (batch)
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} array of embedding vectors
 */
const generateBatchEmbeddings = async (texts) => {
    if (!texts || texts.length === 0) return [];

    const results = [];

    // Process in chunks of MAX_BATCH_SIZE
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
        const batch = texts.slice(i, i + MAX_BATCH_SIZE).map(t =>
            (t || '').substring(0, 32000)
        );

        try {
            const response = await axios.post(
                `${COPILOT_API_URL}/v1/embeddings`,
                {
                    model: EMBEDDING_MODEL,
                    input: batch
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: EMBEDDING_TIMEOUT * 2
                }
            );

            const embeddings = response.data?.data;
            if (embeddings && Array.isArray(embeddings)) {
                // Sort by index in case API returns unordered
                embeddings.sort((a, b) => a.index - b.index);
                results.push(...embeddings.map(e => e.embedding));
            } else {
                // Fill with zeros for failed batch
                results.push(...batch.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0)));
            }
        } catch (err) {
            console.error('[EmbeddingService] Batch embedding failed:', err.message);
            results.push(...batch.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0)));
        }
    }

    return results;
};

/**
 * Calculate cosine similarity between two vectors
 *
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} similarity score (-1 to 1)
 */
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
};

/**
 * Find top-k most similar vectors using brute-force cosine similarity
 * Fallback when hnswlib is not available.
 *
 * @param {number[]} queryVector
 * @param {Array<{ id: string, vector: number[] }>} candidates
 * @param {number} [topK=5]
 * @returns {Array<{ id: string, score: number }>}
 */
const findSimilar = (queryVector, candidates, topK = 5) => {
    if (!queryVector || !candidates || candidates.length === 0) return [];

    const scored = candidates.map(c => ({
        id: c.id,
        score: cosineSimilarity(queryVector, c.vector)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
};

module.exports = {
    generateEmbedding,
    generateBatchEmbeddings,
    cosineSimilarity,
    findSimilar,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    MAX_BATCH_SIZE
};
