/**
 * Video Note Generator — generate AI notes dari YouTube video
 *
 * Responsible for:
 * - Generating smart notes dari video transcript + timestamps
 * - Creating summary, key points, dan action items
 * - Formatting output untuk WhatsApp
 *
 * @author Tama El Pablo
 */

const { extractTimestamps, generateChaptersSummary, generateAITimestamps, formatTimestamp } = require('./timestampExtractor');
const { cleanTranscript, getPlainText, splitBySections } = require('./transcriptParser');

/**
 * Generate complete video notes
 *
 * @param {object} videoData
 * @param {string} videoData.title - video title
 * @param {string} videoData.description - video description
 * @param {string} videoData.transcript - raw transcript text
 * @param {number} videoData.duration - video duration in seconds
 * @param {string} videoData.channel - channel name
 * @param {string} videoData.url - video URL
 * @returns {Promise<{ summary: string, chapters: string, keyPoints: string[], fullNotes: string }>}
 */
const generateVideoNotes = async (videoData = {}) => {
    const { title = '', description = '', transcript = '', duration = 0, channel = '', url = '' } = videoData;

    // 1. Extract timestamps from description
    let timestamps = extractTimestamps(description);

    // 2. If no timestamps in description, try AI generation
    if (timestamps.length === 0 && transcript.length > 100) {
        timestamps = await generateAITimestamps(transcript, title, duration);
    }

    // 3. Generate chapters
    const chapters = generateChaptersSummary(timestamps, duration);

    // 4. Generate AI summary
    const summary = await generateAISummary(title, transcript, description, duration);

    // 5. Extract key points
    const keyPoints = await extractKeyPoints(title, transcript);

    // 6. Build full notes
    const fullNotes = formatFullNotes({
        title, channel, url, duration,
        summary, chapters, keyPoints, timestamps,
    });

    return { summary, chapters, keyPoints, fullNotes };
};

/**
 * Generate AI summary of the video
 */
const generateAISummary = async (title, transcript, description, duration) => {
    if (!transcript && !description) return 'Tidak cukup data untuk membuat summary.';

    const { COPILOT_API_URL, COPILOT_API_MODEL } = require('../aiHandler');
    const axios = require('axios');

    const textSource = transcript ? transcript.substring(0, 4000) : description.substring(0, 2000);

    const prompt = `Buat ringkasan video berikut dalam bahasa Indonesia yang casual.

VIDEO: ${(title || 'Unknown').substring(0, 200)}
DURASI: ${formatTimestamp(duration || 0)}

KONTEN:
${textSource}

Buat ringkasan 3-5 paragraf pendek. Gaya bahasa santai tapi informatif.
Jangan pake "Saya", "Anda", "silakan". Pake "lu", "gw" kalau perlu.
LANGSUNG tulis ringkasan tanpa pembukaan.`;

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
        );

        return response.data?.choices?.[0]?.message?.content || 'Gagal generate summary.';
    } catch (err) {
        console.error('[VideoNoteGenerator] Summary failed:', err.message);
        return 'Gagal generate summary: ' + err.message;
    }
};

/**
 * Extract key points from transcript
 */
const extractKeyPoints = async (title, transcript) => {
    if (!transcript || transcript.length < 50) return [];

    const { COPILOT_API_URL, COPILOT_API_MODEL } = require('../aiHandler');
    const axios = require('axios');

    const prompt = `Dari transcript video berikut, extract 5-8 key points / poin penting.

VIDEO: ${(title || 'Unknown').substring(0, 200)}
TRANSCRIPT: ${transcript.substring(0, 3000)}

Format output WAJIB (1 baris per poin, tanpa nomor):
- Poin penting pertama
- Poin penting kedua
dst.

HANYA output poin-poin, tanpa penjelasan tambahan.`;

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
        );

        const text = response.data?.choices?.[0]?.message?.content || '';
        return text
            .split('\n')
            .map(l => l.replace(/^[-•*]\s*/, '').trim())
            .filter(l => l.length > 5);
    } catch (err) {
        console.error('[VideoNoteGenerator] Key points failed:', err.message);
        return [];
    }
};

/**
 * Format complete video notes for WhatsApp
 */
const formatFullNotes = ({ title, channel, url, duration, summary, chapters, keyPoints, timestamps }) => {
    const lines = [
        `📝 *Video Notes*`,
        ``,
        `🎬 *${title || 'Unknown'}*`,
    ];

    if (channel) lines.push(`📺 ${channel}`);
    if (duration) lines.push(`⏱️ ${formatTimestamp(duration)}`);
    if (url) lines.push(`🔗 ${url}`);

    lines.push('', '─'.repeat(25), '');

    // Summary
    if (summary) {
        lines.push('📋 *Ringkasan*', '', summary, '');
    }

    // Key Points
    if (keyPoints && keyPoints.length > 0) {
        lines.push('🔑 *Poin Penting*', '');
        keyPoints.forEach(p => lines.push(`• ${p}`));
        lines.push('');
    }

    // Chapters
    if (timestamps && timestamps.length > 0) {
        lines.push(chapters, '');
    }

    return lines.join('\n');
};

module.exports = {
    generateVideoNotes,
    generateAISummary,
    extractKeyPoints,
    formatFullNotes,
};
