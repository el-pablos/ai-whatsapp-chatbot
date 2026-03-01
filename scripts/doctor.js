#!/usr/bin/env node
/**
 * Doctor Check — Standalone health diagnostic
 *
 * Verifies that all modules load, exports are present,
 * and external dependencies are detectable (via capabilities registry).
 * 
 * Runs with plain `node` (no Jest needed).
 *
 * Usage:  node scripts/doctor.js
 *         npm run doctor
 *
 * @author Tama El Pablo
 * @version 2.0.0
 */

const path = require('path');
const { execSync } = require('child_process');

const SRC = path.resolve(__dirname, '..', 'src');
let passed = 0;
let failed = 0;
const failures = [];

// ─── Helpers ────────────────────────────────────────────

function check(label, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✅  ${label}`);
    } catch (e) {
        failed++;
        const msg = e.message || String(e);
        failures.push({ label, msg });
        console.log(`  ❌  ${label} — ${msg}`);
    }
}

function requireSrc(mod) {
    return require(path.join(SRC, mod));
}

function commandExists(cmd) {
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
}

// ─── Module checks ──────────────────────────────────────

console.log('\n🩺 Doctor Check — Module Loading\n');

check('aiHandler loads (fetchCopilotResponse)', () => {
    const m = requireSrc('aiHandler');
    if (typeof m.fetchCopilotResponse !== 'function') throw new Error('fetchCopilotResponse is not a function');
});

check('database loads (initDatabase)', () => {
    const m = requireSrc('database');
    if (typeof m.initDatabase !== 'function') throw new Error('initDatabase is not a function');
});

check('youtubeHandler loads (detectYoutubeUrl)', () => {
    const m = requireSrc('youtubeHandler');
    if (typeof m.detectYoutubeUrl !== 'function') throw new Error('missing detectYoutubeUrl');
    if (typeof m.checkDependencies !== 'function') throw new Error('missing checkDependencies');
});

check('webSearchHandler loads (webSearch)', () => {
    const m = requireSrc('webSearchHandler');
    if (typeof m.webSearch !== 'function') throw new Error('missing webSearch');
});

check('documentHandler loads (processDocument)', () => {
    const m = requireSrc('documentHandler');
    if (typeof m.processDocument !== 'function') throw new Error('missing processDocument');
});

check('messageUtils loads (splitMessage)', () => {
    const m = requireSrc('messageUtils');
    if (typeof m.splitMessage !== 'function') throw new Error('missing splitMessage');
});

check('healthCheck loads (startHealthCheckServer)', () => {
    const m = requireSrc('healthCheck');
    if (typeof m.startHealthCheckServer !== 'function') throw new Error('missing startHealthCheckServer');
});

check('calendarHandler loads (getTodayInfo)', () => {
    const m = requireSrc('calendarHandler');
    if (typeof m.getTodayInfo !== 'function') throw new Error('missing getTodayInfo');
});

check('moodHandler loads (analyzeMood)', () => {
    const m = requireSrc('moodHandler');
    if (typeof m.analyzeMood !== 'function') throw new Error('missing analyzeMood');
});

check('tarotHandler loads (performReading)', () => {
    const m = requireSrc('tarotHandler');
    if (typeof m.performReading !== 'function') throw new Error('missing performReading');
});

check('weatherHandler loads (getWeather)', () => {
    const m = requireSrc('weatherHandler');
    if (typeof m.getWeather !== 'function') throw new Error('missing getWeather');
});

check('stickerHandler loads (imageToSticker)', () => {
    const m = requireSrc('stickerHandler');
    if (typeof m.imageToSticker !== 'function') throw new Error('missing imageToSticker');
});

check('voiceHandler loads (transcribeAudio)', () => {
    const m = requireSrc('voiceHandler');
    if (typeof m.transcribeAudio !== 'function') throw new Error('missing transcribeAudio');
});

check('locationHandler loads (searchPlace)', () => {
    const m = requireSrc('locationHandler');
    if (typeof m.searchPlace !== 'function') throw new Error('missing searchPlace');
});

check('backupHandler loads (scheduleBackup)', () => {
    const m = requireSrc('backupHandler');
    if (typeof m.scheduleBackup !== 'function') throw new Error('missing scheduleBackup');
});

check('dnsUpdater loads (syncDNSRecord)', () => {
    const m = requireSrc('dnsUpdater');
    if (typeof m.syncDNSRecord !== 'function') throw new Error('missing syncDNSRecord');
});

check('bugReporter loads (reportBugToOwner)', () => {
    const m = requireSrc('bugReporter');
    if (typeof m.reportBugToOwner !== 'function') throw new Error('missing reportBugToOwner');
});

check('fileCreator loads (parseFileMarker)', () => {
    const m = requireSrc('fileCreator');
    if (typeof m.parseFileMarker !== 'function') throw new Error('missing parseFileMarker');
});

check('errorUtils loads (normalizeError, safeErrorMessage)', () => {
    const m = requireSrc('errorUtils');
    if (typeof m.normalizeError !== 'function') throw new Error('missing normalizeError');
    if (typeof m.safeErrorMessage !== 'function') throw new Error('missing safeErrorMessage');
});

check('userProfileHelper loads (classifyUser)', () => {
    const m = requireSrc('userProfileHelper');
    if (typeof m.classifyUser !== 'function') throw new Error('missing classifyUser');
});

check('autoSetup loads (commandExists)', () => {
    const m = requireSrc('autoSetup');
    if (typeof m.commandExists !== 'function') throw new Error('missing commandExists');
});

check('mediaHandler loads (downloadMedia)', () => {
    try {
        const m = requireSrc('mediaHandler');
        if (typeof m.downloadMedia !== 'function') throw new Error('missing downloadMedia');
    } catch (e) {
        if (e.message.includes('Cannot use import statement') || e.message.includes('Unexpected token')) {
            // Baileys ESM issue — acceptable in standalone Node
            console.log('      ⚠️  Skipped: mediaHandler depends on Baileys (ESM)');
            return;
        }
        throw e;
    }
});

check('package.json is valid', () => {
    const pkg = require(path.resolve(__dirname, '..', 'package.json'));
    if (!pkg.version.match(/^\d+\.\d+\.\d+/)) throw new Error('invalid version');
    if (pkg.name !== 'ai-whatsapp-chatbot') throw new Error('wrong package name');
});

// ─── External dependency checks (via Capabilities Registry) ─

console.log('\n🔧 Doctor Check — External Dependencies\n');

check('Node.js version >= 20', () => {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    if (major < 20) throw new Error(`Node ${process.versions.node} < 20`);
});

check('node_modules exists', () => {
    const fs = require('fs');
    if (!fs.existsSync(path.resolve(__dirname, '..', 'node_modules'))) {
        throw new Error('node_modules missing — run: npm install');
    }
});

// Run capability registry checks
const { checkAll } = requireSrc('capabilities');
const capResults = checkAll();

console.log('\n📋 Doctor Check — Capability Registry\n');

for (const cap of capResults) {
    if (cap.ok) {
        const extra = cap.detectedAs ? ` (${cap.detectedAs})` : '';
        check(`[${cap.level}] ${cap.name} — ${cap.feature}`, () => {
            // pass — already checked
            if (cap.detectedAs) console.log(`      ✅ Found as: ${cap.detectedAs}`);
        });
    } else if (cap.level === 'required') {
        // Required deps that are missing should FAIL the doctor
        check(`[${cap.level}] ${cap.name} — ${cap.feature}`, () => {
            throw new Error(`${cap.error}. Fix: ${cap.installHints[0]}`);
        });
    } else {
        // Warn-only deps: pass the check but print warning
        check(`[${cap.level}] ${cap.name} — ${cap.feature}`, () => {
            console.log(`      ⚠️  ${cap.error}`);
            console.log(`         Install: ${cap.installHints[0]}`);
        });
    }
}

// ─── Summary ────────────────────────────────────────────

console.log('\n' + '═'.repeat(50));
if (failed === 0) {
    console.log(`✅ Doctor OK — ${passed} checks passed`);
    console.log('═'.repeat(50) + '\n');
    process.exit(0);
} else {
    console.log(`❌ Doctor FAILED — ${passed} passed, ${failed} failed`);
    console.log('');
    for (const f of failures) {
        console.log(`   • ${f.label}: ${f.msg}`);
    }
    console.log('═'.repeat(50) + '\n');
    process.exit(1);
}
