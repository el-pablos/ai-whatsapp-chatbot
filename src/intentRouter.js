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
const { smartSend } = require('./messageUtils');
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
            text: `🤖 *Tama AI v3.0*\n\n*Chat:*\n• Chat biasa - w bales pake gaya Tama\n• Kirim gambar - w analisis\n• Kirim voice note - w transcribe & jawab\n• Kirim lokasi - w tau dimana lu\n• Reply chat/lampiran - w paham konteks\n• 🌐 *Internet* - w bisa cari info terbaru!\n\n*File:*\n📄 Minta w buatin file apa aja\n📑 Kirim dokumen - w baca & analisis (70+ format)\n\n*Media:*\n🎨 stiker/sticker → bikin stiker\n🎵 link youtube → download MP3/MP4\n📸 kirim foto → analisis gambar\n\n*Entertainment:*\n🔮 tarot → baca kartu tarot\n😊 curhat → baca mood lo\n🔍 search/cari → cari di internet\n\n*Kalender:*\n📅 /kalender /libur /zodiak /ultah /today\n\n*Admin:*\n• /clear - hapus history\n• /stats - statistik\n• /backup - backup data\n\n💡 Chat aja natural, w ngerti kok 😎`,
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
                const result = await handler(args, { chatId, sock, isOwner: isOwner(chatId) });
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
                // Normal text response
                await smartSend(sock, chatId, response.text, { quoted: ctx.rawMsg });
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
