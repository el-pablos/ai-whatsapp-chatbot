/**
 * Message Normalizer — standardise Baileys proto messages
 *
 * Takes a raw Baileys `messages.upsert` message object and produces
 * a flat, uniform structure that every tool / handler can consume.
 *
 * Output shape:
 * {
 *   chatId,        // JID of the chat (1-on-1 or group)
 *   senderId,      // JID of the sender
 *   pushName,      // WhatsApp display name
 *   isGroup,       // boolean
 *   isFromMe,      // boolean
 *   text,          // extracted text content (or null)
 *   messageType,   // 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'unknown'
 *   attachments[], // media info objects
 *   quoted,        // { text, mediaType, mediaInfo, messageId, participant } | null
 *   messageId,     // Baileys message ID
 *   timestamp,     // unix epoch ms
 *   raw,           // the original msg object (for edge-case access)
 * }
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════
// UNWRAP HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Recursively unwrap viewOnce / ephemeral / documentWithCaption wrappers
 */
const unwrapMessage = (message) => {
    if (!message) return message;
    if (message.viewOnceMessage) message = message.viewOnceMessage.message || message;
    if (message.viewOnceMessageV2) message = message.viewOnceMessageV2.message || message;
    if (message.ephemeralMessage) message = message.ephemeralMessage.message || message;
    if (message.documentWithCaptionMessage) message = message.documentWithCaptionMessage.message || message;
    return message;
};

/**
 * Determine the primary message type from Baileys message keys
 */
const detectMessageType = (message) => {
    if (!message) return 'unknown';
    if (message.conversation || message.extendedTextMessage) return 'text';
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    if (message.stickerMessage) return 'sticker';
    if (message.locationMessage || message.liveLocationMessage) return 'location';
    if (message.contactMessage || message.contactsArrayMessage) return 'contact';
    return 'unknown';
};

/**
 * Extract the plain-text content from a message
 */
const extractText = (message) => {
    if (!message) return null;
    return message.conversation
        || message.extendedTextMessage?.text
        || message.imageMessage?.caption
        || message.videoMessage?.caption
        || message.documentMessage?.caption
        || null;
};

/**
 * Build attachment info from a media message
 */
const extractAttachments = (message, messageType) => {
    const attachments = [];

    const mediaHandlers = {
        image: () => ({
            type: 'image',
            mimetype: message.imageMessage?.mimetype || 'image/jpeg',
            caption: message.imageMessage?.caption || '',
            fileLength: message.imageMessage?.fileLength,
            fileName: 'image.jpg',
        }),
        video: () => ({
            type: 'video',
            mimetype: message.videoMessage?.mimetype || 'video/mp4',
            caption: message.videoMessage?.caption || '',
            fileLength: message.videoMessage?.fileLength,
            seconds: message.videoMessage?.seconds,
            fileName: 'video.mp4',
        }),
        audio: () => ({
            type: 'audio',
            mimetype: message.audioMessage?.mimetype || 'audio/ogg',
            seconds: message.audioMessage?.seconds,
            ptt: !!message.audioMessage?.ptt,
            fileName: message.audioMessage?.ptt ? 'voice.ogg' : 'audio.ogg',
        }),
        document: () => ({
            type: 'document',
            mimetype: message.documentMessage?.mimetype || 'application/octet-stream',
            caption: message.documentMessage?.caption || '',
            fileLength: message.documentMessage?.fileLength,
            fileName: message.documentMessage?.fileName || 'unknown',
        }),
        sticker: () => ({
            type: 'sticker',
            mimetype: message.stickerMessage?.mimetype || 'image/webp',
            animated: !!message.stickerMessage?.isAnimated,
            fileName: 'sticker.webp',
        }),
    };

    if (mediaHandlers[messageType]) {
        attachments.push(mediaHandlers[messageType]());
    }
    return attachments;
};

/**
 * Extract quoted message info (reply context)
 */
const extractQuoted = (message) => {
    // ContextInfo can live in several message types
    const contextInfo =
        message?.extendedTextMessage?.contextInfo ||
        message?.imageMessage?.contextInfo ||
        message?.documentMessage?.contextInfo ||
        message?.videoMessage?.contextInfo ||
        message?.audioMessage?.contextInfo ||
        message?.stickerMessage?.contextInfo;

    if (!contextInfo?.quotedMessage) return null;

    const qm = unwrapMessage(contextInfo.quotedMessage);
    const qType = detectMessageType(qm);

    let text = null;
    let mediaInfo = null;

    if (qType === 'image') {
        text = qm.imageMessage?.caption || '[gambar]';
        mediaInfo = { mimetype: qm.imageMessage?.mimetype, fileLength: qm.imageMessage?.fileLength };
    } else if (qType === 'document') {
        const fn = qm.documentMessage?.fileName || 'unknown';
        text = `[dokumen: ${fn}]`;
        mediaInfo = { mimetype: qm.documentMessage?.mimetype, fileName: fn, fileLength: qm.documentMessage?.fileLength };
    } else if (qType === 'video') {
        text = qm.videoMessage?.caption || '[video]';
        mediaInfo = { mimetype: qm.videoMessage?.mimetype, fileLength: qm.videoMessage?.fileLength };
    } else if (qType === 'audio') {
        text = '[voice note / audio]';
        mediaInfo = { mimetype: qm.audioMessage?.mimetype, seconds: qm.audioMessage?.seconds, ptt: qm.audioMessage?.ptt };
    } else if (qType === 'sticker') {
        text = '[sticker]';
    } else {
        text = qm.conversation || qm.extendedTextMessage?.text || '[media]';
    }

    return {
        text,
        mediaType: qType !== 'text' && qType !== 'unknown' ? qType : null,
        mediaInfo,
        messageId: contextInfo.stanzaId || null,
        participant: contextInfo.participant || null,
        raw: qm,
    };
};

// ═══════════════════════════════════════════════════════════
// MAIN NORMALIZER
// ═══════════════════════════════════════════════════════════

/**
 * Normalize a raw Baileys message into a standard shape.
 *
 * @param {object} msg — Raw message from `messages.upsert`
 * @returns {object} Normalized message
 */
const normalizeMessage = (msg) => {
    if (!msg) return null;

    const message = unwrapMessage(msg.message);
    const messageType = detectMessageType(message);
    const text = extractText(message);
    const attachments = extractAttachments(message, messageType);
    const quoted = extractQuoted(message);

    const chatId = msg.key?.remoteJid || '';
    const isGroup = chatId.endsWith('@g.us');
    const isFromMe = !!msg.key?.fromMe;
    const senderId = isGroup
        ? (msg.key?.participant || chatId)
        : chatId;

    // Location special case
    let location = null;
    if (message?.locationMessage) {
        location = {
            latitude: message.locationMessage.degreesLatitude,
            longitude: message.locationMessage.degreesLongitude,
            name: message.locationMessage.name || null,
            address: message.locationMessage.address || null,
        };
    }

    return {
        chatId,
        senderId,
        pushName: msg.pushName || 'User',
        isGroup,
        isFromMe,
        text,
        messageType,
        attachments,
        quoted,
        location,
        messageId: msg.key?.id || '',
        timestamp: msg.messageTimestamp
            ? (typeof msg.messageTimestamp === 'number'
                ? msg.messageTimestamp * 1000
                : Date.now())
            : Date.now(),
        raw: msg,
    };
};

module.exports = {
    normalizeMessage,
    unwrapMessage,
    detectMessageType,
    extractText,
    extractAttachments,
    extractQuoted,
};
