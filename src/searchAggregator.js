/**
 * Search Aggregator — multi-source search aggregation untuk live verification
 *
 * Aggregate hasil dari beberapa search source sekaligus untuk data yang lebih reliable.
 * Merge, deduplicate, dan hitung confidence score.
 *
 * @author Tama El Pablo
 */

const { webSearch, axiosGetWithRetry } = require('./webSearchHandler');

const AGGREGATE_TIMEOUT = parseInt(process.env.LIVE_VERIFY_TIMEOUT_MS, 10) || 15000;

// Domain-specific URL patterns
const DOMAIN_PATTERNS = {
    wikipedia: /\b(wikipedia|wiki)\b/i,
    github: /\b(github|repo|repository)\b/i,
};

// ═══════════════════════════════════════════════════════════
//  CORE: aggregateSearch
// ═══════════════════════════════════════════════════════════

/**
 * Aggregate search from multiple sources
 *
 * @param {string} query - search query
 * @param {object} options
 * @param {number} options.maxResults - max results to return (default 5)
 * @param {number} options.timeout - timeout in ms (default 15000)
 * @returns {Promise<{ results: Array, sources: string[], confidence: number, timestamp: Date }>}
 */
const aggregateSearch = async (query, options = {}) => {
    const { maxResults = 5, timeout = AGGREGATE_TIMEOUT } = options;
    const results = [];
    const sources = [];
    const startTime = Date.now();

    // 1. DuckDuckGo search (existing webSearch)
    try {
        const ddgResult = await Promise.race([
            webSearch(query),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
        ]);

        if (ddgResult && ddgResult.hasContent) {
            sources.push(ddgResult.source || 'duckduckgo');

            // Extract individual results
            if (ddgResult.abstract) {
                results.push({
                    title: ddgResult.heading || query,
                    snippet: ddgResult.abstract,
                    url: ddgResult.abstractURL || '',
                    source: ddgResult.abstractSource || 'DuckDuckGo',
                });
            }

            if (ddgResult.answer) {
                results.push({
                    title: 'Direct Answer',
                    snippet: ddgResult.answer,
                    url: '',
                    source: 'DuckDuckGo',
                });
            }

            // Related topics
            if (ddgResult.relatedTopics) {
                for (const topic of ddgResult.relatedTopics.slice(0, 3)) {
                    results.push({
                        title: topic.text?.substring(0, 80) || '',
                        snippet: topic.text || '',
                        url: topic.url || '',
                        source: 'DuckDuckGo',
                    });
                }
            }

            // Google snippets (from fallback)
            if (ddgResult.googleSnippets) {
                for (const snippet of ddgResult.googleSnippets.slice(0, 3)) {
                    results.push({
                        title: snippet.title || '',
                        snippet: snippet.snippet || snippet.text || '',
                        url: snippet.url || '',
                        source: 'Google',
                    });
                }
            }
        }
    } catch (err) {
        console.error('[SearchAggregator] DuckDuckGo search failed:', err.message);
    }

    // 2. Domain-specific URL fetch if query matches
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(timeout - elapsed, 2000);

    if (DOMAIN_PATTERNS.wikipedia.test(query)) {
        try {
            const wikiQuery = query.replace(/\b(wikipedia|wiki)\b/gi, '').trim();
            const wikiResult = await fetchWikipediaSummary(wikiQuery, remainingTime);
            if (wikiResult) {
                results.push(wikiResult);
                sources.push('wikipedia');
            }
        } catch (err) {
            console.error('[SearchAggregator] Wikipedia fetch failed:', err.message);
        }
    }

    // 3. Deduplicate results
    const deduped = deduplicateResults(results);

    // 4. Calculate confidence score
    const confidence = calculateConfidence(deduped, sources);

    return {
        results: deduped.slice(0, maxResults),
        sources: [...new Set(sources)],
        confidence,
        timestamp: new Date(),
    };
};

// ═══════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch Wikipedia summary for a topic
 */
const fetchWikipediaSummary = async (query, timeout = 5000) => {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://id.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`;

    try {
        const resp = await axiosGetWithRetry(url, { timeout }, 0);
        if (resp.data && resp.data.extract) {
            return {
                title: resp.data.title || query,
                snippet: resp.data.extract,
                url: resp.data.content_urls?.desktop?.page || '',
                source: 'Wikipedia',
            };
        }
    } catch {
        // Try English Wikipedia as fallback
        try {
            const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`;
            const resp = await axiosGetWithRetry(enUrl, { timeout: Math.max(timeout - 2000, 2000) }, 0);
            if (resp.data && resp.data.extract) {
                return {
                    title: resp.data.title || query,
                    snippet: resp.data.extract,
                    url: resp.data.content_urls?.desktop?.page || '',
                    source: 'Wikipedia (EN)',
                };
            }
        } catch {
            // both failed
        }
    }
    return null;
};

/**
 * Deduplicate results by comparing snippets
 */
const deduplicateResults = (results) => {
    const seen = new Set();
    return results.filter(r => {
        // Normalize snippet for comparison
        const key = (r.snippet || '').toLowerCase().substring(0, 100).replace(/\s+/g, ' ').trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

/**
 * Calculate confidence score based on results quality
 */
const calculateConfidence = (results, sources) => {
    if (results.length === 0) return 0;

    let score = 0;

    // More results = higher confidence (up to 0.4)
    score += Math.min(results.length * 0.1, 0.4);

    // More unique sources = higher confidence (up to 0.3)
    const uniqueSources = new Set(sources);
    score += Math.min(uniqueSources.size * 0.15, 0.3);

    // Results with URLs = higher confidence (up to 0.2)
    const withUrls = results.filter(r => r.url).length;
    score += Math.min(withUrls * 0.05, 0.2);

    // Results with substantial content (up to 0.1)
    const substantial = results.filter(r => (r.snippet || '').length > 50).length;
    score += Math.min(substantial * 0.025, 0.1);

    return Math.min(score, 1.0);
};

module.exports = {
    aggregateSearch,
    fetchWikipediaSummary,
    deduplicateResults,
    calculateConfidence,
};
