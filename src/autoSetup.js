/**
 * Auto Setup — runs BEFORE any npm module is loaded
 *
 * Uses ONLY Node.js built-ins (child_process, fs, path) so it works
 * even when node_modules is missing.
 *
 * What it does (synchronously, on every boot):
 *  1. npm install --production   (skips if node_modules is fresh)
 *  2. Install yt-dlp             (skips if already installed)
 *  3. Install ffmpeg             (skips if already installed)
 *  4. Create required dirs       (logs, downloads, auth_info_baileys)
 *
 * Safe to run repeatedly — fast no-op when everything is installed.
 *
 * @author Tama El Pablo
 * @version 1.0.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const log = (msg) => console.log(`[AutoSetup] ${msg}`);
const warn = (msg) => console.warn(`[AutoSetup] ⚠️  ${msg}`);

/**
 * Run a shell command synchronously, return success/failure
 */
const run = (cmd, opts = {}) => {
    try {
        execSync(cmd, {
            cwd: PROJECT_DIR,
            stdio: 'pipe',
            timeout: opts.timeout || 120000, // 2 min default
            env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' },
            ...opts,
        });
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Check if a system command exists
 */
const commandExists = (cmd) => {
    try {
        execSync(`which ${cmd} 2>/dev/null || command -v ${cmd} 2>/dev/null`, {
            stdio: 'pipe',
            timeout: 5000,
        });
        return true;
    } catch {
        return false;
    }
};

/**
 * Get version string of a command (or null)
 */
const getVersion = (cmd) => {
    try {
        return execSync(`${cmd} --version 2>/dev/null`, {
            stdio: 'pipe',
            timeout: 5000,
        }).toString().trim().split('\n')[0];
    } catch {
        return null;
    }
};

// ═══════════════════════════════════════════════════════════
// 1. NPM INSTALL
// ═══════════════════════════════════════════════════════════

const ensureNpmDeps = () => {
    const nodeModules = path.join(PROJECT_DIR, 'node_modules');
    const packageJson = path.join(PROJECT_DIR, 'package.json');
    const lockMarker = path.join(nodeModules, '.package-lock.json');

    // Skip if node_modules exists and is newer than package.json
    if (fs.existsSync(lockMarker)) {
        try {
            const pkgMtime = fs.statSync(packageJson).mtimeMs;
            const lockMtime = fs.statSync(lockMarker).mtimeMs;
            if (lockMtime >= pkgMtime) {
                log('npm dependencies up to date ✅');
                return;
            }
        } catch {
            // Fall through to install
        }
    }

    log('Running npm install --production ...');
    const ok = run('npm install --production --no-audit --no-fund', { 
        timeout: 180000,  // 3 min for npm install
        stdio: 'inherit', // Show npm output in PM2 logs
    });
    if (ok) {
        log('npm install complete ✅');
    } else {
        warn('npm install failed — some modules may be missing');
    }
};

// ═══════════════════════════════════════════════════════════
// 2. YT-DLP
// ═══════════════════════════════════════════════════════════

const ensureYtDlp = () => {
    if (commandExists('yt-dlp')) {
        const ver = getVersion('yt-dlp') || 'installed';
        log(`yt-dlp: ${ver} ✅`);
        return;
    }

    log('Installing yt-dlp ...');

    // Method 1: pip3 install (best — auto-updates)
    if (commandExists('pip3')) {
        const ok = run('pip3 install --quiet --break-system-packages yt-dlp 2>/dev/null || pip3 install --quiet yt-dlp', {
            timeout: 120000,
        });
        if (ok && commandExists('yt-dlp')) {
            log('yt-dlp installed via pip3 ✅');
            return;
        }
    }

    // Method 2: Direct binary download (no Python needed)
    log('Trying binary download ...');
    const ok = run(
        'curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp',
        { timeout: 60000 }
    );
    if (ok && commandExists('yt-dlp')) {
        log('yt-dlp installed via binary ✅');
        return;
    }

    // Method 3: apt (some distros have it)
    if (commandExists('apt-get')) {
        run('apt-get update -qq 2>/dev/null && apt-get install -y -qq yt-dlp 2>/dev/null', {
            timeout: 120000,
        });
        if (commandExists('yt-dlp')) {
            log('yt-dlp installed via apt ✅');
            return;
        }
    }

    warn('yt-dlp could not be installed — YouTube features will be disabled');
};

// ═══════════════════════════════════════════════════════════
// 3. FFMPEG
// ═══════════════════════════════════════════════════════════

const ensureFfmpeg = () => {
    if (commandExists('ffmpeg')) {
        log('ffmpeg: installed ✅');
        return;
    }

    log('Installing ffmpeg ...');

    if (commandExists('apt-get')) {
        const ok = run('apt-get update -qq 2>/dev/null && apt-get install -y -qq ffmpeg 2>/dev/null', {
            timeout: 180000, // ffmpeg is big
        });
        if (ok && commandExists('ffmpeg')) {
            log('ffmpeg installed via apt ✅');
            return;
        }
    }

    if (commandExists('yum')) {
        run('yum install -y -q ffmpeg 2>/dev/null', { timeout: 180000 });
        if (commandExists('ffmpeg')) {
            log('ffmpeg installed via yum ✅');
            return;
        }
    }

    if (commandExists('apk')) {
        run('apk add --quiet ffmpeg 2>/dev/null', { timeout: 120000 });
        if (commandExists('ffmpeg')) {
            log('ffmpeg installed via apk ✅');
            return;
        }
    }

    warn('ffmpeg could not be installed — audio conversion will use @ffmpeg-installer fallback');
};

// ═══════════════════════════════════════════════════════════
// 3b. PDFTOTEXT (poppler-utils) — PDF fallback extraction
// ═══════════════════════════════════════════════════════════

const ensurePdftotext = () => {
    if (commandExists('pdftotext')) {
        log('pdftotext: installed ✅');
        return;
    }

    log('Installing poppler-utils (pdftotext)...');

    if (commandExists('apt-get')) {
        const ok = run('apt-get update -qq 2>/dev/null && apt-get install -y -qq poppler-utils 2>/dev/null', {
            timeout: 120000,
        });
        if (ok && commandExists('pdftotext')) {
            log('pdftotext installed via apt ✅');
            return;
        }
    }

    if (commandExists('yum')) {
        run('yum install -y -q poppler-utils 2>/dev/null', { timeout: 120000 });
        if (commandExists('pdftotext')) {
            log('pdftotext installed via yum ✅');
            return;
        }
    }

    if (commandExists('apk')) {
        run('apk add --quiet poppler-utils 2>/dev/null', { timeout: 120000 });
        if (commandExists('pdftotext')) {
            log('pdftotext installed via apk ✅');
            return;
        }
    }

    warn('pdftotext not available — PDF extraction will rely on pdf-parse only');
};

// ═══════════════════════════════════════════════════════════
// 4. REQUIRED DIRECTORIES
// ═══════════════════════════════════════════════════════════

const ensureDirectories = () => {
    const dirs = ['logs', 'downloads', 'auth_info_baileys', 'data'];
    for (const dir of dirs) {
        const fullPath = path.join(PROJECT_DIR, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            log(`Created directory: ${dir}/`);
        }
    }
};

// ═══════════════════════════════════════════════════════════
// RUN EVERYTHING
// ═══════════════════════════════════════════════════════════

const runAutoSetup = () => {
    // Only run on Linux (production server), skip on Windows (dev)
    if (process.platform === 'win32') {
        return;
    }

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║          🚀 AUTO-SETUP — checking dependencies...        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    const start = Date.now();

    try {
        ensureDirectories();
        ensureNpmDeps();
        ensureYtDlp();
        ensureFfmpeg();
        ensurePdftotext();
    } catch (e) {
        warn(`Unexpected error: ${e.message}`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    // Summary
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║          📋 AUTO-SETUP COMPLETE                          ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  yt-dlp    : ${commandExists('yt-dlp') ? '✅ ready' : '❌ missing'}                                    ║`);
    console.log(`║  ffmpeg    : ${commandExists('ffmpeg') ? '✅ ready' : '❌ missing'}                                    ║`);
    console.log(`║  pdftotext : ${commandExists('pdftotext') ? '✅ ready' : '❌ missing'}                                    ║`);
    console.log(`║  elapsed   : ${elapsed}s                                          ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
};

// Execute immediately when required
runAutoSetup();

module.exports = { runAutoSetup, commandExists, getVersion, ensurePdftotext };
