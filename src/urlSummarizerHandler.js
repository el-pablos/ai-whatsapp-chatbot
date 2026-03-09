/**
 * URL Summarizer Handler — rangkum artikel dan halaman web
 * 
 * Fetch URL, extract konten utama, kirim ke AI untuk dirangkum.
 * 
 * @author Tama El Pablo
 */

const axios = require('axios');

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch|shorts|playlist)|youtu\.be\/)/i;
const MAX_TEXT_LENGTH = 10000;

/**
 * Deteksi URL di teks
 */
const detectUrl = (text) => {
    if (!text) return [];
    const matches = text.match(URL_REGEX);
    return matches || [];
};

/**
 * Cek apakah URL YouTube
 */
const isYoutubeUrl = (url) => {
    return YOUTUBE_REGEX.test(url);
};

/**
 * Fetch HTML dan extract teks utama
 */
const fetchAndExtractText = async (url) => {
    const response = await axios.get(url, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
        },
        maxRedirects: 5,
        validateStatus: s => s < 400,
    });

    let html = response.data;
    if (typeof html !== 'string') return { title: '', text: '' };

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Remove script, style, nav, footer, header, aside
    html = html.replace(/<(script|style|nav|footer|header|aside|iframe|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Remove HTML tags
    let text = html.replace(/<[^>]+>/g, ' ');
    // Decode common entities
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    // Clean whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return { title, text: text.substring(0, MAX_TEXT_LENGTH) };
};

/**
 * Rangkum URL via AI
 */
const summarizeUrl = async (url, aiCall) => {
    if (!url) return { success: false, error: 'URL kosong' };
    if (isYoutubeUrl(url)) return { success: false, error: 'URL YouTube — pakai fitur YouTube aja bro' };

    try {
        const { title, text } = await fetchAndExtractText(url);
        if (!text || text.length < 50) {
            return { success: false, error: 'Ga bisa extract konten dari URL tersebut' };
        }

        const summary = aiCall
            ? await aiCall(text, title)
            : `*${title || 'Untitled'}*\n\n${text.substring(0, 1000)}...`;

        return {
            success: true,
            title: title || 'Untitled',
            summary,
            url,
            textLength: text.length,
        };
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            return { success: false, error: `URL ga bisa diakses: ${err.code}` };
        }
        return { success: false, error: `Gagal fetch URL: ${err.message}` };
    }
};

/**
 * Format hasil summary
 */
const formatSummary = (title, summary, url) => {
    return `📰 *${title}*\n${url}\n\n${summary}`;
};

module.exports = {
    detectUrl,
    isYoutubeUrl,
    fetchAndExtractText,
    summarizeUrl,
    formatSummary,
    URL_REGEX,
    MAX_TEXT_LENGTH,
};
