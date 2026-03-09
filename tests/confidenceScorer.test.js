/**
 * Tests for Confidence Scorer
 */

const {
    scoreConfidence,
    isConfident,
    scoreStepCount,
    scoreStepQuality,
    scoreConclusionQuality,
    scoreQueryCoverage,
    WEIGHTS
} = require('../src/reasoning/confidenceScorer');

describe('confidenceScorer', () => {
    describe('scoreStepCount', () => {
        test('should score 0 for empty', () => {
            expect(scoreStepCount([])).toBe(0);
            expect(scoreStepCount(null)).toBe(0);
        });

        test('should score 0.3 for 1 step', () => {
            expect(scoreStepCount(['one'])).toBe(0.3);
        });

        test('should score 0.6 for 2 steps', () => {
            expect(scoreStepCount(['a', 'b'])).toBe(0.6);
        });

        test('should score 0.8 for 3 steps', () => {
            expect(scoreStepCount(['a', 'b', 'c'])).toBe(0.8);
        });

        test('should score 1.0 for 4+ steps', () => {
            expect(scoreStepCount(['a', 'b', 'c', 'd'])).toBe(1.0);
            expect(scoreStepCount(['a', 'b', 'c', 'd', 'e'])).toBe(1.0);
        });
    });

    describe('scoreStepQuality', () => {
        test('should score 0 for empty', () => {
            expect(scoreStepQuality([])).toBe(0);
            expect(scoreStepQuality(null)).toBe(0);
        });

        test('should score low for very short steps', () => {
            const score = scoreStepQuality(['hi', 'ok']);
            expect(score).toBeLessThan(0.5);
        });

        test('should score high for detailed steps', () => {
            const steps = [
                'This is a detailed analysis of the problem with multiple considerations',
                'After evaluating all the factors and their relationships in depth'
            ];
            const score = scoreStepQuality(steps);
            expect(score).toBeGreaterThanOrEqual(0.8);
        });

        test('should handle object steps', () => {
            const steps = [{ content: 'short' }];
            const score = scoreStepQuality(steps);
            expect(score).toBeGreaterThan(0);
        });
    });

    describe('scoreConclusionQuality', () => {
        test('should return 0 for empty', () => {
            expect(scoreConclusionQuality('')).toBe(0);
            expect(scoreConclusionQuality(null)).toBe(0);
        });

        test('should score low for very short', () => {
            expect(scoreConclusionQuality('ok')).toBe(0.3);
        });

        test('should score medium for moderate length', () => {
            const score = scoreConclusionQuality('The answer is probably yes');
            expect(score).toBeGreaterThanOrEqual(0.6);
        });

        test('should score high for detailed conclusion', () => {
            const score = scoreConclusionQuality('Based on the analysis of multiple factors including economic conditions and social impact this is a comprehensive conclusion');
            expect(score).toBeGreaterThanOrEqual(0.9);
        });
    });

    describe('scoreQueryCoverage', () => {
        test('should return 0 for empty inputs', () => {
            expect(scoreQueryCoverage('', 'response')).toBe(0);
            expect(scoreQueryCoverage('query', '')).toBe(0);
        });

        test('should score high when query terms appear in response', () => {
            const score = scoreQueryCoverage(
                'ekonomi Indonesia inflasi',
                'Analisis ekonomi Indonesia menunjukkan inflasi terkendali'
            );
            expect(score).toBeGreaterThan(0.5);
        });

        test('should score low when query terms are missing', () => {
            const score = scoreQueryCoverage(
                'blockchain cryptocurrency',
                'Cuaca hari ini cerah dan berawan'
            );
            expect(score).toBeLessThan(0.5);
        });

        test('should filter stop words', () => {
            const score = scoreQueryCoverage(
                'yang dan untuk dari',
                'response text here'
            );
            // All words are stop words or too short, returns 0.5 default
            expect(score).toBe(0.5);
        });
    });

    describe('scoreConfidence', () => {
        test('should return 0 for null input', () => {
            const result = scoreConfidence(null);
            expect(result.score).toBe(0);
            expect(result.level).toBe('none');
        });

        test('should score high for thorough reasoning', () => {
            const reasoning = {
                steps: [
                    'First we identify the core problem statement',
                    'Then we analyze the contributing factors',
                    'Next we evaluate possible solutions',
                    'Finally we synthesize the best approach'
                ],
                conclusion: 'The optimal solution involves combining multiple approaches for best results',
                confidence: 0.9,
                rawResponse: 'ekonomi Indonesia inflasi dampak pertumbuhan'
            };
            const result = scoreConfidence(reasoning, 'ekonomi Indonesia inflasi');
            expect(result.score).toBeGreaterThan(0.5);
            expect(result.level).toBe('high');
            expect(result.factors).toBeDefined();
        });

        test('should score low for empty reasoning', () => {
            const result = scoreConfidence({ steps: [], conclusion: '', confidence: 0 });
            expect(result.score).toBeLessThan(0.2);
            expect(result.level).toBe('none');
        });

        test('should include all factor scores', () => {
            const result = scoreConfidence({
                steps: ['one', 'two'],
                conclusion: 'done',
                confidence: 0.5,
                rawResponse: 'test'
            }, 'test');
            expect(result.factors).toHaveProperty('stepCount');
            expect(result.factors).toHaveProperty('stepQuality');
            expect(result.factors).toHaveProperty('conclusionQuality');
            expect(result.factors).toHaveProperty('aiConfidence');
            expect(result.factors).toHaveProperty('queryCoverage');
        });

        test('should clamp AI confidence to 0-1', () => {
            const result = scoreConfidence({
                steps: ['a'],
                conclusion: 'b',
                confidence: 5.0,
                rawResponse: ''
            });
            expect(result.factors.aiConfidence).toBe(1);
        });
    });

    describe('isConfident', () => {
        test('should return true for high confidence reasoning', () => {
            const reasoning = {
                steps: ['analyze', 'evaluate', 'synthesize', 'conclude'],
                conclusion: 'Clear answer based on thorough analysis of all relevant factors',
                confidence: 0.9,
                rawResponse: 'detailed response'
            };
            expect(isConfident(reasoning, 0.3)).toBe(true);
        });

        test('should return false for empty reasoning', () => {
            expect(isConfident({ steps: [], conclusion: '', confidence: 0 })).toBe(false);
        });

        test('should respect custom threshold', () => {
            const reasoning = {
                steps: ['one'],
                conclusion: 'maybe',
                confidence: 0.3,
                rawResponse: ''
            };
            expect(isConfident(reasoning, 0.9)).toBe(false);
        });
    });

    describe('WEIGHTS', () => {
        test('should sum to approximately 1.0', () => {
            const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0, 2);
        });

        test('should have all required weight keys', () => {
            expect(WEIGHTS).toHaveProperty('STEP_COUNT');
            expect(WEIGHTS).toHaveProperty('STEP_QUALITY');
            expect(WEIGHTS).toHaveProperty('CONCLUSION_PRESENT');
            expect(WEIGHTS).toHaveProperty('AI_CONFIDENCE');
            expect(WEIGHTS).toHaveProperty('QUERY_COVERAGE');
        });
    });
});
