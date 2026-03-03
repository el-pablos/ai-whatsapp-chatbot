/**
 * Tests for AI Orchestrator
 *
 * Tests focus on pure-logic functions and error handling.
 * API calls are mocked to avoid hitting real Copilot API.
 */

jest.mock('axios');
jest.mock('../src/database', () => ({
    getConversationHistory: jest.fn(() => []),
    saveMessage: jest.fn(),
    getUserPreferences: jest.fn(() => null),
    getPreferredName: jest.fn(() => null),
    detectNicknamePreference: jest.fn(),
    clearConversation: jest.fn(),
    getStats: jest.fn(() => ({ totalMessages: 0, totalUsers: 0, totalChats: 0 })),
    isOwner: jest.fn(() => false),
    initDatabase: jest.fn(),
    closeDatabase: jest.fn(),
    scheduleRetentionCleanup: jest.fn(),
}));
jest.mock('../src/userProfileHelper', () => ({
    classifyUser: jest.fn((jid) => ({
        isOwner: jid === '6281234567890@s.whatsapp.net',
        contextHint: '',
    })),
    isOwnerPhone: jest.fn(() => false),
}));

const axios = require('axios');

const {
    orchestrate,
    orchestrateVision,
    callCopilotAPI,
    handleLegacyMarkers,
    parseWebSearchMarker,
    parseFileMarker,
    MAX_TOOL_ITERATIONS,
    MAX_RETRIES,
} = require('../src/aiOrchestrator');

describe('AI Orchestrator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Re-apply mock implementations that resetMocks clears
        const { classifyUser } = require('../src/userProfileHelper');
        classifyUser.mockImplementation((jid) => ({
            isOwner: jid === '6281234567890@s.whatsapp.net',
            contextHint: '',
        }));
        const { getConversationHistory, getPreferredName, detectNicknamePreference, saveMessage } = require('../src/database');
        getConversationHistory.mockReturnValue([]);
        getPreferredName.mockReturnValue(null);
        detectNicknamePreference.mockImplementation(() => {});
        saveMessage.mockImplementation(() => {});
    });

    // ──────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────
    describe('Constants', () => {
        test('MAX_TOOL_ITERATIONS should be 3', () => {
            expect(MAX_TOOL_ITERATIONS).toBe(3);
        });

        test('MAX_RETRIES should be 2', () => {
            expect(MAX_RETRIES).toBe(2);
        });
    });

    // ──────────────────────────────────────────────────
    //  parseWebSearchMarker
    // ──────────────────────────────────────────────────
    describe('parseWebSearchMarker()', () => {
        test('should parse [WEBSEARCH:query] marker', () => {
            expect(parseWebSearchMarker('cek [WEBSEARCH:bitcoin price] dong')).toBe('bitcoin price');
        });

        test('should parse marker at start', () => {
            expect(parseWebSearchMarker('[WEBSEARCH:cuaca jakarta]')).toBe('cuaca jakarta');
        });

        test('should return null for no marker', () => {
            expect(parseWebSearchMarker('just normal text')).toBeNull();
        });

        test('should return null for empty string', () => {
            expect(parseWebSearchMarker('')).toBeNull();
        });

        test('should trim whitespace in query', () => {
            expect(parseWebSearchMarker('[WEBSEARCH:  test query  ]')).toBe('test query');
        });
    });

    // ──────────────────────────────────────────────────
    //  parseFileMarker
    // ──────────────────────────────────────────────────
    describe('parseFileMarker()', () => {
        test('should parse [FILE:filename] marker', () => {
            const result = parseFileMarker('[FILE:test.md]\n# Hello\nWorld');
            expect(result).not.toBeNull();
            expect(result.fileName).toBe('test.md');
            expect(result.content).toBe('# Hello\nWorld');
        });

        test('should handle file with spaces in name', () => {
            const result = parseFileMarker('[FILE:my report.csv]\na,b,c\n1,2,3');
            expect(result.fileName).toBe('my report.csv');
        });

        test('should return null for no marker', () => {
            expect(parseFileMarker('normal text without marker')).toBeNull();
        });

        test('should handle marker at start with content after newline', () => {
            const result = parseFileMarker('[FILE:data.json]\n{"key":"value"}');
            expect(result.fileName).toBe('data.json');
            expect(result.content).toBe('{"key":"value"}');
        });

        test('should trim leading newlines from content', () => {
            const result = parseFileMarker('[FILE:test.txt]\n\n\nhello');
            expect(result.content).toBe('hello');
        });
    });

    // ──────────────────────────────────────────────────
    //  callCopilotAPI
    // ──────────────────────────────────────────────────
    describe('callCopilotAPI()', () => {
        test('should call axios.post with correct URL', async () => {
            axios.post.mockResolvedValueOnce({
                data: { choices: [{ message: { content: 'hello back' } }] },
            });

            const result = await callCopilotAPI([
                { role: 'system', content: 'test' },
                { role: 'user', content: 'hello' },
            ]);

            expect(axios.post).toHaveBeenCalledTimes(1);
            const [url, body] = axios.post.mock.calls[0];
            expect(url).toContain('/v1/chat/completions');
            expect(body.messages).toHaveLength(2);
            expect(body.model).toBeDefined();
        });

        test('should include tools when provided', async () => {
            axios.post.mockResolvedValueOnce({
                data: { choices: [{ message: { content: 'ok' } }] },
            });

            const tools = [{ type: 'function', function: { name: 'test.tool' } }];
            await callCopilotAPI([{ role: 'user', content: 'hi' }], tools);

            const body = axios.post.mock.calls[0][1];
            expect(body.tools).toBe(tools);
            expect(body.tool_choice).toBe('auto');
        });

        test('should NOT include tools when null', async () => {
            axios.post.mockResolvedValueOnce({
                data: { choices: [{ message: { content: 'ok' } }] },
            });

            await callCopilotAPI([{ role: 'user', content: 'hi' }], null);

            const body = axios.post.mock.calls[0][1];
            expect(body.tools).toBeUndefined();
            expect(body.tool_choice).toBeUndefined();
        });

        test('should throw TOKEN_EXPIRED on 401', async () => {
            axios.post.mockRejectedValueOnce({
                response: { status: 401 },
                message: 'Unauthorized',
            });

            await expect(callCopilotAPI([{ role: 'user', content: 'hi' }]))
                .rejects.toThrow('TOKEN_EXPIRED');
        });

        test('should throw QUOTA_EXHAUSTED on 402', async () => {
            axios.post.mockRejectedValueOnce({
                response: { status: 402 },
                message: 'Payment Required',
            });

            await expect(callCopilotAPI([{ role: 'user', content: 'hi' }]))
                .rejects.toThrow('QUOTA_EXHAUSTED');
        });

        test('should throw PAYLOAD_TOO_LARGE on 413', async () => {
            axios.post.mockRejectedValueOnce({
                response: { status: 413 },
                message: 'Payload Too Large',
            });

            await expect(callCopilotAPI([{ role: 'user', content: 'hi' }]))
                .rejects.toThrow('PAYLOAD_TOO_LARGE');
        });

        test('should retry on 500', async () => {
            axios.post
                .mockRejectedValueOnce({ response: { status: 500 }, code: null, message: 'Server Error' })
                .mockResolvedValueOnce({
                    data: { choices: [{ message: { content: 'recovered' } }] },
                });

            const result = await callCopilotAPI([{ role: 'user', content: 'hi' }]);
            expect(axios.post).toHaveBeenCalledTimes(2);
            expect(result.choices[0].message.content).toBe('recovered');
        });

        test('should retry on ECONNRESET', async () => {
            axios.post
                .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
                .mockResolvedValueOnce({
                    data: { choices: [{ message: { content: 'ok' } }] },
                });

            await callCopilotAPI([{ role: 'user', content: 'hi' }]);
            expect(axios.post).toHaveBeenCalledTimes(2);
        });

        test('should retry on 429', async () => {
            axios.post
                .mockRejectedValueOnce({ response: { status: 429 }, code: null, message: 'Rate limit' })
                .mockResolvedValueOnce({
                    data: { choices: [{ message: { content: 'ok' } }] },
                });

            await callCopilotAPI([{ role: 'user', content: 'hi' }]);
            expect(axios.post).toHaveBeenCalledTimes(2);
        });
    });

    // ──────────────────────────────────────────────────
    //  orchestrate
    // ──────────────────────────────────────────────────
    describe('orchestrate()', () => {
        const makeNormalized = (overrides = {}) => ({
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
            raw: {},
            ...overrides,
        });

        test('should return text from simple AI response', async () => {
            axios.post.mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: 'halo juga bro!' } }],
                },
            });

            const result = await orchestrate(makeNormalized());
            expect(result.text).toContain('halo juga bro!');
        });

        test('should call saveMessage with correct object format', async () => {
            const { saveMessage } = require('../src/database');
            axios.post.mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: 'response text' } }],
                },
            });

            await orchestrate(makeNormalized({ text: 'hello world', senderId: '628111@s.whatsapp.net', pushName: 'Budi' }));

            // Should be called twice: once for user, once for assistant
            expect(saveMessage).toHaveBeenCalledTimes(2);

            // User message: must use object format with correct fields
            expect(saveMessage).toHaveBeenCalledWith(expect.objectContaining({
                chatId: '628999@s.whatsapp.net',
                senderJid: '628111@s.whatsapp.net',
                senderName: 'Budi',
                role: 'user',
                content: 'hello world',
            }));

            // Assistant message: must use object format
            expect(saveMessage).toHaveBeenCalledWith(expect.objectContaining({
                chatId: '628999@s.whatsapp.net',
                role: 'assistant',
                content: 'response text',
            }));
        });

        test('should NOT call saveMessage with positional args (regression)', async () => {
            const { saveMessage } = require('../src/database');
            axios.post.mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: 'test response' } }],
                },
            });

            await orchestrate(makeNormalized());

            // Ensure saveMessage is called with objects, not strings
            for (const call of saveMessage.mock.calls) {
                expect(typeof call[0]).toBe('object');
                expect(call[0]).toHaveProperty('chatId');
                expect(call[0]).toHaveProperty('role');
                expect(call[0]).toHaveProperty('content');
            }
        });

        test('should handle TOKEN_EXPIRED error', async () => {
            axios.post.mockRejectedValueOnce({
                response: { status: 401 },
                message: 'Unauthorized',
            });

            const result = await orchestrate(makeNormalized());
            expect(result.text).toContain('token expired');
        });

        test('should handle QUOTA_EXHAUSTED error', async () => {
            axios.post.mockRejectedValueOnce({
                response: { status: 402 },
                message: 'Payment Required',
            });

            const result = await orchestrate(makeNormalized());
            expect(result.text).toContain('quota');
        });

        test('should handle PAYLOAD_TOO_LARGE error', async () => {
            axios.post.mockRejectedValueOnce({
                response: { status: 413 },
                message: 'Payload Too Large',
            });

            const result = await orchestrate(makeNormalized());
            expect(result.text).toContain('kepanjangan');
        });

        test('should handle tool_calls in response', async () => {
            // First call: AI returns tool_calls
            axios.post.mockResolvedValueOnce({
                data: {
                    choices: [{
                        message: {
                            content: null,
                            tool_calls: [{
                                id: 'call_1',
                                type: 'function',
                                function: {
                                    name: 'calendar_today',
                                    arguments: '{}',
                                },
                            }],
                        },
                    }],
                },
            });
            // Second call: AI uses tool result
            axios.post.mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: 'hari ini Senin ya bro' } }],
                },
            });

            const result = await orchestrate(makeNormalized({ text: 'hari ini apa?' }));
            expect(result.text).toContain('Senin');
            expect(axios.post).toHaveBeenCalledTimes(2);
        });

        test('should handle empty choices', async () => {
            axios.post.mockResolvedValueOnce({
                data: { choices: [] },
            });

            const result = await orchestrate(makeNormalized());
            expect(result.text).toBeDefined();
            expect(typeof result.text).toBe('string');
        });

        test('should handle null choice', async () => {
            axios.post.mockResolvedValueOnce({
                data: { choices: [null] },
            });

            // Should fall through to error handler since choice is null
            const result = await orchestrate(makeNormalized());
            expect(result.text).toBeDefined();
        });
    });

    // ──────────────────────────────────────────────────
    //  handleLegacyMarkers
    // ──────────────────────────────────────────────────
    describe('handleLegacyMarkers()', () => {
        test('should pass through normal text unchanged', async () => {
            const result = await handleLegacyMarkers('just normal text', {});
            expect(result).toBe('just normal text');
        });

        test('should keep [FILE:] marker in text for router to handle', async () => {
            const text = '[FILE:report.md]\n# Report\nContent here';
            const result = await handleLegacyMarkers(text, {});
            expect(result).toBe(text); // kept as-is
        });
    });

    // ──────────────────────────────────────────────────
    //  orchestrateVision
    // ──────────────────────────────────────────────────
    describe('orchestrateVision()', () => {
        test('should call API with image message', async () => {
            axios.post.mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: 'ini gambar kucing bro 🐱' } }],
                },
            });

            const result = await orchestrateVision(
                'base64imagedata',
                'image/jpeg',
                'ini apa?',
                '628999@s.whatsapp.net',
            );

            expect(result.text).toContain('kucing');
            expect(axios.post).toHaveBeenCalledTimes(1);

            // Check that image_url was in the message
            const body = axios.post.mock.calls[0][1];
            const lastMsg = body.messages[body.messages.length - 1];
            expect(Array.isArray(lastMsg.content)).toBe(true);
            expect(lastMsg.content[0].type).toBe('image_url');
        });

        test('should call saveMessage with correct object format in vision', async () => {
            const { saveMessage } = require('../src/database');
            axios.post.mockResolvedValueOnce({
                data: {
                    choices: [{ message: { content: 'gambar bagus bro' } }],
                },
            });

            await orchestrateVision('base64data', 'image/jpeg', 'nice pic', '628777@s.whatsapp.net');

            expect(saveMessage).toHaveBeenCalledTimes(2);

            // User message
            expect(saveMessage).toHaveBeenCalledWith(expect.objectContaining({
                chatId: '628777@s.whatsapp.net',
                role: 'user',
                content: 'nice pic',
            }));

            // Assistant message
            expect(saveMessage).toHaveBeenCalledWith(expect.objectContaining({
                chatId: '628777@s.whatsapp.net',
                role: 'assistant',
                content: 'gambar bagus bro',
            }));

            // Must NOT be called with positional args
            for (const call of saveMessage.mock.calls) {
                expect(typeof call[0]).toBe('object');
                expect(call[0]).toHaveProperty('chatId');
                expect(call[0]).toHaveProperty('role');
            }
        });

        test('should handle vision API error', async () => {
            axios.post.mockRejectedValueOnce(new Error('Vision API down'));

            const result = await orchestrateVision(
                'base64', 'image/jpeg', 'test', '628999@s.whatsapp.net',
            );
            expect(result.text).toContain('error');
        });
    });
});
