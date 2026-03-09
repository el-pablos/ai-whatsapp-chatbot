/**
 * Note Formatter — format video notes untuk berbagai output format
 *
 * Responsible for:
 * - WhatsApp-optimized formatting
 * - Plain text export
 * - Markdown format
 *
 * @author Tama El Pablo
 */

const { formatTimestamp } = require('./timestampExtractor');

const WA_SAFE_LIMIT = 4000;

/**
 * Format video notes for WhatsApp, auto-truncate if too long
 *
 * @param {object} data
 * @param {string} data.title
 * @param {string} data.summary
 * @param {string[]} data.keyPoints
 * @param {Array<{ time: string, label: string }>} data.chapters
 * @param {string[]} data.actionItems
 * @param {number} data.duration
 * @param {string} data.url
 * @returns {string}
 */
const formatForWhatsApp = (data = {}) => {
    const lines = [];

    // Header
    lines.push(`📝 *Video Notes*`);
    if (data.title) lines.push(`🎬 *${data.title}*`);
    if (data.duration) lines.push(`⏱️ ${formatTimestamp(data.duration)}`);
    if (data.url) lines.push(`🔗 ${data.url}`);
    lines.push('');

    // Summary
    if (data.summary) {
        lines.push('📋 *Ringkasan*', data.summary, '');
    }

    // Key Points
    if (data.keyPoints && data.keyPoints.length > 0) {
        lines.push('🔑 *Key Points*');
        data.keyPoints.forEach(p => lines.push(`• ${p}`));
        lines.push('');
    }

    // Chapters
    if (data.chapters && data.chapters.length > 0) {
        lines.push('📑 *Chapters*');
        data.chapters.forEach(c => lines.push(`${c.time} — ${c.label}`));
        lines.push('');
    }

    // Action Items
    if (data.actionItems && data.actionItems.length > 0) {
        lines.push('✅ *Action Items*');
        data.actionItems.forEach(a => lines.push(`☐ ${a}`));
        lines.push('');
    }

    let result = lines.join('\n');
    if (result.length > WA_SAFE_LIMIT) {
        result = result.substring(0, WA_SAFE_LIMIT - 30) + '\n\n...(notes terpotong, terlalu panjang)';
    }
    return result;
};

/**
 * Format video notes as Markdown
 *
 * @param {object} data - same as formatForWhatsApp
 * @returns {string}
 */
const formatAsMarkdown = (data = {}) => {
    const lines = [];

    lines.push(`# Video Notes`);
    if (data.title) lines.push(`## ${data.title}`);
    if (data.duration) lines.push(`**Durasi:** ${formatTimestamp(data.duration)}`);
    if (data.url) lines.push(`**URL:** ${data.url}`);
    lines.push('');

    if (data.summary) {
        lines.push('## Ringkasan', '', data.summary, '');
    }

    if (data.keyPoints && data.keyPoints.length > 0) {
        lines.push('## Key Points', '');
        data.keyPoints.forEach(p => lines.push(`- ${p}`));
        lines.push('');
    }

    if (data.chapters && data.chapters.length > 0) {
        lines.push('## Chapters', '');
        data.chapters.forEach(c => lines.push(`- \`${c.time}\` ${c.label}`));
        lines.push('');
    }

    if (data.actionItems && data.actionItems.length > 0) {
        lines.push('## Action Items', '');
        data.actionItems.forEach(a => lines.push(`- [ ] ${a}`));
        lines.push('');
    }

    return lines.join('\n');
};

/**
 * Format as plain text (no formatting)
 *
 * @param {object} data - same as formatForWhatsApp
 * @returns {string}
 */
const formatAsPlainText = (data = {}) => {
    const lines = [];

    lines.push('VIDEO NOTES');
    if (data.title) lines.push(data.title);
    if (data.duration) lines.push(`Durasi: ${formatTimestamp(data.duration)}`);
    lines.push('');

    if (data.summary) {
        lines.push('RINGKASAN:', data.summary, '');
    }

    if (data.keyPoints && data.keyPoints.length > 0) {
        lines.push('KEY POINTS:');
        data.keyPoints.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
        lines.push('');
    }

    if (data.chapters && data.chapters.length > 0) {
        lines.push('CHAPTERS:');
        data.chapters.forEach(c => lines.push(`${c.time} - ${c.label}`));
        lines.push('');
    }

    return lines.join('\n');
};

module.exports = {
    formatForWhatsApp,
    formatAsMarkdown,
    formatAsPlainText,
};
