/**
 * Tests for errorUtils module
 */

const { normalizeError, safeErrorMessage } = require('../src/errorUtils');

describe('errorUtils', () => {
    describe('normalizeError', () => {
        it('should handle Error objects', () => {
            const err = new Error('test error');
            const result = normalizeError(err);
            expect(result.message).toBe('test error');
            expect(result.original).toBe(err);
        });

        it('should handle Error with code', () => {
            const err = new Error('connection failed');
            err.code = 'ECONNREFUSED';
            const result = normalizeError(err);
            expect(result.message).toBe('connection failed');
            expect(result.code).toBe('ECONNREFUSED');
        });

        it('should handle Axios-style errors', () => {
            const err = new Error('Request failed');
            err.response = { status: 500 };
            const result = normalizeError(err);
            expect(result.status).toBe(500);
        });

        it('should handle plain strings', () => {
            const result = normalizeError('string error');
            expect(result.message).toBe('string error');
            expect(result.code).toBeNull();
        });

        it('should handle objects with message', () => {
            const result = normalizeError({ message: 'obj error', code: 'CUSTOM' });
            expect(result.message).toBe('obj error');
            expect(result.code).toBe('CUSTOM');
        });

        it('should handle null', () => {
            const result = normalizeError(null);
            expect(result.message).toBe('Unknown error');
        });

        it('should handle undefined', () => {
            const result = normalizeError(undefined);
            expect(result.message).toBe('Unknown error');
        });

        it('should handle numbers', () => {
            const result = normalizeError(404);
            expect(result.message).toBe('404');
        });

        it('should handle Error without message', () => {
            const err = new Error();
            const result = normalizeError(err);
            expect(result.message).toBe('Unknown error');
        });
    });

    describe('safeErrorMessage', () => {
        it('should return short error messages as-is', () => {
            const result = safeErrorMessage(new Error('timeout'));
            expect(result).toBe('timeout');
        });

        it('should return fallback for multi-line errors', () => {
            const err = new Error('line1\nline2\nline3');
            const result = safeErrorMessage(err, 'oops');
            expect(result).toBe('oops');
        });

        it('should return fallback for very long errors', () => {
            const err = new Error('x'.repeat(300));
            const result = safeErrorMessage(err);
            expect(result).toBe('Terjadi error, coba lagi ya bro');
        });

        it('should use default fallback when not provided', () => {
            const err = new Error('x'.repeat(300));
            const result = safeErrorMessage(err);
            expect(result).toContain('Terjadi error');
        });

        it('should handle non-Error inputs', () => {
            const result = safeErrorMessage('simple');
            expect(result).toBe('simple');
        });
    });
});
