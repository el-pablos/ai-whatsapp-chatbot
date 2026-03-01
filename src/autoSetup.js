/**
 * Auto Setup — runs BEFORE any npm module is loaded
 *
 * Uses ONLY Node.js built-ins (child_process, fs, path, crypto) so it works
 * even when node_modules is missing.
 *
 * What it does (synchronously, on every boot):
 *  0. git pull origin master (fast-forward only, if enabled)
 *  1. npm install --production   (skips if deps hash unchanged)
 *  2. Install yt-dlp             (skips if already installed)
 *  3. Install ffmpeg             (skips if already installed)
 *  4. Install pdftotext          (skips if already installed)
 *  5. Install LibreOffice        (gated behind env var)
 *  6. Create required dirs       (logs, downloads, auth_info_baileys)
 *  7. pm2 save                   (if running under PM2)
 *
 * Safe to run repeatedly — fast no-op when everything is installed.
 *
 * @author Tama El Pablo
 * @version 2.0.0
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
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
// 0. GIT PULL (fast-forward only)
// ═══════════════════════════════════════════════════════════

const ensureGitPull = () => {
    // Gating: AUTO_GIT_PULL defaults to '1' (ON)
    if (process.env.AUTO_GIT_PULL === '0') {
        log('git pull disabled (AUTO_GIT_PULL=0)');
        return;
    }

    // Must have .git folder
    if (!fs.existsSync(path.join(PROJECT_DIR, '.git'))) {
        log('Not a git repo — skip git pull');
        return;
    }

    if (!commandExists('git')) {
        warn('git not found — skip git pull');
        return;
    }

    const branch = process.env.AUTO_GIT_BRANCH || 'master';

    try {
        log(`git pull origin ${branch} (fast-forward only)...`);
        execSync(`git fetch origin ${branch} --quiet`, {
            cwd: PROJECT_DIR,
            stdio: 'pipe',
            timeout: 30000,
        });
        execSync(`git merge --ff-only origin/${branch}`, {
            cwd: PROJECT_DIR,
            stdio: 'pipe',
            timeout: 15000,
        });
        log(`git pull origin ${branch} ✅`);
    } catch (e) {
        const msg = (e.stdout || e.stderr || e.message || '').toString().trim();
        if (msg.includes('Already up to date')) {
            log(`Already up to date ✅`);
        } else {
            warn(`git pull failed (safe — continuing with current version): ${msg.substring(0, 200)}`);
        }
    }
};

// ═══════════════════════════════════════════════════════════
// 1. NPM INSTALL (hash-based freshness check)
// ═══════════════════════════════════════════════════════════

/**
 * Compute MD5 hash of a file (fast, no security concern)
 */
const fileHash = (filePath) => {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    } catch {
        return null;
    }
};

const ensureNpmDeps = () => {
    const nodeModules = path.join(PROJECT_DIR, 'node_modules');
    const packageJson = path.join(PROJECT_DIR, 'package.json');
    const packageLock = path.join(PROJECT_DIR, 'package-lock.json');
    const hashMarker = path.join(nodeModules, '.deps-hash');

    // Compute current hash from package.json + package-lock.json
    const pkgHash = fileHash(packageJson) || '';
    const lockHash = fileHash(packageLock) || '';
    const currentHash = `${pkgHash}:${lockHash}`;

    // Skip if hash matches
    if (fs.existsSync(hashMarker)) {
        try {
            const storedHash = fs.readFileSync(hashMarker, 'utf-8').trim();
            if (storedHash === currentHash && fs.existsSync(nodeModules)) {
                log('npm dependencies up to date ✅');
                return;
            }
        } catch {
            // Fall through to install
        }
    }

    // node_modules missing entirely
    if (!fs.existsSync(nodeModules)) {
        log('node_modules missing — running npm install...');
    } else {
        log('package.json or package-lock.json changed — running npm install...');
    }

    const ok = run('npm install --omit=dev --no-audit --no-fund', {
        timeout: 180000,  // 3 min for npm install
        stdio: 'inherit', // Show npm output in PM2 logs
    });
    if (ok) {
        // Write hash marker after successful install
        try {
            fs.writeFileSync(hashMarker, currentHash, 'utf-8');
        } catch { /* non-critical */ }
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
// 3c. LIBREOFFICE (optional, gated behind env var)
// ═══════════════════════════════════════════════════════════

const ensureLibreOffice = () => {
    // Check if already available (libreoffice or soffice)
    if (commandExists('libreoffice') || commandExists('soffice')) {
        const which = commandExists('libreoffice') ? 'libreoffice' : 'soffice';
        log(`LibreOffice: ${which} installed ✅`);
        return;
    }

    // Gated behind env var — LibreOffice is heavy (~200MB+)
    if (process.env.AUTOSETUP_INSTALL_LIBREOFFICE !== '1') {
        warn('LibreOffice missing — PPT/PPTX will use fallback XML parser (teks only). ' +
             'Install manual: apt install libreoffice-core libreoffice-impress, ' +
             'atau set AUTOSETUP_INSTALL_LIBREOFFICE=1 untuk auto-install.');
        return;
    }

    log('Installing LibreOffice (env AUTOSETUP_INSTALL_LIBREOFFICE=1)...');

    if (commandExists('apt-get')) {
        const ok = run('apt-get update -qq 2>/dev/null && apt-get install -y -qq libreoffice-core libreoffice-impress 2>/dev/null', {
            timeout: 600000, // 10 min — LO is big
        });
        if (ok && (commandExists('libreoffice') || commandExists('soffice'))) {
            log('LibreOffice installed via apt ✅');
            return;
        }
    }

    if (commandExists('yum') || commandExists('dnf')) {
        const pm = commandExists('dnf') ? 'dnf' : 'yum';
        run(`${pm} install -y -q libreoffice-core libreoffice-impress 2>/dev/null`, { timeout: 600000 });
        if (commandExists('libreoffice') || commandExists('soffice')) {
            log(`LibreOffice installed via ${pm} ✅`);
            return;
        }
    }

    if (commandExists('apk')) {
        run('apk add --quiet libreoffice 2>/dev/null', { timeout: 600000 });
        if (commandExists('libreoffice') || commandExists('soffice')) {
            log('LibreOffice installed via apk ✅');
            return;
        }
    }

    warn('LibreOffice could not be installed — PPT/PPTX will use fallback XML parser');
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
// 5. PM2 SAVE
// ═══════════════════════════════════════════════════════════

const ensurePm2Save = () => {
    // Disable via env var
    if (process.env.AUTO_PM2_SAVE === '0') {
        log('pm2 save disabled (AUTO_PM2_SAVE=0)');
        return;
    }

    // Only run if we are inside a PM2 process
    if (!process.env.pm_id) {
        return; // Not running under PM2
    }

    if (!commandExists('pm2')) {
        return; // pm2 binary not found
    }

    const ok = run('pm2 save', { timeout: 15000 });
    if (ok) {
        log('pm2 save ✅');
    } else {
        warn('pm2 save failed (non-critical)');
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
        ensureGitPull();
        ensureDirectories();
        ensureNpmDeps();
        ensureYtDlp();
        ensureFfmpeg();
        ensurePdftotext();
        ensureLibreOffice();
        ensurePm2Save();
    } catch (e) {
        warn(`Unexpected error: ${e.message}`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    // Summary
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║          📋 AUTO-SETUP COMPLETE                          ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  git pull    : ${commandExists('git') ? '✅' : '—'}                                              ║`);
    console.log(`║  yt-dlp      : ${commandExists('yt-dlp') ? '✅ ready' : '❌ missing'}                                    ║`);
    console.log(`║  ffmpeg      : ${commandExists('ffmpeg') ? '✅ ready' : '❌ missing'}                                    ║`);
    console.log(`║  pdftotext   : ${commandExists('pdftotext') ? '✅ ready' : '❌ missing'}                                    ║`);
    console.log(`║  libreoffice : ${(commandExists('libreoffice') || commandExists('soffice')) ? '✅ ready' : '⚠️ missing (fallback)'}                             ║`);
    console.log(`║  pm2 save    : ${process.env.pm_id ? '✅' : '— (not PM2)'}                                       ║`);
    console.log(`║  elapsed     : ${elapsed}s                                          ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
};

// Execute immediately when required
runAutoSetup();

module.exports = {
    runAutoSetup,
    commandExists,
    getVersion,
    ensureGitPull,
    ensureNpmDeps,
    ensurePdftotext,
    ensureLibreOffice,
    ensurePm2Save,
    fileHash,
};
