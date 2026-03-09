/**
 * RAG Generator — generate answers using retrieved context + AI
 *
 * Ambil context dari retriever, inject ke prompt, kirim ke AI.
 * Format output buat WhatsApp friendly.
 *
 * @author Tama El Pablo
 */

const axios = require('axios');

const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4-20250514';
const RAG_TIMEOUT = parseInt(process.env.RAG_TIMEOUT_MS, 10) || 60000;
const RAG_TEMPERATURE = parseFloat(process.env.RAG_TEMPERATURE) || 0.4;
const MAX_ANSWER_LENGTH = 3800; // WhatsApp safe limit

/**
 * Generate an answer using retrieved context
 *
 * @param {string} query - user question
 * @param {string} context - retrieved document context
 * @param {object} [options={}]
 * @param {string} [options.systemPrompt] - custom system prompt
 * @param {string} [options.language='id'] - response language
 * @param {number} [options.maxTokens=1500]
 * @returns {Promise<{ answer: string, fromContext: boolean, tokensUsed: number }>}
 */
const generate = async (query, context, options = {}) => {
    if (!query || typeof query !== 'string') {
        return { answer: '', fromContext: false, tokensUsed: 0 };
    }

    const language = options.language || 'id';
    const maxTokens = options.maxTokens || 1500;
    const hasContext = !!(context && context.trim().length > 0);

    const systemPrompt = options.systemPrompt || _buildSystemPrompt(language, hasContext);
    const userPrompt = _buildUserPrompt(query, context);

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: RAG_TEMPERATURE,
                max_tokens: maxTokens
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: RAG_TIMEOUT
            }
        );

        const answer = response.data?.choices?.[0]?.message?.content || '';
        const tokensUsed = response.data?.usage?.total_tokens || 0;

        // Truncate if too long for WhatsApp
        const truncated = answer.length > MAX_ANSWER_LENGTH
            ? answer.substring(0, MAX_ANSWER_LENGTH) + '\n\n_...jawaban dipotong karena terlalu panjang_'
            : answer;

        return {
            answer: truncated,
            fromContext: hasContext,
            tokensUsed
        };
    } catch (err) {
        console.error('[RAGGenerator] Generation failed:', err.message);
        return {
            answer: _getFallbackAnswer(query, hasContext),
            fromContext: false,
            tokensUsed: 0
        };
    }
};

/**
 * Format RAG answer for WhatsApp
 *
 * @param {string} answer
 * @param {object} stats - retrieval stats
 * @param {boolean} [showStats=false]
 * @returns {string}
 */
const formatAnswer = (answer, stats = {}, showStats = false) => {
    if (!answer) return '';

    let formatted = answer;

    if (showStats && stats.found > 0) {
        formatted += `\n\n📚 _Sumber: ${stats.found} dokumen (relevansi: ${((stats.maxScore || 0) * 100).toFixed(0)}%)_`;
    }

    return formatted;
};

/**
 * Generate with citation markers
 * Adds [1], [2] etc. referencing source chunks
 *
 * @param {string} query
 * @param {Array<{ text: string, metadata: object }>} chunks
 * @param {object} [options={}]
 * @returns {Promise<{ answer: string, citations: Array }>}
 */
const generateWithCitations = async (query, chunks, options = {}) => {
    try {
    if (!chunks || chunks.length === 0) {
        const result = await generate(query, '', options);
        return { answer: result.answer, citations: [] };
    }

    // Build context with citation numbers
    const contextParts = chunks.map((chunk, i) => {
        const text = chunk.text || chunk.metadata?.text || '';
        const source = chunk.metadata?.source || chunk.metadata?.documentId || 'unknown';
        return `[${i + 1}] (source: ${source})\n${text}`;
    });

    const context = contextParts.join('\n\n---\n\n');

    const citationPrompt = `${options.systemPrompt || _buildSystemPrompt(options.language || 'id', true)}
When using information from the context, reference it with [N] markers matching the source numbers.`;

    const result = await generate(query, context, {
        ...options,
        systemPrompt: citationPrompt
    });

    const citations = chunks.map((chunk, i) => ({
        number: i + 1,
        source: chunk.metadata?.source || chunk.metadata?.documentId || 'unknown',
        heading: chunk.metadata?.heading || '',
        score: chunk.score || 0
    }));

    return {
        answer: result.answer,
        citations
    };
    } catch (err) {
        console.error('[RAGGenerator] generateWithCitations failed:', err.message);
        // Fallback: try generating without citations
        try {
            const fallback = await generate(query, '', {});
            return { answer: fallback.answer, citations: [] };
        } catch {
            return { answer: 'Maaf, gagal generate jawaban dengan sumber. Coba lagi ya.', citations: [] };
        }
    }
};

// ─── Internal helpers ────────────────────────────────────────

const _buildSystemPrompt = (language, hasContext) => {
    const langInstruction = language === 'id'
        ? 'Jawab dalam Bahasa Indonesia yang natural dan casual.'
        : 'Answer in the requested language naturally.';

    if (hasContext) {
        return `Kamu adalah asisten AI yang menjawab pertanyaan berdasarkan konteks dokumen yang diberikan.
${langInstruction}
- Jawab berdasarkan konteks yang tersedia
- Jika konteks tidak cukup untuk menjawab, katakan dengan jujur
- Jangan mengarang informasi yang tidak ada di konteks
- Gunakan format yang mudah dibaca di WhatsApp (bold, list, dll)`;
    }

    return `Kamu adalah asisten AI yang membantu menjawab pertanyaan.
${langInstruction}
- Jawab sebaik mungkin berdasarkan pengetahuanmu
- Jika tidak yakin, katakan dengan jujur
- Format untuk WhatsApp (bold, list, dll)`;
};

const _buildUserPrompt = (query, context) => {
    if (context && context.trim().length > 0) {
        return `Berdasarkan konteks dokumen berikut:

---
${context}
---

Pertanyaan: ${query}`;
    }

    return query;
};

const _getFallbackAnswer = (query, hadContext) => {
    if (hadContext) {
        return 'Maaf, gw gagal generate jawaban dari dokumen. Coba tanya lagi ya.';
    }
    return 'Maaf, gw gagal proses pertanyaan lu. Coba lagi ntar ya.';
};

module.exports = {
    generate,
    formatAnswer,
    generateWithCitations,
    MAX_ANSWER_LENGTH,
    RAG_TEMPERATURE
};
