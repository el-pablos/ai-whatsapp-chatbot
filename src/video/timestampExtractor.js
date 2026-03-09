/**
 * Timestamp Extractor — extract timestamps dari YouTube video descriptions/comments
 *
 * Responsible for:
 * - Parsing timestamp format (HH:MM:SS or MM:SS) dari text
 * - Generating timestamp chapters dari video description
 * - Creating timeline dari AI-analyzed content
 *
 * @author Tama El Pablo
 */

// Regex patterns for timestamp detection
const TIMESTAMP_REGEX = /(?:^|\s)(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+?)(?:\n|$)/gm;
const SIMPLE_TIMESTAMP_REGEX = /(\d{1,2}:\d{2}(?::\d{2})?)/g;

/**
 * Parse timestamp string to seconds
 * Supports: "1:23", "01:23", "1:23:45", "01:23:45"
 *
 * @param {string} ts - timestamp string
 * @returns {number} total seconds
 */
const parseTimestamp = (ts) => {
    if (!ts || typeof ts !== 'string') return 0;
    const parts = ts.split(':').map(Number);
    if (parts.some(isNaN)) return 0;

    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
};

/**
 * Format seconds to timestamp string
 *
 * @param {number} seconds
 * @returns {string} formatted timestamp
 */
const formatTimestamp = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Extract timestamps and labels from video description text
 *
 * @param {string} text - video description or transcript
 * @returns {Array<{ time: string, seconds: number, label: string }>}
 */
const extractTimestamps = (text) => {
    if (!text || typeof text !== 'string') return [];

    const timestamps = [];
    const seen = new Set();
    let match;

    // Reset regex lastIndex
    TIMESTAMP_REGEX.lastIndex = 0;

    while ((match = TIMESTAMP_REGEX.exec(text)) !== null) {
        const time = match[1].trim();
        const label = match[2].trim();
        const seconds = parseTimestamp(time);
        const key = `${seconds}:${label.substring(0, 30)}`;

        if (!seen.has(key) && label.length > 0) {
            seen.add(key);
            timestamps.push({ time, seconds, label });
        }
    }

    // Sort by timestamp
    timestamps.sort((a, b) => a.seconds - b.seconds);
    return timestamps;
};

/**
 * Extract just the timestamp values from text (no labels)
 *
 * @param {string} text
 * @returns {string[]} array of timestamp strings
 */
const findTimestamps = (text) => {
    if (!text || typeof text !== 'string') return [];
    const matches = text.match(SIMPLE_TIMESTAMP_REGEX) || [];
    return [...new Set(matches)];
};

/**
 * Generate a chapters summary from timestamps
 *
 * @param {Array<{ time: string, seconds: number, label: string }>} timestamps
 * @param {number} totalDuration - total video duration in seconds
 * @returns {string} formatted chapters text
 */
const generateChaptersSummary = (timestamps, totalDuration = 0) => {
    if (!timestamps || timestamps.length === 0) return 'Tidak ada timestamps ditemukan.';

    const lines = ['📋 *Video Chapters*\n'];

    for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const nextTs = timestamps[i + 1];
        const duration = nextTs
            ? nextTs.seconds - ts.seconds
            : totalDuration ? totalDuration - ts.seconds : 0;

        const durationStr = duration > 0 ? ` (${formatTimestamp(duration)})` : '';
        lines.push(`${ts.time} — ${ts.label}${durationStr}`);
    }

    lines.push(`\n📊 Total: ${timestamps.length} chapters`);
    if (totalDuration > 0) {
        lines.push(`⏱️ Durasi: ${formatTimestamp(totalDuration)}`);
    }

    return lines.join('\n');
};

/**
 * Use AI to generate timestamps from transcript/description when no manual timestamps exist
 *
 * @param {string} transcript - video transcript text
 * @param {string} videoTitle - video title
 * @param {number} totalDuration - total video duration in seconds
 * @returns {Promise<Array<{ time: string, seconds: number, label: string }>>}
 */
const generateAITimestamps = async (transcript, videoTitle, totalDuration) => {
    if (!transcript || transcript.length < 100) return [];

    const { COPILOT_API_URL, COPILOT_API_MODEL } = require('../aiHandler');
    const axios = require('axios');

    const prompt = `Analisis transcript video berikut dan buat timestamps/chapters.

VIDEO: ${(videoTitle || 'Unknown').substring(0, 200)}
DURASI: ${formatTimestamp(totalDuration || 0)}
TRANSCRIPT (awal): ${transcript.substring(0, 3000)}

Buat 5-10 timestamp chapters yang logis berdasarkan topik yang dibahas.
Format output (WAJIB exact format, 1 baris per timestamp):
MM:SS - Deskripsi singkat topik

Jika durasi video > 1 jam gunakan format HH:MM:SS.
HANYA output timestamps, tanpa penjelasan tambahan.`;

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
        return extractTimestamps(text);
    } catch (err) {
        console.error('[TimestampExtractor] AI generation failed:', err.message);
        return [];
    }
};

module.exports = {
    parseTimestamp,
    formatTimestamp,
    extractTimestamps,
    findTimestamps,
    generateChaptersSummary,
    generateAITimestamps,
    TIMESTAMP_REGEX,
    SIMPLE_TIMESTAMP_REGEX,
};
