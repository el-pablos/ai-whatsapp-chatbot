/**
 * Prompt Composer — builds context-rich prompts for the AI Orchestrator
 *
 * Combines:
 *   1) Persona system prompt (Tama AI)
 *   2) Capability cards (what tools are available)
 *   3) User profile context (owner / salsa / normal + nickname)
 *   4) Conversation history
 *   5) Current message context (quoted, media, location)
 *   6) Tool-use instructions
 *
 * The composed prompt is sent to the Copilot API so the AI knows
 * exactly what it can do, how to call tools, and how to respond.
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const { TAMA_SYSTEM_PROMPT } = require('./aiHandler');
const { getToolSummary } = require('./toolRegistry');
const { generateCapabilityCards } = require('./featureRegistry');

// ═══════════════════════════════════════════════════════════
//  TOOL-USE INSTRUCTION BLOCK
// ═══════════════════════════════════════════════════════════

const TOOL_USE_INSTRUCTIONS = `
TOOL-USE: KAMU BISA MEMANGGIL TOOL UNTUK MENGERJAKAN TUGAS

Kamu punya akses ke tools berikut. Gunakan tools saat dibutuhkan:
- Untuk info real-time (cuaca, harga, berita): pakai web.search
- Untuk dokumen yang dikirim user: pakai document.extract_text
- Untuk YouTube link: pakai youtube.get_info lalu youtube.download_mp3/mp4
- Untuk lokasi: pakai location.search
- Untuk sticker: pakai sticker.make
- Untuk voice note: pakai voice.transcribe
- Untuk tarot: pakai tarot.reading atau tarot.yesno
- Untuk mood: pakai mood.reading
- Untuk kalender: pakai calendar.today/holidays/zodiac/birthday/month
- Untuk bikin file: pakai file.create
- Untuk stats: pakai admin.stats

ATURAN TOOL-USE:
1. Pilih tool yang paling cocok untuk kebutuhan user
2. Kamu boleh memanggil BEBERAPA tools dalam satu respon kalau dibutuhkan
3. Kalau tidak perlu tool (chat biasa), JANGAN panggil tool — langsung jawab
4. Parameter tool harus sesuai schema (JSON valid)
5. Setelah dapat hasil tool, rangkum hasilnya dengan gaya Tama (natural, ga kaku)
6. JANGAN pernah bilang ke user kalo kamu "memanggil tool" — user ga perlu tau mekanisme internal
7. File creation: kalau user minta bikin file, panggil file.create dengan konten lengkap

RESPONSE FORMAT:
- Jawab normal pakai gaya Tama (chat WA natural)
- JANGAN markdown formal kecuali user minta
- Tetap pakai format WA: *bold* bukan **bold**
- Kalau ada data dari tool, sajikan dengan natural
`.trim();

// ═══════════════════════════════════════════════════════════
//  COMPOSER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Compose the full system prompt with tools + capabilities
 *
 * @param {object} opts
 * @param {boolean} opts.includeToolInstructions - whether to add tool-use instructions
 * @param {string}  opts.capabilityCards - override capability cards (for testing)
 * @returns {string} Complete system prompt
 */
const composeSystemPrompt = (opts = {}) => {
    const { includeToolInstructions = true } = opts;

    const parts = [TAMA_SYSTEM_PROMPT];

    if (includeToolInstructions) {
        parts.push('\n\n' + TOOL_USE_INSTRUCTIONS);

        // Add tool summary
        const toolSummary = opts.capabilityCards || getToolSummary();
        parts.push('\n\nAVAILABLE TOOLS:\n' + toolSummary);
    }

    return parts.join('');
};

/**
 * Compose user-message content with context enrichment
 *
 * @param {object} normalizedMsg - output from messageNormalizer
 * @param {object} profile - from classifyUser()
 * @param {string} preferredName - user's preferred nickname
 * @returns {string} enriched user message text
 */
const composeUserMessage = (normalizedMsg, profile = {}, preferredName = null) => {
    const parts = [];

    // Add personalization context
    if (profile.contextHint) {
        parts.push(profile.contextHint);
    }

    // Add nickname preference
    if (preferredName && preferredName !== 'bro') {
        parts.push(`[PANGGILAN: ${preferredName}]`);
    }

    // Add quoted message context
    if (normalizedMsg.quoted) {
        const qType = normalizedMsg.quoted.mediaType ? `[${normalizedMsg.quoted.mediaType}] ` : '';
        parts.push(`[User membalas pesan: "${qType}${normalizedMsg.quoted.text}"]`);
    }

    // Add media context
    if (normalizedMsg.attachments.length > 0) {
        const att = normalizedMsg.attachments[0];
        parts.push(`[User mengirim ${att.type}: ${att.fileName || att.mimetype}]`);
    }

    // Add location context
    if (normalizedMsg.location) {
        const loc = normalizedMsg.location;
        parts.push(`[User share lokasi: ${loc.name || ''} ${loc.address || `(${loc.latitude}, ${loc.longitude})`}]`);
    }

    // Add the actual text
    if (normalizedMsg.text) {
        parts.push(normalizedMsg.text);
    }

    return parts.join(' ').trim() || '[media tanpa teks]';
};

/**
 * Build the complete messages array for Copilot API call
 *
 * @param {string} userContent - enriched user message
 * @param {Array}  history - conversation history from DB
 * @param {object} opts
 * @param {boolean} opts.includeTools - include tool instructions
 * @param {string}  opts.imageBase64 - base64 image for vision
 * @param {string}  opts.imageMimetype - image mimetype
 * @returns {Array} messages array for API
 */
const buildMessages = (userContent, history = [], opts = {}) => {
    const systemPrompt = composeSystemPrompt({
        includeToolInstructions: opts.includeTools !== false,
    });

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
    ];

    // Vision message (image + text)
    if (opts.imageBase64 && opts.imageMimetype) {
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: { url: `data:${opts.imageMimetype};base64,${opts.imageBase64}` },
                },
                { type: 'text', text: userContent },
            ],
        });
    } else {
        messages.push({ role: 'user', content: userContent });
    }

    return messages;
};

module.exports = {
    composeSystemPrompt,
    composeUserMessage,
    buildMessages,
    TOOL_USE_INSTRUCTIONS,
};
