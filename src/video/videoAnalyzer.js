/**
 * Video Analyzer — comprehensive video analysis controller
 *
 * Main entry point for video analysis features:
 * - Fetch video metadata + transcript via yt-dlp
 * - Run timestamp extraction
 * - Generate notes with AI
 * - Format final output
 *
 * @author Tama El Pablo
 */

const { detectYoutubeUrl, processYoutubeUrl } = require('../youtubeHandler');
const { extractTimestamps } = require('./timestampExtractor');
const { cleanTranscript, parseSRT, mergeSegments, getPlainText } = require('./transcriptParser');
const { generateVideoNotes } = require('./videoNoteGenerator');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'downloads');

// ═══════════════════════════════════════════════════════════
//  IN-MEMORY CACHE — avoid re-processing same videos
// ═══════════════════════════════════════════════════════════
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 50;
const _notesCache = new Map();

const getCachedNotes = (videoId) => {
    const entry = _notesCache.get(videoId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        _notesCache.delete(videoId);
        return null;
    }
    return entry.data;
};

const setCachedNotes = (videoId, data) => {
    if (_notesCache.size >= MAX_CACHE_SIZE) {
        const oldest = [..._notesCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldest) _notesCache.delete(oldest[0]);
    }
    _notesCache.set(videoId, { data, timestamp: Date.now() });
};

/**
 * Analyze a YouTube video and generate notes
 *
 * @param {string} url - YouTube URL
 * @param {object} options
 * @param {boolean} options.includeTranscript - include raw transcript (default false)
 * @param {boolean} options.chaptersOnly - only return chapters (default false)
 * @returns {Promise<{ success: boolean, notes: string, error?: string }>}
 */
const analyzeVideo = async (url, options = {}) => {
    const { includeTranscript = false, chaptersOnly = false } = options;

    try {
        // 1. Validate YouTube URL
        const detected = detectYoutubeUrl(url);
        if (!detected) {
            return { success: false, notes: '', error: 'URL bukan YouTube yang valid' };
        }

        // 1b. Check cache
        const cacheKey = `${detected.videoId}_${chaptersOnly ? 'ch' : 'full'}`;
        const cached = getCachedNotes(cacheKey);
        if (cached) return cached;

        // 2. Get video info
        const videoInfo = await getVideoMetadata(detected.videoId);
        if (!videoInfo.success) {
            return { success: false, notes: '', error: videoInfo.error || 'Gagal ambil info video' };
        }

        // 3. Try to get transcript
        const transcript = await fetchTranscript(detected.videoId);

        // 4. If chapters only mode
        if (chaptersOnly) {
            const timestamps = extractTimestamps(videoInfo.description || '');
            if (timestamps.length === 0) {
                return { success: true, notes: 'Video ini tidak punya chapters/timestamp di deskripsi.' };
            }
            const { generateChaptersSummary } = require('./timestampExtractor');
            return { success: true, notes: generateChaptersSummary(timestamps, videoInfo.duration) };
        }

        // 5. Generate full notes
        const result = await generateVideoNotes({
            title: videoInfo.title,
            description: videoInfo.description,
            transcript: transcript || '',
            duration: videoInfo.duration,
            channel: videoInfo.channel,
            url,
        });

        let output = result.fullNotes;

        // 6. Optionally include transcript
        if (includeTranscript && transcript) {
            output += `\n\n📜 *Transcript*\n\n${transcript.substring(0, 3000)}`;
            if (transcript.length > 3000) output += '\n...(terpotong)';
        }

        const finalResult = { success: true, notes: output };
        setCachedNotes(cacheKey, finalResult);
        return finalResult;
    } catch (err) {
        console.error('[VideoAnalyzer] Error:', err.message);
        return { success: false, notes: '', error: err.message };
    }
};

/**
 * Get video metadata via yt-dlp
 */
const getVideoMetadata = async (videoId) => {
    try {
        const { stdout } = await execFileAsync('yt-dlp', [
            '--dump-json',
            '--no-download',
            `https://www.youtube.com/watch?v=${videoId}`,
        ], { timeout: 30000 });

        const info = JSON.parse(stdout);
        return {
            success: true,
            title: info.title || '',
            description: info.description || '',
            duration: info.duration || 0,
            channel: info.uploader || info.channel || '',
            thumbnail: info.thumbnail || '',
            viewCount: info.view_count || 0,
            uploadDate: info.upload_date || '',
        };
    } catch (err) {
        console.error('[VideoAnalyzer] yt-dlp metadata failed:', err.message);
        return { success: false, error: 'yt-dlp gagal: ' + err.message };
    }
};

/**
 * Fetch transcript via yt-dlp subtitle download
 */
const fetchTranscript = async (videoId) => {
    const subtitlePath = path.join(TEMP_DIR, `${videoId}.id.vtt`);
    const subtitlePathEn = path.join(TEMP_DIR, `${videoId}.en.vtt`);

    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });

        // Try auto-generated subtitles first (Indonesian, then English)
        try {
            await execFileAsync('yt-dlp', [
                '--write-auto-sub',
                '--sub-lang', 'id,en',
                '--skip-download',
                '--sub-format', 'vtt',
                '-o', path.join(TEMP_DIR, `${videoId}`),
                `https://www.youtube.com/watch?v=${videoId}`,
            ], { timeout: 30000 });
        } catch {
            // subtitles might not be available
        }

        // Check for Indonesian subtitle first, then English
        let vttContent = '';
        for (const p of [subtitlePath, subtitlePathEn]) {
            try {
                vttContent = await fs.readFile(p, 'utf-8');
                if (vttContent) break;
            } catch {
                // file doesn't exist
            }
        }

        if (!vttContent) return null;

        // Parse VTT and extract plain text
        const { parseVTT } = require('./transcriptParser');
        const segments = parseVTT(vttContent);
        const merged = mergeSegments(segments, 3);
        return getPlainText(merged);
    } catch (err) {
        console.error('[VideoAnalyzer] Transcript fetch failed:', err.message);
        return null;
    } finally {
        // Cleanup subtitle files
        for (const p of [subtitlePath, subtitlePathEn]) {
            try { await fs.unlink(p); } catch { /* ignore */ }
        }
    }
};

module.exports = {
    analyzeVideo,
    getVideoMetadata,
    fetchTranscript,
    getCachedNotes,
    setCachedNotes,
    _notesCache,
};
