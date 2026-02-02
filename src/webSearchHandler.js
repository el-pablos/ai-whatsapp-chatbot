/**
 * Web Search Handler Module
 * 
 * Fitur:
 * - Web search menggunakan DuckDuckGo (free, no API key)
 * - Extract relevant info dari search results
 * - Format hasil untuk chat
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

const axios = require('axios');

// DuckDuckGo Instant Answer API (free)
const DDG_API = 'https://api.duckduckgo.com/';

/**
 * Detect if message is requesting web search
 * @param {string} text - Message text
 * @returns {Object|null} - { isSearch, query } or null
 */
const detectSearchRequest = (text) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    // Patterns untuk detect search request
    const searchPatterns = [
        /^(?:cari(?:in)?|search|googling?|cek|find)\s+(.+)/i,
        /(?:apa itu|apakah|siapa|dimana|kapan|berapa|bagaimana)\s+(.+)\??/i,
        /^(.+)\s+(?:itu apa|apaan|artinya apa)\??$/i
    ];
    
    for (const pattern of searchPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return {
                isSearch: true,
                query: match[1].trim()
            };
        }
    }
    
    // Check for explicit search keywords
    const explicitKeywords = ['cariin', 'cari di internet', 'cek internet', 'google'];
    if (explicitKeywords.some(kw => lowerText.includes(kw))) {
        // Extract query after keyword
        for (const kw of explicitKeywords) {
            const idx = lowerText.indexOf(kw);
            if (idx !== -1) {
                const query = text.substring(idx + kw.length).trim();
                if (query.length > 2) {
                    return { isSearch: true, query };
                }
            }
        }
    }
    
    return null;
};

/**
 * Search using DuckDuckGo Instant Answer API
 * @param {string} query - Search query
 * @returns {Promise<Object>} - Search result
 */
const searchDuckDuckGo = async (query) => {
    try {
        const response = await axios.get(DDG_API, {
            params: {
                q: query,
                format: 'json',
                no_redirect: 1,
                no_html: 1,
                skip_disambig: 1
            },
            timeout: 10000
        });
        
        const data = response.data;
        
        // Extract useful info
        const result = {
            success: true,
            query: query,
            abstract: data.Abstract || null,
            abstractSource: data.AbstractSource || null,
            abstractURL: data.AbstractURL || null,
            answer: data.Answer || null,
            definition: data.Definition || null,
            definitionSource: data.DefinitionSource || null,
            heading: data.Heading || null,
            image: data.Image || null,
            relatedTopics: (data.RelatedTopics || []).slice(0, 5).map(t => ({
                text: t.Text,
                url: t.FirstURL
            })).filter(t => t.text),
            infobox: data.Infobox || null,
            type: data.Type || null
        };
        
        // Check if we got any useful content
        const hasContent = result.abstract || result.answer || result.definition || result.relatedTopics.length > 0;
        
        return {
            ...result,
            hasContent
        };
        
    } catch (error) {
        console.error('[WebSearch] DuckDuckGo error:', error.message);
        return {
            success: false,
            error: error.message,
            hasContent: false
        };
    }
};

/**
 * Search using SerpAPI-like scraping (fallback)
 * This is a simple HTML scraper for Google
 * Note: May break if Google changes their HTML
 */
const searchGoogleScrape = async (query) => {
    try {
        const response = await axios.get('https://www.google.com/search', {
            params: {
                q: query,
                hl: 'id',
                gl: 'id'
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        
        // Very basic scraping - extract snippets
        const html = response.data;
        const snippetMatches = html.match(/<div class="BNeawe s3v9rd AP7Wnd">(.*?)<\/div>/g) || [];
        
        const snippets = snippetMatches
            .slice(0, 5)
            .map(s => s.replace(/<[^>]*>/g, '').trim())
            .filter(s => s.length > 20);
        
        return {
            success: true,
            query,
            snippets,
            hasContent: snippets.length > 0
        };
        
    } catch (error) {
        console.error('[WebSearch] Google scrape error:', error.message);
        return {
            success: false,
            error: error.message,
            hasContent: false
        };
    }
};

/**
 * Main search function - combines multiple sources
 * @param {string} query 
 * @returns {Promise<Object>}
 */
const webSearch = async (query) => {
    // Try DuckDuckGo first
    let result = await searchDuckDuckGo(query);
    
    // If no content, try Google scrape as fallback
    if (!result.hasContent) {
        console.log('[WebSearch] DuckDuckGo no content, trying fallback...');
        const googleResult = await searchGoogleScrape(query);
        if (googleResult.hasContent) {
            result = {
                ...result,
                ...googleResult,
                source: 'google'
            };
        }
    } else {
        result.source = 'duckduckgo';
    }
    
    return result;
};

/**
 * Format search results untuk chat response
 * @param {Object} result - Search result object
 * @returns {string} - Formatted text
 */
const formatSearchResult = (result) => {
    if (!result.success || !result.hasContent) {
        return null;
    }
    
    let formatted = `🔍 *Hasil pencarian: "${result.query}"*\n\n`;
    
    // Add main content
    if (result.abstract) {
        formatted += `📖 ${result.abstract}\n`;
        if (result.abstractSource) {
            formatted += `_Sumber: ${result.abstractSource}_\n`;
        }
        formatted += '\n';
    }
    
    if (result.answer) {
        formatted += `💡 *Jawaban:* ${result.answer}\n\n`;
    }
    
    if (result.definition) {
        formatted += `📚 *Definisi:* ${result.definition}\n`;
        if (result.definitionSource) {
            formatted += `_Sumber: ${result.definitionSource}_\n`;
        }
        formatted += '\n';
    }
    
    // Add related topics if no main content
    if (!result.abstract && !result.answer && !result.definition && result.relatedTopics?.length > 0) {
        formatted += '📋 *Topik terkait:*\n';
        result.relatedTopics.forEach((topic, i) => {
            formatted += `${i + 1}. ${topic.text}\n`;
        });
    }
    
    // Add Google snippets if available
    if (result.snippets?.length > 0) {
        formatted += '📝 *Snippets:*\n';
        result.snippets.forEach((snippet, i) => {
            formatted += `• ${snippet}\n`;
        });
    }
    
    // Handle no results
    if (!result.abstract && !result.answer && !result.definition && 
        (!result.relatedTopics || result.relatedTopics.length === 0) &&
        (!result.snippets || result.snippets.length === 0)) {
        return `Hasil pencarian untuk "${result.query}" tidak ditemukan. Coba kata kunci lain.`;
    }
    
    return formatted.trim();
};

/**
 * Sanitize search query
 */
const sanitizeQuery = (query) => {
    if (!query) return '';
    return query
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
};

/**
 * Parse DuckDuckGo response
 */
const parseSearchResults = (ddgResponse) => {
    const results = [];
    
    if (!ddgResponse?.RelatedTopics) return results;
    
    for (const topic of ddgResponse.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
            results.push({
                title: topic.Text.split(' - ')[0] || topic.Text,
                snippet: topic.Text,
                url: topic.FirstURL
            });
        }
        
        // Handle nested topics
        if (topic.Topics) {
            for (const nested of topic.Topics) {
                if (nested.Text && nested.FirstURL) {
                    results.push({
                        title: nested.Text.split(' - ')[0] || nested.Text,
                        snippet: nested.Text,
                        url: nested.FirstURL
                    });
                }
            }
        }
    }
    
    return results;
};

/**
 * Check if query is informational
 */
const isInfoQuery = (text) => {
    if (!text) return false;
    const infoPatterns = [
        /^apa (itu|yang)/i,
        /^siapa/i,
        /^kapan/i,
        /^dimana/i,
        /^bagaimana/i,
        /^mengapa/i,
        /^kenapa/i,
        /^berapa/i
    ];
    return infoPatterns.some(p => p.test(text));
};

// Constants
const SEARCH_KEYWORDS = ['search', 'cari', 'googling', 'cariin', 'lookup', 'browse'];
const DUCKDUCKGO_API_URL = DDG_API;
const MAX_RESULTS = 5;

module.exports = {
    detectSearchRequest,
    webSearch,
    searchDuckDuckGo,
    formatSearchResult,
    sanitizeQuery,
    parseSearchResults,
    isInfoQuery,
    SEARCH_KEYWORDS,
    DUCKDUCKGO_API_URL,
    MAX_RESULTS,
    DDG_API
};
