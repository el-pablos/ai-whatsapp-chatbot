/**
 * Media Handler Module - File & Image Processing
 * 
 * Handle media messages (images, documents, etc) dan extract content untuk AI
 * Support Vision API untuk image understanding
 * 
 * @author Tama (el-pablos)
 * @version 2.0.0
 */

const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Config
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4.5';
const MEDIA_DIR = path.join(__dirname, '..', 'data', 'media');

// Ensure media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

/**
 * Download and save media from WhatsApp message
 * 
 * @param {Object} msg - Baileys message object
 * @param {Object} sock - Baileys socket
 * @returns {Object} - { path, buffer, mimetype, filename }
 */
const downloadMedia = async (msg, sock) => {
    try {
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            }
        );

        const mediaType = getMediaType(msg);
        const extension = getExtension(msg);
        const filename = `${msg.key.id}_${Date.now()}${extension}`;
        const filepath = path.join(MEDIA_DIR, filename);
        
        // Save to disk
        fs.writeFileSync(filepath, buffer);
        
        return {
            path: filepath,
            buffer,
            mimetype: getMimetype(msg),
            filename,
            type: mediaType
        };
    } catch (error) {
        console.error('[Media] Error downloading media:', error.message);
        throw error;
    }
};

/**
 * Get media type from message
 */
const getMediaType = (msg) => {
    if (msg.message?.imageMessage) return 'image';
    if (msg.message?.videoMessage) return 'video';
    if (msg.message?.audioMessage) return 'audio';
    if (msg.message?.documentMessage) return 'document';
    if (msg.message?.stickerMessage) return 'sticker';
    return 'unknown';
};

/**
 * Get mimetype from message
 */
const getMimetype = (msg) => {
    return msg.message?.imageMessage?.mimetype ||
           msg.message?.videoMessage?.mimetype ||
           msg.message?.audioMessage?.mimetype ||
           msg.message?.documentMessage?.mimetype ||
           msg.message?.stickerMessage?.mimetype ||
           'application/octet-stream';
};

/**
 * Get file extension from message
 */
const getExtension = (msg) => {
    const mimetype = getMimetype(msg);
    const mimeMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'audio/ogg': '.ogg',
        'audio/mpeg': '.mp3',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    return mimeMap[mimetype] || '.bin';
};

/**
 * Get caption from media message
 */
const getMediaCaption = (msg) => {
    return msg.message?.imageMessage?.caption ||
           msg.message?.videoMessage?.caption ||
           msg.message?.documentMessage?.caption ||
           '';
};

/**
 * Analyze image using Vision API (Claude)
 * 
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} mimetype - Image mimetype
 * @param {string} userPrompt - Optional prompt from user (caption)
 * @param {Array} conversationHistory - Previous chat context
 * @param {string} systemPrompt - System prompt for persona
 * @returns {Promise<string>} - AI response about the image
 */
const analyzeImage = async (imageBuffer, mimetype, userPrompt = '', conversationHistory = [], systemPrompt = '') => {
    try {
        // Convert to base64
        const base64Image = imageBuffer.toString('base64');
        
        // Compress if too large (>5MB)
        let finalBase64 = base64Image;
        let finalMimetype = mimetype;
        
        if (imageBuffer.length > 5 * 1024 * 1024) {
            console.log('[Media] Image too large, compressing...');
            const compressed = await sharp(imageBuffer)
                .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();
            finalBase64 = compressed.toString('base64');
            finalMimetype = 'image/jpeg';
        }
        
        // Build prompt for vision
        const visionPrompt = userPrompt 
            ? `User kirim gambar dengan caption: "${userPrompt}". Analisis gambar ini dan responlah sesuai konteks caption.`
            : 'User kirim gambar ini. Deskripsikan apa yang kamu lihat dan berikan respons yang sesuai.';
        
        // Build messages with vision content
        const messages = [
            {
                role: 'system',
                content: systemPrompt
            },
            ...conversationHistory,
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: finalMimetype,
                            data: finalBase64
                        }
                    },
                    {
                        type: 'text',
                        text: visionPrompt
                    }
                ]
            }
        ];

        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: messages,
                temperature: 0.8,
                max_tokens: 1000
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 detik untuk vision
            }
        );

        if (response.data?.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content;
        }

        return 'duh ga bisa liat gambar nya nih jir 😓';
        
    } catch (error) {
        console.error('[Media] Error analyzing image:', error.message);
        
        if (error.response?.status === 400) {
            return 'hmm gambar nya ga bisa w proses nih, coba kirim ulang bro 😓';
        }
        
        return 'aduh error pas analisis gambar 😭 coba lgi ya';
    }
};

/**
 * Analyze document/file content
 * 
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - File mimetype  
 * @returns {Promise<string>} - File content description
 */
const analyzeDocument = async (buffer, filename, mimetype) => {
    try {
        // For text-based files, extract content
        if (mimetype.includes('text') || 
            mimetype.includes('json') || 
            mimetype.includes('javascript') ||
            mimetype.includes('xml')) {
            const textContent = buffer.toString('utf-8').slice(0, 5000);
            return `Isi file ${filename}:\n\`\`\`\n${textContent}\n\`\`\``;
        }
        
        // For PDFs and documents, just acknowledge
        if (mimetype.includes('pdf')) {
            return `User kirim file PDF: ${filename}. (Note: gw blm bisa baca isi PDF secara langsung nih)`;
        }
        
        if (mimetype.includes('word') || mimetype.includes('document')) {
            return `User kirim dokumen Word: ${filename}. (Note: gw blm bisa baca isi doc secara langsung)`;
        }
        
        return `User kirim file: ${filename} (${mimetype})`;
        
    } catch (error) {
        console.error('[Media] Error analyzing document:', error.message);
        return `User kirim file: ${filename}`;
    }
};

/**
 * Detect ethnicity from face image (for fun feature)
 * Using vision AI to analyze facial features
 * 
 * @param {Buffer} imageBuffer - Image buffer containing face
 * @param {string} mimetype - Image mimetype
 * @returns {Promise<string>} - Ethnicity prediction response
 */
const detectEthnicity = async (imageBuffer, mimetype) => {
    try {
        const base64Image = imageBuffer.toString('base64');
        
        const prompt = `Kamu adalah AI yang bisa menebak suku/etnis seseorang dari foto wajah secara fun dan casual.

Analisis foto wajah ini dan tebak suku/etnisnya berdasarkan ciri-ciri wajah seperti:
- Bentuk wajah dan rahang
- Bentuk mata
- Bentuk hidung
- Warna kulit
- Tekstur rambut (jika terlihat)

Berikan tebakan dalam gaya casual Tama dengan format:
1. Tebakan utama (suku/etnis paling mungkin)
2. Alternatif tebakan
3. Ciri-ciri yang kamu lihat
4. Confidence level (rendah/sedang/tinggi)

Ingat ini cuma for fun ya! Jangan terlalu serius, bisa bercanda dikit tapi tetap respectful.
Kalau ga ada wajah di foto, bilang aja "eh ini ga ada muka nya bro 😭"`;

        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimetype,
                            data: base64Image
                        }
                    },
                    {
                        type: 'text',
                        text: prompt
                    }
                ]
            }
        ];

        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: messages,
                temperature: 0.9,
                max_tokens: 500
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            }
        );

        if (response.data?.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content;
        }

        return 'duh gagal nebak nih jir 😭';
        
    } catch (error) {
        console.error('[Media] Error detecting ethnicity:', error.message);
        return 'aduh error pas nebak suku nya 😓 coba lgi bro';
    }
};

/**
 * Check if message contains media
 */
const hasMedia = (msg) => {
    return !!(
        msg.message?.imageMessage ||
        msg.message?.videoMessage ||
        msg.message?.audioMessage ||
        msg.message?.documentMessage ||
        msg.message?.stickerMessage
    );
};

/**
 * Clean up old media files (>7 days)
 */
const cleanupOldMedia = () => {
    try {
        const files = fs.readdirSync(MEDIA_DIR);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        let cleaned = 0;
        for (const file of files) {
            const filepath = path.join(MEDIA_DIR, file);
            const stats = fs.statSync(filepath);
            
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filepath);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`[Media] Cleaned up ${cleaned} old media files`);
        }
    } catch (error) {
        console.error('[Media] Error cleaning up:', error.message);
    }
};

// Run cleanup daily
setInterval(cleanupOldMedia, 24 * 60 * 60 * 1000);

module.exports = {
    downloadMedia,
    getMediaType,
    getMimetype,
    getMediaCaption,
    analyzeImage,
    analyzeDocument,
    detectEthnicity,
    hasMedia,
    cleanupOldMedia,
    MEDIA_DIR
};
