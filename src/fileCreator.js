/**
 * File Creator Module - Create & Send Files via WhatsApp
 *
 * Membuat file (markdown, txt, csv, json, html, dll) dan mengirimkannya
 * sebagai document attachment ke WhatsApp user.
 *
 * @author Tama El Pablo
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

// Temp directory for created files
const TEMP_DIR = path.join(process.cwd(), 'temp_files');

// MIME type mapping
const MIME_TYPES = {
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'html': 'text/html',
    'htm': 'text/html',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'py': 'text/x-python',
    'css': 'text/css',
    'sql': 'application/sql',
    'sh': 'application/x-sh',
    'bat': 'application/x-bat',
    'ini': 'text/plain',
    'cfg': 'text/plain',
    'log': 'text/plain',
    'rst': 'text/x-rst',
    'tex': 'application/x-tex',
    'tsv': 'text/tab-separated-values'
};

/**
 * Ensure temp directory exists
 */
const ensureTempDir = async () => {
    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });
    } catch (e) { }
};

/**
 * Cleanup temp file
 */
const cleanupTemp = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (e) { }
};

/**
 * Get MIME type for a file extension
 * @param {string} ext - File extension (without dot)
 * @returns {string} MIME type
 */
const getMimeType = (ext) => {
    const cleanExt = ext.replace(/^\./, '').toLowerCase();
    return MIME_TYPES[cleanExt] || 'application/octet-stream';
};

/**
 * File marker pattern used by AI to indicate file output
 * Format: [FILE:filename.ext] at the start of the response
 */
const FILE_MARKER_REGEX = /^\[FILE:([^\]]+)\]\s*/;

/**
 * Check if AI response contains a file marker
 * @param {string} response - AI response text
 * @returns {{ hasFile: boolean, fileName: string, content: string } | null}
 */
const parseFileMarker = (response) => {
    if (!response) return null;

    const match = response.match(FILE_MARKER_REGEX);
    if (!match) return null;

    const fileName = match[1].trim();
    const content = response.replace(FILE_MARKER_REGEX, '').trim();

    // Validate filename
    if (!fileName || fileName.length > 200) return null;

    // Get extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext) return null;

    return {
        hasFile: true,
        fileName: sanitizeFileName(fileName),
        extension: ext,
        content: content,
        mimetype: getMimeType(ext)
    };
};

/**
 * Sanitize filename - remove invalid characters
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFileName = (filename) => {
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 200)
        .trim();
};

/**
 * Create a file and send it via WhatsApp
 * @param {Object} sock - Baileys socket instance
 * @param {string} sender - Recipient JID
 * @param {string} content - File content
 * @param {string} fileName - Filename with extension
 * @param {Object} options - Additional options
 * @param {Object} options.quoted - Message to quote
 * @param {string} options.caption - Caption for the file
 * @returns {Promise<boolean>} Success status
 */
const createAndSendFile = async (sock, sender, content, fileName, options = {}) => {
    await ensureTempDir();

    const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
    const mimetype = getMimeType(ext);
    const tempPath = path.join(TEMP_DIR, `${Date.now()}_${fileName}`);

    try {
        // Write content to temp file
        await fs.writeFile(tempPath, content, 'utf-8');

        // Read as buffer for sending
        const fileBuffer = await fs.readFile(tempPath);

        // Send as document
        const msgOptions = options.quoted ? { quoted: options.quoted } : {};

        await sock.sendMessage(sender, {
            document: fileBuffer,
            mimetype: mimetype,
            fileName: fileName,
            caption: options.caption || `📄 *${fileName}*\n\n_tap untuk save ke device_`
        }, msgOptions);

        console.log(`[FileCreator] Sent file: ${fileName} (${fileBuffer.length} bytes) to ${sender}`);

        // Cleanup
        await cleanupTemp(tempPath);

        return true;
    } catch (error) {
        console.error(`[FileCreator] Error creating/sending file:`, error.message);
        await cleanupTemp(tempPath);
        throw error;
    }
};

/**
 * Detect if user is requesting file creation from their message
 * Used as a secondary check alongside AI's [FILE:] marker
 * @param {string} text - User's message
 * @returns {{ isFileRequest: boolean, format: string|null }}
 */
const detectFileRequest = (text) => {
    if (!text) return { isFileRequest: false, format: null };

    const lowerText = text.toLowerCase();

    // Pattern matching for file creation requests
    const filePatterns = [
        // Direct format mentions
        /(?:dalam|ke|jadi|sebagai|format|bentuk)\s+(?:file\s+)?(?:\.?)(md|markdown|txt|csv|json|html|xml|yaml|yml|py|js|sql)\b/i,
        // "buatkan/bikin file"
        /(?:buatk?an|bikin|buat|create|generate|export)\s+(?:dalam\s+)?(?:bentuk\s+)?file\s+(?:\.?)(md|markdown|txt|csv|json|html|xml|yaml|yml)\b/i,
        // "kirim sebagai file"
        /(?:kirim|send)\s+(?:sebagai|sebagi|sbg|as)\s+file/i,
        // "file .md" / "format .md"
        /(?:file|format)\s+\.?(md|markdown|txt|csv|json|html|xml|yaml|yml)\b/i,
        // "dalam bentuk markdown/file"
        /dalam\s+bentuk\s+(?:file\s+)?(md|markdown|txt|csv|json|html|xml)\b/i,
    ];

    for (const pattern of filePatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            let format = match[1] || null;
            if (format === 'markdown') format = 'md';
            return { isFileRequest: true, format: format || 'md' };
        }
    }

    // Generic file request without specific format
    const genericPatterns = [
        /(?:buatk?an|bikin|buat|create|generate)\s+(?:sebuah\s+)?file\b/i,
        /(?:kirim|send)\s+(?:sebagai|sbg|as)\s+file\b/i,
        /export\s+(?:ke|to)\s+file\b/i
    ];

    for (const pattern of genericPatterns) {
        if (pattern.test(lowerText)) {
            return { isFileRequest: true, format: null };
        }
    }

    return { isFileRequest: false, format: null };
};

module.exports = {
    parseFileMarker,
    createAndSendFile,
    detectFileRequest,
    sanitizeFileName,
    getMimeType,
    ensureTempDir,
    cleanupTemp,
    FILE_MARKER_REGEX,
    MIME_TYPES,
    TEMP_DIR
};
