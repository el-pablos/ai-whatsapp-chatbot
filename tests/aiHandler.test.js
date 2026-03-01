/**
 * Unit Tests - AI Handler Module
 * 
 * Test cases untuk validasi:
 * 1. Fungsi fetchCopilotResponse dengan mock axios
 * 2. Error handling ketika API gagal
 * 3. Validasi persona Tama dalam output
 * 4. Owner recognition
 * 5. Smart truncation
 */

const axios = require('axios');

// Mock axios
jest.mock('axios');

// Import module setelah mock
const {
    fetchCopilotResponse,
    validateTamaPersona,
    getRandomErrorResponse,
    isOwnerNumber,
    smartTruncate,
    MAX_RESPONSE_LENGTH,
    TAMA_SYSTEM_PROMPT,
    ERROR_RESPONSES,
    OWNER_NUMBERS
} = require('../src/aiHandler');

describe('AI Handler Module', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchCopilotResponse', () => {

        it('should return AI response when API call is successful', async () => {
            // Mock successful API response
            const mockResponse = {
                data: {
                    choices: [{
                        message: {
                            content: 'wah gampang jir, bntar w jelasin ya 😭'
                        }
                    }]
                }
            };
            axios.post.mockResolvedValue(mockResponse);

            const result = await fetchCopilotResponse('halo, gimana caranya belajar coding?');

            expect(result).toBe('wah gampang jir, bntar w jelasin ya 😭');
            expect(axios.post).toHaveBeenCalledTimes(1);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/v1/chat/completions'),
                expect.objectContaining({
                    model: expect.any(String),
                    messages: expect.arrayContaining([
                        expect.objectContaining({ role: 'system' }),
                        expect.objectContaining({ role: 'user', content: 'halo, gimana caranya belajar coding?' })
                    ])
                }),
                expect.any(Object)
            );
        });

        it('should return error response when API returns 500', async () => {
            // Mock API error
            axios.post.mockRejectedValue({
                response: {
                    status: 500,
                    data: { error: 'Internal Server Error' }
                },
                message: 'Request failed with status code 500'
            });

            const result = await fetchCopilotResponse('test message');

            // Should return one of the error responses
            expect(ERROR_RESPONSES).toContain(result);
        });

        it('should return error response when API returns 404', async () => {
            axios.post.mockRejectedValue({
                response: {
                    status: 404,
                    data: { error: 'Not Found' }
                },
                message: 'Request failed with status code 404'
            });

            const result = await fetchCopilotResponse('test message');

            expect(ERROR_RESPONSES).toContain(result);
        });

        it('should return actionable message when API returns 401 (token expired)', async () => {
            axios.post.mockRejectedValue({
                response: {
                    status: 401,
                    data: { error: { message: 'unauthorized: token expired\n', type: 'error' } }
                },
                message: 'Request failed with status code 401'
            });

            const result = await fetchCopilotResponse('test message');

            expect(result).toContain('token expired');
            expect(result).not.toBe(''); // not a generic error
            expect(ERROR_RESPONSES).not.toContain(result); // not a random error response
        });

        it('should return actionable message when API returns 402 (quota exceeded)', async () => {
            axios.post.mockRejectedValue({
                response: {
                    status: 402,
                    data: { error: { message: 'You have no quota', type: 'error', code: 'quota_exceeded' } }
                },
                message: 'Request failed with status code 402'
            });

            const result = await fetchCopilotResponse('test message');

            expect(result).toContain('quota');
            expect(ERROR_RESPONSES).not.toContain(result);
        });

        it('should return error response when network timeout', async () => {
            axios.post.mockRejectedValue({
                code: 'ECONNABORTED',
                message: 'timeout of 30000ms exceeded'
            });

            const result = await fetchCopilotResponse('test message');

            expect(ERROR_RESPONSES).toContain(result);
        });

        it('should return error response when response structure is invalid', async () => {
            axios.post.mockResolvedValue({
                data: {
                    // Missing choices array
                    result: 'invalid'
                }
            });

            const result = await fetchCopilotResponse('test message');

            expect(ERROR_RESPONSES).toContain(result);
        });

        it('should include conversation history in API call', async () => {
            const mockResponse = {
                data: {
                    choices: [{
                        message: { content: 'test response jir' }
                    }]
                }
            };
            axios.post.mockResolvedValue(mockResponse);

            const history = [
                { role: 'user', content: 'previous message' },
                { role: 'assistant', content: 'previous response' }
            ];

            await fetchCopilotResponse('new message', history);

            const callArgs = axios.post.mock.calls[0][1];
            expect(callArgs.messages.length).toBe(4); // system + 2 history + user
        });

        it('should use correct temperature for creative responses', async () => {
            const mockResponse = {
                data: {
                    choices: [{
                        message: { content: 'wkwkwk' }
                    }]
                }
            };
            axios.post.mockResolvedValue(mockResponse);

            await fetchCopilotResponse('test');

            const callArgs = axios.post.mock.calls[0][1];
            expect(callArgs.temperature).toBe(0.85);
        });

    });

    describe('validateTamaPersona', () => {

        it('should validate response with Tama keywords as valid', () => {
            const response = 'wah gampang jir, w jelasin deh bentar yak 😭';
            const result = validateTamaPersona(response);

            expect(result.isValid).toBe(true);
            expect(result.tamaKeywordsFound.length).toBeGreaterThan(0);
            expect(result.formalKeywordsFound.length).toBe(0);
        });

        it('should detect formal keywords as invalid', () => {
            const response = 'Saya akan membantu Anda dengan senang hati, silakan tanyakan.';
            const result = validateTamaPersona(response);

            expect(result.isValid).toBe(false);
            expect(result.formalKeywordsFound).toContain('saya');
            expect(result.formalKeywordsFound).toContain('anda');
        });

        it('should detect emoji presence', () => {
            const responseWithEmoji = 'test 😭';
            const responseNoEmoji = 'test biasa';

            expect(validateTamaPersona(responseWithEmoji).hasEmoji).toBe(true);
            expect(validateTamaPersona(responseNoEmoji).hasEmoji).toBe(false);
        });

        it('should calculate persona score correctly', () => {
            // Response dengan banyak keyword Tama
            const goodResponse = 'wkwkwk jir gw gatau sih yak';
            const goodResult = validateTamaPersona(goodResponse);

            // Response dengan keyword formal
            const badResponse = 'saya tidak tahu';
            const badResult = validateTamaPersona(badResponse);

            expect(goodResult.score).toBeGreaterThan(badResult.score);
        });

        it('should find multiple Tama keywords', () => {
            const response = 'akh gelo jir w gatau bngt sih gimana';
            const result = validateTamaPersona(response);

            expect(result.tamaKeywordsFound).toContain('w');
            expect(result.tamaKeywordsFound).toContain('jir');
            expect(result.tamaKeywordsFound).toContain('sih');
        });

    });

    describe('getRandomErrorResponse', () => {

        it('should return a string from ERROR_RESPONSES array', () => {
            const result = getRandomErrorResponse();
            expect(typeof result).toBe('string');
            expect(ERROR_RESPONSES).toContain(result);
        });

        it('should return different responses over multiple calls (randomness)', () => {
            const results = new Set();
            // Call multiple times to check randomness
            for (let i = 0; i < 50; i++) {
                results.add(getRandomErrorResponse());
            }
            // Should have more than 1 unique response (probabilistically)
            expect(results.size).toBeGreaterThan(1);
        });

    });

    describe('TAMA_SYSTEM_PROMPT', () => {

        it('should contain key persona instructions', () => {
            expect(TAMA_SYSTEM_PROMPT).toContain('Tama');
            expect(TAMA_SYSTEM_PROMPT).toContain('jir');
            expect(TAMA_SYSTEM_PROMPT).toContain('w');
            expect(TAMA_SYSTEM_PROMPT).toContain('gw');
        });

        it('should prohibit formal language', () => {
            expect(TAMA_SYSTEM_PROMPT.toLowerCase()).toContain('saya');
            expect(TAMA_SYSTEM_PROMPT).toContain('JANGAN');
        });

        it('should include typo examples', () => {
            expect(TAMA_SYSTEM_PROMPT).toContain('bntr');
            expect(TAMA_SYSTEM_PROMPT).toContain('gatau');
        });

    });

    describe('ERROR_RESPONSES', () => {

        it('should have at least 3 different error responses', () => {
            expect(ERROR_RESPONSES.length).toBeGreaterThanOrEqual(3);
        });

        it('all error responses should contain Tama characteristics', () => {
            ERROR_RESPONSES.forEach(response => {
                const validation = validateTamaPersona(response);
                // Each error response should have at least some Tama flavor
                expect(validation.tamaKeywordsFound.length + (validation.hasEmoji ? 1 : 0)).toBeGreaterThan(0);
            });
        });

    });

    // ═══════════════════════════════════════════════════════════
    // NEW TESTS: Owner Recognition
    // ═══════════════════════════════════════════════════════════
    describe('isOwnerNumber', () => {

        it('should return true for owner #1 phone number with country code', () => {
            expect(isOwnerNumber('6282210819939')).toBe(true);
        });

        it('should return true for owner #1 phone number without country code', () => {
            expect(isOwnerNumber('082210819939')).toBe(true);
        });

        it('should return true for owner #1 JID format', () => {
            expect(isOwnerNumber('6282210819939@s.whatsapp.net')).toBe(true);
        });

        it('should return true for owner #2 (6285817378442)', () => {
            expect(isOwnerNumber('6285817378442')).toBe(true);
        });

        it('should return true for owner #2 with 0 prefix', () => {
            expect(isOwnerNumber('085817378442')).toBe(true);
        });

        it('should return true for owner #2 JID format', () => {
            expect(isOwnerNumber('6285817378442@s.whatsapp.net')).toBe(true);
        });

        it('should return false for non-owner number', () => {
            expect(isOwnerNumber('6281234567890')).toBe(false);
            expect(isOwnerNumber('6289999999999')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isOwnerNumber(null)).toBe(false);
            expect(isOwnerNumber(undefined)).toBe(false);
            expect(isOwnerNumber('')).toBe(false);
        });

    });

    describe('OWNER_NUMBERS', () => {

        it('should contain both owner phone numbers', () => {
            expect(OWNER_NUMBERS).toContain('6282210819939');
            expect(OWNER_NUMBERS).toContain('082210819939');
            expect(OWNER_NUMBERS).toContain('6285817378442');
            expect(OWNER_NUMBERS).toContain('085817378442');
        });

    });

    // ═══════════════════════════════════════════════════════════
    // NEW TESTS: fetchCopilotResponse with pushName/userContextHint
    // ═══════════════════════════════════════════════════════════
    describe('fetchCopilotResponse with personalization options', () => {

        it('should accept pushName in options without error', async () => {
            const mockResponse = {
                data: {
                    choices: [{
                        message: { content: 'hey Salsa!' }
                    }]
                }
            };
            axios.post.mockResolvedValue(mockResponse);

            const result = await fetchCopilotResponse('hello', [], {
                pushName: 'Salsa',
                userContextHint: '[SPECIAL_USER: Salsa]'
            });

            expect(result).toBe('hey Salsa!');
        });

        it('should inject userContextHint into system messages when provided', async () => {
            const mockResponse = {
                data: {
                    choices: [{
                        message: { content: 'yo king!' }
                    }]
                }
            };
            axios.post.mockResolvedValue(mockResponse);

            await fetchCopilotResponse('hello', [], {
                isOwner: true,
                senderPhone: '6282210819939',
                pushName: 'Tama',
                userContextHint: '[OWNER: true] Ini owner kamu'
            });

            // Verify the API was called with system message containing contextHint
            const callArgs = axios.post.mock.calls[0][1];
            const messages = callArgs.messages;
            const systemMsg = messages.find(m => m.role === 'system');
            expect(systemMsg).toBeDefined();
            expect(systemMsg.content).toContain('[OWNER: true]');
        });

        it('should work normally without pushName or userContextHint', async () => {
            const mockResponse = {
                data: {
                    choices: [{
                        message: { content: 'response biasa aja' }
                    }]
                }
            };
            axios.post.mockResolvedValue(mockResponse);

            const result = await fetchCopilotResponse('test message', [], {
                isOwner: false,
                senderPhone: '6281234567890'
            });

            expect(result).toBe('response biasa aja');
        });
    });

    // ═══════════════════════════════════════════════════════════
    // NEW TESTS: Smart Truncation
    // ═══════════════════════════════════════════════════════════
    describe('smartTruncate', () => {

        it('should return original text if under max length', () => {
            const shortText = 'ini text pendek';
            expect(smartTruncate(shortText)).toBe(shortText);
        });

        it('should truncate long text with truncation notice', () => {
            const longText = 'a'.repeat(65000);
            const result = smartTruncate(longText);
            expect(result.length).toBeLessThan(longText.length);
            expect(result).toContain('dipotong');
        });

        it('should try to break at sentence boundaries', () => {
            const text = 'Paragraf pertama. ' + 'x'.repeat(62000) + ' Paragraf kedua.';
            const result = smartTruncate(text);
            // Should end with truncation message
            expect(result).toContain('dipotong');
        });

        it('should handle null/empty input', () => {
            expect(smartTruncate(null)).toBeNull();
            expect(smartTruncate('')).toBe('');
        });

        it('should respect custom max length', () => {
            const text = 'a'.repeat(1000);
            const result = smartTruncate(text, 500);
            expect(result.length).toBeLessThan(text.length);
        });

    });

    describe('MAX_RESPONSE_LENGTH', () => {

        it('should be a reasonable number', () => {
            expect(MAX_RESPONSE_LENGTH).toBeGreaterThan(1000);
            expect(MAX_RESPONSE_LENGTH).toBeLessThan(65536); // WhatsApp limit
        });

    });

});
