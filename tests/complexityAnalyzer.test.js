/**
 * Tests for Complexity Analyzer
 */

const {
    analyzeComplexity,
    needsReasoning,
    countMatches,
    COMPLEXITY,
    THRESHOLDS,
    MULTI_PART_PATTERNS,
    ANALYSIS_PATTERNS,
    LOGIC_PATTERNS,
    SIMPLE_PATTERNS
} = require('../src/reasoning/complexityAnalyzer');

describe('complexityAnalyzer', () => {
    describe('analyzeComplexity', () => {
        test('should classify greeting as simple', () => {
            const result = analyzeComplexity('halo');
            expect(result.level).toBe(COMPLEXITY.SIMPLE);
            expect(result.needsReasoning).toBe(false);
            expect(result.score).toBeLessThan(THRESHOLDS.MODERATE);
        });

        test('should classify ok/yes as simple', () => {
            expect(analyzeComplexity('ok').level).toBe(COMPLEXITY.SIMPLE);
            expect(analyzeComplexity('iya').level).toBe(COMPLEXITY.SIMPLE);
        });

        test('should classify analytical question as complex', () => {
            const result = analyzeComplexity('jelaskan mengapa ekonomi Indonesia bisa tumbuh 5% dan apa dampaknya terhadap inflasi?');
            expect(result.level).toBe(COMPLEXITY.COMPLEX);
            expect(result.needsReasoning).toBe(true);
            expect(result.factors).toContain('analysis_required');
        });

        test('should classify comparison as having multi_part factor', () => {
            const result = analyzeComplexity('bandingkan React vs Vue, jelaskan kelebihan dan kekurangan masing-masing?');
            expect(result.score).toBeGreaterThan(0);
            expect(result.factors).toContain('multi_part');
        });

        test('should classify math/logic questions', () => {
            const result = analyzeComplexity('hitung probabilitas mendapatkan 3 kartu as berturut-turut');
            expect(result.score).toBeGreaterThanOrEqual(THRESHOLDS.MODERATE);
            expect(result.factors).toContain('logic_math');
        });

        test('should classify multi-step task', () => {
            const result = analyzeComplexity('bagaimana cara membuat REST API step by step dengan Node.js?');
            expect(result.factors).toContain('multi_step');
        });

        test('should classify opinion as moderate', () => {
            const result = analyzeComplexity('menurut kamu framework mana yang lebih bagus untuk web development?');
            expect(result.factors).toContain('opinion');
        });

        test('should boost multiple question marks', () => {
            const result = analyzeComplexity('apa bedanya JavaScript dan TypeScript? mana yang lebih baik? kenapa?');
            expect(result.factors).toContain('multiple_questions');
        });

        test('should detect long queries', () => {
            const longQuery = 'jelaskan ' + 'kata '.repeat(40) + 'ini semua bagaimana?';
            const result = analyzeComplexity(longQuery);
            expect(result.factors).toContain('long_query');
        });

        test('should handle empty input', () => {
            expect(analyzeComplexity('').level).toBe(COMPLEXITY.SIMPLE);
            expect(analyzeComplexity(null).level).toBe(COMPLEXITY.SIMPLE);
            expect(analyzeComplexity(undefined).level).toBe(COMPLEXITY.SIMPLE);
        });

        test('should have score between 0 and 1', () => {
            const r1 = analyzeComplexity('halo apa kabar');
            const r2 = analyzeComplexity('jelaskan mengapa dan bagaimana analisis dampak probabilitas rumus strategi implementasi?');
            expect(r1.score).toBeGreaterThanOrEqual(0);
            expect(r1.score).toBeLessThanOrEqual(1);
            expect(r2.score).toBeGreaterThanOrEqual(0);
            expect(r2.score).toBeLessThanOrEqual(1);
        });

        test('should return unique factors', () => {
            const result = analyzeComplexity('jelaskan analisis dampak mengapa proses ini terjadi?');
            const unique = [...new Set(result.factors)];
            expect(result.factors.length).toBe(unique.length);
        });
    });

    describe('needsReasoning', () => {
        test('should return false for simple queries', () => {
            expect(needsReasoning('halo')).toBe(false);
            expect(needsReasoning('thanks')).toBe(false);
        });

        test('should return true for complex queries', () => {
            expect(needsReasoning('jelaskan mengapa dampak analisis probabilitas ekonomi Indonesia terhadap inflasi dan apa strateginya?')).toBe(true);
        });
    });

    describe('countMatches', () => {
        test('should count pattern matches', () => {
            expect(countMatches('hello world', [/hello/i, /world/i, /foo/i])).toBe(2);
        });

        test('should return 0 for no matches', () => {
            expect(countMatches('test', [/foo/i, /bar/i])).toBe(0);
        });
    });

    describe('constants', () => {
        test('COMPLEXITY enum should have 3 levels', () => {
            expect(Object.keys(COMPLEXITY)).toHaveLength(3);
            expect(COMPLEXITY.SIMPLE).toBe('simple');
            expect(COMPLEXITY.MODERATE).toBe('moderate');
            expect(COMPLEXITY.COMPLEX).toBe('complex');
        });

        test('THRESHOLDS should be properly ordered', () => {
            expect(THRESHOLDS.MODERATE).toBeLessThan(THRESHOLDS.COMPLEX);
        });

        test('pattern arrays should be non-empty', () => {
            expect(MULTI_PART_PATTERNS.length).toBeGreaterThan(0);
            expect(ANALYSIS_PATTERNS.length).toBeGreaterThan(0);
            expect(LOGIC_PATTERNS.length).toBeGreaterThan(0);
            expect(SIMPLE_PATTERNS.length).toBeGreaterThan(0);
        });
    });
});
