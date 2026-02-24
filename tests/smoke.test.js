/**
 * Smoke / Doctor Test
 * 
 * Quick sanity check that all modules load correctly,
 * exports are present, and external dependencies are detectable.
 * Also runs as part of Jest: npm test
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

describe('Smoke / Doctor — Module Loading', () => {
    it('should load aiHandler with required exports', () => {
        const m = require('../src/aiHandler');
        expect(typeof m.fetchCopilotResponse).toBe('function');
    });

    it('should load database with required exports', () => {
        const m = require('../src/database');
        expect(typeof m.initDatabase).toBe('function');
    });

    it('should load youtubeHandler with required exports', () => {
        const m = require('../src/youtubeHandler');
        expect(typeof m.detectYoutubeUrl).toBe('function');
        expect(typeof m.checkDependencies).toBe('function');
        expect(typeof m.isYtDlpInstalled).toBe('function');
        expect(typeof m.isFFmpegInstalled).toBe('function');
        expect(typeof m.commandExists).toBe('function');
    });

    it('should load webSearchHandler with required exports', () => {
        const m = require('../src/webSearchHandler');
        expect(typeof m.webSearch).toBe('function');
        expect(typeof m.axiosGetWithRetry).toBe('function');
        expect(m.SEARCH_TIMEOUT).toBeGreaterThan(0);
        expect(m.SEARCH_MAX_RETRIES).toBeGreaterThanOrEqual(0);
    });

    it('should load documentHandler with required exports', () => {
        const m = require('../src/documentHandler');
        expect(typeof m.processDocument).toBe('function');
    });

    it('should load mediaHandler with required exports', () => {
        // mediaHandler depends on @whiskeysockets/baileys which uses ESM
        // Skip if Baileys can't be loaded in test environment
        try {
            const m = require('../src/mediaHandler');
            expect(typeof m.downloadMedia).toBe('function');
        } catch (e) {
            if (e.message.includes('Cannot use import statement') || e.message.includes('Unexpected token')) {
                console.log('    ⚠️  Skipped: mediaHandler depends on Baileys (ESM)');
            } else {
                throw e;
            }
        }
    });

    it('should load messageUtils with required exports', () => {
        const m = require('../src/messageUtils');
        expect(typeof m.splitMessage).toBe('function');
    });

    it('should load healthCheck with required exports', () => {
        const m = require('../src/healthCheck');
        expect(typeof m.startHealthCheckServer).toBe('function');
    });

    it('should load calendarHandler with required exports', () => {
        const m = require('../src/calendarHandler');
        expect(typeof m.getTodayInfo).toBe('function');
    });

    it('should load moodHandler with required exports', () => {
        const m = require('../src/moodHandler');
        expect(typeof m.analyzeMood).toBe('function');
    });

    it('should load tarotHandler with required exports', () => {
        const m = require('../src/tarotHandler');
        expect(typeof m.performReading).toBe('function');
    });

    it('should load weatherHandler with required exports', () => {
        const m = require('../src/weatherHandler');
        expect(typeof m.getWeather).toBe('function');
    });

    it('should load stickerHandler with required exports', () => {
        const m = require('../src/stickerHandler');
        expect(typeof m.imageToSticker).toBe('function');
    });

    it('should load voiceHandler with required exports', () => {
        const m = require('../src/voiceHandler');
        expect(typeof m.transcribeAudio).toBe('function');
    });

    it('should load locationHandler with required exports', () => {
        const m = require('../src/locationHandler');
        expect(typeof m.searchPlace).toBe('function');
    });

    it('should load backupHandler with required exports', () => {
        const m = require('../src/backupHandler');
        expect(typeof m.scheduleBackup).toBe('function');
    });

    it('should load dnsUpdater with required exports', () => {
        const m = require('../src/dnsUpdater');
        expect(typeof m.syncDNSRecord).toBe('function');
    });

    it('should load bugReporter with required exports', () => {
        const m = require('../src/bugReporter');
        expect(typeof m.reportBugToOwner).toBe('function');
    });

    it('should load fileCreator with required exports', () => {
        const m = require('../src/fileCreator');
        expect(typeof m.parseFileMarker).toBe('function');
    });

    it('should load errorUtils with required exports', () => {
        const m = require('../src/errorUtils');
        expect(typeof m.normalizeError).toBe('function');
        expect(typeof m.safeErrorMessage).toBe('function');
    });

    it('should load package.json with valid version', () => {
        const pkg = require('../package.json');
        expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
        expect(pkg.name).toBe('ai-whatsapp-chatbot');
    });
});
