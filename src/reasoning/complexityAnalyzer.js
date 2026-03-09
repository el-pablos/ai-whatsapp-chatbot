/**
 * Complexity Analyzer — determine question complexity
 *
 * Analisis query buat decide apakah butuh full reasoning
 * atau cukup jawab langsung.
 *
 * @author Tama El Pablo
 */

/**
 * Complexity levels
 */
const COMPLEXITY = {
    SIMPLE: 'simple',
    MODERATE: 'moderate',
    COMPLEX: 'complex'
};

/**
 * Score thresholds
 */
const THRESHOLDS = {
    MODERATE: 0.35,
    COMPLEX: 0.65
};

// --- Pattern definitions ---

/** Multi-part question indicators */
const MULTI_PART_PATTERNS = [
    /\b(dan|serta|juga|plus|selain itu)\b.*\?/i,
    /\b(pertama|kedua|ketiga)\b/i,
    /\b(bandingkan|perbandingan|vs|versus)\b/i,
    /\b(compare|comparison)\b/i,
    /\d+\.\s+/,  // numbered items
    /\b(apa saja|berapa banyak|sebutkan)\b/i
];

/** Deep analysis indicators */
const ANALYSIS_PATTERNS = [
    /\b(mengapa|kenapa|why)\b/i,
    /\b(bagaimana|how)\b.*\b(bisa|could|would)\b/i,
    /\b(jelaskan|explain|elaborate)\b/i,
    /\b(analisis|analyze|analysis)\b/i,
    /\b(pro\s*(dan|&)\s*kontra|kelebihan\s*(dan|&)\s*kekurangan)\b/i,
    /\b(dampak|impact|efek|effect|konsekuensi)\b/i,
    /\b(strategi|strategy|approach|pendekatan)\b/i
];

/** Math/logic indicators */
const LOGIC_PATTERNS = [
    /\b(hitung|calculate|kalkulasi)\b/i,
    /\b(buktikan|prove|proof)\b/i,
    /\b(logika|logic|reasoning)\b/i,
    /\b(jika.*maka|if.*then)\b/i,
    /\b(probabilitas|probability|peluang)\b/i,
    /[\d+\-*/^=]+/,
    /\b(rumus|formula|equation)\b/i
];

/** Multi-step task indicators */
const MULTI_STEP_PATTERNS = [
    /\b(langkah|step|tahap)\b/i,
    /\b(cara|how\s+to|tutorial)\b.*\b(membuat|bikin|create|build)\b/i,
    /\b(proses|process|workflow)\b/i,
    /\b(implementasi|implement|setup)\b/i,
    /\b(debug|troubleshoot|fix)\b.*\b(error|bug|issue|masalah)\b/i
];

/** Simple query indicators (reduce complexity score) */
const SIMPLE_PATTERNS = [
    /^(hi|halo|hello|hey|yo|hai)\b/i,
    /^(apa kabar|gimana kabar|how are you)/i,
    /^(thanks|makasih|thx|ty)\b/i,
    /^(ok|oke|siap|yoi|iya)\b/i,
    /^(ya|yep|yap|no|ga|gak|nggak)\b$/i,
    /\b(tl;?dr|singkat|summary|rangkum)\b/i,
    /^[^?]{0,30}$/  // very short, no multi-clause
];

/** Opinion/subjective (moderate, not complex) */
const OPINION_PATTERNS = [
    /\b(menurut|pendapat|opinion|think)\b/i,
    /\b(rekomendasi|recommend|saran|suggest)\b/i,
    /\b(bagus|lebih baik|better|best|worst)\b/i,
    /\b(favorit|favourite|favorite)\b/i
];

/**
 * Count pattern matches
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {number}
 */
const countMatches = (text, patterns) => {
    return patterns.filter(p => p.test(text)).length;
};

/**
 * Analyze query complexity
 *
 * @param {string} query
 * @returns {{ level: string, score: number, needsReasoning: boolean, factors: string[] }}
 */
const analyzeComplexity = (query) => {
    if (!query || typeof query !== 'string') {
        return { level: COMPLEXITY.SIMPLE, score: 0, needsReasoning: false, factors: [] };
    }

    const text = query.trim();
    if (text.length === 0) {
        return { level: COMPLEXITY.SIMPLE, score: 0, needsReasoning: false, factors: [] };
    }

    const factors = [];
    let score = 0;

    // --- Simple checks (reduce score) ---
    const simpleCount = countMatches(text, SIMPLE_PATTERNS);
    if (simpleCount > 0) {
        score -= 0.2 * simpleCount;
        factors.push('simple_pattern');
    }

    // Short queries are simpler
    if (text.length < 20) {
        score -= 0.15;
        factors.push('very_short');
    }

    // --- Complexity boosters ---

    // Multi-part questions
    const multiPartCount = countMatches(text, MULTI_PART_PATTERNS);
    if (multiPartCount > 0) {
        score += 0.15 * multiPartCount;
        factors.push('multi_part');
    }

    // Analytical depth
    const analysisCount = countMatches(text, ANALYSIS_PATTERNS);
    if (analysisCount > 0) {
        score += 0.2 * analysisCount;
        factors.push('analysis_required');
    }

    // Logic/math
    const logicCount = countMatches(text, LOGIC_PATTERNS);
    if (logicCount > 0) {
        score += 0.2 * logicCount;
        factors.push('logic_math');
    }

    // Multi-step tasks
    const multiStepCount = countMatches(text, MULTI_STEP_PATTERNS);
    if (multiStepCount > 0) {
        score += 0.15 * multiStepCount;
        factors.push('multi_step');
    }

    // Opinion (moderate bump)
    const opinionCount = countMatches(text, OPINION_PATTERNS);
    if (opinionCount > 0) {
        score += 0.1;
        factors.push('opinion');
    }

    // Question mark count (more questions = more complex)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 1) {
        score += 0.1 * (questionCount - 1);
        factors.push('multiple_questions');
    }

    // Word count (longer = potentially more complex)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 30) {
        score += 0.1;
        factors.push('long_query');
    }
    if (wordCount > 60) {
        score += 0.1;
        factors.push('very_long_query');
    }

    // Clamp to 0-1
    score = Math.max(0, Math.min(1, score));

    // Determine level
    let level;
    if (score >= THRESHOLDS.COMPLEX) {
        level = COMPLEXITY.COMPLEX;
    } else if (score >= THRESHOLDS.MODERATE) {
        level = COMPLEXITY.MODERATE;
    } else {
        level = COMPLEXITY.SIMPLE;
    }

    return {
        level,
        score: Math.round(score * 100) / 100,
        needsReasoning: level === COMPLEXITY.COMPLEX,
        factors: [...new Set(factors)]
    };
};

/**
 * Quick check if query needs reasoning (boolean shortcut)
 *
 * @param {string} query
 * @returns {boolean}
 */
const needsReasoning = (query) => {
    return analyzeComplexity(query).needsReasoning;
};

module.exports = {
    analyzeComplexity,
    needsReasoning,
    countMatches,
    COMPLEXITY,
    THRESHOLDS,
    MULTI_PART_PATTERNS,
    ANALYSIS_PATTERNS,
    LOGIC_PATTERNS,
    MULTI_STEP_PATTERNS,
    SIMPLE_PATTERNS,
    OPINION_PATTERNS
};
