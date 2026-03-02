/**
 * Tests for Intent Router
 *
 * Tests focus on fast-path commands and routing logic.
 * AI Orchestrator and network calls are mocked.
 */

jest.mock('../src/aiOrchestrator', () => ({
    orchestrate: jest.fn(async () => ({ text: 'AI response' })),
    orchestrateVision: jest.fn(async () => ({ text: 'Image analysis' })),
    parseFileMarker: jest.fn(() => null),
}));
jest.mock('../src/database', () => ({
    clearConversation: jest.fn(),
    getStats: jest.fn(() => ({
        totalMessages: 100,
        totalUsers: 5,
        totalChats: 10,
    })),
    isOwner: jest.fn((jid) => jid === '6281234567890@s.whatsapp.net'),
    getConversationHistory: jest.fn(() => []),
    saveMessage: jest.fn(),
    getUserPreferences: jest.fn(() => null),
    getPreferredName: jest.fn(() => null),
    detectNicknamePreference: jest.fn(),
    initDatabase: jest.fn(),
    closeDatabase: jest.fn(),
    scheduleRetentionCleanup: jest.fn(),
}));
jest.mock('../src/bugReporter', () => ({
    reportBugToOwner: jest.fn(),
}));
jest.mock('../src/backupHandler', () => ({
    runBackupNow: jest.fn(async () => {}),
    scheduleBackup: jest.fn(),
    stopBackup: jest.fn(),
}));
jest.mock('../src/stickerHandler', () => ({
    sendSticker: jest.fn(),
    imageToSticker: jest.fn(),
    videoToSticker: jest.fn(),
}));
jest.mock('../src/youtubeHandler', () => ({
    cleanupFile: jest.fn(),
    checkDependencies: jest.fn(() => ({ ytDlp: false, ffmpeg: false })),
    detectYoutubeUrl: jest.fn(),
    processYoutubeUrl: jest.fn(),
    downloadAsMP3: jest.fn(),
    downloadAsMP4: jest.fn(),
}));
jest.mock('../src/pptxHandler', () => ({
    sendPptx: jest.fn(),
}));
jest.mock('../src/fileCreator', () => ({
    createAndSendFile: jest.fn(),
    parseFileMarker: jest.fn(() => null),
    getMimeType: jest.fn(() => 'application/octet-stream'),
}));
jest.mock('../src/messageUtils', () => ({
    smartSend: jest.fn(),
    splitMessage: jest.fn((t) => [t]),
    WA_MESSAGE_LIMIT: 4096,
}));
jest.mock('@whiskeysockets/baileys', () => ({
    downloadMediaMessage: jest.fn(),
}));

const { routeMessage, FAST_COMMANDS, PREFIX_COMMANDS } = require('../src/intentRouter');
const { clearConversation, getStats, isOwner } = require('../src/database');
const { smartSend } = require('../src/messageUtils');
const { orchestrate } = require('../src/aiOrchestrator');

// Helper: create a fake sock
const makeSock = () => ({
    sendMessage: jest.fn(async () => ({})),
    sendPresenceUpdate: jest.fn(async () => {}),
    updateMediaMessage: jest.fn(),
});

// Helper: create normalized message
const makeMsg = (overrides = {}) => ({
    chatId: '628999@s.whatsapp.net',
    senderId: '628999@s.whatsapp.net',
    pushName: 'TestUser',
    isGroup: false,
    isFromMe: false,
    text: 'hello',
    messageType: 'text',
    attachments: [],
    quoted: null,
    location: null,
    messageId: 'MSG1',
    timestamp: Date.now(),
    raw: { key: { id: 'MSG1' } },
    ...overrides,
});

describe('Intent Router', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Re-apply mock implementations that resetMocks clears
        clearConversation.mockImplementation(() => {});
        getStats.mockReturnValue({ totalMessages: 100, totalUsers: 5, totalChats: 10 });
        isOwner.mockImplementation((jid) => jid === '6281234567890@s.whatsapp.net');
        orchestrate.mockResolvedValue({ text: 'AI response' });
        const { smartSend: ss } = require('../src/messageUtils');
        ss.mockImplementation(async () => {});
        const { parseFileMarker: pf } = require('../src/fileCreator');
        pf.mockReturnValue(null);
    });

    // ──────────────────────────────────────────────────
    //  FAST_COMMANDS registry
    // ──────────────────────────────────────────────────
    describe('FAST_COMMANDS', () => {
        test('should have /clear', () => {
            expect(FAST_COMMANDS).toHaveProperty('/clear');
        });

        test('should have /reset', () => {
            expect(FAST_COMMANDS).toHaveProperty('/reset');
        });

        test('should have /stats', () => {
            expect(FAST_COMMANDS).toHaveProperty('/stats');
        });

        test('should have /help', () => {
            expect(FAST_COMMANDS).toHaveProperty('/help');
        });

        test('should have /bantuan', () => {
            expect(FAST_COMMANDS).toHaveProperty('/bantuan');
        });

        test('should have /kalender', () => {
            expect(FAST_COMMANDS).toHaveProperty('/kalender');
        });

        test('should have /libur', () => {
            expect(FAST_COMMANDS).toHaveProperty('/libur');
        });

        test('should have /today', () => {
            expect(FAST_COMMANDS).toHaveProperty('/today');
        });

        test('should have 12+ commands', () => {
            expect(Object.keys(FAST_COMMANDS).length).toBeGreaterThanOrEqual(12);
        });

        test('all values should be async functions', () => {
            Object.values(FAST_COMMANDS).forEach(fn => {
                expect(typeof fn).toBe('function');
            });
        });
    });

    // ──────────────────────────────────────────────────
    //  PREFIX_COMMANDS registry
    // ──────────────────────────────────────────────────
    describe('PREFIX_COMMANDS', () => {
        test('should have /zodiak', () => {
            expect(PREFIX_COMMANDS).toHaveProperty('/zodiak');
        });

        test('should have /zodiac alias', () => {
            expect(PREFIX_COMMANDS).toHaveProperty('/zodiac');
        });

        test('should have /ultah', () => {
            expect(PREFIX_COMMANDS).toHaveProperty('/ultah');
        });

        test('should have /birthday alias', () => {
            expect(PREFIX_COMMANDS).toHaveProperty('/birthday');
        });

        test('should have /backup', () => {
            expect(PREFIX_COMMANDS).toHaveProperty('/backup');
        });
    });

    // ──────────────────────────────────────────────────
    //  Fast-path command execution
    // ──────────────────────────────────────────────────
    describe('Fast-path: /clear', () => {
        test('should clear conversation and reply', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: '/clear' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(clearConversation).toHaveBeenCalledWith('628999@s.whatsapp.net');
            expect(sock.sendMessage).toHaveBeenCalledTimes(1);
            const sentText = sock.sendMessage.mock.calls[0][1].text;
            expect(sentText).toContain('history');
        });
    });

    describe('Fast-path: /stats', () => {
        test('should return stats', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: '/stats' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(getStats).toHaveBeenCalled();
            expect(sock.sendMessage).toHaveBeenCalledTimes(1);
            const sentText = sock.sendMessage.mock.calls[0][1].text;
            expect(sentText).toContain('100'); // totalMessages
            expect(sentText).toContain('5');   // totalUsers
        });
    });

    describe('Fast-path: /help', () => {
        test('should return help text', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: '/help' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(sock.sendMessage).toHaveBeenCalledTimes(1);
            const sentText = sock.sendMessage.mock.calls[0][1].text;
            expect(sentText).toContain('Tama AI');
        });
    });

    describe('Fast-path: case insensitivity', () => {
        test('/CLEAR should work same as /clear', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: '/CLEAR' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(clearConversation).toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────
    //  Prefix commands
    // ──────────────────────────────────────────────────
    describe('Prefix: /zodiak without args', () => {
        test('should send usage hint', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: '/zodiak' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(sock.sendMessage).toHaveBeenCalledTimes(1);
            const sentText = sock.sendMessage.mock.calls[0][1].text;
            expect(sentText).toContain('tanggal lahir');
        });
    });

    describe('Prefix: /ultah without args', () => {
        test('should send usage hint', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: '/ultah' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            const sentText = sock.sendMessage.mock.calls[0][1].text;
            expect(sentText).toContain('tanggal lahir');
        });
    });

    describe('Prefix: /backup (non-owner)', () => {
        test('should reject non-owner', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: '/backup', senderId: '628111@s.whatsapp.net' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            const sentText = sock.sendMessage.mock.calls[0][1].text;
            expect(sentText).toContain('owner');
        });
    });

    describe('Prefix: /backup (owner)', () => {
        test('should trigger backup for owner', async () => {
            isOwner.mockReturnValue(true);
            const sock = makeSock();
            const msg = makeMsg({
                text: '/backup',
                chatId: '6281234567890@s.whatsapp.net',
            });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            const { runBackupNow } = require('../src/backupHandler');
            expect(runBackupNow).toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────
    //  Default path: AI Orchestrator
    // ──────────────────────────────────────────────────
    describe('Default path: AI Orchestrator', () => {
        test('should call orchestrate for regular text', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: 'halo tama gimana kabar?' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(orchestrate).toHaveBeenCalledTimes(1);
            expect(sock.sendPresenceUpdate).toHaveBeenCalledWith('composing', msg.chatId);
        });

        test('should send AI response via smartSend', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: 'cuaca gimana?' });
            orchestrate.mockResolvedValueOnce({ text: 'cerah bro' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(smartSend).toHaveBeenCalledWith(
                sock, msg.chatId, 'cerah bro', expect.objectContaining({ quoted: msg.raw }),
            );
        });

        test('should pass composing then paused presence updates', async () => {
            const sock = makeSock();
            const msg = makeMsg({ text: 'test' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            expect(sock.sendPresenceUpdate).toHaveBeenCalledWith('composing', msg.chatId);
            expect(sock.sendPresenceUpdate).toHaveBeenCalledWith('paused', msg.chatId);
        });

        test('should send PPTX when orchestrate returns response.pptx', async () => {
            orchestrate.mockResolvedValueOnce({
                text: 'nih presentasi lu',
                pptx: {
                    filePath: '/tmp/test.pptx',
                    fileName: 'Proposal.pptx',
                    slideCount: 5,
                },
            });
            const sock = makeSock();
            const msg = makeMsg({ text: 'buatin gw pptx tentang AI' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            const { sendPptx } = require('../src/pptxHandler');
            expect(sendPptx).toHaveBeenCalledWith(
                sock,
                msg.chatId,
                '/tmp/test.pptx',
                'Proposal.pptx',
                expect.objectContaining({
                    quoted: msg.raw,
                    caption: expect.stringContaining('Proposal.pptx'),
                }),
            );
            // Caption should include slide count
            const captionArg = sendPptx.mock.calls[0][4].caption;
            expect(captionArg).toContain('5 slides');
        });
    });

    // ──────────────────────────────────────────────────
    //  Error handling
    // ──────────────────────────────────────────────────
    describe('Error handling', () => {
        test('should catch orchestrate errors and report bug', async () => {
            orchestrate.mockRejectedValueOnce(new Error('test error'));
            const sock = makeSock();
            const msg = makeMsg({ text: 'crash me' });

            await routeMessage(msg, { sock, rawMsg: msg.raw });

            const { reportBugToOwner } = require('../src/bugReporter');
            expect(reportBugToOwner).toHaveBeenCalled();
            // Should still send error message to user
            expect(sock.sendMessage).toHaveBeenCalled();
        });
    });
});
