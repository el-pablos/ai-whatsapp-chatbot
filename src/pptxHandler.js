/**
 * PPTX Handler — Generate & send PowerPoint presentations
 *
 * Pipeline:
 *   1. buildSlideSpec() — AI generates a JSON slide spec
 *   2. validateSlideSpec() — validate schema before generation
 *   3. generatePptx() — call Python pptx_generator.py
 *   4. sendPptx() — send .pptx file via Baileys
 *
 * Integrates with toolRegistry as 'presentation.create' tool.
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { runPythonJSON, isPythonAvailable } = require('./pythonRunner');

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const TEMP_DIR = path.join(process.cwd(), 'temp_files');
const PPTX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const PPTX_GENERATOR_SCRIPT = 'pptx_generator.py';
const MAX_SLIDES = 20;
const MIN_SLIDES = 1;

// Allowed slide types
const VALID_SLIDE_TYPES = new Set(['title', 'bullets', 'summary']);

// ═══════════════════════════════════════════════════════════
//  SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate a slide spec object for schema correctness.
 *
 * @param {object} spec - The slide spec to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateSlideSpec = (spec) => {
    const errors = [];

    if (!spec || typeof spec !== 'object') {
        return { valid: false, errors: ['Spec must be a JSON object'] };
    }

    // title: required non-empty string
    if (!spec.title || typeof spec.title !== 'string' || !spec.title.trim()) {
        errors.push("'title' is required and must be a non-empty string");
    }

    // slides: required array
    if (!Array.isArray(spec.slides)) {
        errors.push("'slides' is required and must be an array");
    } else {
        if (spec.slides.length < MIN_SLIDES) {
            errors.push(`'slides' must have at least ${MIN_SLIDES} slide`);
        }
        if (spec.slides.length > MAX_SLIDES) {
            errors.push(`'slides' must have at most ${MAX_SLIDES} slides`);
        }

        for (let i = 0; i < spec.slides.length; i++) {
            const s = spec.slides[i];
            if (!s || typeof s !== 'object') {
                errors.push(`slides[${i}] must be an object`);
                continue;
            }

            const slideType = s.type || 'bullets';
            if (!VALID_SLIDE_TYPES.has(slideType)) {
                errors.push(`slides[${i}].type '${slideType}' is not valid (allowed: ${[...VALID_SLIDE_TYPES].join(', ')})`);
            }

            if (slideType === 'bullets' || slideType === 'summary') {
                if (s.bullets !== undefined && !Array.isArray(s.bullets)) {
                    errors.push(`slides[${i}].bullets must be an array`);
                }
            }

            if (slideType === 'summary' && s.next_steps !== undefined) {
                if (!Array.isArray(s.next_steps)) {
                    errors.push(`slides[${i}].next_steps must be an array`);
                }
            }
        }
    }

    // notes: optional object
    if (spec.notes !== undefined) {
        if (typeof spec.notes !== 'object' || spec.notes === null) {
            errors.push("'notes' must be an object");
        } else if (spec.notes.per_slide !== undefined && !Array.isArray(spec.notes.per_slide)) {
            errors.push("'notes.per_slide' must be an array");
        }
    }

    return { valid: errors.length === 0, errors };
};

// ═══════════════════════════════════════════════════════════
//  CORE: GENERATE PPTX
// ═══════════════════════════════════════════════════════════

/**
 * Ensure temp directory exists
 */
const ensureTempDir = () => {
    try {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
    } catch { /* ignore */ }
};

/**
 * Clean up temp files
 * @param {...string} filePaths - Files to remove
 */
const cleanupFiles = (...filePaths) => {
    for (const fp of filePaths) {
        try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* ignore */ }
    }
};

/**
 * Generate a PPTX file from a validated slide spec.
 *
 * @param {object} spec - Validated slide spec
 * @param {string} [outputFilename] - Output filename (default: auto-generated)
 * @returns {Promise<{ filePath: string, fileName: string, fileSize: number }>}
 */
const generatePptx = async (spec, outputFilename) => {
    ensureTempDir();

    const timestamp = Date.now();
    const sanitizedTitle = (spec.title || 'presentasi')
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

    const fileName = outputFilename || `${sanitizedTitle}_${timestamp}.pptx`;
    const specPath = path.join(TEMP_DIR, `spec_${timestamp}.json`);
    const outputPath = path.join(TEMP_DIR, fileName);

    try {
        // Write spec to temp JSON
        fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf-8');

        // Run Python generator
        const result = await runPythonJSON(PPTX_GENERATOR_SCRIPT, [
            '--in', specPath,
            '--out', outputPath,
        ]);

        if (!result.success) {
            throw new Error(result.error || 'PPTX generation failed');
        }

        // Clean up spec file
        cleanupFiles(specPath);

        return {
            filePath: outputPath,
            fileName,
            fileSize: result.size || 0,
            slideCount: result.slides || spec.slides.length,
        };
    } catch (err) {
        cleanupFiles(specPath, outputPath);
        throw err;
    }
};

/**
 * Send a PPTX file via WhatsApp as a document.
 *
 * @param {object} sock - Baileys socket instance
 * @param {string} chatId - Recipient JID
 * @param {string} filePath - Absolute path to .pptx file
 * @param {string} fileName - Display filename
 * @param {object} [options]
 * @param {object} [options.quoted] - Message to quote
 * @param {string} [options.caption] - Caption text
 * @returns {Promise<boolean>}
 */
const sendPptx = async (sock, chatId, filePath, fileName, options = {}) => {
    const buffer = fs.readFileSync(filePath);
    const msgOptions = options.quoted ? { quoted: options.quoted } : {};

    await sock.sendMessage(chatId, {
        document: buffer,
        mimetype: PPTX_MIMETYPE,
        fileName: fileName.endsWith('.pptx') ? fileName : `${fileName}.pptx`,
        caption: options.caption || `📊 *${fileName}*\n\n_tap buat save ke device lu_`,
    }, msgOptions);

    console.log(`[PptxHandler] Sent PPTX: ${fileName} (${buffer.length} bytes) to ${chatId}`);

    // Cleanup after sending
    cleanupFiles(filePath);

    return true;
};

/**
 * Full pipeline: validate spec → generate → return result for toolRegistry.
 * Does NOT send directly (that's the router's job).
 *
 * @param {object} spec - Slide spec from AI
 * @param {string} [outputFilename] - Optional output filename
 * @returns {Promise<object>} Tool result with type='pptx'
 */
const createPptxFromSpec = async (spec, outputFilename) => {
    // Validate
    const validation = validateSlideSpec(spec);
    if (!validation.valid) {
        return {
            success: false,
            error: `Invalid slide spec: ${validation.errors.join('; ')}`,
        };
    }

    // Check Python availability
    const pythonOk = await isPythonAvailable();
    if (!pythonOk) {
        return {
            success: false,
            error: 'Python is not available on this server. Install Python 3 and python-pptx.',
        };
    }

    // Generate
    try {
        const result = await generatePptx(spec, outputFilename);
        return {
            success: true,
            type: 'pptx',
            filePath: result.filePath,
            fileName: result.fileName,
            fileSize: result.fileSize,
            slideCount: result.slideCount,
            mimetype: PPTX_MIMETYPE,
        };
    } catch (err) {
        console.error('[PptxHandler] Generation error:', err.message);
        return {
            success: false,
            error: `PPTX generation failed: ${err.message}`,
        };
    }
};

// ═══════════════════════════════════════════════════════════
//  DETECT PPTX REQUEST
// ═══════════════════════════════════════════════════════════

/**
 * Detect if user message is requesting a PPTX/presentation.
 *
 * @param {string} text - User message text
 * @returns {{ isPptxRequest: boolean, slideCount: number|null }}
 */
const detectPptxRequest = (text) => {
    if (!text) return { isPptxRequest: false, slideCount: null };

    const lower = text.toLowerCase();

    // Check for PPTX/PPT/PowerPoint/slide/presentation keywords
    const pptxKeywords = /\b(pptx|ppt|powerpoint|presentasi|slide)\b/i;
    const hasKeyword = pptxKeywords.test(lower);

    if (!hasKeyword) return { isPptxRequest: false, slideCount: null };

    // Try to extract slide count
    const slideCountMatch = lower.match(/(\d+)\s*slide/i);
    const slideCount = slideCountMatch ? parseInt(slideCountMatch[1], 10) : null;

    return {
        isPptxRequest: true,
        slideCount: slideCount ? Math.min(Math.max(slideCount, 2), MAX_SLIDES) : 5, // default 5
    };
};

module.exports = {
    validateSlideSpec,
    generatePptx,
    sendPptx,
    createPptxFromSpec,
    detectPptxRequest,
    cleanupFiles,
    ensureTempDir,
    PPTX_MIMETYPE,
    PPTX_GENERATOR_SCRIPT,
    VALID_SLIDE_TYPES,
    MAX_SLIDES,
    MIN_SLIDES,
    TEMP_DIR,
};
