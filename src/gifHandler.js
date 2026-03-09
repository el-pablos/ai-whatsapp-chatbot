/**
 * GIF Handler — search GIF dari Tenor/Giphy
 * 
 * @author Tama El Pablo
 */

const axios = require('axios');

const TENOR_API_URL = 'https://tenor.googleapis.com/v2/search';
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs/search';

/**
 * Cari GIF dari Tenor
 * @param {string} query — kata kunci pencarian
 * @param {number} limit — jumlah hasil (default 1)
 * @returns {Promise<Array<{url: string, title: string, preview: string}>>}
 */
const searchTenor = async (query, limit = 1) => {
    const apiKey = process.env.TENOR_API_KEY;
    if (!apiKey) return [];

    const response = await axios.get(TENOR_API_URL, {
        params: { q: query, key: apiKey, limit, media_filter: 'gif' },
        timeout: 10000,
    });

    return (response.data.results || []).map(r => ({
        url: r.media_formats?.gif?.url || r.url,
        title: r.title || query,
        preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || '',
    }));
};

/**
 * Cari GIF dari Giphy
 * @param {string} query — kata kunci pencarian
 * @param {number} limit — jumlah hasil (default 1)
 * @returns {Promise<Array<{url: string, title: string, preview: string}>>}
 */
const searchGiphy = async (query, limit = 1) => {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) return [];

    const response = await axios.get(GIPHY_API_URL, {
        params: { q: query, api_key: apiKey, limit, rating: 'pg-13' },
        timeout: 10000,
    });

    return (response.data.data || []).map(g => ({
        url: g.images?.original?.url || '',
        title: g.title || query,
        preview: g.images?.fixed_height_small?.url || '',
    }));
};

/**
 * Cari GIF — coba Tenor dulu, fallback ke Giphy
 * @param {string} query — kata kunci pencarian
 * @param {number} limit — jumlah hasil
 * @returns {Promise<Array<{url: string, title: string, preview: string}>>}
 */
const searchGif = async (query, limit = 1) => {
    if (!query) return [];

    // Coba Tenor dulu
    try {
        const results = await searchTenor(query, limit);
        if (results.length > 0) return results;
    } catch (err) {
        console.error('[GIF] Tenor search gagal:', err.message);
    }

    // Fallback ke Giphy
    try {
        const results = await searchGiphy(query, limit);
        if (results.length > 0) return results;
    } catch (err) {
        console.error('[GIF] Giphy search gagal:', err.message);
    }

    return [];
};

/**
 * Parse command /gif
 * @param {string} text — misal "/gif kucing lucu"
 * @returns {string|null} query
 */
const parseGifCommand = (text) => {
    if (!text) return null;
    const match = text.match(/^\/gif\s+(.+)$/i);
    return match ? match[1].trim() : null;
};

/**
 * Check apakah GIF API tersedia
 */
const isGifAvailable = () => {
    return !!(process.env.TENOR_API_KEY || process.env.GIPHY_API_KEY);
};

module.exports = {
    searchTenor,
    searchGiphy,
    searchGif,
    parseGifCommand,
    isGifAvailable,
};
