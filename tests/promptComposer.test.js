/**
 * Tests for Prompt Composer
 */

const {
    composeSystemPrompt,
    composeUserMessage,
    buildMessages,
    TOOL_USE_INSTRUCTIONS,
} = require('../src/promptComposer');

describe('Prompt Composer', () => {
    // ──────────────────────────────────────────────────
    //  TOOL_USE_INSTRUCTIONS
    // ──────────────────────────────────────────────────
    describe('TOOL_USE_INSTRUCTIONS', () => {
        test('should be a non-empty string', () => {
            expect(typeof TOOL_USE_INSTRUCTIONS).toBe('string');
            expect(TOOL_USE_INSTRUCTIONS.length).toBeGreaterThan(100);
        });

        test('should mention web_search', () => {
            expect(TOOL_USE_INSTRUCTIONS).toContain('web_search');
        });

        test('should mention file_create', () => {
            expect(TOOL_USE_INSTRUCTIONS).toContain('file_create');
        });

        test('should contain tool-use rules', () => {
            expect(TOOL_USE_INSTRUCTIONS).toContain('ATURAN TOOL-USE');
        });

        test('should mention WA formatting', () => {
            expect(TOOL_USE_INSTRUCTIONS).toContain('*bold*');
        });
    });

    // ──────────────────────────────────────────────────
    //  composeSystemPrompt
    // ──────────────────────────────────────────────────
    describe('composeSystemPrompt()', () => {
        test('should include Tama persona', () => {
            const prompt = composeSystemPrompt();
            expect(prompt).toContain('Tama');
        });

        test('should include tool instructions by default', () => {
            const prompt = composeSystemPrompt();
            expect(prompt).toContain('TOOL-USE');
            expect(prompt).toContain('AVAILABLE TOOLS');
        });

        test('should exclude tool instructions when disabled', () => {
            const prompt = composeSystemPrompt({ includeToolInstructions: false });
            expect(prompt).not.toContain('AVAILABLE TOOLS');
        });

        test('prompt with tools should be longer than without', () => {
            const withTools = composeSystemPrompt({ includeToolInstructions: true });
            const without = composeSystemPrompt({ includeToolInstructions: false });
            expect(withTools.length).toBeGreaterThan(without.length);
        });

        test('should accept custom capability cards', () => {
            const prompt = composeSystemPrompt({ capabilityCards: 'CUSTOM TOOL LIST' });
            expect(prompt).toContain('CUSTOM TOOL LIST');
        });
    });

    // ──────────────────────────────────────────────────
    //  composeUserMessage
    // ──────────────────────────────────────────────────
    describe('composeUserMessage()', () => {
        const makeNormalized = (overrides = {}) => ({
            text: 'hello',
            attachments: [],
            quoted: null,
            location: null,
            ...overrides,
        });

        test('should return text directly for simple message', () => {
            const result = composeUserMessage(makeNormalized({ text: 'halo' }));
            expect(result).toContain('halo');
        });

        test('should add context hint from profile', () => {
            const result = composeUserMessage(
                makeNormalized({ text: 'hi' }),
                { contextHint: '[OWNER]' },
            );
            expect(result).toContain('[OWNER]');
        });

        test('should add nickname preference', () => {
            const result = composeUserMessage(
                makeNormalized({ text: 'hi' }),
                {},
                'Pablo',
            );
            expect(result).toContain('[PANGGILAN: Pablo]');
        });

        test('should NOT add default nickname "bro"', () => {
            const result = composeUserMessage(
                makeNormalized({ text: 'hi' }),
                {},
                'bro',
            );
            expect(result).not.toContain('[PANGGILAN:');
        });

        test('should add quoted message context', () => {
            const result = composeUserMessage(makeNormalized({
                text: 'rangkum',
                quoted: { text: 'original text', mediaType: null },
            }));
            expect(result).toContain('[User membalas pesan:');
            expect(result).toContain('original text');
        });

        test('should add quoted media type', () => {
            const result = composeUserMessage(makeNormalized({
                text: 'analisa',
                quoted: { text: 'some caption', mediaType: 'image' },
            }));
            expect(result).toContain('[image]');
        });

        test('should add attachment context', () => {
            const result = composeUserMessage(makeNormalized({
                text: 'check this',
                attachments: [{ type: 'document', fileName: 'report.pdf', mimetype: 'application/pdf' }],
            }));
            expect(result).toContain('[User mengirim document: report.pdf]');
        });

        test('should add location context', () => {
            const result = composeUserMessage(makeNormalized({
                text: null,
                location: { latitude: -6.2, longitude: 106.8, name: 'Monas' },
            }));
            expect(result).toContain('[User share lokasi:');
            expect(result).toContain('Monas');
        });

        test('should return fallback for empty media message', () => {
            const result = composeUserMessage(makeNormalized({
                text: null,
                attachments: [],
            }));
            expect(result).toBe('[media tanpa teks]');
        });
    });

    // ──────────────────────────────────────────────────
    //  buildMessages
    // ──────────────────────────────────────────────────
    describe('buildMessages()', () => {
        test('should return array with system + user messages', () => {
            const msgs = buildMessages('hello');
            expect(Array.isArray(msgs)).toBe(true);
            expect(msgs.length).toBeGreaterThanOrEqual(2);
            expect(msgs[0].role).toBe('system');
            expect(msgs[msgs.length - 1].role).toBe('user');
        });

        test('should include conversation history', () => {
            const history = [
                { role: 'user', content: 'old message' },
                { role: 'assistant', content: 'old reply' },
            ];
            const msgs = buildMessages('new msg', history);
            // system + 2 history + user = 4
            expect(msgs).toHaveLength(4);
            expect(msgs[1].content).toBe('old message');
            expect(msgs[2].content).toBe('old reply');
        });

        test('should create text-only user message by default', () => {
            const msgs = buildMessages('hello world');
            const lastMsg = msgs[msgs.length - 1];
            expect(lastMsg.content).toBe('hello world');
        });

        test('should create vision message when imageBase64 provided', () => {
            const msgs = buildMessages('what is this?', [], {
                imageBase64: 'base64data',
                imageMimetype: 'image/jpeg',
            });
            const lastMsg = msgs[msgs.length - 1];
            expect(Array.isArray(lastMsg.content)).toBe(true);
            expect(lastMsg.content).toHaveLength(2);
            expect(lastMsg.content[0].type).toBe('image_url');
            expect(lastMsg.content[0].image_url.url).toContain('data:image/jpeg;base64,');
            expect(lastMsg.content[1].type).toBe('text');
            expect(lastMsg.content[1].text).toBe('what is this?');
        });

        test('should include tool instructions by default', () => {
            const msgs = buildMessages('hi');
            expect(msgs[0].content).toContain('TOOL-USE');
        });

        test('should exclude tool instructions when disabled', () => {
            const msgs = buildMessages('hi', [], { includeTools: false });
            expect(msgs[0].content).not.toContain('AVAILABLE TOOLS');
        });
    });
});
