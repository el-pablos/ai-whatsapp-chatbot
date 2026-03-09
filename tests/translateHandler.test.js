/**
 * Tests for Translate Handler
 */

const {
    SUPPORTED_LANGUAGES,
    parseTranslateCommand,
    translateText,
    formatTranslation,
    listLanguages,
} = require('../src/translateHandler');

describe('Translate Handler', () => {

    describe('SUPPORTED_LANGUAGES', () => {
        test('should have 20 languages', () => {
            expect(Object.keys(SUPPORTED_LANGUAGES)).toHaveLength(20);
        });

        test('should include Indonesian', () => {
            expect(SUPPORTED_LANGUAGES.id).toBe('Bahasa Indonesia');
        });

        test('should include English', () => {
            expect(SUPPORTED_LANGUAGES.en).toBe('English');
        });

        test('should include Japanese', () => {
            expect(SUPPORTED_LANGUAGES.ja).toBe('Japanese');
        });

        test('should include Korean', () => {
            expect(SUPPORTED_LANGUAGES.ko).toBe('Korean');
        });

        test('all values should be strings', () => {
            Object.values(SUPPORTED_LANGUAGES).forEach(name => {
                expect(typeof name).toBe('string');
            });
        });
    });

    describe('parseTranslateCommand', () => {
        test('should parse valid translate command', () => {
            const result = parseTranslateCommand('/translate en Halo apa kabar');
            expect(result).toEqual({
                langCode: 'en',
                langName: 'English',
                textToTranslate: 'Halo apa kabar',
            });
        });

        test('should be case-insensitive for lang code', () => {
            const result = parseTranslateCommand('/translate EN Hello world');
            expect(result).not.toBeNull();
            expect(result.langCode).toBe('en');
        });

        test('should return null for unsupported language', () => {
            expect(parseTranslateCommand('/translate xx Hello')).toBeNull();
        });

        test('should return null for empty text', () => {
            expect(parseTranslateCommand('')).toBeNull();
            expect(parseTranslateCommand(null)).toBeNull();
        });

        test('should return null for command without text', () => {
            expect(parseTranslateCommand('/translate en')).toBeNull();
        });

        test('should handle multiline text', () => {
            const result = parseTranslateCommand('/translate ja Baris satu\nBaris dua');
            expect(result).not.toBeNull();
            expect(result.textToTranslate).toContain('Baris satu');
        });
    });

    describe('translateText', () => {
        test('should call aiCall with prompt', async () => {
            const mockAi = jest.fn().mockResolvedValue('Hello');
            const result = await translateText('Halo', 'English', mockAi);
            expect(result).toBe('Hello');
            expect(mockAi).toHaveBeenCalledWith(expect.stringContaining('English'));
        });
    });

    describe('formatTranslation', () => {
        test('should format with language name', () => {
            const result = formatTranslation('Halo', 'Hello', 'English');
            expect(result).toContain('English');
            expect(result).toContain('Hello');
        });
    });

    describe('listLanguages', () => {
        test('should list all supported languages', () => {
            const result = listLanguages();
            expect(result).toContain('id');
            expect(result).toContain('en');
            expect(result).toContain('ja');
            expect(result).toContain('Bahasa Indonesia');
            expect(result).toContain('/translate');
        });
    });
});
