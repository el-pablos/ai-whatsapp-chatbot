/**
 * Tests for Calculator Handler
 */

jest.mock('axios');
const axios = require('axios');

const {
    calculateExpression,
    convertUnit,
    convertCurrency,
    parseCalcCommand,
    formatCalcResult,
} = require('../src/calculatorHandler');

describe('Calculator Handler', () => {

    beforeEach(() => jest.clearAllMocks());

    describe('calculateExpression', () => {
        test('should evaluate simple math', () => {
            const result = calculateExpression('2+2');
            expect(result.success).toBe(true);
            expect(result.result).toBe('4');
        });

        test('should evaluate complex expression', () => {
            const result = calculateExpression('sqrt(144)');
            expect(result.success).toBe(true);
            expect(result.result).toBe('12');
        });

        test('should evaluate trigonometric', () => {
            const result = calculateExpression('sin(0)');
            expect(result.success).toBe(true);
            expect(result.result).toBe('0');
        });

        test('should handle power', () => {
            const result = calculateExpression('2^10');
            expect(result.success).toBe(true);
            expect(result.result).toBe('1024');
        });

        test('should fail for empty expression', () => {
            const result = calculateExpression('');
            expect(result.success).toBe(false);
        });

        test('should fail for invalid expression', () => {
            const result = calculateExpression('abc xyz');
            expect(result.success).toBe(false);
        });
    });

    describe('convertUnit', () => {
        test('should convert km to m', () => {
            const result = convertUnit(1, 'km', 'm');
            expect(result.success).toBe(true);
            expect(result.result).toContain('1000');
        });

        test('should convert celsius to fahrenheit', () => {
            const result = convertUnit(100, 'degC', 'degF');
            expect(result.success).toBe(true);
            expect(result.result).toMatch(/21[12]/);
        });

        test('should fail for invalid units', () => {
            const result = convertUnit(1, 'abc', 'xyz');
            expect(result.success).toBe(false);
        });
    });

    describe('convertCurrency', () => {
        test('should convert USD to IDR', async () => {
            axios.get.mockResolvedValue({
                data: { rates: { IDR: 15000 } },
            });
            const result = await convertCurrency(100, 'USD', 'IDR');
            expect(result.success).toBe(true);
            expect(result.rate).toBe(15000);
            expect(result.result).toContain('IDR');
        });

        test('should fail for unknown currency', async () => {
            axios.get.mockResolvedValue({ data: { rates: {} } });
            const result = await convertCurrency(1, 'USD', 'XYZ');
            expect(result.success).toBe(false);
        });

        test('should handle API error', async () => {
            axios.get.mockRejectedValue(new Error('Network error'));
            const result = await convertCurrency(1, 'USD', 'IDR');
            expect(result.success).toBe(false);
        });

        test('should be case-insensitive', async () => {
            axios.get.mockResolvedValue({ data: { rates: { EUR: 0.85 } } });
            const result = await convertCurrency(100, 'usd', 'eur');
            expect(result.success).toBe(true);
        });
    });

    describe('parseCalcCommand', () => {
        test('should parse math expression', () => {
            const result = parseCalcCommand('/calc 2+2');
            expect(result).toEqual({ type: 'math', params: { expression: '2+2' } });
        });

        test('should parse /hitung alias', () => {
            const result = parseCalcCommand('/hitung 3*4');
            expect(result).toEqual({ type: 'math', params: { expression: '3*4' } });
        });

        test('should parse currency conversion', () => {
            const result = parseCalcCommand('/calc 100 USD to IDR');
            expect(result.type).toBe('currency');
            expect(result.params.amount).toBe(100);
            expect(result.params.from).toBe('USD');
            expect(result.params.to).toBe('IDR');
        });

        test('should parse unit conversion', () => {
            const result = parseCalcCommand('/calc 100 km to mile');
            expect(result.type).toBe('unit');
            expect(result.params.value).toBe(100);
            expect(result.params.from).toBe('km');
            expect(result.params.to).toBe('mile');
        });

        test('should return null for empty', () => {
            expect(parseCalcCommand('')).toBeNull();
            expect(parseCalcCommand(null)).toBeNull();
        });

        test('should return null for non-calc command', () => {
            expect(parseCalcCommand('/other test')).toBeNull();
        });
    });

    describe('formatCalcResult', () => {
        test('should format success result', () => {
            const result = formatCalcResult({ success: true, result: '42' });
            expect(result).toContain('42');
            expect(result).toContain('🧮');
        });

        test('should format error result', () => {
            const result = formatCalcResult({ success: false, error: 'bad' });
            expect(result).toContain('❌');
            expect(result).toContain('bad');
        });
    });
});
