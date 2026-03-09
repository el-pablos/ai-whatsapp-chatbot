/**
 * Integration tests for Smart Reasoning system (Fase 3)
 */

const {
    performReasoning,
    parseReasoningResponse,
    buildReasoningPrompt,
    quickReason,
    MAX_REASONING_STEPS,
    REASONING_ENABLED
} = require('../src/reasoning/chainOfThought');

const {
    parseSteps,
    extractConclusion,
    extractConfidence,
    formatForWhatsApp,
    formatAsPlainText,
    summarizeSteps
} = require('../src/reasoning/reasoningParser');

const {
    analyzeComplexity,
    needsReasoning,
    COMPLEXITY
} = require('../src/reasoning/complexityAnalyzer');

const {
    scoreConfidence,
    isConfident
} = require('../src/reasoning/confidenceScorer');

const {
    getCachedReasoning,
    setCachedReasoning,
    clearCache,
    getCacheStats
} = require('../src/reasoning/reasoningCache');

describe('Reasoning Integration', () => {
    beforeEach(() => {
        clearCache();
    });

    test('all 5 reasoning modules should export correctly', () => {
        expect(typeof performReasoning).toBe('function');
        expect(typeof parseReasoningResponse).toBe('function');
        expect(typeof buildReasoningPrompt).toBe('function');
        expect(typeof quickReason).toBe('function');
        expect(typeof parseSteps).toBe('function');
        expect(typeof extractConclusion).toBe('function');
        expect(typeof extractConfidence).toBe('function');
        expect(typeof formatForWhatsApp).toBe('function');
        expect(typeof formatAsPlainText).toBe('function');
        expect(typeof summarizeSteps).toBe('function');
        expect(typeof analyzeComplexity).toBe('function');
        expect(typeof needsReasoning).toBe('function');
        expect(typeof scoreConfidence).toBe('function');
        expect(typeof isConfident).toBe('function');
        expect(typeof getCachedReasoning).toBe('function');
        expect(typeof setCachedReasoning).toBe('function');
        expect(typeof clearCache).toBe('function');
    });

    test('complexity → parser → scorer pipeline', () => {
        // 1. Analyze complexity
        const complexity = analyzeComplexity('jelaskan mengapa dan bagaimana dampak AI terhadap ekonomi Indonesia?');
        expect(complexity.level).toBe(COMPLEXITY.COMPLEX);
        expect(complexity.needsReasoning).toBe(true);

        // 2. Parse a simulated reasoning response
        const rawResponse = `STEP 1: AI mempengaruhi banyak sektor ekonomi
STEP 2: Sektor manufaktur dan jasa paling terdampak
STEP 3: Peluang dan tantangan bagi tenaga kerja
CONCLUSION: AI berdampak positif dan negatif terhadap ekonomi
CONFIDENCE: 0.8`;
        const parsed = parseReasoningResponse(rawResponse);
        expect(parsed.steps).toHaveLength(3);
        expect(parsed.conclusion).toContain('ekonomi');
        expect(parsed.confidence).toBe(0.8);

        // 3. Score confidence
        const score = scoreConfidence(parsed, 'dampak AI ekonomi');
        expect(score.score).toBeGreaterThan(0);
        expect(score.level).toBeDefined();
    });

    test('cache → get → format pipeline', () => {
        const reasoningResult = {
            steps: ['Analisis masalah', 'Evaluasi solusi', 'Sintesis jawaban'],
            conclusion: 'Jawaban final yang komprehensif',
            confidence: 0.85
        };

        // Store in cache
        setCachedReasoning('test question about complex topic here', reasoningResult);

        // Retrieve from cache
        const cached = getCachedReasoning('test question about complex topic here');
        expect(cached).toEqual(reasoningResult);

        // Format for WhatsApp
        const formatted = formatForWhatsApp(cached);
        expect(formatted).toContain('🧠');
        expect(formatted).toContain('Step 1');
        expect(formatted).toContain('Kesimpulan');
        expect(formatted).toContain('85%');
    });

    test('complexity threshold determines reasoning need', () => {
        // Simple queries should NOT need reasoning
        const simpleQueries = ['halo', 'makasih', 'ok siap'];
        simpleQueries.forEach(q => {
            expect(needsReasoning(q)).toBe(false);
        });

        // Complex should need reasoning
        const complexQuery = 'jelaskan mengapa dan bagaimana analisis dampak probabilitas rumus strategi implementasi?';
        expect(needsReasoning(complexQuery)).toBe(true);
    });

    test('reasoning parser handles various formats', () => {
        // STEP format
        const steps1 = parseSteps('STEP 1: First\nSTEP 2: Second');
        expect(steps1).toHaveLength(2);

        // Extract conclusion
        const conclusion = extractConclusion('CONCLUSION: Final answer here');
        expect(conclusion).toBe('Final answer here');

        // Extract confidence
        const confidence = extractConfidence('CONFIDENCE: 0.75');
        expect(confidence).toBe(0.75);
    });

    test('confidence scorer weights sum to 1', () => {
        const { WEIGHTS } = require('../src/reasoning/confidenceScorer');
        const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
    });

    test('cache stats reflect actual state', () => {
        const stats1 = getCacheStats();
        expect(stats1.size).toBe(0);

        setCachedReasoning('question one is the test', { a: 1 });
        setCachedReasoning('question two is the test', { b: 2 });

        const stats2 = getCacheStats();
        expect(stats2.size).toBe(2);

        clearCache();
        expect(getCacheStats().size).toBe(0);
    });

    test('plain text format is readable', () => {
        const text = formatAsPlainText({
            steps: ['First analysis', 'Second evaluation'],
            conclusion: 'Final answer',
            confidence: 0.7
        });
        expect(text).toContain('1. First analysis');
        expect(text).toContain('Kesimpulan');
        expect(text).toContain('70%');
    });
});
