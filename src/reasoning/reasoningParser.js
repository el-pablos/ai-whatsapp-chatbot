/**
 * Reasoning Parser — parse & format reasoning output
 *
 * Convert raw AI reasoning ke structured data,
 * format buat WhatsApp display.
 *
 * @author Tama El Pablo
 */

const WA_SAFE_LIMIT = 4000;

/**
 * Parse reasoning steps from raw text
 * Supports multiple formats: "STEP N:", "N.", "- Step N"
 *
 * @param {string} rawText
 * @returns {Array<{ step: number, content: string }>}
 */
const parseSteps = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return [];

    const lines = rawText.split('\n');
    const steps = [];
    let currentStep = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Match "STEP N: content" or "Step N: content"
        const stepMatch = trimmed.match(/^(?:STEP|Step)\s+(\d+)\s*:\s*(.+)/);
        if (stepMatch) {
            if (currentStep) steps.push(currentStep);
            currentStep = { step: parseInt(stepMatch[1], 10), content: stepMatch[2].trim() };
            continue;
        }

        // Match "N. content" (numbered list)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch && !currentStep) {
            steps.push({ step: parseInt(numMatch[1], 10), content: numMatch[2].trim() });
            continue;
        }

        // Continuation of current step
        if (currentStep && !trimmed.match(/^(CONCLUSION|CONFIDENCE)/i)) {
            currentStep.content += ' ' + trimmed;
        }
    }

    if (currentStep) steps.push(currentStep);
    return steps;
};

/**
 * Extract conclusion from reasoning output
 *
 * @param {string} rawText
 * @returns {string}
 */
const extractConclusion = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return '';

    const match = rawText.match(/CONCLUSION\s*:\s*(.+?)(?=\nCONFIDENCE|\n\n|$)/is);
    return match ? match[1].trim() : '';
};

/**
 * Extract confidence from reasoning output
 *
 * @param {string} rawText
 * @returns {number} 0.0 - 1.0
 */
const extractConfidence = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return 0;

    const match = rawText.match(/CONFIDENCE\s*:\s*([\d.]+)/i);
    if (!match) return 0;

    const val = parseFloat(match[1]);
    if (isNaN(val)) return 0;
    return Math.max(0, Math.min(1, val));
};

/**
 * Format reasoning result for WhatsApp
 *
 * @param {object} reasoning
 * @param {string[]} reasoning.steps
 * @param {string} reasoning.conclusion
 * @param {number} reasoning.confidence
 * @returns {string}
 */
const formatForWhatsApp = (reasoning) => {
    if (!reasoning) return '';

    const { steps = [], conclusion = '', confidence = 0 } = reasoning;

    let output = '*🧠 Reasoning Analysis*\n\n';

    if (steps.length > 0) {
        steps.forEach((step, i) => {
            const content = typeof step === 'string' ? step : step.content || step;
            output += `*Step ${i + 1}:* ${content}\n\n`;
        });
    }

    if (conclusion) {
        output += `*💡 Kesimpulan:* ${conclusion}\n`;
    }

    if (confidence > 0) {
        const pct = Math.round(confidence * 100);
        const bar = pct >= 80 ? '🟢' : pct >= 50 ? '🟡' : '🔴';
        output += `\n${bar} Confidence: ${pct}%`;
    }

    // Truncate if too long
    if (output.length > WA_SAFE_LIMIT) {
        output = output.substring(0, WA_SAFE_LIMIT - 20) + '\n\n_...dipotong_';
    }

    return output.trim();
};

/**
 * Format reasoning as plain text (non-WhatsApp)
 *
 * @param {object} reasoning
 * @returns {string}
 */
const formatAsPlainText = (reasoning) => {
    if (!reasoning) return '';

    const { steps = [], conclusion = '', confidence = 0 } = reasoning;

    let output = 'Reasoning Analysis\n\n';

    if (steps.length > 0) {
        steps.forEach((step, i) => {
            const content = typeof step === 'string' ? step : step.content || step;
            output += `${i + 1}. ${content}\n`;
        });
        output += '\n';
    }

    if (conclusion) {
        output += `Kesimpulan: ${conclusion}\n`;
    }

    if (confidence > 0) {
        output += `Confidence: ${Math.round(confidence * 100)}%\n`;
    }

    return output.trim();
};

/**
 * Summarize reasoning steps into compact form
 *
 * @param {string[]} steps
 * @param {number} [maxLength=500]
 * @returns {string}
 */
const summarizeSteps = (steps, maxLength = 500) => {
    if (!steps || steps.length === 0) return '';

    const compact = steps.map((s, i) => {
        const content = typeof s === 'string' ? s : s.content || '';
        // Truncate each step
        return `${i + 1}. ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
    }).join('\n');

    if (compact.length > maxLength) {
        return compact.substring(0, maxLength - 3) + '...';
    }

    return compact;
};

module.exports = {
    parseSteps,
    extractConclusion,
    extractConfidence,
    formatForWhatsApp,
    formatAsPlainText,
    summarizeSteps,
    WA_SAFE_LIMIT
};
