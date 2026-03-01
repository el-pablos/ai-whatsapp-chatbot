/**
 * Capability Registry — centralised dependency map
 *
 * Every "reader" / feature that depends on an external binary
 * or native Node module is listed here with:
 *   - how to detect it,
 *   - what happens when it is missing,
 *   - install hints.
 *
 * Consumed by: doctor.js, autoSetup.js, healthCheck /capabilities endpoint.
 *
 * @author Tama El Pablo
 * @version 1.0.0
 */

const { execSync } = require('child_process');
const path = require('path');

// ─── helpers ────────────────────────────────────────────

/**
 * Check if a system command exists (cross-platform)
 */
const commandExists = (cmd) => {
    try {
        execSync(
            process.platform === 'win32'
                ? `where ${cmd} 2>nul`
                : `which ${cmd} 2>/dev/null || command -v ${cmd} 2>/dev/null`,
            { stdio: 'pipe', timeout: 5000 }
        );
        return true;
    } catch {
        return false;
    }
};

/**
 * Try to require a Node module, return { ok, error }
 */
const moduleLoadable = (mod) => {
    try {
        require(mod);
        return { ok: true, error: null };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

// ─── Registry ───────────────────────────────────────────

/**
 * Each entry:
 *   name       — human-readable capability name
 *   level      — 'required' | 'warn'
 *   feature    — which bot feature depends on it
 *   check()    — returns { ok, detectedAs?, error? }
 *   installHints — array of shell commands to try
 */
const CAPABILITIES = [
    // ═══ Node native modules ═══
    {
        name: 'better-sqlite3',
        level: 'required',
        feature: 'Database (all persistent data)',
        check: () => {
            const r = moduleLoadable('better-sqlite3');
            if (!r.ok && r.error.includes('Could not locate the bindings file')) {
                return { ok: false, error: 'Native binding missing — npm rebuild better-sqlite3 --build-from-source' };
            }
            return r;
        },
        installHints: ['npm rebuild better-sqlite3 --build-from-source'],
    },
    {
        name: 'sharp',
        level: 'required',
        feature: 'Image compression, Vision/media handler',
        check: () => {
            const r = moduleLoadable('sharp');
            return r;
        },
        installHints: ['npm rebuild sharp', 'npm install sharp'],
    },
    {
        name: 'pdf-parse',
        level: 'required',
        feature: 'PDF text extraction (primary)',
        check: () => {
            const r = moduleLoadable('pdf-parse');
            if (r.ok) {
                const m = require('pdf-parse');
                if (typeof m !== 'function' && !(m && m.PDFParse) && !(m && m.default)) {
                    return { ok: false, error: 'pdf-parse loaded but no usable export found' };
                }
            }
            return r;
        },
        installHints: ['npm install pdf-parse'],
    },

    // ═══ System binaries ═══
    {
        name: 'libreoffice',
        level: 'warn',
        feature: 'PPT/PPTX/DOC/ODT/ODS → PDF/text conversion',
        check: () => {
            if (commandExists('libreoffice')) return { ok: true, detectedAs: 'libreoffice' };
            if (commandExists('soffice'))     return { ok: true, detectedAs: 'soffice' };
            return { ok: false, error: 'PPTX uses XML fallback (text only); PPT/DOC/ODT cannot be processed' };
        },
        installHints: ['apt install libreoffice-core libreoffice-impress', 'yum install libreoffice', 'apk add libreoffice'],
    },
    {
        name: 'pdftotext',
        level: 'warn',
        feature: 'PDF fallback extraction (poppler-utils)',
        check: () => {
            if (commandExists('pdftotext')) return { ok: true };
            return { ok: false, error: 'PDF extraction relies on pdf-parse only (no pdftotext fallback)' };
        },
        installHints: ['apt install poppler-utils', 'yum install poppler-utils', 'apk add poppler-utils'],
    },
    {
        name: 'ffmpeg',
        level: 'warn',
        feature: 'Audio/video conversion, sticker creation, voice STT',
        check: () => {
            if (commandExists('ffmpeg')) return { ok: true };
            return { ok: false, error: 'Audio conversion and sticker creation will fail' };
        },
        installHints: ['apt install ffmpeg', 'yum install ffmpeg', 'apk add ffmpeg'],
    },
    {
        name: 'yt-dlp',
        level: 'warn',
        feature: 'YouTube video/audio download',
        check: () => {
            if (commandExists('yt-dlp')) return { ok: true };
            return { ok: false, error: 'YouTube features disabled' };
        },
        installHints: ['pip3 install yt-dlp', 'curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp'],
    },
    {
        name: 'ebook-convert',
        level: 'warn',
        feature: 'Ebook (EPUB/MOBI/AZW/FB2) text extraction',
        check: () => {
            if (commandExists('ebook-convert')) return { ok: true };
            return { ok: false, error: 'Ebook formats cannot be processed' };
        },
        installHints: ['apt install calibre', 'yum install calibre'],
    },
    {
        name: 'djvutxt',
        level: 'warn',
        feature: 'DJVU document text extraction',
        check: () => {
            if (commandExists('djvutxt')) return { ok: true };
            return { ok: false, error: 'DJVU files cannot be processed' };
        },
        installHints: ['apt install djvulibre-bin', 'yum install djvulibre'],
    },
    {
        name: 'unrar',
        level: 'warn',
        feature: 'RAR archive listing/extraction',
        check: () => {
            if (commandExists('unrar')) return { ok: true };
            return { ok: false, error: 'RAR archives show placeholder instead of file list' };
        },
        installHints: ['apt install unrar', 'yum install unrar'],
    },
    {
        name: '7z',
        level: 'warn',
        feature: '7z archive listing/extraction',
        check: () => {
            if (commandExists('7z')) return { ok: true };
            return { ok: false, error: '7z archives show placeholder instead of file list' };
        },
        installHints: ['apt install p7zip-full', 'yum install p7zip'],
    },
    {
        name: 'tar',
        level: 'warn',
        feature: 'TAR/GZ/BZ2/XZ archive listing',
        check: () => {
            if (commandExists('tar')) return { ok: true };
            return { ok: false, error: 'TAR archives cannot be listed' };
        },
        installHints: ['apt install tar'],
    },
    {
        name: 'unzip',
        level: 'warn',
        feature: 'ZIP archive fallback listing (AdmZip is primary)',
        check: () => {
            if (commandExists('unzip')) return { ok: true };
            return { ok: false, error: 'ZIP fallback via unzip command unavailable (AdmZip still works)' };
        },
        installHints: ['apt install unzip', 'yum install unzip'],
    },
    {
        name: 'zcat',
        level: 'warn',
        feature: 'GZ file decompression',
        check: () => {
            if (commandExists('zcat')) return { ok: true };
            return { ok: false, error: '.gz files cannot be decompressed' };
        },
        installHints: ['apt install gzip'],
    },
    {
        name: 'git',
        level: 'warn',
        feature: 'Auto git pull on restart',
        check: () => {
            if (commandExists('git')) return { ok: true };
            return { ok: false, error: 'Auto git pull disabled' };
        },
        installHints: ['apt install git'],
    },
];

// ─── Runners ────────────────────────────────────────────

/**
 * Run all capability checks.
 * Returns array of { name, level, feature, ok, detectedAs?, error?, installHints }
 */
const checkAll = () => {
    return CAPABILITIES.map(cap => {
        const result = cap.check();
        return {
            name: cap.name,
            level: cap.level,
            feature: cap.feature,
            ok: result.ok,
            detectedAs: result.detectedAs || null,
            error: result.error || null,
            installHints: cap.installHints,
        };
    });
};

/**
 * Run checks and return a simple summary object.
 * { total, ok, warn, fail, results[] }
 */
const getSummary = () => {
    const results = checkAll();
    return {
        total: results.length,
        ok: results.filter(r => r.ok).length,
        warn: results.filter(r => !r.ok && r.level === 'warn').length,
        fail: results.filter(r => !r.ok && r.level === 'required').length,
        results,
    };
};

module.exports = {
    CAPABILITIES,
    checkAll,
    getSummary,
    commandExists,
    moduleLoadable,
};
