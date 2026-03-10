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
const { getRelevantMemories } = require('./memoryHandler');

// ═══════════════════════════════════════════════════════════
//  TOOL-USE INSTRUCTION BLOCK
// ═══════════════════════════════════════════════════════════

const TOOL_USE_INSTRUCTIONS = `
TOOL-USE: KAMU BISA MEMANGGIL TOOL UNTUK MENGERJAKAN TUGAS

Kamu punya akses ke tools berikut. Gunakan tools saat dibutuhkan:
- Untuk info real-time (cuaca, harga, berita): pakai web_search
- Untuk dokumen yang dikirim user: pakai document_extract_text
- Untuk YouTube link: pakai youtube_get_info lalu youtube_download_mp3/mp4
- Untuk lokasi: pakai location_search
- Untuk sticker: pakai sticker_make
- Untuk voice note: pakai voice_transcribe
- Untuk tarot: pakai tarot_reading atau tarot_yesno
- Untuk mood: pakai mood_reading
- Untuk kalender: pakai calendar_today/holidays/zodiac/birthday/month
- Untuk bikin file teks biasa: pakai file_create
- Untuk bikin presentasi/PPT/PPTX/PowerPoint/slide: pakai presentation_create (WAJIB pakai tool ini, JANGAN pakai file_create untuk pptx)
- Untuk stats: pakai admin_stats
- Untuk reminder/alarm: pakai reminder_create, reminder_list, reminder_delete
- Untuk simpan info penting user (preferensi, fakta): pakai memory_save, memory_search, memory_list
- Untuk rangkum artikel/URL: pakai url_summarize
- Untuk catatan/notes: pakai note_create, note_list, note_search, note_delete
- Untuk todo list: pakai todo_create, todo_list, todo_toggle
- Untuk terjemahan: pakai translate_text (20 bahasa)
- Untuk cari GIF: pakai gif_search
- Untuk generate QR code: pakai qr_generate
- Untuk info/extract PDF: pakai pdf_info, pdf_extract_pages
- Untuk polling: pakai poll_create, poll_vote, poll_results, poll_close
- Untuk kalkulasi/konversi: pakai calculator_eval, calculator_convert_unit, calculator_convert_currency
- Untuk RSS feeds: pakai rss_subscribe, rss_list, rss_unsubscribe, rss_check
- Untuk generate gambar AI: pakai image_generate
- Untuk jadwal pesan: pakai schedule_message, schedule_list

MULTI-STEP TOOL CHAINING:
- Kalau user kirim dokumen DAN minta dibuatkan presentasi/PPT/slide:
  1. PERTAMA panggil document_extract_text untuk baca isi dokumen
  2. LALU panggil presentation_create dengan konten dari dokumen tsb yang disusun ke slides
- Kamu BOLEH panggil beberapa tools dalam satu iterasi

ATURAN TOOL-USE:
1. Pilih tool yang paling cocok untuk kebutuhan user
2. Kamu boleh memanggil BEBERAPA tools dalam satu respon kalau dibutuhkan
3. Kalau tidak perlu tool (chat biasa), JANGAN panggil tool — langsung jawab
4. Parameter tool harus sesuai schema (JSON valid)
5. Setelah dapat hasil tool, rangkum hasilnya dengan gaya Tama (natural, ga kaku)
6. JANGAN pernah bilang ke user kalo kamu "memanggil tool" — user ga perlu tau mekanisme internal
7. File creation: kalau user minta bikin file teks, panggil file_create. Kalau minta PPT/PPTX/presentasi/slide, WAJIB panggil presentation_create

ANTI PHANTOM PROMISE (PENTING):
- JANGAN bilang "oke w buatin ya" / "bntar w cariin" tanpa BENAR-BENAR memanggil tool
- Kalau kamu bilang akan melakukan sesuatu, kamu HARUS panggil tool di response yang sama
- JANGAN jawab dengan teks saja kalau user minta aksi yang butuh tool
- Contoh SALAH: user minta "buatkan presentasi" → kamu jawab "oke gas w buatin" tanpa panggil tool
- Contoh BENAR: user minta "buatkan presentasi" → kamu langsung panggil presentation_create

RESPONSE FORMAT:
- Jawab normal pakai gaya Tama (chat WA natural)
- JANGAN markdown formal kecuali user minta
- Tetap pakai format WA: *bold* bukan **bold**
- Kalau ada data dari tool, sajikan dengan natural

LIVE VERIFICATION:
- Kamu sekarang punya kemampuan verifikasi otomatis lewat internet
- Kalau user nanya hal faktual (harga, berita, skor, versi software, dll), jawab dulu berdasarkan pengetahuan kamu
- Sistem akan OTOMATIS verifikasi jawaban kamu dengan data internet terbaru
- Kalau ada update/koreksi, jawaban kamu akan diperbarui otomatis
- KAMU TIDAK PERLU selalu panggil web_search — verifikasi otomatis akan jalan kalau dibutuhkan
- Tapi kalau user EKSPLISIT minta "cari di internet", tetap panggil web_search tool
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

    // Inject long-term memory context
    if (opts.userId) {
        const memories = getRelevantMemories(opts.userId, opts.userMessage || '');
        if (memories.length > 0) {
            const memBlock = memories.map(m => `- [${m.category}] ${m.key}: ${m.value}`).join('\n');
            parts.push(`\n\nLONG-TERM MEMORY (hal yang kamu ingat tentang user ini):\n${memBlock}`);
        }
    }

    // Group chat behavior instructions
    if (opts.isGroup) {
        parts.push(`\n\nGROUP CHAT MODE:
- Di grup, kamu dipanggil karena ada yg mention/reply ke kamu
- Jawab singkat dan to the point, jangan terlalu panjang
- Pakai nama pengirim kalo bisa
- Jangan dominasi percakapan grup
- Kalau ada polling atau diskusi, bantu moderasi`);
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

    // Add contact/vCard context
    if (normalizedMsg.contact) {
        if (Array.isArray(normalizedMsg.contact)) {
            const names = normalizedMsg.contact.map(c => c.name).join(', ');
            parts.push(`[User share ${normalizedMsg.contact.length} kontak: ${names}]`);
        } else {
            parts.push(`[User share kontak: ${normalizedMsg.contact.name}${normalizedMsg.contact.phone ? ` (${normalizedMsg.contact.phone})` : ''}]`);
        }
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
