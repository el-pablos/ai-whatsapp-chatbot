/**
 * Sticker Handler Module
 * 
 * Fitur:
 * - Create sticker from image
 * - Create sticker from video/GIF
 * - Send random reaction stickers
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// Config
const TEMP_DIR = path.join(process.cwd(), 'temp_sticker');
const STICKER_PACK_NAME = 'Tama AI Bot';
const STICKER_AUTHOR = '@tam.aspx';

/**
 * Pastikan folder temp exists
 */
const ensureTempDir = async () => {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
};

/**
 * Detect if message is requesting sticker creation
 * FIXED: Stricter detection to avoid false positives
 * Only trigger on EXPLICIT sticker request, not when user mentions "sticker" in passing
 * @param {string} text - Message text
 * @returns {boolean}
 */
const isStickerRequest = (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase().trim();
    
    // Negative keywords - if these appear, user is NOT asking for sticker
    const negativeKeywords = [
        'analisis', 'analisa', 'analyze', 'analysis', 'apa ini', 'apa itu',
        'lihat', 'liat', 'cek', 'baca', 'jelaskan', 'jelasin', 'describe',
        'tebak', 'guess', 'foto', 'gambar', 'image', 'picture',
        'ga bisa', 'gabisa', 'tidak bisa', 'gak bisa', 'cant', "can't"
    ];
    
    // If negative keywords exist, this is NOT a sticker request
    if (negativeKeywords.some(kw => lowerText.includes(kw))) {
        return false;
    }
    
    // Exact match keywords (short ones) - only if caption is exactly this
    const exactKeywords = ['stiker', 'sticker', 'stk'];
    if (exactKeywords.includes(lowerText)) {
        return true;
    }
    
    // Contains keywords (longer phrases - safer to match partially)
    const containsKeywords = [
        'jadiin stiker', 'jadiin sticker', 'bikin stiker', 'bikin sticker',
        'buat stiker', 'buat sticker', 'jadi stiker', 'jadi sticker',
        'stiker dong', 'sticker dong', 'stickernya', 'stikernya',
        'jadikan stiker', 'jadikan sticker', 'convert to sticker',
        'jadi kan stiker', 'jadi kan sticker'
    ];
    
    return containsKeywords.some(kw => lowerText.includes(kw));
};

/**
 * Convert image to WebP sticker format
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} mimetype - Image mimetype
 * @returns {Promise<Buffer>} - WebP sticker buffer
 */
const imageToSticker = async (imageBuffer, mimetype = 'image/jpeg') => {
    await ensureTempDir();
    
    const timestamp = Date.now();
    const ext = mimetype.includes('png') ? 'png' : 'jpg';
    const inputPath = path.join(TEMP_DIR, `input_${timestamp}.${ext}`);
    const outputPath = path.join(TEMP_DIR, `sticker_${timestamp}.webp`);
    
    try {
        // Write input file
        fs.writeFileSync(inputPath, imageBuffer);
        
        // Convert to WebP with proper sticker dimensions (512x512 max)
        // Using ffmpeg for better quality
        await execFileAsync('ffmpeg', [
            '-i', inputPath,
            '-vf', "scale='if(gt(iw,ih),512,-1)':'if(gt(iw,ih),-1,512)',pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000",
            '-c:v', 'libwebp', '-lossless', '0', '-quality', '80', '-loop', '0',
            outputPath, '-y'
        ]);
        
        // Read output
        const stickerBuffer = fs.readFileSync(outputPath);
        
        // Cleanup
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        
        return stickerBuffer;
        
    } catch (error) {
        // Cleanup on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
    }
};

/**
 * Convert video/GIF to animated WebP sticker
 * @param {Buffer} videoBuffer - Video/GIF buffer
 * @param {string} mimetype - Video mimetype
 * @returns {Promise<Buffer>} - Animated WebP sticker buffer
 */
const videoToSticker = async (videoBuffer, mimetype = 'video/mp4') => {
    await ensureTempDir();
    
    const timestamp = Date.now();
    const ext = mimetype.includes('gif') ? 'gif' : 'mp4';
    const inputPath = path.join(TEMP_DIR, `input_${timestamp}.${ext}`);
    const outputPath = path.join(TEMP_DIR, `sticker_${timestamp}.webp`);
    
    try {
        // Write input file
        fs.writeFileSync(inputPath, videoBuffer);
        
        // Convert to animated WebP (max 6 seconds, 10fps for smaller size)
        // WhatsApp animated sticker limit: ~1MB, 512x512
        await execFileAsync('ffmpeg', [
            '-i', inputPath,
            '-t', '6',
            '-vf', "fps=10,scale='if(gt(iw,ih),512,-1)':'if(gt(iw,ih),-1,512)',pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000",
            '-c:v', 'libwebp', '-lossless', '0', '-quality', '60', '-loop', '0',
            '-preset', 'default', '-an',
            outputPath, '-y'
        ]);
        
        // Check file size (WhatsApp limit ~1MB for animated)
        const stats = fs.statSync(outputPath);
        if (stats.size > 1024 * 1024) {
            // Re-encode with lower quality
            await execFileAsync('ffmpeg', [
                '-i', inputPath,
                '-t', '4',
                '-vf', "fps=8,scale='if(gt(iw,ih),400,-1)':'if(gt(iw,ih),-1,400)',pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000",
                '-c:v', 'libwebp', '-lossless', '0', '-quality', '40', '-loop', '0',
                '-preset', 'default', '-an',
                outputPath, '-y'
            ]);
        }
        
        // Read output
        const stickerBuffer = fs.readFileSync(outputPath);
        
        // Cleanup
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        
        return stickerBuffer;
        
    } catch (error) {
        // Cleanup on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        throw error;
    }
};

/**
 * Add EXIF metadata to sticker (pack name & author)
 * Note: Requires wa-sticker-formatter or manual EXIF injection
 * For simplicity, we'll skip this for now
 */
const addStickerMetadata = async (stickerBuffer) => {
    // TODO: Add EXIF metadata for sticker pack name & author
    // This requires additional libraries like wa-sticker-formatter
    return stickerBuffer;
};

/**
 * Send sticker message
 * @param {Object} sock - Baileys socket
 * @param {string} recipient - Recipient JID
 * @param {Buffer} stickerBuffer - WebP sticker buffer
 * @param {Object} options - Options (quoted, etc)
 */
const sendSticker = async (sock, recipient, stickerBuffer, options = {}) => {
    const { quoted } = options;
    
    await sock.sendMessage(recipient, {
        sticker: stickerBuffer
    }, quoted ? { quoted } : {});
};

/**
 * Cleanup temp files
 */
const cleanupTempSticker = async () => {
    try {
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(TEMP_DIR, file));
            }
        }
    } catch (error) {
        // Ignore cleanup errors
    }
};

/**
 * Validate if mimetype is supported image
 */
const validateImage = (mimetype) => {
    const supportedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return supportedImages.includes(mimetype);
};

/**
 * Validate if mimetype is supported video
 */
const validateVideo = (mimetype) => {
    const supportedVideos = ['video/mp4', 'video/webm', 'image/gif'];
    return supportedVideos.includes(mimetype);
};

// Constants
const STICKER_KEYWORDS = ['sticker', 'stiker', 'jadiin sticker', 'bikin stiker', 'buat stiker', 'jadi sticker'];
const STICKER_SIZE = 512;
const MAX_VIDEO_DURATION = 10; // seconds

module.exports = {
    isStickerRequest,
    imageToSticker,
    videoToSticker,
    addStickerMetadata,
    sendSticker,
    cleanupTempSticker,
    validateImage,
    validateVideo,
    STICKER_PACK_NAME,
    STICKER_AUTHOR,
    STICKER_KEYWORDS,
    STICKER_SIZE,
    MAX_VIDEO_DURATION,
    TEMP_DIR
};
