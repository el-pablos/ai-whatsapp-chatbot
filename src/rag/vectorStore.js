/**
 * Vector Store — in-memory vector storage with brute-force search
 *
 * Simpen embedding vectors di memory, search pake cosine similarity.
 * Support add, search, delete, clear, dan metadata per document.
 * Optional persistence ke file buat restart recovery.
 *
 * @author Tama El Pablo
 */

const { cosineSimilarity } = require('./embeddingService');
const fs = require('fs');
const path = require('path');

const MAX_STORE_SIZE = parseInt(process.env.VECTOR_STORE_MAX_SIZE, 10) || 10000;
const SIMILARITY_THRESHOLD = parseFloat(process.env.VECTOR_SIMILARITY_THRESHOLD) || 0.3;
const PERSISTENCE_PATH = process.env.VECTOR_STORE_PATH || '';

/**
 * In-memory vector store
 * Map<string, { id, vector, metadata, createdAt }>
 */
const _store = new Map();

/**
 * Add a document vector to the store
 *
 * @param {string} id - unique document/chunk identifier
 * @param {number[]} vector - embedding vector
 * @param {object} [metadata={}] - additional metadata (title, source, etc.)
 * @returns {{ id: string, success: boolean }}
 */
const addVector = (id, vector, metadata = {}) => {
    if (!id || typeof id !== 'string') {
        return { id: null, success: false };
    }

    if (!vector || !Array.isArray(vector) || vector.length === 0) {
        return { id, success: false };
    }

    // Enforce max store size — evict oldest if full
    if (_store.size >= MAX_STORE_SIZE && !_store.has(id)) {
        _evictOldest();
    }

    _store.set(id, {
        id,
        vector,
        metadata: metadata || {},
        createdAt: Date.now()
    });

    return { id, success: true };
};

/**
 * Add multiple vectors in batch
 *
 * @param {Array<{ id: string, vector: number[], metadata?: object }>} items
 * @returns {{ added: number, failed: number }}
 */
const addBatch = (items) => {
    if (!items || !Array.isArray(items)) return { added: 0, failed: 0 };

    let added = 0;
    let failed = 0;

    for (const item of items) {
        const result = addVector(item.id, item.vector, item.metadata);
        if (result.success) added++;
        else failed++;
    }

    return { added, failed };
};

/**
 * Search for most similar vectors to a query
 *
 * @param {number[]} queryVector - query embedding
 * @param {number} [topK=5] - number of results to return
 * @param {object} [filter={}] - metadata filter (key-value pairs must match)
 * @returns {Array<{ id: string, score: number, metadata: object }>}
 */
const search = (queryVector, topK = 5, filter = {}) => {
    if (!queryVector || !Array.isArray(queryVector) || _store.size === 0) {
        return [];
    }

    const results = [];
    const filterKeys = Object.keys(filter || {});

    for (const [, entry] of _store) {
        // Apply metadata filter
        if (filterKeys.length > 0) {
            const match = filterKeys.every(key => entry.metadata[key] === filter[key]);
            if (!match) continue;
        }

        const score = cosineSimilarity(queryVector, entry.vector);
        if (score >= SIMILARITY_THRESHOLD) {
            results.push({
                id: entry.id,
                score,
                metadata: entry.metadata
            });
        }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
};

/**
 * Get a single vector entry by ID
 *
 * @param {string} id
 * @returns {{ id: string, vector: number[], metadata: object, createdAt: number } | null}
 */
const getVector = (id) => {
    return _store.get(id) || null;
};

/**
 * Delete a vector by ID
 *
 * @param {string} id
 * @returns {boolean} true if deleted
 */
const deleteVector = (id) => {
    return _store.delete(id);
};

/**
 * Delete vectors matching a metadata filter
 *
 * @param {object} filter - key-value pairs to match
 * @returns {number} count of deleted entries
 */
const deleteByFilter = (filter) => {
    if (!filter || Object.keys(filter).length === 0) return 0;

    const filterKeys = Object.keys(filter);
    let deleted = 0;

    for (const [id, entry] of _store) {
        const match = filterKeys.every(key => entry.metadata[key] === filter[key]);
        if (match) {
            _store.delete(id);
            deleted++;
        }
    }

    return deleted;
};

/**
 * Clear all vectors from the store
 */
const clearStore = () => {
    _store.clear();
};

/**
 * Get store statistics
 *
 * @returns {{ size: number, maxSize: number, threshold: number }}
 */
const getStoreStats = () => {
    return {
        size: _store.size,
        maxSize: MAX_STORE_SIZE,
        threshold: SIMILARITY_THRESHOLD
    };
};

/**
 * Check if a vector exists by ID
 *
 * @param {string} id
 * @returns {boolean}
 */
const hasVector = (id) => {
    return _store.has(id);
};

/**
 * Get all vector IDs in the store
 *
 * @returns {string[]}
 */
const getAllIds = () => {
    return Array.from(_store.keys());
};

/**
 * Persist store to disk (optional, for restart recovery)
 *
 * @returns {boolean} success
 */
const persistToDisk = () => {
    if (!PERSISTENCE_PATH) return false;

    try {
        const data = [];
        for (const [, entry] of _store) {
            data.push({
                id: entry.id,
                vector: entry.vector,
                metadata: entry.metadata,
                createdAt: entry.createdAt
            });
        }

        const dir = path.dirname(PERSISTENCE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(PERSISTENCE_PATH, JSON.stringify(data), 'utf-8');
        return true;
    } catch (err) {
        console.error('[VectorStore] Persist failed:', err.message);
        return false;
    }
};

/**
 * Load store from disk (optional, for restart recovery)
 *
 * @returns {number} count of loaded entries
 */
const loadFromDisk = () => {
    if (!PERSISTENCE_PATH) return 0;

    try {
        if (!fs.existsSync(PERSISTENCE_PATH)) return 0;

        const raw = fs.readFileSync(PERSISTENCE_PATH, 'utf-8');
        const data = JSON.parse(raw);

        if (!Array.isArray(data)) return 0;

        let loaded = 0;
        for (const entry of data) {
            if (entry.id && entry.vector && Array.isArray(entry.vector)) {
                _store.set(entry.id, {
                    id: entry.id,
                    vector: entry.vector,
                    metadata: entry.metadata || {},
                    createdAt: entry.createdAt || Date.now()
                });
                loaded++;
            }
        }

        return loaded;
    } catch (err) {
        console.error('[VectorStore] Load from disk failed:', err.message);
        return 0;
    }
};

/**
 * Evict the oldest entry from the store
 * @private
 */
const _evictOldest = () => {
    let oldestId = null;
    let oldestTime = Infinity;

    for (const [id, entry] of _store) {
        if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            oldestId = id;
        }
    }

    if (oldestId) {
        _store.delete(oldestId);
    }
};

module.exports = {
    addVector,
    addBatch,
    search,
    getVector,
    deleteVector,
    deleteByFilter,
    clearStore,
    getStoreStats,
    hasVector,
    getAllIds,
    persistToDisk,
    loadFromDisk,
    MAX_STORE_SIZE,
    SIMILARITY_THRESHOLD,
    _store
};
