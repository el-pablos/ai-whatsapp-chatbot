/**
 * Transcript Parser — parse dan format transcript dari YouTube video
 *
 * Responsible for:
 * - Parsing raw transcript text
 * - Segmenting transcript by topic/time
 * - Cleaning and formatting transcript text
 * - Generating summaries dari transcript segments
 *
 * @author Tama El Pablo
 */

const { parseTimestamp, formatTimestamp } = require('./timestampExtractor');

/**
 * Clean raw transcript text
 * Remove duplicate whitespace, fix encoding, normalize newlines
 *
 * @param {string} raw - raw transcript text
 * @returns {string} cleaned transcript
 */
const cleanTranscript = (raw) => {
    if (!raw || typeof raw !== 'string') return '';

    return raw
        .replace(/\r\n/g, '\n')       // normalize newlines
        .replace(/\t/g, ' ')          // tabs to spaces
        .replace(/\[.*?\]/g, '')       // remove [Music], [Applause] etc
        .replace(/ {2,}/g, ' ')        // collapse multiple spaces
        .replace(/\n{3,}/g, '\n\n')    // max 2 consecutive newlines
        .trim();
};

/**
 * Parse SRT-format transcript
 *
 * @param {string} srt - SRT format text
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
const parseSRT = (srt) => {
    if (!srt || typeof srt !== 'string') return [];

    const segments = [];
    const blocks = srt.split(/\n\s*\n/);

    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 3) continue;

        // Parse timestamp line: "00:00:01,234 --> 00:00:05,678"
        const timeMatch = /(\d{2}:\d{2}:\d{2})[,.]?\d*\s*-->\s*(\d{2}:\d{2}:\d{2})[,.]?\d*/.exec(lines[1]);
        if (!timeMatch) continue;

        const start = parseTimestamp(timeMatch[1]);
        const end = parseTimestamp(timeMatch[2]);
        const text = lines.slice(2).join(' ').replace(/<[^>]+>/g, '').trim();

        if (text) {
            segments.push({ start, end, text });
        }
    }

    return segments;
};

/**
 * Parse VTT-format transcript (WebVTT)
 *
 * @param {string} vtt - VTT format text
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
const parseVTT = (vtt) => {
    if (!vtt || typeof vtt !== 'string') return [];

    // Remove WEBVTT header
    const content = vtt.replace(/^WEBVTT\s*\n/, '').replace(/^Kind:.*\n/m, '').replace(/^Language:.*\n/m, '');
    return parseSRT(content); // VTT and SRT share similar format
};

/**
 * Merge adjacent segments with short gaps
 *
 * @param {Array<{ start: number, end: number, text: string }>} segments
 * @param {number} gapThreshold - max gap in seconds to merge (default 2)
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
const mergeSegments = (segments, gapThreshold = 2) => {
    if (!segments || segments.length === 0) return [];

    const merged = [{ ...segments[0] }];

    for (let i = 1; i < segments.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = segments[i];

        if (curr.start - prev.end <= gapThreshold) {
            prev.end = curr.end;
            prev.text += ' ' + curr.text;
        } else {
            merged.push({ ...curr });
        }
    }

    return merged;
};

/**
 * Format transcript segments to readable text with timestamps
 *
 * @param {Array<{ start: number, end: number, text: string }>} segments
 * @param {object} options
 * @param {boolean} options.showTimestamps - show timestamp prefix (default true)
 * @param {number} options.maxLength - max total chars (default 4000)
 * @returns {string}
 */
const formatTranscript = (segments, options = {}) => {
    const { showTimestamps = true, maxLength = 4000 } = options;

    if (!segments || segments.length === 0) return 'Transcript tidak tersedia.';

    const lines = [];
    let totalLength = 0;

    for (const seg of segments) {
        const prefix = showTimestamps ? `[${formatTimestamp(seg.start)}] ` : '';
        const line = `${prefix}${seg.text}`;

        if (totalLength + line.length > maxLength) {
            lines.push('...(terpotong)');
            break;
        }

        lines.push(line);
        totalLength += line.length + 1;
    }

    return lines.join('\n');
};

/**
 * Get transcript text only (no timestamps)
 *
 * @param {Array<{ start: number, end: number, text: string }>} segments
 * @returns {string}
 */
const getPlainText = (segments) => {
    if (!segments || segments.length === 0) return '';
    return segments.map(s => s.text).join(' ');
};

/**
 * Split transcript into sections by time intervals
 *
 * @param {Array<{ start: number, end: number, text: string }>} segments
 * @param {number} intervalSeconds - seconds per section (default 300 = 5 min)
 * @returns {Array<{ startTime: number, endTime: number, text: string }>}
 */
const splitBySections = (segments, intervalSeconds = 300) => {
    if (!segments || segments.length === 0) return [];

    const sections = [];
    let currentSection = { startTime: 0, endTime: intervalSeconds, text: '' };

    for (const seg of segments) {
        while (seg.start >= currentSection.endTime) {
            if (currentSection.text.trim()) sections.push({ ...currentSection, text: currentSection.text.trim() });
            currentSection = {
                startTime: currentSection.endTime,
                endTime: currentSection.endTime + intervalSeconds,
                text: '',
            };
        }
        currentSection.text += (currentSection.text ? ' ' : '') + seg.text;
    }

    if (currentSection.text.trim()) sections.push({ ...currentSection, text: currentSection.text.trim() });

    return sections;
};

module.exports = {
    cleanTranscript,
    parseSRT,
    parseVTT,
    mergeSegments,
    formatTranscript,
    getPlainText,
    splitBySections,
};
