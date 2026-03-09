/**
 * Image Gen Handler — generate gambar via AI (OpenAI DALL-E)
 * Gated by env var OPENAI_API_KEY
 * 
 * @author Tama El Pablo
 */

const axios = require('axios');

const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';

/**
 * Check apakah image gen tersedia
 */
const isImageGenAvailable = () => {
    return !!process.env.OPENAI_API_KEY;
};

/**
 * Generate gambar pake DALL-E
 * @param {string} prompt — deskripsi gambar
 * @param {object} options — { size, quality, model }
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
const generateImage = async (prompt, options = {}) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { success: false, error: 'OPENAI_API_KEY belum di-set' };
    if (!prompt) return { success: false, error: 'Prompt gambar ga boleh kosong bro' };

    try {
        const response = await axios.post(OPENAI_API_URL, {
            model: options.model || 'dall-e-3',
            prompt,
            n: 1,
            size: options.size || '1024x1024',
            quality: options.quality || 'standard',
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        });

        const imageUrl = response.data?.data?.[0]?.url;
        if (!imageUrl) return { success: false, error: 'Ga dapet URL gambar dari API' };

        return { success: true, url: imageUrl, revisedPrompt: response.data?.data?.[0]?.revised_prompt };
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        return { success: false, error: `Gagal generate gambar: ${errMsg}` };
    }
};

/**
 * Download gambar dari URL ke buffer
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
const downloadImageBuffer = async (url) => {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return Buffer.from(response.data);
};

/**
 * Parse command /imagine
 * @param {string} text — "/imagine kucing bermain gitar"
 * @returns {{ prompt: string, size?: string } | null}
 */
const parseImagineCommand = (text) => {
    if (!text) return null;

    const match = text.match(/^\/imagine\s+(.+)$/is);
    if (!match) return null;

    let prompt = match[1].trim();
    let size = '1024x1024';

    // Check size flag
    const sizeMatch = prompt.match(/--size\s+(square|landscape|portrait)/i);
    if (sizeMatch) {
        const sizeMap = { square: '1024x1024', landscape: '1792x1024', portrait: '1024x1792' };
        size = sizeMap[sizeMatch[1].toLowerCase()] || '1024x1024';
        prompt = prompt.replace(sizeMatch[0], '').trim();
    }

    return { prompt, size };
};

module.exports = {
    isImageGenAvailable,
    generateImage,
    downloadImageBuffer,
    parseImagineCommand,
};
