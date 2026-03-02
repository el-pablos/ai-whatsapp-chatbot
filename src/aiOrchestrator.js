/**
 * AI Orchestrator — the "brain" of AI-First Architecture
 *
 * Flow:
 *   normalizedMsg ──▸ enrichPrompt ──▸ Copilot API (+ tools) ──▸ handle tool_calls ──▸ execute tools ──▸ loop or return
 *
 * The Orchestrator uses function-calling (OpenAI-compatible) to let the AI
 * dynamically choose which tools to run.  If the API doesn't support native
 * tool_calls it falls back to legacy marker parsing ([WEBSEARCH:], [FILE:]).
 *
 * Max iterations per message: 3  (tool_call → result → follow-up → …)
 * Max retries on network error: 2
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const axios = require('axios');

const { composeSystemPrompt, composeUserMessage, buildMessages } = require('./promptComposer');
const { getToolsForAPI, getToolsForOwner, executeTool, getToolByName } = require('./toolRegistry');
const { smartTruncate, COPILOT_API_URL, COPILOT_API_MODEL, getRandomErrorResponse, checkDimensiLainLogic } = require('./aiHandler');
const { classifyUser } = require('./userProfileHelper');
const { getConversationHistory, saveMessage, getUserPreferences, getPreferredName, detectNicknamePreference } = require('./database');
const { splitMessage, smartSend, WA_MESSAGE_LIMIT } = require('./messageUtils');

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const MAX_TOOL_ITERATIONS = 3;   // max tool-call loops per message
const MAX_RETRIES = 2;           // network retries
const API_TIMEOUT = 120_000;     // 2 min
const TOOL_CALL_TIMEOUT = 60_000; // 1 min per tool execution

// ═══════════════════════════════════════════════════════════
//  LEGACY MARKER PARSING (fallback when native tool_calls unavailable)
// ═══════════════════════════════════════════════════════════

const WEBSEARCH_RE = /\[WEBSEARCH:(.+?)\]/;
const FILE_RE = /\[FILE:([^\]]+)\]/;

/**
 * Parse legacy [WEBSEARCH:query] marker from AI response
 */
const parseWebSearchMarker = (text) => {
    const m = WEBSEARCH_RE.exec(text);
    return m ? m[1].trim() : null;
};

/**
 * Parse legacy [FILE:name] marker from AI response
 */
const parseFileMarker = (text) => {
    const m = FILE_RE.exec(text);
    if (!m) return null;
    const fileName = m[1].trim();
    // Content is everything after the marker line
    const markerEnd = text.indexOf(m[0]) + m[0].length;
    const content = text.substring(markerEnd).replace(/^\n+/, '');
    return { fileName, content };
};

// ═══════════════════════════════════════════════════════════
//  CORE: callCopilotAPI
// ═══════════════════════════════════════════════════════════

/**
 * Raw API call with retry + timeout
 *
 * @param {Array} messages - OpenAI-format messages array
 * @param {Array|null} tools - tools schema or null
 * @param {number} retryCount
 * @returns {object} response.data
 */
const callCopilotAPI = async (messages, tools = null, retryCount = 0) => {
    const body = {
        model: COPILOT_API_MODEL,
        messages,
        temperature: 0.85,
    };

    if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
    }

    try {
        const res = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            body,
            { headers: { 'Content-Type': 'application/json' }, timeout: API_TIMEOUT },
        );
        return res.data;
    } catch (err) {
        console.error('[Orchestrator] API error:', err.message);

        // Auth / quota errors — no retry
        const status = err.response?.status;
        if (status === 401) throw new Error('TOKEN_EXPIRED');
        if (status === 402) throw new Error('QUOTA_EXHAUSTED');
        if (status === 413) throw new Error('PAYLOAD_TOO_LARGE');

        // Retryable errors
        if (retryCount < MAX_RETRIES) {
            const retryable = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(err.code) ||
                              (status && status >= 500) || status === 429;
            if (retryable) {
                const delay = 2000 * (retryCount + 1);
                console.log(`[Orchestrator] Retry ${retryCount + 1}/${MAX_RETRIES} in ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
                return callCopilotAPI(messages, tools, retryCount + 1);
            }
        }

        throw err;
    }
};

// ═══════════════════════════════════════════════════════════
//  CORE: orchestrate
// ═══════════════════════════════════════════════════════════

/**
 * Orchestrate a single user message end-to-end.
 *
 * @param {object} normalizedMsg - from messageNormalizer.normalizeMessage()
 * @param {object} ctx - context
 * @param {object} ctx.sock - Baileys socket (needed for sending media/stickers)
 * @param {function} ctx.downloadMedia - function(msg) → {buffer, mimetype, filename}
 * @param {function} ctx.onProgress - optional progress callback(text)
 * @returns {object} { text, media?, sticker?, file?, error? }
 */
const orchestrate = async (normalizedMsg, ctx = {}) => {
    const { chatId, senderId, pushName, isGroup, text } = normalizedMsg;

    // ── 1. Temporal logic check ───────────────────────────
    if (text) {
        const dimensiLain = checkDimensiLainLogic(text, senderId);
        if (dimensiLain) return { text: dimensiLain };
    }

    // ── 2. Profile & preferences ──────────────────────────
    const profile = classifyUser(senderId, pushName);
    const preferredName = getPreferredName(chatId) || null;
    const isOwner = profile.isOwner;

    // Detect nickname preference in current message
    if (text) detectNicknamePreference(text, chatId);

    // ── 3. Conversation history ───────────────────────────
    const history = getConversationHistory(chatId);

    // ── 4. Build enriched user message ────────────────────
    const userContent = composeUserMessage(normalizedMsg, profile, preferredName);

    // ── 5. Build messages array ───────────────────────────
    const messages = buildMessages(userContent, history, {
        includeTools: true,
        imageBase64: normalizedMsg.attachments?.[0]?.type === 'image' ? null : undefined, // handled separately
    });

    // ── 6. Choose tools for this user ─────────────────────
    const tools = isOwner ? getToolsForOwner() : getToolsForAPI();

    // ── 7. Prepare media context ──────────────────────────
    const mediaCtx = {
        chatId,
        senderId,
        isOwner,
        sock: ctx.sock,
        conversationHistory: history,
        onProgress: ctx.onProgress,
    };

    // If there's downloadable media, download it
    if (normalizedMsg.attachments.length > 0 && ctx.downloadMedia) {
        try {
            const att = normalizedMsg.attachments[0];
            const download = await ctx.downloadMedia(normalizedMsg.raw);
            mediaCtx.mediaBuffer = download.buffer || download;
            mediaCtx.mediaMimetype = att.mimetype || download.mimetype;
            mediaCtx.mediaFilename = att.fileName || download.filename || 'file';
        } catch (err) {
            console.error('[Orchestrator] Failed to download media:', err.message);
        }
    }

    // ── 8. Tool-calling loop ──────────────────────────────
    let iteration = 0;
    let finalText = null;
    const toolResults = [];

    try {
        while (iteration < MAX_TOOL_ITERATIONS) {
            iteration++;

            const data = await callCopilotAPI(messages, tools);
            const choice = data.choices?.[0];

            if (!choice) {
                finalText = getRandomErrorResponse();
                break;
            }

            const msg = choice.message;

            // ── No tool calls → we're done ────────────────
            if (!msg.tool_calls || msg.tool_calls.length === 0) {
                finalText = msg.content || '';
                break;
            }

            // ── Process tool calls ────────────────────────
            // Add assistant message with tool_calls to conversation
            messages.push({
                role: 'assistant',
                content: msg.content || null,
                tool_calls: msg.tool_calls,
            });

            for (const tc of msg.tool_calls) {
                const toolName = tc.function?.name;
                let toolParams = {};

                // Parse params safely
                try {
                    toolParams = JSON.parse(tc.function?.arguments || '{}');
                } catch {
                    console.error(`[Orchestrator] Bad JSON for tool ${toolName}:`, tc.function?.arguments);
                    toolParams = {};
                }

                console.log(`[Orchestrator] iter=${iteration} calling tool: ${toolName}`, toolParams);

                // Execute tool
                const result = await executeTool(toolName, toolParams, mediaCtx);
                toolResults.push({ name: toolName, params: toolParams, result });

                // Add tool result to messages
                messages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: JSON.stringify(result).substring(0, 15000), // truncate huge results
                });
            }

            // Loop back to get AI's follow-up response
        }

        // ── 9. Legacy marker fallback ─────────────────────
        if (finalText) {
            finalText = await handleLegacyMarkers(finalText, mediaCtx);
        }

    } catch (err) {
        console.error('[Orchestrator] Error:', err.message);

        if (err.message === 'TOKEN_EXPIRED') {
            return { text: 'duh AI nya lagi error bro — token expired, owner harus refresh token Copilot API dulu 🔑' };
        }
        if (err.message === 'QUOTA_EXHAUSTED') {
            return { text: 'wah quota AI nya abis bro 😓 owner harus top-up atau tunggu reset quota' };
        }
        if (err.message === 'PAYLOAD_TOO_LARGE') {
            return { text: 'duh kepanjangan nih pesan nya 😓 coba kirim yang lebih pendek' };
        }

        return { text: getRandomErrorResponse() };
    }

    // ── 10. Build response ────────────────────────────────
    const response = { text: smartTruncate(finalText || '') };

    // Attach special outputs from tool results (sticker, file, etc.)
    for (const tr of toolResults) {
        if (tr.result?.type === 'sticker' && tr.result?.stickerBuffer) {
            response.sticker = tr.result.stickerBuffer;
        }
        if (tr.result?.type === 'file' && tr.result?.fileName) {
            response.file = {
                fileName: tr.result.fileName,
                content: tr.result.content,
                mimetype: tr.result.mimetype,
            };
        }
        if (tr.result?.mp3Path || tr.result?.videoPath) {
            response.media = {
                path: tr.result.mp3Path || tr.result.videoPath,
                type: tr.result.mp3Path ? 'audio' : 'video',
                cleanup: tr.result.cleanup,
            };
        }
    }

    // ── 11. Save to conversation history ──────────────────
    if (text) {
        saveMessage(chatId, 'user', text);
    }
    if (response.text) {
        saveMessage(chatId, 'assistant', response.text);
    }

    return response;
};

// ═══════════════════════════════════════════════════════════
//  LEGACY MARKER HANDLING
// ═══════════════════════════════════════════════════════════

/**
 * Handle [WEBSEARCH:query] and [FILE:name] markers when
 * the AI uses text markers instead of native tool_calls
 */
const handleLegacyMarkers = async (text, ctx) => {
    // Web search marker
    const searchQuery = parseWebSearchMarker(text);
    if (searchQuery) {
        console.log('[Orchestrator] Legacy WEBSEARCH marker:', searchQuery);
        const result = await executeTool('web.search', { query: searchQuery }, ctx);
        if (result?.success) {
            // Re-send to AI with search results
            const searchContext = `[HASIL PENCARIAN INTERNET untuk "${searchQuery}"]\n${result.results || JSON.stringify(result.raw?.results || [])}\n\n[Jawab pertanyaan user berdasarkan info di atas. Tetap gaya Tama.]`;
            try {
                const followUp = await callCopilotAPI([
                    { role: 'system', content: composeSystemPrompt({ includeToolInstructions: false }) },
                    ...(ctx.conversationHistory || []),
                    { role: 'user', content: text.replace(WEBSEARCH_RE, '').trim() || searchQuery },
                    { role: 'assistant', content: searchContext },
                ], null);
                return followUp.choices?.[0]?.message?.content || text.replace(WEBSEARCH_RE, '').trim();
            } catch {
                return `${text.replace(WEBSEARCH_RE, '').trim()}\n\n_Hasil search: ${(result.results || '').substring(0, 500)}_`;
            }
        }
        return text.replace(WEBSEARCH_RE, '(gagal search)');
    }

    // File marker
    const fileData = parseFileMarker(text);
    if (fileData) {
        console.log('[Orchestrator] Legacy FILE marker:', fileData.fileName);
        // The file will be handled by the caller (bot.js / intentRouter)
        // We tag it so the router knows
        return text; // keep as-is; the router will parse [FILE:] and send the document
    }

    return text;
};

// ═══════════════════════════════════════════════════════════
//  VISION ORCHESTRATION
// ═══════════════════════════════════════════════════════════

/**
 * Orchestrate image analysis (vision)
 *
 * @param {string} base64 - base64 image
 * @param {string} mimetype - image mimetype
 * @param {string} caption - user caption
 * @param {string} chatId - conversation id
 * @param {object} profile - from classifyUser
 * @param {string} preferredName
 * @returns {object} { text }
 */
const orchestrateVision = async (base64, mimetype, caption, chatId, profile = {}, preferredName = null) => {
    const history = getConversationHistory(chatId);

    const userContent = caption || 'User kirim gambar ini. Lihat dan kasih respons singkat.';
    const messages = buildMessages(userContent, history, {
        includeTools: false,
        imageBase64: base64,
        imageMimetype: mimetype,
    });

    try {
        const data = await callCopilotAPI(messages, null);
        const text = data.choices?.[0]?.message?.content || 'duh ga bisa liat gambar nya nih 😓';
        saveMessage(chatId, 'user', caption || '[gambar]');
        saveMessage(chatId, 'assistant', text);
        return { text: smartTruncate(text) };
    } catch (err) {
        console.error('[Orchestrator] Vision error:', err.message);
        return { text: 'aduh error pas liat gambar 😭 coba kirim ulang bro' };
    }
};

// ═══════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
    orchestrate,
    orchestrateVision,
    callCopilotAPI,
    handleLegacyMarkers,
    parseWebSearchMarker,
    parseFileMarker,
    MAX_TOOL_ITERATIONS,
    MAX_RETRIES,
};
