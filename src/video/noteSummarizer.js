/**
 * Note Summarizer — compress dan summarize panjang notes jadi ringkas
 *
 * Responsible for:
 * - Summarizing long video notes to fit WA message limits
 * - Creating different summary levels (brief, standard, detailed)
 * - Extracting action items dari notes
 *
 * @author Tama El Pablo
 */

const WA_MAX_LENGTH = 4000; // WhatsApp message char limit (safe zone)

/**
 * Summary levels
 */
const SUMMARY_LEVELS = {
    brief: { maxLength: 500, style: 'Ultra singkat, 2-3 kalimat aja' },
    standard: { maxLength: 1500, style: 'Ringkas tapi lengkap, 5-8 paragraf pendek' },
    detailed: { maxLength: 3500, style: 'Detail dan komprehensif, include key points dan examples' },
};

/**
 * Summarize notes to fit a specific level
 *
 * @param {string} notes - full notes text
 * @param {string} level - 'brief' | 'standard' | 'detailed'
 * @returns {Promise<string>} summarized notes
 */
const summarizeNotes = async (notes, level = 'standard') => {
    if (!notes || typeof notes !== 'string') return 'Tidak ada notes untuk di-summarize.';

    const config = SUMMARY_LEVELS[level] || SUMMARY_LEVELS.standard;

    // If already short enough, return as-is
    if (notes.length <= config.maxLength) return notes;

    const { COPILOT_API_URL, COPILOT_API_MODEL } = require('../aiHandler');
    const axios = require('axios');

    const prompt = `Ringkas teks berikut dalam ${config.maxLength} karakter max.
Style: ${config.style}
Bahasa: Indonesia casual (ga usah formal)

TEKS:
${notes.substring(0, 5000)}

LANGSUNG tulis ringkasan tanpa pembukaan atau kata pengantar.`;

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4,
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
        );

        const result = response.data?.choices?.[0]?.message?.content || '';
        return result.substring(0, config.maxLength) || notes.substring(0, config.maxLength);
    } catch (err) {
        console.error('[NoteSummarizer] Summarize failed:', err.message);
        // Fallback: simple truncation
        return truncateNotes(notes, config.maxLength);
    }
};

/**
 * Simple truncation as fallback
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
const truncateNotes = (text, maxLength = WA_MAX_LENGTH) => {
    if (!text || text.length <= maxLength) return text || '';

    // Try to break at paragraph boundary
    const truncated = text.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf('\n\n');
    if (lastNewline > maxLength * 0.6) {
        return truncated.substring(0, lastNewline) + '\n\n...(ringkasan terpotong)';
    }

    // Try to break at sentence
    const lastPeriod = truncated.lastIndexOf('. ');
    if (lastPeriod > maxLength * 0.6) {
        return truncated.substring(0, lastPeriod + 1) + '\n\n...(ringkasan terpotong)';
    }

    return truncated + '...(terpotong)';
};

/**
 * Extract action items from notes
 *
 * @param {string} notes
 * @returns {string[]} array of action items
 */
const extractActionItems = (notes) => {
    if (!notes || typeof notes !== 'string') return [];

    const actionPatterns = [
        /(?:harus|perlu|wajib|sebaiknya|disarankan|pastikan)\s+(.+?)(?:\.|$)/gim,
        /(?:jangan lupa|ingat untuk|coba)\s+(.+?)(?:\.|$)/gim,
        /(?:step|langkah|tips?)\s*\d*[:.]\s*(.+?)(?:\.|$)/gim,
    ];

    const items = new Set();
    for (const pattern of actionPatterns) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(notes)) !== null) {
            const item = match[1].trim();
            if (item.length > 10 && item.length < 200) {
                items.add(item);
            }
        }
    }

    return [...items].slice(0, 10);
};

module.exports = {
    summarizeNotes,
    truncateNotes,
    extractActionItems,
    SUMMARY_LEVELS,
    WA_MAX_LENGTH,
};
