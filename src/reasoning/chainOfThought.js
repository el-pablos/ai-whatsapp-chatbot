/**
 * Chain of Thought — step-by-step reasoning engine
 *
 * Multi-step reasoning buat pertanyaan kompleks.
 * Break down query → reasoning steps → aggregate → final answer.
 *
 * @author Tama El Pablo
 */

const axios = require('axios');

const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4-20250514';
const REASONING_ENABLED = process.env.REASONING_ENABLED !== 'false';
const REASONING_TIMEOUT = parseInt(process.env.REASONING_TIMEOUT_MS, 10) || 120000;
const MAX_REASONING_STEPS = 8;
const MIN_QUERY_LENGTH = 10;

/**
 * Build reasoning prompt from query + context
 */
const buildReasoningPrompt = (query, context = {}) => {
    const { conversationHistory = [], userProfile = '', additionalContext = '' } = context;

    let historyBlock = '';
    if (conversationHistory.length > 0) {
        const last3 = conversationHistory.slice(-3);
        historyBlock = '\n\nKonteks percakapan sebelumnya:\n' +
            last3.map(h => `- ${h.role}: ${h.content?.substring(0, 200) || ''}`).join('\n');
    }

    let profileBlock = '';
    if (userProfile) {
        profileBlock = `\nProfil user: ${userProfile}`;
    }

    let extraBlock = '';
    if (additionalContext) {
        extraBlock = `\nKonteks tambahan: ${additionalContext}`;
    }

    return `Kamu adalah reasoning engine. Analisis pertanyaan berikut secara step-by-step.

Pertanyaan: "${query}"
${profileBlock}${historyBlock}${extraBlock}

Jawab dengan format WAJIB ini:

STEP 1: [Identifikasi inti pertanyaan]
STEP 2: [Analisis komponen utama]
STEP 3: [Pertimbangkan sudut pandang berbeda]
STEP 4: [Sintesis jawaban]
CONCLUSION: [Jawaban final yang ringkas dan jelas]
CONFIDENCE: [0.0-1.0]

Catatan:
- Minimal 2 step, maksimal ${MAX_REASONING_STEPS} step
- Gunakan bahasa Indonesia casual
- Setiap step harus substantif, bukan filler
- CONCLUSION wajib ada
- CONFIDENCE wajib ada (float 0.0-1.0)`;
};

/**
 * Perform chain-of-thought reasoning
 *
 * @param {string} query - user question
 * @param {object} [context={}] - optional context (conversationHistory, userProfile, additionalContext)
 * @returns {Promise<{ steps: string[], conclusion: string, confidence: number, rawResponse: string, success: boolean }>}
 */
const performReasoning = async (query, context = {}) => {
    if (!REASONING_ENABLED) {
        return {
            steps: [],
            conclusion: '',
            confidence: 0,
            rawResponse: '',
            success: false,
            error: 'Reasoning disabled'
        };
    }

    if (!query || query.length < MIN_QUERY_LENGTH) {
        return {
            steps: [],
            conclusion: '',
            confidence: 0,
            rawResponse: '',
            success: false,
            error: 'Query too short'
        };
    }

    const prompt = buildReasoningPrompt(query, context);

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: REASONING_TIMEOUT
            }
        );

        const rawResponse = response.data?.choices?.[0]?.message?.content || '';

        if (!rawResponse) {
            return {
                steps: [],
                conclusion: '',
                confidence: 0,
                rawResponse: '',
                success: false,
                error: 'Empty AI response'
            };
        }

        // Parse the response
        const parsed = parseReasoningResponse(rawResponse);

        return {
            ...parsed,
            rawResponse,
            success: true
        };
    } catch (err) {
        console.error('[ChainOfThought] Reasoning failed:', err.message);
        return {
            steps: [],
            conclusion: '',
            confidence: 0,
            rawResponse: '',
            success: false,
            error: err.message
        };
    }
};

/**
 * Parse raw AI response into structured reasoning
 */
const parseReasoningResponse = (rawResponse) => {
    if (!rawResponse || typeof rawResponse !== 'string') {
        return { steps: [], conclusion: '', confidence: 0 };
    }
    const lines = rawResponse.split('\n');
    const steps = [];
    let conclusion = '';
    let confidence = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        // Match STEP N: ...
        const stepMatch = trimmed.match(/^STEP\s+(\d+)\s*:\s*(.+)/i);
        if (stepMatch) {
            steps.push(stepMatch[2].trim());
            continue;
        }

        // Match CONCLUSION: ...
        const conclusionMatch = trimmed.match(/^CONCLUSION\s*:\s*(.+)/i);
        if (conclusionMatch) {
            conclusion = conclusionMatch[1].trim();
            continue;
        }

        // Match CONFIDENCE: ...
        const confMatch = trimmed.match(/^CONFIDENCE\s*:\s*([\d.]+)/i);
        if (confMatch) {
            confidence = parseFloat(confMatch[1]);
            if (isNaN(confidence)) confidence = 0;
            confidence = Math.max(0, Math.min(1, confidence));
            continue;
        }

        // Append multi-line conclusion
        if (conclusion && !stepMatch && !confMatch && trimmed && !trimmed.match(/^(STEP|CONFIDENCE)/i)) {
            conclusion += ' ' + trimmed;
        }
    }

    return { steps, conclusion, confidence };
};

/**
 * Quick reasoning check — sederhana, cuma 1 step
 * Buat pertanyaan yang butuh sedikit reasoning tapi ga full chain
 *
 * @param {string} query
 * @returns {Promise<{ answer: string, confidence: number, success: boolean }>}
 */
const quickReason = async (query) => {
    if (!REASONING_ENABLED || !query || query.length < MIN_QUERY_LENGTH) {
        return { answer: '', confidence: 0, success: false };
    }

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [{
                    role: 'user',
                    content: `Analisis singkat dan jawab pertanyaan ini:\n"${query}"\n\nJawab dalam 1-2 kalimat, bahasa Indonesia casual.`
                }],
                temperature: 0.3
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content || '';
        return { answer, confidence: answer ? 0.7 : 0, success: !!answer };
    } catch (err) {
        console.error('[ChainOfThought] Quick reason failed:', err.message);
        return { answer: '', confidence: 0, success: false };
    }
};

module.exports = {
    performReasoning,
    parseReasoningResponse,
    buildReasoningPrompt,
    quickReason,
    MAX_REASONING_STEPS,
    MIN_QUERY_LENGTH,
    REASONING_ENABLED
};
