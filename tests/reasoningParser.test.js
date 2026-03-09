/**
 * Tests for Reasoning Parser
 */

const {
    parseSteps,
    extractConclusion,
    extractConfidence,
    formatForWhatsApp,
    formatAsPlainText,
    summarizeSteps,
    WA_SAFE_LIMIT
} = require('../src/reasoning/reasoningParser');

describe('reasoningParser', () => {
    describe('parseSteps', () => {
        test('should parse STEP N: format', () => {
            const raw = `STEP 1: Identifikasi masalah
STEP 2: Analisis faktor
STEP 3: Sintesis solusi`;
            const steps = parseSteps(raw);
            expect(steps).toHaveLength(3);
            expect(steps[0].step).toBe(1);
            expect(steps[0].content).toContain('Identifikasi');
            expect(steps[2].step).toBe(3);
        });

        test('should parse numbered list format when no currentStep', () => {
            const raw = `1. First point
2. Second point
3. Third point`;
            const steps = parseSteps(raw);
            expect(steps).toHaveLength(3);
            expect(steps[1].step).toBe(2);
            expect(steps[1].content).toContain('Second');
        });

        test('should handle multi-line steps', () => {
            const raw = `STEP 1: Main idea
continuation of step 1
STEP 2: Next idea`;
            const steps = parseSteps(raw);
            expect(steps).toHaveLength(2);
            expect(steps[0].content).toContain('continuation');
        });

        test('should handle empty input', () => {
            expect(parseSteps('')).toEqual([]);
            expect(parseSteps(null)).toEqual([]);
            expect(parseSteps(undefined)).toEqual([]);
        });

        test('should skip CONCLUSION and CONFIDENCE lines', () => {
            const raw = `STEP 1: Analysis
CONCLUSION: Final answer
CONFIDENCE: 0.9`;
            const steps = parseSteps(raw);
            expect(steps).toHaveLength(1);
        });
    });

    describe('extractConclusion', () => {
        test('should extract conclusion', () => {
            const raw = `STEP 1: Bla
CONCLUSION: The sky is blue
CONFIDENCE: 0.9`;
            expect(extractConclusion(raw)).toBe('The sky is blue');
        });

        test('should handle multi-line conclusion', () => {
            const raw = `CONCLUSION: First part
second part of conclusion
CONFIDENCE: 0.8`;
            const result = extractConclusion(raw);
            expect(result).toContain('First part');
        });

        test('should return empty for missing conclusion', () => {
            expect(extractConclusion('STEP 1: only steps')).toBe('');
        });

        test('should handle null input', () => {
            expect(extractConclusion(null)).toBe('');
            expect(extractConclusion('')).toBe('');
        });
    });

    describe('extractConfidence', () => {
        test('should extract float confidence', () => {
            expect(extractConfidence('CONFIDENCE: 0.85')).toBe(0.85);
        });

        test('should extract integer confidence', () => {
            expect(extractConfidence('CONFIDENCE: 1')).toBe(1);
        });

        test('should clamp to 0-1', () => {
            expect(extractConfidence('CONFIDENCE: 1.5')).toBe(1);
            expect(extractConfidence('CONFIDENCE: -0.2')).toBe(0);
        });

        test('should return 0 for missing', () => {
            expect(extractConfidence('no confidence here')).toBe(0);
            expect(extractConfidence(null)).toBe(0);
        });
    });

    describe('formatForWhatsApp', () => {
        test('should format complete reasoning', () => {
            const result = formatForWhatsApp({
                steps: ['Identify the problem', 'Analyze data', 'Conclude'],
                conclusion: 'Answer is 42',
                confidence: 0.9
            });
            expect(result).toContain('🧠');
            expect(result).toContain('Step 1:');
            expect(result).toContain('Step 3:');
            expect(result).toContain('Kesimpulan');
            expect(result).toContain('90%');
            expect(result).toContain('🟢');
        });

        test('should show yellow for medium confidence', () => {
            const result = formatForWhatsApp({
                steps: ['Step one'],
                conclusion: 'Maybe',
                confidence: 0.6
            });
            expect(result).toContain('🟡');
            expect(result).toContain('60%');
        });

        test('should show red for low confidence', () => {
            const result = formatForWhatsApp({
                steps: ['Step one'],
                conclusion: 'Unsure',
                confidence: 0.3
            });
            expect(result).toContain('🔴');
        });

        test('should handle empty reasoning', () => {
            expect(formatForWhatsApp(null)).toBe('');
            expect(formatForWhatsApp({})).toContain('🧠');
        });

        test('should truncate long output', () => {
            const longSteps = Array.from({ length: 20 }, (_, i) =>
                'A'.repeat(300) + ` step ${i}`
            );
            const result = formatForWhatsApp({ steps: longSteps, conclusion: 'done', confidence: 0.5 });
            expect(result.length).toBeLessThanOrEqual(WA_SAFE_LIMIT);
            expect(result).toContain('dipotong');
        });
    });

    describe('formatAsPlainText', () => {
        test('should format as plain text', () => {
            const result = formatAsPlainText({
                steps: ['First', 'Second'],
                conclusion: 'Done',
                confidence: 0.7
            });
            expect(result).toContain('1. First');
            expect(result).toContain('2. Second');
            expect(result).toContain('Kesimpulan: Done');
            expect(result).toContain('70%');
        });

        test('should handle null', () => {
            expect(formatAsPlainText(null)).toBe('');
        });
    });

    describe('summarizeSteps', () => {
        test('should summarize steps compactly', () => {
            const steps = ['Step one content', 'Step two content'];
            const result = summarizeSteps(steps);
            expect(result).toContain('1. Step one');
            expect(result).toContain('2. Step two');
        });

        test('should truncate long steps', () => {
            const steps = ['A'.repeat(200)];
            const result = summarizeSteps(steps);
            expect(result).toContain('...');
            expect(result.length).toBeLessThan(200);
        });

        test('should respect maxLength', () => {
            const steps = Array.from({ length: 10 }, () => 'content here');
            const result = summarizeSteps(steps, 50);
            expect(result.length).toBeLessThanOrEqual(53); // 50 + '...'
        });

        test('should handle empty', () => {
            expect(summarizeSteps([])).toBe('');
            expect(summarizeSteps(null)).toBe('');
        });
    });

    describe('constants', () => {
        test('WA_SAFE_LIMIT should be 4000', () => {
            expect(WA_SAFE_LIMIT).toBe(4000);
        });
    });
});
