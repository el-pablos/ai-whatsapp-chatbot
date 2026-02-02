/**
 * YouTube Handler Module
 * Download YouTube videos as MP3 or MP4 using yt-dlp
 * 
 * Features:
 * - YouTube link detection
 * - Video info extraction with AI analysis
 * - MP3 audio download
 * - MP4 video download
 * - Interactive button selection
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Constants
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141/v1/chat/completions';
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const MAX_DURATION = 30 * 60; // 30 minutes max
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB WhatsApp limit

// YouTube URL patterns
const YOUTUBE_PATTERNS = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
];

/**
 * Ensure download directory exists
 */
const ensureDownloadDir = async () => {
    try {
        await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    } catch (error) {
        // Directory exists
    }
};

/**
 * Detect if text contains YouTube URL
 * @param {string} text - Text to check
 * @returns {Object|null} - YouTube info or null
 */
const detectYoutubeUrl = (text) => {
    for (const pattern of YOUTUBE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return {
                videoId: match[1],
                url: match[0].startsWith('http') ? match[0] : `https://${match[0]}`
            };
        }
    }
    return null;
};

/**
 * Get video info using yt-dlp
 * @param {string} url - YouTube URL
 * @returns {Promise<Object>} - Video information
 */
const getVideoInfo = async (url) => {
    try {
        const { stdout } = await execAsync(
            `yt-dlp --dump-json --no-warnings "${url}"`,
            { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
        );
        
        const info = JSON.parse(stdout);
        
        return {
            success: true,
            id: info.id,
            title: info.title,
            duration: info.duration,
            durationString: formatDuration(info.duration),
            thumbnail: info.thumbnail,
            channel: info.channel || info.uploader,
            viewCount: info.view_count,
            likeCount: info.like_count,
            uploadDate: info.upload_date,
            description: info.description?.substring(0, 500) || '',
            url: url
        };
    } catch (error) {
        console.error('[YouTube] Get info error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Format duration in seconds to human readable
 * @param {number} seconds 
 * @returns {string}
 */
const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hours}:${String(remainMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

/**
 * Get AI analysis of video
 * @param {Object} videoInfo - Video information
 * @returns {Promise<string>} - AI description
 */
const getVideoAnalysisAI = async (videoInfo) => {
    try {
        const systemPrompt = `Lo adalah Tama, AI yang bisa ngasih info tentang video YouTube.
Personality: santai, gaul Jakarta, informatif tapi fun.

Tugas lo: Kasih ringkasan info video dengan gaya yang asik.
Include: judul, channel, durasi, views, dan preview deskripsi.
Pake emoji biar seru! 🎬✨`;

        const userMessage = `Kasih info tentang video YouTube ini:
- Judul: ${videoInfo.title}
- Channel: ${videoInfo.channel}
- Durasi: ${videoInfo.durationString}
- Views: ${videoInfo.viewCount ? videoInfo.viewCount.toLocaleString() : 'N/A'}
- Likes: ${videoInfo.likeCount ? videoInfo.likeCount.toLocaleString() : 'N/A'}
- Upload: ${videoInfo.uploadDate || 'N/A'}
- Deskripsi: ${videoInfo.description || 'Tidak ada deskripsi'}`;

        const response = await axios.post(COPILOT_API_URL, {
            model: 'claude-sonnet-4-20250514',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 500,
            temperature: 0.7
        }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });

        return response.data.choices[0].message.content;

    } catch (error) {
        console.error('[YouTube] AI analysis error:', error.message);
        // Fallback to basic info
        return `🎬 *${videoInfo.title}*\n\n📺 Channel: ${videoInfo.channel}\n⏱️ Durasi: ${videoInfo.durationString}\n👁️ Views: ${videoInfo.viewCount?.toLocaleString() || 'N/A'}`;
    }
};

/**
 * Download YouTube video as MP3
 * @param {string} url - YouTube URL
 * @param {string} videoId - Video ID for filename
 * @returns {Promise<Object>} - Download result
 */
const downloadAsMP3 = async (url, videoId) => {
    await ensureDownloadDir();
    
    const outputPath = path.join(DOWNLOAD_DIR, `${videoId}.mp3`);
    
    try {
        // Check duration first
        const info = await getVideoInfo(url);
        if (info.success && info.duration > MAX_DURATION) {
            return {
                success: false,
                error: `Video terlalu panjang (${info.durationString}). Max 30 menit ya bro!`
            };
        }

        console.log(`[YouTube] Downloading MP3: ${url}`);
        
        // Download with yt-dlp
        const { stdout, stderr } = await execAsync(
            `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" --no-playlist --max-filesize 50M "${url}"`,
            { timeout: 300000 } // 5 min timeout
        );

        // Check if file exists
        const stats = await fs.stat(outputPath);
        
        if (stats.size > MAX_FILE_SIZE) {
            await fs.unlink(outputPath).catch(() => {});
            return {
                success: false,
                error: 'File terlalu besar untuk dikirim via WhatsApp (max 50MB)'
            };
        }

        return {
            success: true,
            filePath: outputPath,
            filename: `${videoId}.mp3`,
            size: stats.size,
            title: info.title || videoId
        };

    } catch (error) {
        console.error('[YouTube] MP3 download error:', error.message);
        // Cleanup
        await fs.unlink(outputPath).catch(() => {});
        return {
            success: false,
            error: error.message.includes('max-filesize') 
                ? 'File terlalu besar (max 50MB)'
                : 'Gagal download audio'
        };
    }
};

/**
 * Download YouTube video as MP4
 * @param {string} url - YouTube URL
 * @param {string} videoId - Video ID for filename
 * @returns {Promise<Object>} - Download result
 */
const downloadAsMP4 = async (url, videoId) => {
    await ensureDownloadDir();
    
    const outputPath = path.join(DOWNLOAD_DIR, `${videoId}.mp4`);
    
    try {
        // Check duration first
        const info = await getVideoInfo(url);
        if (info.success && info.duration > MAX_DURATION) {
            return {
                success: false,
                error: `Video terlalu panjang (${info.durationString}). Max 30 menit ya bro!`
            };
        }

        console.log(`[YouTube] Downloading MP4: ${url}`);
        
        // Download best quality under 50MB
        const { stdout, stderr } = await execAsync(
            `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" --no-playlist --max-filesize 50M "${url}"`,
            { timeout: 600000 } // 10 min timeout
        );

        // Check if file exists
        const stats = await fs.stat(outputPath);
        
        if (stats.size > MAX_FILE_SIZE) {
            await fs.unlink(outputPath).catch(() => {});
            return {
                success: false,
                error: 'File terlalu besar untuk dikirim via WhatsApp (max 50MB)'
            };
        }

        return {
            success: true,
            filePath: outputPath,
            filename: `${videoId}.mp4`,
            size: stats.size,
            title: info.title || videoId
        };

    } catch (error) {
        console.error('[YouTube] MP4 download error:', error.message);
        // Cleanup
        await fs.unlink(outputPath).catch(() => {});
        return {
            success: false,
            error: error.message.includes('max-filesize')
                ? 'File terlalu besar (max 50MB)'
                : 'Gagal download video'
        };
    }
};

/**
 * Cleanup downloaded file
 * @param {string} filePath 
 */
const cleanupFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
        console.log(`[YouTube] Cleaned up: ${filePath}`);
    } catch (error) {
        // Ignore cleanup errors
    }
};

/**
 * Generate format selection buttons for WhatsApp
 * @param {string} videoId - Video ID
 * @returns {Object} - Button configuration
 */
const generateFormatButtons = (videoId) => {
    return {
        text: 'Mau download format apa?',
        footer: 'Pilih format di bawah',
        buttons: [
            { buttonId: `yt_mp3_${videoId}`, buttonText: { displayText: '🎵 MP3 (Audio)' }, type: 1 },
            { buttonId: `yt_mp4_${videoId}`, buttonText: { displayText: '🎬 MP4 (Video)' }, type: 1 }
        ],
        headerType: 1
    };
};

/**
 * Generate interactive list for format selection
 * @param {string} videoId - Video ID
 * @param {string} title - Video title
 * @returns {Object} - List message configuration
 */
const generateFormatList = (videoId, title) => {
    return {
        text: `📥 *Download Options*\n\n🎬 ${title}\n\nPilih format yang lo mau:`,
        buttonText: 'Pilih Format',
        sections: [
            {
                title: 'Format Download',
                rows: [
                    {
                        title: '🎵 MP3 (Audio Only)',
                        rowId: `yt_mp3_${videoId}`,
                        description: 'Download audio aja, ukuran lebih kecil'
                    },
                    {
                        title: '🎬 MP4 (Full Video)',
                        rowId: `yt_mp4_${videoId}`,
                        description: 'Download video lengkap dengan audio'
                    }
                ]
            }
        ]
    };
};

/**
 * Parse button/list response to get format and video ID
 * @param {string} responseId - Button/list response ID
 * @returns {Object|null}
 */
const parseFormatResponse = (responseId) => {
    const mp3Match = responseId.match(/^yt_mp3_([a-zA-Z0-9_-]{11})$/);
    if (mp3Match) {
        return { format: 'mp3', videoId: mp3Match[1] };
    }
    
    const mp4Match = responseId.match(/^yt_mp4_([a-zA-Z0-9_-]{11})$/);
    if (mp4Match) {
        return { format: 'mp4', videoId: mp4Match[1] };
    }
    
    return null;
};

/**
 * Check if yt-dlp is installed
 * @returns {Promise<boolean>}
 */
const isYtDlpInstalled = async () => {
    try {
        await execAsync('which yt-dlp');
        return true;
    } catch {
        return false;
    }
};

/**
 * Process YouTube URL - get info and show format options
 * @param {string} url - YouTube URL
 * @returns {Promise<Object>}
 */
const processYoutubeUrl = async (url) => {
    // Get video info
    const info = await getVideoInfo(url);
    
    if (!info.success) {
        return {
            success: false,
            error: 'Gagal ambil info video',
            message: 'duh ga bisa akses video nya bro 😓 mungkin private atau dihapus'
        };
    }

    // Check duration
    if (info.duration > MAX_DURATION) {
        return {
            success: false,
            error: 'Video too long',
            message: `waduh video nya kepanjangan bro (${info.durationString}) 😅 max 30 menit ya`
        };
    }

    // Get AI analysis
    const analysis = await getVideoAnalysisAI(info);

    return {
        success: true,
        info,
        analysis,
        formatOptions: generateFormatList(info.id, info.title)
    };
};

module.exports = {
    detectYoutubeUrl,
    getVideoInfo,
    getVideoAnalysisAI,
    downloadAsMP3,
    downloadAsMP4,
    cleanupFile,
    generateFormatButtons,
    generateFormatList,
    parseFormatResponse,
    isYtDlpInstalled,
    processYoutubeUrl,
    formatDuration,
    ensureDownloadDir,
    YOUTUBE_PATTERNS,
    MAX_DURATION,
    MAX_FILE_SIZE,
    DOWNLOAD_DIR
};
