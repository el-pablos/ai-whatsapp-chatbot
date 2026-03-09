/**
 * Confidence Scorer — evaluate reasoning quality
 *
 * Score confidence dari reasoning result berdasarkan
 * multiple heuristic factors.
 *
 * @author Tama El Pablo
 */

/**
 * Weight configuration for scoring factors
 */
const WEIGHTS = {
    STEP_COUNT: 0.2,        // More steps = more thorough
    STEP_QUALITY: 0.25,     // Content quality per step
    CONCLUSION_PRESENT: 0.2, // Has conclusion?
    AI_CONFIDENCE: 0.2,     // AI's own confidence
    QUERY_COVERAGE: 0.15    // Does answer address the query?
};

/**
 * Score based on reasoning step count
 * @param {string[]} steps
 * @returns {number} 0-1
 */
const scoreStepCount = (steps) => {
    if (!steps || steps.length === 0) return 0;
    if (steps.length >= 4) return 1.0;
    if (steps.length >= 3) return 0.8;
    if (steps.length >= 2) return 0.6;
    return 0.3;
};

/**
 * Score based on step content quality
 * Each step should be substantive (not filler)
 *
 * @param {string[]} steps
 * @returns {number} 0-1
 */
const scoreStepQuality = (steps) => {
    if (!steps || steps.length === 0) return 0;

    const scores = steps.map(step => {
        const content = typeof step === 'string' ? step : step.content || '';
        const wordCount = content.split(/\s+/).length;

        // Very short = filler
        if (wordCount < 5) return 0.2;
        // Short but ok
        if (wordCount < 10) return 0.5;
        // Good length
        if (wordCount < 30) return 0.8;
        // Detailed
        return 1.0;
    });

    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
};

/**
 * Score based on conclusion presence and quality
 *
 * @param {string} conclusion
 * @returns {number} 0-1
 */
const scoreConclusionQuality = (conclusion) => {
    if (!conclusion) return 0;

    const wordCount = conclusion.split(/\s+/).length;
    if (wordCount < 3) return 0.3;
    if (wordCount < 10) return 0.6;
    if (wordCount < 30) return 0.9;
    return 1.0;
};

/**
 * Score query coverage — check if key terms from query appear in reasoning
 *
 * @param {string} query
 * @param {string} fullResponse
 * @returns {number} 0-1
 */
const scoreQueryCoverage = (query, fullResponse) => {
    if (!query || !fullResponse) return 0;

    // Extract significant words (>3 chars, not common stops)
    const stopWords = new Set(['yang', 'dan', 'atau', 'dari', 'untuk', 'dengan', 'the', 'and', 'for', 'this', 'that', 'apa', 'ini', 'itu', 'ada', 'bisa', 'akan', 'juga', 'saya', 'kamu']);
    const queryWords = query.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));

    if (queryWords.length === 0) return 0.5;

    const responseLower = fullResponse.toLowerCase();
    const matched = queryWords.filter(w => responseLower.includes(w));
    return matched.length / queryWords.length;
};

/**
 * Calculate overall confidence score
 *
 * @param {object} reasoning
 * @param {string[]} reasoning.steps
 * @param {string} reasoning.conclusion
 * @param {number} reasoning.confidence - AI's own confidence
 * @param {string} reasoning.rawResponse
 * @param {string} query - original user query
 * @returns {{ score: number, factors: object, level: string }}
 */
const scoreConfidence = (reasoning, query = '') => {
    if (!reasoning) {
        return { score: 0, factors: {}, level: 'none' };
    }

    const { steps = [], conclusion = '', confidence: aiConf = 0, rawResponse = '' } = reasoning;

    const factors = {
        stepCount: scoreStepCount(steps),
        stepQuality: scoreStepQuality(steps),
        conclusionQuality: scoreConclusionQuality(conclusion),
        aiConfidence: Math.max(0, Math.min(1, aiConf)),
        queryCoverage: scoreQueryCoverage(query, rawResponse || conclusion)
    };

    // Weighted average
    const score =
        factors.stepCount * WEIGHTS.STEP_COUNT +
        factors.stepQuality * WEIGHTS.STEP_QUALITY +
        factors.conclusionQuality * WEIGHTS.CONCLUSION_PRESENT +
        factors.aiConfidence * WEIGHTS.AI_CONFIDENCE +
        factors.queryCoverage * WEIGHTS.QUERY_COVERAGE;

    const finalScore = Math.round(score * 100) / 100;

    let level;
    if (finalScore >= 0.8) level = 'high';
    else if (finalScore >= 0.5) level = 'medium';
    else if (finalScore >= 0.2) level = 'low';
    else level = 'none';

    return { score: finalScore, factors, level };
};

/**
 * Quick confidence check — returns boolean
 *
 * @param {object} reasoning
 * @param {number} [threshold=0.5]
 * @returns {boolean}
 */
const isConfident = (reasoning, threshold = 0.5) => {
    const { score } = scoreConfidence(reasoning);
    return score >= threshold;
};

module.exports = {
    scoreConfidence,
    isConfident,
    scoreStepCount,
    scoreStepQuality,
    scoreConclusionQuality,
    scoreQueryCoverage,
    WEIGHTS
};
