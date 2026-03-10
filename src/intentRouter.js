/**
 * Intent Router — thin layer between bot.js and AI Orchestrator
 *
 * Responsibilities:
 *   1. Fast-path: intercept trivial slash commands (/clear, /stats, /help)
 *      that don't need AI — execute them instantly
 *   2. Default path: forward everything else to aiOrchestrator.orchestrate()
 *   3. Post-processing: turn orchestrator output into WA messages
 *      (stickers, files, audio, smarts-send, etc.)
 *
 * bot.js calls `routeMessage(normalizedMsg, ctx)` instead of the old
 * 2400-line if-else chain.
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const { orchestrate, orchestrateVision, parseFileMarker } = require('./aiOrchestrator');
const { normalizeMessage } = require('./messageNormalizer');
const { smartSend, multiBubbleSend } = require('./messageUtils');
const { clearConversation, getStats } = require('./database');
const { formatCalendarResponse, parseDateFromString } = require('./calendarHandler');
const { createAndSendFile } = require('./fileCreator');
const { sendPptx } = require('./pptxHandler');
const { sendSticker } = require('./stickerHandler');
const { cleanupFile } = require('./youtubeHandler');
const { reportBugToOwner } = require('./bugReporter');
const { isOwner } = require('./database');
const { runBackupNow } = require('./backupHandler');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { parseTranslateCommand, listLanguages } = require('./translateHandler');
const { parseGifCommand } = require('./gifHandler');
const { parseQRCommand, createQRResponse } = require('./qrCodeHandler');
const { parsePDFCommand } = require('./pdfEditorHandler');
const { parsePollCommand, parseVoteCommand, createPoll: pollCreate, votePoll: pollVote, closePoll: pollClose, showPollResults } = require('./pollHandler');
const { parseCalcCommand, calculateExpression, convertUnit, convertCurrency, formatCalcResult } = require('./calculatorHandler');
const { parseRssCommand, subscribeFeed, listFeeds, unsubscribeFeed, checkUserFeeds, formatFeedUpdates } = require('./rssHandler');
const { parseImagineCommand, generateImage, downloadImageBuffer, isImageGenAvailable } = require('./imageGenHandler');
const { parseScheduleCommand, scheduleMessage, listScheduledMessages } = require('./scheduledMessageHandler');
const { listReminders } = require('./reminderHandler');
const { listNotes, listTodos } = require('./noteHandler');
const { addNumber: allowAdd, removeNumber: allowRemove, toggleNumber: allowToggle, getAll: getAllAllow, getStats: getAllowStats } = require('./allowlistManager');
const { normalizePhoneNumber, isFeatureEnabled, setFeatureToggle, getAllFeatureToggles } = require('./database');
const { needsVerification } = require('./liveVerifier');
const { aggregateSearch } = require('./searchAggregator');
const { verifyWithInternet } = require('./factChecker');

// ═══════════════════════════════════════════════════════════
//  COMMAND → FEATURE ID MAPPING (for feature toggle checks)
// ═══════════════════════════════════════════════════════════
const CMD_FEATURE_MAP = {
    '/clear': 'admin_clear', '/reset': 'admin_clear', '/stats': 'admin_stats',
    '/kalender': 'calendar_today', '/calendar': 'calendar_today', '/today': 'calendar_today', '/tanggal': 'calendar_today',
    '/libur': 'calendar_holidays',
    '/zodiak': 'calendar_zodiac', '/zodiac': 'calendar_zodiac',
    '/ultah': 'calendar_birthday', '/birthday': 'calendar_birthday',
    '/reminder': 'reminder_create', '/pengingat': 'reminder_create',
    '/reminders': 'reminder_list', '/pengingats': 'reminder_list',
    '/translate': 'translate', '/bahasa': 'translate', '/tr': 'translate', '/languages': 'translate',
    '/gif': 'gif_search', '/qr': 'qr_generate', '/pdf': 'pdf_edit',
    '/poll': 'poll', '/vote': 'poll', '/hasilpoll': 'poll', '/tutuppoll': 'poll',
    '/hitung': 'calculator', '/calc': 'calculator', '/convert': 'calculator',
    '/rss': 'rss_feeds', '/imagine': 'image_gen', '/gambar': 'image_gen',
    '/jadwal': 'scheduled_message', '/schedule': 'scheduled_message',
    '/notes': 'note_create', '/catatan': 'note_create', '/todos': 'todo_manage',
    '/backup': 'admin_backup',
    '/verify': 'live_verification',
    '/videonotes': 'video_notes', '/vnotes': 'video_notes',
    '/reasoning': 'smart_reasoning', '/think': 'smart_reasoning', '/mikir': 'smart_reasoning',
    '/rag': 'rag_document', '/dokumen': 'rag_document', '/ragstatus': 'rag_document',
};

// ═══════════════════════════════════════════════════════════
//  FAST-PATH COMMANDS (no AI needed)
// ═══════════════════════════════════════════════════════════

const FAST_COMMANDS = {
    '/clear': async (_args, ctx) => {
        clearConversation(ctx.chatId);
        return { text: 'okei bro, history chat udh w hapus. fresh start! 🔄' };
    },
    '/reset': async (_args, ctx) => {
        clearConversation(ctx.chatId);
        return { text: 'okei bro, history chat udh w hapus. fresh start! 🔄' };
    },
    '/stats': async () => {
        const stats = getStats();
        return { text: `📊 *Bot Stats*\n\nTotal pesan: ${stats.totalMessages}\nTotal users: ${stats.totalUsers}\nTotal chats: ${stats.totalChats}` };
    },
    '/help': async () => {
        return {
            text: `🤖 *ClawBot V4.0*\n\n*Chat:*\n• Chat biasa - w bales pake gaya Tama\n• Kirim gambar - w analisis\n• Kirim voice note - w transcribe & jawab\n• Kirim lokasi - w tau dimana lu\n• Reply chat/lampiran - w paham konteks\n• 🌐 Internet - w bisa cari info terbaru!\n\n*File:*\n📄 Minta w buatin file apa aja\n📑 Kirim dokumen - w baca & analisis (70+ format)\n📊 /pdf info, /pdf extract 1,3\n\n*Media:*\n🎨 stiker/sticker → bikin stiker\n🎵 link youtube → download MP3/MP4\n📸 kirim foto → analisis gambar\n🎭 /gif [query] → cari GIF\n📱 /qr [text/url] → generate QR code\n🎨 /imagine [prompt] → generate gambar AI\n\n*Produktivitas:*\n⏰ "ingetin gw...", /reminder list\n📝 /notes list, /todo list\n🌐 /translate [lang] [text]\n🧮 /calc [ekspresi]\n📅 /kalender /libur /zodiak /ultah /today\n\n*Social:*\n📊 /poll [pertanyaan] | [opsi1] | [opsi2]\n/vote [nomor]\n📰 /rss add [url], /rss list, /rss check\n⏰ /schedule [waktu] | [pesan]\n\n*Entertainment:*\n🔮 tarot → baca kartu tarot\n😊 curhat → baca mood lo\n🔍 search/cari → cari di internet\n\n*Admin:*\n• /clear - hapus history\n• /stats - statistik\n• /backup - backup data\n\n💡 Chat aja natural, w ngerti kok 😎`,
        };
    },
    '/bantuan': async () => FAST_COMMANDS['/help'](),
    '/kalender': async () => ({ text: formatCalendarResponse('calendar') }),
    '/calendar': async () => ({ text: formatCalendarResponse('calendar') }),
    '/libur': async () => ({ text: formatCalendarResponse('holidays') }),
    '/holiday': async () => ({ text: formatCalendarResponse('holidays') }),
    '/holidays': async () => ({ text: formatCalendarResponse('holidays') }),
    '/today': async () => ({ text: formatCalendarResponse('today') }),
    '/tanggal': async () => ({ text: formatCalendarResponse('today') }),
};

/**
 * Commands that take arguments (prefix match)
 */
const PREFIX_COMMANDS = {
    '/zodiak': async (args) => {
        const parsed = parseDateFromString(args);
        if (!parsed) return { text: 'format tanggal nya salah bro, coba: /zodiak 1 januari atau /zodiak 1/1' };
        return { text: formatCalendarResponse('zodiac', { month: parsed.month, day: parsed.day }) };
    },
    '/zodiac': async (args) => PREFIX_COMMANDS['/zodiak'](args),
    '/ultah': async (args) => {
        const parsed = parseDateFromString(args);
        if (!parsed || !parsed.year) return { text: 'tambahin tahun lahir nya jg dong\ncontoh: /ultah 1 januari 2000' };
        return { text: formatCalendarResponse('birthday', { year: parsed.year, month: parsed.month, day: parsed.day }) };
    },
    '/birthday': async (args) => PREFIX_COMMANDS['/ultah'](args),
    '/backup': async (_args, ctx) => {
        if (!ctx.isOwner) return { text: 'fitur ini cuma buat owner bro 😅' };
        try {
            await runBackupNow(ctx.sock);
            return { text: 'backup berhasil dikirim cuy 📦' };
        } catch (err) {
            return { text: `gagal backup: ${err.message}` };
        }
    },
    '/verify': async (args, ctx) => {
        if (!ctx.isOwner) return { text: 'fitur ini cuma buat owner aja cuy 😅' };
        if (!args || args.trim().length === 0) return { text: 'kasih query dong bre\ncontoh: /verify harga bitcoin sekarang' };
        try {
            const searchResults = await aggregateSearch(args.trim());
            if (!searchResults.results.length) return { text: 'gak nemu data buat verify bre 😕' };
            const verifyResult = await verifyWithInternet(args.trim(), searchResults, args.trim());
            const lines = [
                `🔍 *Verification Result*`,
                ``,
                `Status: ${verifyResult.verified}`,
                `Confidence: ${(verifyResult.confidence * 100).toFixed(0)}%`,
            ];
            if (verifyResult.corrections !== 'none') lines.push(`Koreksi: ${verifyResult.corrections}`);
            if (verifyResult.updatedResponse) lines.push(`\nInfo: ${verifyResult.updatedResponse}`);
            if (verifyResult.sources.length) lines.push(`\nSources: ${verifyResult.sources.join(', ')}`);
            return { text: lines.join('\n') };
        } catch (err) {
            return { text: `gagal verify: ${err.message}` };
        }
    },
    '/videonotes': async (args, ctx) => {
        if (!args || args.trim().length === 0) return { text: 'kasih link YouTube dong bre\ncontoh: /videonotes https://youtube.com/watch?v=xxx' };
        try {
            const { processVideoNotes } = require('./youtubeHandler');
            const result = await processVideoNotes(args.trim());
            if (!result.success) return { text: result.error || 'gagal generate notes bro 😕' };
            return { text: result.notes || 'notes kosong cuy' };
        } catch (err) {
            return { text: `gagal bikin videonotes: ${err.message}` };
        }
    },
    '/vnotes': async (args, ctx) => {
        const handler = PREFIX_COMMANDS['/videonotes'];
        return handler(args, ctx);
    },
    '/reasoning': async (args, ctx) => {
        if (!args || args.trim().length === 0) return { text: 'kasih pertanyaan dong cuy\ncontoh: /reasoning jelaskan dampak AI terhadap ekonomi' };
        try {
            const { performReasoning } = require('./reasoning/chainOfThought');
            const { formatForWhatsApp } = require('./reasoning/reasoningParser');
            const result = await performReasoning(args.trim(), {
                conversationHistory: ctx?.conversationHistory || []
            });
            if (!result.success) return { text: result.error || 'gagal reasoning bre 😕' };
            return { text: formatForWhatsApp(result) };
        } catch (err) {
            return { text: `gagal reasoning: ${err.message}` };
        }
    },
    '/think': async (args, ctx) => {
        const handler = PREFIX_COMMANDS['/reasoning'];
        return handler(args, ctx);
    },
    '/mikir': async (args, ctx) => {
        const handler = PREFIX_COMMANDS['/reasoning'];
        return handler(args, ctx);
    },
    '/rag': async (args, ctx) => {
        if (!args || args.trim().length === 0) return { text: 'Pake format:\n/rag [pertanyaan] — tanya dari dokumen\n/ragstatus — cek status RAG\n/dokumen [pertanyaan] — sama aja' };
        try {
            const { query } = require('./rag/ragPipeline');
            const result = await query(args.trim(), { showStats: true, citations: true });
            return { text: result.answer || 'Ga nemu jawaban dari dokumen.' };
        } catch (err) {
            console.error('[IntentRouter] /rag error:', err.message);
            return { text: 'RAG error: ' + err.message };
        }
    },
    '/dokumen': async (args, ctx) => {
        const handler = PREFIX_COMMANDS['/rag'];
        return handler(args, ctx);
    },
    '/ragstatus': async (args, ctx) => {
        try {
            const { getStatus } = require('./rag/ragPipeline');
            const status = getStatus();
            return { text: `📚 *RAG Status*\nEnabled: ${status.enabled}\nDokumen: ${status.storeStats.size} chunks\nMax ingest: ${(status.maxIngestSize / 1000).toFixed(0)}KB` };
        } catch (err) {
            return { text: 'Gagal cek status RAG: ' + err.message };
        }
    },
    '/translate': async (args, ctx) => {
        if (!args) return { text: listLanguages() };
        const parsed = parseTranslateCommand('/translate ' + args);
        if (!parsed) return { text: 'format: /translate [kode bahasa] [teks]\ncontoh: /translate en halo apa kabar\n\nketik /translate buat lihat daftar bahasa' };
        // Akan di-handle orchestrator via AI tool
        return null; // fallthrough ke orchestrator
    },
    '/gif': async (args, ctx) => {
        if (!args) return { text: 'format: /gif [kata kunci]\ncontoh: /gif kucing lucu' };
        return null; // fallthrough ke orchestrator
    },
    '/qr': async (args, ctx) => {
        if (!args) return { text: 'format: /qr [teks atau url]\ncontoh: /qr https://example.com' };
        const result = await createQRResponse(args);
        return { qrImage: result };
    },
    '/pdf': async (args, ctx) => {
        if (!args) return { text: 'format:\n/pdf info — info PDF\n/pdf extract 1,3,5 — extract halaman' };
        return null; // needs document context — fallthrough
    },
    '/poll': async (args, ctx) => {
        if (!args) return { text: 'format: /poll [pertanyaan] | [opsi1] | [opsi2] | ...\ncontoh: /poll Makan apa? | Nasi goreng | Mie | Sate\n\n/poll close — tutup poll\n/poll results — lihat hasil' };
        const parsed = parsePollCommand('/poll ' + args);
        if (!parsed) return { text: 'format ga valid bro' };
        if (parsed.action === 'close') return { text: pollClose(ctx.chatId, ctx.senderId || ctx.chatId, process.env.OWNER_JID || '').message };
        if (parsed.action === 'results') return { text: showPollResults(ctx.chatId) };
        if (parsed.action === 'create') return { text: pollCreate(ctx.chatId, ctx.senderId || ctx.chatId, parsed.question, parsed.options).message };
        return { text: 'command poll ga valid' };
    },
    '/vote': async (args, ctx) => {
        const num = parseInt(args, 10);
        if (!num) return { text: 'format: /vote [nomor]\ncontoh: /vote 1' };
        return { text: pollVote(ctx.chatId, ctx.senderId || ctx.chatId, num).message };
    },
    '/calc': async (args) => {
        if (!args) return { text: 'format: /calc [ekspresi]\ncontoh: /calc sqrt(144)\n/calc 100 USD to IDR\n/calc 10 km to mile' };
        const parsed = parseCalcCommand('/calc ' + args);
        if (!parsed) return { text: 'ekspresi ga valid bro' };
        if (parsed.type === 'currency') {
            const r = await convertCurrency(parsed.params.amount, parsed.params.from, parsed.params.to);
            return { text: formatCalcResult(r) };
        }
        if (parsed.type === 'unit') {
            const r = convertUnit(parsed.params.value, parsed.params.from, parsed.params.to);
            return { text: formatCalcResult(r) };
        }
        return { text: formatCalcResult(calculateExpression(parsed.params.expression)) };
    },
    '/hitung': async (args) => PREFIX_COMMANDS['/calc'](args),
    '/rss': async (args, ctx) => {
        const userId = ctx.senderId || ctx.chatId;
        if (!args) return { text: listFeeds(userId) };
        const parsed = parseRssCommand('/rss ' + args);
        if (!parsed) return { text: 'format:\n/rss add [url] [label] — subscribe\n/rss list — lihat feeds\n/rss remove [id] — unsubscribe\n/rss check — cek update' };
        if (parsed.action === 'list') return { text: listFeeds(userId) };
        if (parsed.action === 'add') {
            const r = await subscribeFeed(userId, parsed.url, parsed.label);
            return { text: r.message };
        }
        if (parsed.action === 'remove') {
            const r = unsubscribeFeed(userId, parsed.feedId);
            return { text: r.message };
        }
        if (parsed.action === 'check') {
            const updates = await checkUserFeeds(userId);
            const formatted = formatFeedUpdates(updates);
            return { text: formatted || 'Ga ada artikel baru dari feed kamu 📰' };
        }
        return { text: 'command rss ga valid' };
    },
    '/feeds': async (args, ctx) => PREFIX_COMMANDS['/rss'](args, ctx),
    '/imagine': async (args, ctx) => {
        if (!args) return { text: 'format: /imagine [deskripsi gambar]\ncontoh: /imagine kucing bermain gitar' };
        if (!isImageGenAvailable()) return { text: 'Image gen belum aktif (OPENAI_API_KEY not set) 🎨' };
        return null; // fallthrough ke orchestrator for proper handling
    },
    '/schedule': async (args, ctx) => {
        const userId = ctx.senderId || ctx.chatId;
        if (!args) return { text: 'format: /schedule [waktu] | [pesan]\ncontoh: /schedule besok jam 10 | selamat pagi!\n/schedule list' };
        const parsed = parseScheduleCommand('/schedule ' + args);
        if (!parsed) return { text: 'format ga valid bro' };
        if (parsed.action === 'list') return { text: listScheduledMessages(userId) };
        if (parsed.action === 'create') {
            const target = parsed.target || ctx.chatId;
            const r = scheduleMessage(userId, target, parsed.message, parsed.time, ctx.isOwner || false);
            return { text: r.message };
        }
        return { text: 'command schedule ga valid' };
    },
    '/reminder': async (args, ctx) => {
        if (!args || args.toLowerCase() === 'list') return { text: listReminders(ctx.senderId || ctx.chatId) };
        return null; // fallthrough ke orchestrator
    },
    '/notes': async (args, ctx) => {
        if (!args || args.toLowerCase() === 'list') return { text: listNotes(ctx.senderId || ctx.chatId) };
        return null;
    },
    '/todo': async (args, ctx) => {
        if (!args || args.toLowerCase() === 'list') return { text: listTodos(ctx.senderId || ctx.chatId) };
        return null;
    },
    // ── ALLOWLIST COMMANDS (owner only) ──
    '/allow': async (args, ctx) => {
        if (!ctx.isOwner) return null;
        if (!args) return { text: 'format: /allow 628xxx [nama]\ncontoh: /allow 6281234567890 si Budi' };
        const parts = args.split(/\s+/);
        const phone = parts[0];
        const name = parts.slice(1).join(' ') || null;
        const result = allowAdd(phone, name, ctx.senderId || 'owner', null);
        if (!result) return { text: 'format nomor ga valid bro' };
        return { text: `✅ ${result.phone_number}${result.display_name ? ` (${result.display_name})` : ''} ditambahin ke allowlist` };
    },
    '/unallow': async (args, ctx) => {
        if (!ctx.isOwner) return null;
        if (!args) return { text: 'format: /unallow 628xxx' };
        const removed = allowRemove(args.trim());
        return { text: removed ? `✅ dihapus dari allowlist` : `ga nemu nomor itu di allowlist` };
    },
    '/allowlist': async (_args, ctx) => {
        if (!ctx.isOwner) return null;
        const entries = getAllAllow();
        if (entries.length === 0) return { text: '📋 Allowlist kosong — semua nomor bisa akses bot.' };
        const stats = getAllowStats();
        const lines = entries.map((e, i) => {
            const status = e.is_active ? 'aktif ✅' : 'nonaktif ❌';
            const name = e.display_name ? ` — ${e.display_name}` : '';
            return `${i + 1}. ${e.phone_number}${name} (${status})`;
        });
        return { text: `📋 *Allowlist*\n${lines.join('\n')}\n\nTotal: ${stats.total} nomor (${stats.active} aktif, ${stats.inactive} nonaktif)` };
    },
    '/allowon': async (args, ctx) => {
        if (!ctx.isOwner) return null;
        if (!args) return { text: 'format: /allowon 628xxx' };
        const ok = allowToggle(args.trim(), true);
        return { text: ok ? '✅ nomor diaktifkan' : 'ga nemu nomor itu' };
    },
    '/allowoff': async (args, ctx) => {
        if (!ctx.isOwner) return null;
        if (!args) return { text: 'format: /allowoff 628xxx' };
        const ok = allowToggle(args.trim(), false);
        return { text: ok ? '✅ nomor dinonaktifkan' : 'ga nemu nomor itu' };
    },
    // ── FEATURE TOGGLE COMMANDS (owner only) ──
    '/feature': async (args, ctx) => {
        if (!ctx.isOwner) return null;
        if (!args) return { text: 'format: /feature on [featureId]\n/feature off [featureId]\n/features — lihat semua' };
        const parts = args.split(/\s+/);
        const action = parts[0].toLowerCase();
        const featureId = parts[1];
        if (!featureId) return { text: 'tambahin feature id nya dong\ncontoh: /feature on youtube_download' };
        if (action === 'on') {
            setFeatureToggle(featureId, true, null);
            return { text: `✅ Fitur *${featureId}* diaktifkan` };
        }
        if (action === 'off') {
            setFeatureToggle(featureId, false, ctx.senderId || 'owner');
            return { text: `🔴 Fitur *${featureId}* dinonaktifkan` };
        }
        return { text: 'gunakan on/off\ncontoh: /feature on youtube_download' };
    },
    '/features': async (_args, ctx) => {
        if (!ctx.isOwner) return null;
        const toggles = getAllFeatureToggles();
        const { getAllFeatures } = require('./featureRegistry');
        const features = getAllFeatures();
        const lines = features.map(f => {
            const enabled = toggles[f.id] === undefined ? true : toggles[f.id];
            return `${enabled ? '✅' : '🔴'} ${f.id} — ${f.name}`;
        });
        return { text: `🔧 *Feature Status*\n\n${lines.join('\n')}` };
    },
};

// ═══════════════════════════════════════════════════════════
//  ROUTE MESSAGE
// ═══════════════════════════════════════════════════════════

/**
 * Main entry point — replaces bot.js processMessage routing
 *
 * @param {object} normalizedMsg - from normalizeMessage(rawMsg)
 * @param {object} ctx
 * @param {object} ctx.sock - Baileys socket
 * @param {object} ctx.rawMsg - original Baileys message (for quoting)
 * @returns {Promise<void>}
 */
const routeMessage = async (normalizedMsg, ctx = {}) => {
    const { chatId, text } = normalizedMsg;
    const sock = ctx.sock;

    // ── 1. Fast-path: exact-match commands ────────────────
    if (text) {
        const lower = text.toLowerCase().trim();

        // Exact match
        if (FAST_COMMANDS[lower]) {
            // Feature toggle check
            const featureId = CMD_FEATURE_MAP[lower];
            if (featureId && !isFeatureEnabled(featureId)) {
                await sock.sendMessage(chatId, { text: `⚠️ Fitur ${featureId} lagi dimatiin sama admin.` }, { quoted: ctx.rawMsg });
                return;
            }
            const result = await FAST_COMMANDS[lower](null, {
                chatId,
                sock,
                isOwner: isOwner(chatId),
            });
            if (result?.text) {
                await sock.sendMessage(chatId, { text: result.text }, { quoted: ctx.rawMsg });
            }
            return;
        }

        // Prefix match
        for (const [prefix, handler] of Object.entries(PREFIX_COMMANDS)) {
            if (lower.startsWith(prefix)) {
                // Feature toggle check
                const featureId = CMD_FEATURE_MAP[prefix];
                if (featureId && !isFeatureEnabled(featureId)) {
                    await sock.sendMessage(chatId, { text: `⚠️ Fitur ${featureId} lagi dimatiin sama admin.` }, { quoted: ctx.rawMsg });
                    return;
                }
                const args = text.slice(prefix.length).trim();
                if (!args && ['/zodiak', '/zodiac', '/ultah', '/birthday'].includes(prefix)) {
                    // Need args — send usage hint
                    await sock.sendMessage(chatId, {
                        text: prefix.includes('zodiak') || prefix.includes('zodiac')
                            ? 'tambahin tanggal lahir nya dong\ncontoh: /zodiak 1 januari'
                            : 'kasih tanggal lahir lengkap nya dong\ncontoh: /ultah 1 januari 2000',
                    }, { quoted: ctx.rawMsg });
                    return;
                }
                const result = await handler(args, { chatId, sock, isOwner: isOwner(chatId), senderId: normalizedMsg.senderId });
                if (result === null) break; // fallthrough to orchestrator
                if (result?.qrImage) {
                    await sock.sendMessage(chatId, {
                        image: result.qrImage.buffer,
                        caption: result.qrImage.caption,
                    }, { quoted: ctx.rawMsg });
                    return;
                }
                if (result?.text) {
                    await sock.sendMessage(chatId, { text: result.text }, { quoted: ctx.rawMsg });
                }
                return;
            }
        }
    }

    // ── 2. Default path: AI Orchestrator ──────────────────
    await sock.sendPresenceUpdate('composing', chatId);

    try {
        const response = await orchestrate(normalizedMsg, {
            sock,
            downloadMedia: (msg) => downloadMediaMessage(msg, 'buffer', {}, {
                logger: console,
                reuploadRequest: sock.updateMediaMessage,
            }),
            onProgress: async (progressText) => {
                try { await sock.sendMessage(chatId, { text: progressText }); } catch {}
            },
        });

        // ── 3. Post-processing ────────────────────────────

        // Send sticker
        if (response.sticker) {
            await sendSticker(sock, chatId, response.sticker);
        }

        // Send QR code image
        if (response.qrBuffer) {
            await sock.sendMessage(chatId, {
                image: response.qrBuffer,
                caption: `📱 QR Code generated`,
            }, { quoted: ctx.rawMsg });
        }

        // Send GIF
        if (response.gif) {
            const axios = require('axios');
            try {
                const gifResp = await axios.get(response.gif.url, { responseType: 'arraybuffer', timeout: 15000 });
                await sock.sendMessage(chatId, {
                    video: Buffer.from(gifResp.data),
                    gifPlayback: true,
                    caption: response.gif.title || '',
                }, { quoted: ctx.rawMsg });
            } catch (gifErr) {
                await sock.sendMessage(chatId, { text: `🎭 ${response.gif.url}` }, { quoted: ctx.rawMsg });
            }
        }

        // Send AI-generated image
        if (response.imageBuffer) {
            await sock.sendMessage(chatId, {
                image: response.imageBuffer,
                caption: response.revisedPrompt ? `🎨 ${response.revisedPrompt}` : '🎨 Image generated',
            }, { quoted: ctx.rawMsg });
        }

        // Send extracted PDF
        if (response.pdfBuffer) {
            await sock.sendMessage(chatId, {
                document: response.pdfBuffer,
                fileName: 'extracted.pdf',
                mimetype: 'application/pdf',
            }, { quoted: ctx.rawMsg });
        }

        // Send file
        if (response.file) {
            await createAndSendFile(sock, chatId, response.file.content, response.file.fileName, {
                quoted: ctx.rawMsg,
                caption: `📄 *${response.file.fileName}*\n\n_tap buat save ke device lu_`,
            });
        }

        // Send PPTX presentation
        if (response.pptx) {
            await sendPptx(sock, chatId, response.pptx.filePath, response.pptx.fileName, {
                quoted: ctx.rawMsg,
                caption: `📊 *${response.pptx.fileName}* (${response.pptx.slideCount} slides)\n\n_tap buat save ke device lu_`,
            });
        }

        // Send media (mp3/mp4 from YouTube)
        if (response.media) {
            const mediaPath = response.media.path;
            const fs = require('fs');
            if (fs.existsSync(mediaPath)) {
                if (response.media.type === 'audio') {
                    await sock.sendMessage(chatId, {
                        audio: { url: mediaPath },
                        mimetype: 'audio/mpeg',
                    }, { quoted: ctx.rawMsg });
                } else {
                    await sock.sendMessage(chatId, {
                        video: { url: mediaPath },
                        mimetype: 'video/mp4',
                    }, { quoted: ctx.rawMsg });
                }
                // Cleanup temp file
                if (response.media.cleanup) {
                    try { cleanupFile(mediaPath); } catch {}
                }
            }
        }

        // Check for legacy [FILE:] marker in text
        if (response.text) {
            const fileInfo = require('./fileCreator').parseFileMarker(response.text);
            if (fileInfo && fileInfo.hasFile) {
                // Send intro text before file if present
                if (fileInfo.preText) {
                    await sock.sendMessage(chatId, { text: fileInfo.preText }, { quoted: ctx.rawMsg });
                }
                await createAndSendFile(sock, chatId, fileInfo.content, fileInfo.fileName, {
                    quoted: fileInfo.preText ? undefined : ctx.rawMsg,
                    caption: `📄 *${fileInfo.fileName}*\n\n_tap buat save ke device lu_`,
                });
            } else {
                // Normal text response — multi-bubble aware
                await multiBubbleSend(sock, chatId, response.text, { quoted: ctx.rawMsg });
            }
        }

    } catch (err) {
        const errDetail = {
            chatId,
            pushName: normalizedMsg.pushName,
            senderId: normalizedMsg.senderId,
            isGroup: normalizedMsg.isGroup,
            messageType: normalizedMsg.messageType,
            textPreview: (normalizedMsg.text || '').substring(0, 80),
            error: err.message,
            stack: err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : 'N/A',
        };
        console.error(`[IntentRouter] Routing ERROR |`, JSON.stringify(errDetail));
        await reportBugToOwner(sock, chatId, normalizedMsg.pushName, err, 'IntentRouter', ctx.rawMsg);
        await sock.sendMessage(chatId, { text: 'duh error jir 😓 bntar ya' }, { quoted: ctx.rawMsg });
    }

    await sock.sendPresenceUpdate('paused', chatId);
};

module.exports = {
    routeMessage,
    FAST_COMMANDS,
    PREFIX_COMMANDS,
};
