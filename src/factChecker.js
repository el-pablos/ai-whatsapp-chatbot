/**
 * Fact Checker — AI-powered fact verification via Claude Sonnet
 *
 * Membandingkan klaim AI dengan data internet terbaru
 * menggunakan Copilot API.
 *
 * @author Tama El Pablo
 */

const { COPILOT_API_URL, COPILOT_API_MODEL } = require('./aiHandler');
const axios = require('axios');

const VERIFY_TIMEOUT = 30_000; // 30 seconds

// ═══════════════════════════════════════════════════════════
//  CORE: verifyWithInternet
// ═══════════════════════════════════════════════════════════

/**
 * Verify AI response against internet data using Claude
 *
 * @param {string} originalResponse - respon AI asli
 * @param {object} searchResults - hasil dari aggregateSearch
 * @param {string} userQuery - pertanyaan user 
 * @returns {Promise<{ verified: string, corrections: string, confidence: number, updatedResponse: string, sources: string[] }>}
 */
const verifyWithInternet = async (originalResponse, searchResults, userQuery) => {
    if (!originalResponse || !searchResults || !searchResults.results?.length) {
        return {
            verified: 'unknown',
            corrections: 'none',
            confidence: 0,
            updatedResponse: null,
            sources: [],
        };
    }

    // Format search results for the prompt
    const formattedResults = searchResults.results
        .map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}${r.url ? ` (${r.url})` : ''}`)
        .join('\n');

    const verifyPrompt = `Kamu adalah fact-checker. Bandingkan jawaban AI berikut dengan data internet terbaru.

JAWABAN AI: ${originalResponse.substring(0, 2000)}

DATA INTERNET:
${formattedResults.substring(0, 3000)}

PERTANYAAN USER: ${userQuery.substring(0, 500)}

Output format (WAJIB exact format berikut, 1 line per field):
VERIFIED: [true/false/partial]
CORRECTIONS: [koreksi jika ada, atau "none"]
CONFIDENCE: [0.0-1.0]
UPDATED_RESPONSE: [jawaban yang sudah diperbarui dengan gaya casual Indonesia, atau "none" jika tidak perlu update]
SOURCES: [sumber yang dipakai, pisahkan dengan koma]

ATURAN:
- Jika jawaban AI sudah benar, VERIFIED: true dan UPDATED_RESPONSE: none
- Jika ada koreksi kecil, tulis UPDATED_RESPONSE yang memperbaiki bagian yang salah saja
- UPDATED_RESPONSE harus tetap gaya casual (jangan formal)
- Confidence 1.0 = sangat yakin, 0.5 = cukup yakin, 0.0 = tidak yakin`;

    try {
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [{ role: 'user', content: verifyPrompt }],
                temperature: 0.3,
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: VERIFY_TIMEOUT },
        );

        const text = response.data?.choices?.[0]?.message?.content || '';
        return parseVerificationResponse(text, searchResults);
    } catch (err) {
        console.error('[FactChecker] Verification API call failed:', err.message);
        return {
            verified: 'unknown',
            corrections: 'none',
            confidence: 0,
            updatedResponse: null,
            sources: [],
        };
    }
};

// ═══════════════════════════════════════════════════════════
//  PARSE VERIFICATION RESPONSE
// ═══════════════════════════════════════════════════════════

/**
 * Parse the structured verification response from Claude
 */
const parseVerificationResponse = (text, searchResults) => {
    const result = {
        verified: 'unknown',
        corrections: 'none',
        confidence: 0,
        updatedResponse: null,
        sources: [],
    };

    // Parse VERIFIED field
    const verifiedMatch = /VERIFIED:\s*(true|false|partial)/i.exec(text);
    if (verifiedMatch) {
        result.verified = verifiedMatch[1].toLowerCase();
    }

    // Parse CORRECTIONS field
    const correctionsMatch = /CORRECTIONS:\s*(.+?)(?=\n(?:CONFIDENCE|UPDATED_RESPONSE|SOURCES):|\n*$)/is.exec(text);
    if (correctionsMatch) {
        result.corrections = correctionsMatch[1].trim();
    }

    // Parse CONFIDENCE field
    const confidenceMatch = /CONFIDENCE:\s*([\d.]+)/i.exec(text);
    if (confidenceMatch) {
        result.confidence = Math.min(Math.max(parseFloat(confidenceMatch[1]) || 0, 0), 1.0);
    }

    // Parse UPDATED_RESPONSE field
    const updatedMatch = /UPDATED_RESPONSE:\s*(.+?)(?=\nSOURCES:|\n*$)/is.exec(text);
    if (updatedMatch) {
        const updated = updatedMatch[1].trim();
        if (updated.toLowerCase() !== 'none') {
            result.updatedResponse = updated;
        }
    }

    // Parse SOURCES field
    const sourcesMatch = /SOURCES:\s*(.+?)$/im.exec(text);
    if (sourcesMatch) {
        const sourcesText = sourcesMatch[1].trim();
        if (sourcesText.toLowerCase() !== 'none') {
            result.sources = sourcesText
                .split(/[,;]/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }
    }

    // If no sources from parsing, extract from search results
    if (result.sources.length === 0 && searchResults?.results) {
        result.sources = searchResults.results
            .filter(r => r.source)
            .map(r => r.source)
            .slice(0, 3);
    }

    return result;
};

module.exports = {
    verifyWithInternet,
    parseVerificationResponse,
};
