/**
 * Tests for capabilities registry, reader behavior with missing deps,
 * and bugReporter dependency classification.
 *
 * These tests verify that:
 * 1) The capability registry returns correct structure
 * 2) Document readers degrade gracefully when deps are missing
 * 3) bugReporter classifies missing-dependency errors differently from real bugs
 */

// ─── Capabilities Registry ─────────────────────────────

const {
    CAPABILITIES,
    checkAll,
    getSummary,
    commandExists,
    moduleLoadable,
} = require('../src/capabilities');

describe('capabilities registry', () => {

    it('should export CAPABILITIES array with entries', () => {
        expect(Array.isArray(CAPABILITIES)).toBe(true);
        expect(CAPABILITIES.length).toBeGreaterThanOrEqual(10);
    });

    it('each capability has required fields', () => {
        for (const cap of CAPABILITIES) {
            expect(cap).toHaveProperty('name');
            expect(cap).toHaveProperty('level');
            expect(['required', 'warn']).toContain(cap.level);
            expect(cap).toHaveProperty('feature');
            expect(typeof cap.check).toBe('function');
            expect(Array.isArray(cap.installHints)).toBe(true);
            expect(cap.installHints.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('checkAll returns array of results with ok/error', () => {
        const results = checkAll();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(CAPABILITIES.length);
        for (const r of results) {
            expect(typeof r.ok).toBe('boolean');
            expect(r).toHaveProperty('name');
            expect(r).toHaveProperty('level');
            expect(r).toHaveProperty('feature');
            expect(r).toHaveProperty('installHints');
        }
    });

    it('getSummary returns totals', () => {
        const s = getSummary();
        expect(typeof s.total).toBe('number');
        expect(typeof s.ok).toBe('number');
        expect(typeof s.warn).toBe('number');
        expect(typeof s.fail).toBe('number');
        expect(s.total).toBe(s.ok + s.warn + s.fail);
        expect(Array.isArray(s.results)).toBe(true);
    });

    // ─── Node module checks ─────────────────────────────

    it('better-sqlite3 check passes (native binding)', () => {
        const cap = CAPABILITIES.find(c => c.name === 'better-sqlite3');
        expect(cap).toBeDefined();
        expect(cap.level).toBe('required');
        const r = cap.check();
        expect(r.ok).toBe(true);
    });

    it('sharp check passes', () => {
        const cap = CAPABILITIES.find(c => c.name === 'sharp');
        expect(cap).toBeDefined();
        expect(cap.level).toBe('required');
        const r = cap.check();
        expect(r.ok).toBe(true);
    });

    it('pdf-parse check passes', () => {
        const cap = CAPABILITIES.find(c => c.name === 'pdf-parse');
        expect(cap).toBeDefined();
        const r = cap.check();
        expect(r.ok).toBe(true);
    });

    // ─── System binary checks (may or may not be installed) ──

    it('libreoffice check returns detectedAs when found', () => {
        const cap = CAPABILITIES.find(c => c.name === 'libreoffice');
        const r = cap.check();
        if (r.ok) {
            expect(['libreoffice', 'soffice']).toContain(r.detectedAs);
        } else {
            expect(r.error).toBeTruthy();
        }
    });

    it('git check works', () => {
        const cap = CAPABILITIES.find(c => c.name === 'git');
        const r = cap.check();
        // git should be installed in CI/dev
        expect(r.ok).toBe(true);
    });

    it('moduleLoadable helper works', () => {
        const ok = moduleLoadable('path');
        expect(ok.ok).toBe(true);
        const bad = moduleLoadable('nonexistent-module-xyz-123');
        expect(bad.ok).toBe(false);
        expect(bad.error).toBeTruthy();
    });
});

// ─── Document reader behavior with missing deps ────────

const {
    extractPresentationText,
    extractPptxTextFromXml,
    _resetOfficeBinaryCache,
} = require('../src/documentHandler');

describe('reader graceful degradation', () => {
    const child_process = require('child_process');

    beforeEach(() => {
        _resetOfficeBinaryCache();
    });

    afterEach(() => {
        _resetOfficeBinaryCache();
    });

    it('PPTX fallback works when LibreOffice is missing', async () => {
        const originalExecSync = child_process.execSync;
        child_process.execSync = jest.fn((cmd, opts) => {
            if (/where|which|command/.test(cmd) && /libreoffice|soffice/.test(cmd)) {
                throw new Error('not found');
            }
            return originalExecSync(cmd, opts);
        });

        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        zip.addFile('ppt/slides/slide1.xml', Buffer.from(
            `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                    xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
              <p:cSld><p:spTree><p:sp><p:txBody>
                <a:p><a:r><a:t>Test Slide Content</a:t></a:r></a:p>
              </p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
        ));

        const result = await extractPresentationText(zip.toBuffer(), 'pptx');
        expect(result.success).toBe(true);
        expect(result.metadata.method).toBe('pptx-xml-fallback');
        expect(result.text).toContain('Test Slide Content');

        child_process.execSync = originalExecSync;
    });

    it('PPT binary returns actionable error when LibreOffice missing', async () => {
        const originalExecSync = child_process.execSync;
        child_process.execSync = jest.fn((cmd, opts) => {
            if (/where|which|command/.test(cmd) && /libreoffice|soffice/.test(cmd)) {
                throw new Error('not found');
            }
            return originalExecSync(cmd, opts);
        });

        const result = await extractPresentationText(Buffer.from('dummy'), 'ppt');
        expect(result.success).toBe(false);
        expect(result.error).toContain('LibreOffice');
        expect(result.error).toContain('apt install');

        child_process.execSync = originalExecSync;
    });

    it('PPTX XML fallback returns error for corrupt ZIP', () => {
        const result = extractPptxTextFromXml(Buffer.from('not a zip'));
        expect(result.success).toBe(false);
        expect(result.error).toContain('PPTX XML fallback failed');
    });
});

// ─── BugReporter dependency classification ──────────────

const {
    isDependencyMissing,
    reportBugToOwner,
    clearBugCooldowns,
} = require('../src/bugReporter');

describe('bugReporter dependency classification', () => {

    beforeEach(() => {
        clearBugCooldowns();
    });

    // All the binary-not-found patterns
    const depMissingCases = [
        'libreoffice: not found',
        'soffice: not found',
        'ffmpeg: not found',
        'yt-dlp: not found',
        'pdftotext: not found',
        'ebook-convert: not found',
        'djvutxt: not found',
        'unrar: not found',
        'unzip: not found',
        '7z: not found',
        'tar: not found',
        'zcat: not found',
        'curl: not found',
        'pip3: not found',
        'bash: command not found',
        'install unrar to see contents',
        'install p7zip to see contents',
        'install calibre',
        'install djvulibre',
        'install poppler',
        'install libreoffice',
    ];

    it.each(depMissingCases)('isDependencyMissing("%s") → true', (msg) => {
        expect(isDependencyMissing(msg)).toBe(true);
    });

    const realBugCases = [
        'Cannot read property x of undefined',
        'ECONNREFUSED',
        'token expired',
        'TypeError: foo is not a function',
        'Request failed with status code 500',
    ];

    it.each(realBugCases)('isDependencyMissing("%s") → false', (msg) => {
        expect(isDependencyMissing(msg)).toBe(false);
    });

    it('dependency error sends MISSING DEPENDENCY (not BUG REPORTED)', async () => {
        const sock = { sendMessage: jest.fn().mockResolvedValue({}) };
        await reportBugToOwner(sock, '628xxx@s.whatsapp.net', 'User', 'djvutxt: not found', 'Document');
        expect(sock.sendMessage).toHaveBeenCalledTimes(2);
        const ownerMsg = sock.sendMessage.mock.calls[0][1].text;
        expect(ownerMsg).toContain('MISSING DEPENDENCY');
        expect(ownerMsg).not.toContain('BUG REPORTED');
        const userMsg = sock.sendMessage.mock.calls[1][1].text;
        expect(userMsg).not.toContain('Bug');
    });

    it('real bug sends BUG REPORTED', async () => {
        const sock = { sendMessage: jest.fn().mockResolvedValue({}) };
        await reportBugToOwner(sock, '628xxx@s.whatsapp.net', 'User', 'TypeError: x', 'AI Response');
        const ownerMsg = sock.sendMessage.mock.calls[0][1].text;
        expect(ownerMsg).toContain('BUG REPORTED');
    });
});

// ─── autoSetup function exports ─────────────────────────

describe('autoSetup exports', () => {
    // autoSetup runs on require — but skips on Windows
    const autoSetup = require('../src/autoSetup');

    it('should export commandExists', () => {
        expect(typeof autoSetup.commandExists).toBe('function');
    });

    it('should export ensureGitPull', () => {
        expect(typeof autoSetup.ensureGitPull).toBe('function');
    });

    it('should export ensureNpmDeps', () => {
        expect(typeof autoSetup.ensureNpmDeps).toBe('function');
    });

    it('should export ensurePm2Save', () => {
        expect(typeof autoSetup.ensurePm2Save).toBe('function');
    });

    it('should export fileHash', () => {
        expect(typeof autoSetup.fileHash).toBe('function');
    });

    it('fileHash returns consistent hash for same content', () => {
        const fs = require('fs');
        const path = require('path');
        const pkgPath = path.resolve(__dirname, '..', 'package.json');
        const h1 = autoSetup.fileHash(pkgPath);
        const h2 = autoSetup.fileHash(pkgPath);
        expect(h1).toBe(h2);
        expect(typeof h1).toBe('string');
        expect(h1.length).toBe(32); // MD5 hex
    });

    it('fileHash returns null for nonexistent file', () => {
        expect(autoSetup.fileHash('/nonexistent/file.xyz')).toBeNull();
    });
});
