/**
 * Tests for Message Normalizer
 */

const {
    normalizeMessage,
    unwrapMessage,
    detectMessageType,
    extractText,
    extractAttachments,
    extractQuoted,
} = require('../src/messageNormalizer');

// ═══════════════════════════════════════════════════════
//  FACTORY: build fake Baileys messages
// ═══════════════════════════════════════════════════════

const makeBaileysMsg = (overrides = {}) => ({
    key: {
        remoteJid: '6281234567890@s.whatsapp.net',
        id: 'MSG_TEST_123',
        fromMe: false,
        participant: undefined,
        ...overrides.key,
    },
    pushName: 'TestUser',
    messageTimestamp: 1700000000,
    message: overrides.message || { conversation: 'hello' },
    ...overrides,
});

describe('Message Normalizer', () => {
    // ──────────────────────────────────────────────────
    //  unwrapMessage
    // ──────────────────────────────────────────────────
    describe('unwrapMessage()', () => {
        test('should pass through normal message', () => {
            const msg = { conversation: 'hi' };
            expect(unwrapMessage(msg)).toBe(msg);
        });

        test('should unwrap viewOnceMessage', () => {
            const inner = { imageMessage: { caption: 'foto', mimetype: 'image/jpeg' } };
            const wrapped = { viewOnceMessage: { message: inner } };
            const result = unwrapMessage(wrapped);
            expect(result).toHaveProperty('imageMessage');
        });

        test('should unwrap viewOnceMessageV2', () => {
            const inner = { conversation: 'test' };
            const wrapped = { viewOnceMessageV2: { message: inner } };
            expect(unwrapMessage(wrapped).conversation).toBe('test');
        });

        test('should unwrap ephemeralMessage', () => {
            const inner = { conversation: 'temp' };
            const wrapped = { ephemeralMessage: { message: inner } };
            expect(unwrapMessage(wrapped).conversation).toBe('temp');
        });

        test('should unwrap documentWithCaptionMessage', () => {
            const inner = { documentMessage: { fileName: 'test.pdf' } };
            const wrapped = { documentWithCaptionMessage: { message: inner } };
            expect(unwrapMessage(wrapped)).toHaveProperty('documentMessage');
        });

        test('should return null/undefined as-is', () => {
            expect(unwrapMessage(null)).toBeNull();
            expect(unwrapMessage(undefined)).toBeUndefined();
        });
    });

    // ──────────────────────────────────────────────────
    //  detectMessageType
    // ──────────────────────────────────────────────────
    describe('detectMessageType()', () => {
        test('should detect conversation text', () => {
            expect(detectMessageType({ conversation: 'hi' })).toBe('text');
        });

        test('should detect extendedTextMessage', () => {
            expect(detectMessageType({ extendedTextMessage: { text: 'hi' } })).toBe('text');
        });

        test('should detect image', () => {
            expect(detectMessageType({ imageMessage: {} })).toBe('image');
        });

        test('should detect video', () => {
            expect(detectMessageType({ videoMessage: {} })).toBe('video');
        });

        test('should detect audio', () => {
            expect(detectMessageType({ audioMessage: {} })).toBe('audio');
        });

        test('should detect document', () => {
            expect(detectMessageType({ documentMessage: {} })).toBe('document');
        });

        test('should detect sticker', () => {
            expect(detectMessageType({ stickerMessage: {} })).toBe('sticker');
        });

        test('should detect location', () => {
            expect(detectMessageType({ locationMessage: {} })).toBe('location');
        });

        test('should detect liveLocation', () => {
            expect(detectMessageType({ liveLocationMessage: {} })).toBe('location');
        });

        test('should detect contact', () => {
            expect(detectMessageType({ contactMessage: {} })).toBe('contact');
        });

        test('should detect contactsArray', () => {
            expect(detectMessageType({ contactsArrayMessage: {} })).toBe('contact');
        });

        test('should return unknown for null', () => {
            expect(detectMessageType(null)).toBe('unknown');
        });

        test('should return unknown for empty message', () => {
            expect(detectMessageType({})).toBe('unknown');
        });
    });

    // ──────────────────────────────────────────────────
    //  extractText
    // ──────────────────────────────────────────────────
    describe('extractText()', () => {
        test('should extract conversation text', () => {
            expect(extractText({ conversation: 'hello world' })).toBe('hello world');
        });

        test('should extract extendedTextMessage text', () => {
            expect(extractText({ extendedTextMessage: { text: 'hello reply' } })).toBe('hello reply');
        });

        test('should extract image caption', () => {
            expect(extractText({ imageMessage: { caption: 'nice pic' } })).toBe('nice pic');
        });

        test('should extract video caption', () => {
            expect(extractText({ videoMessage: { caption: 'cool vid' } })).toBe('cool vid');
        });

        test('should extract document caption', () => {
            expect(extractText({ documentMessage: { caption: 'check this' } })).toBe('check this');
        });

        test('should return null for no text', () => {
            expect(extractText({ stickerMessage: {} })).toBeNull();
        });

        test('should return null for null input', () => {
            expect(extractText(null)).toBeNull();
        });
    });

    // ──────────────────────────────────────────────────
    //  extractAttachments
    // ──────────────────────────────────────────────────
    describe('extractAttachments()', () => {
        test('should extract image attachment', () => {
            const msg = { imageMessage: { mimetype: 'image/png', caption: 'test', fileLength: 1000 } };
            const atts = extractAttachments(msg, 'image');
            expect(atts).toHaveLength(1);
            expect(atts[0].type).toBe('image');
            expect(atts[0].mimetype).toBe('image/png');
        });

        test('should extract video attachment', () => {
            const msg = { videoMessage: { mimetype: 'video/mp4', seconds: 30 } };
            const atts = extractAttachments(msg, 'video');
            expect(atts).toHaveLength(1);
            expect(atts[0].type).toBe('video');
            expect(atts[0].seconds).toBe(30);
        });

        test('should extract audio attachment (voice note)', () => {
            const msg = { audioMessage: { mimetype: 'audio/ogg', ptt: true, seconds: 5 } };
            const atts = extractAttachments(msg, 'audio');
            expect(atts).toHaveLength(1);
            expect(atts[0].type).toBe('audio');
            expect(atts[0].ptt).toBe(true);
            expect(atts[0].fileName).toBe('voice.ogg');
        });

        test('should extract audio (not voice note)', () => {
            const msg = { audioMessage: { mimetype: 'audio/mp3', ptt: false } };
            const atts = extractAttachments(msg, 'audio');
            expect(atts[0].ptt).toBe(false);
            expect(atts[0].fileName).toBe('audio.ogg');
        });

        test('should extract document attachment', () => {
            const msg = { documentMessage: { mimetype: 'application/pdf', fileName: 'report.pdf', fileLength: 500 } };
            const atts = extractAttachments(msg, 'document');
            expect(atts).toHaveLength(1);
            expect(atts[0].type).toBe('document');
            expect(atts[0].fileName).toBe('report.pdf');
        });

        test('should extract sticker attachment', () => {
            const msg = { stickerMessage: { mimetype: 'image/webp', isAnimated: true } };
            const atts = extractAttachments(msg, 'sticker');
            expect(atts).toHaveLength(1);
            expect(atts[0].type).toBe('sticker');
            expect(atts[0].animated).toBe(true);
        });

        test('should return empty for text', () => {
            const atts = extractAttachments({ conversation: 'hi' }, 'text');
            expect(atts).toHaveLength(0);
        });

        test('should return empty for unknown type', () => {
            expect(extractAttachments({}, 'unknown')).toHaveLength(0);
        });
    });

    // ──────────────────────────────────────────────────
    //  extractQuoted
    // ──────────────────────────────────────────────────
    describe('extractQuoted()', () => {
        test('should return null if no contextInfo', () => {
            expect(extractQuoted({ conversation: 'hi' })).toBeNull();
        });

        test('should extract quoted text message', () => {
            const msg = {
                extendedTextMessage: {
                    text: 'reply to this',
                    contextInfo: {
                        quotedMessage: { conversation: 'original message' },
                        stanzaId: 'QUOTED_MSG_ID',
                        participant: '628111@s.whatsapp.net',
                    },
                },
            };
            const q = extractQuoted(msg);
            expect(q).not.toBeNull();
            expect(q.text).toBe('original message');
            expect(q.mediaType).toBeNull();
            expect(q.messageId).toBe('QUOTED_MSG_ID');
            expect(q.participant).toBe('628111@s.whatsapp.net');
        });

        test('should extract quoted image', () => {
            const msg = {
                extendedTextMessage: {
                    text: 'analisa ini',
                    contextInfo: {
                        quotedMessage: {
                            imageMessage: { caption: 'my pic', mimetype: 'image/jpeg', fileLength: 2000 },
                        },
                    },
                },
            };
            const q = extractQuoted(msg);
            expect(q.mediaType).toBe('image');
            expect(q.text).toBe('my pic');
            expect(q.mediaInfo.mimetype).toBe('image/jpeg');
        });

        test('should extract quoted document', () => {
            const msg = {
                extendedTextMessage: {
                    text: 'rangkum',
                    contextInfo: {
                        quotedMessage: {
                            documentMessage: { fileName: 'report.pdf', mimetype: 'application/pdf' },
                        },
                    },
                },
            };
            const q = extractQuoted(msg);
            expect(q.mediaType).toBe('document');
            expect(q.text).toContain('report.pdf');
        });

        test('should extract quoted video', () => {
            const msg = {
                extendedTextMessage: {
                    text: 'reaction',
                    contextInfo: {
                        quotedMessage: {
                            videoMessage: { caption: 'funny vid', mimetype: 'video/mp4' },
                        },
                    },
                },
            };
            const q = extractQuoted(msg);
            expect(q.mediaType).toBe('video');
            expect(q.text).toBe('funny vid');
        });

        test('should extract quoted audio', () => {
            const msg = {
                extendedTextMessage: {
                    text: 'what did you say?',
                    contextInfo: {
                        quotedMessage: {
                            audioMessage: { mimetype: 'audio/ogg', ptt: true, seconds: 10 },
                        },
                    },
                },
            };
            const q = extractQuoted(msg);
            expect(q.mediaType).toBe('audio');
            expect(q.text).toBe('[voice note / audio]');
        });

        test('should extract quoted sticker', () => {
            const msg = {
                extendedTextMessage: {
                    text: 'lol',
                    contextInfo: {
                        quotedMessage: { stickerMessage: { mimetype: 'image/webp' } },
                    },
                },
            };
            const q = extractQuoted(msg);
            expect(q.mediaType).toBe('sticker');
            expect(q.text).toBe('[sticker]');
        });
    });

    // ──────────────────────────────────────────────────
    //  normalizeMessage (full integration)
    // ──────────────────────────────────────────────────
    describe('normalizeMessage()', () => {
        test('should normalize a simple text message', () => {
            const raw = makeBaileysMsg();
            const n = normalizeMessage(raw);

            expect(n.chatId).toBe('6281234567890@s.whatsapp.net');
            expect(n.senderId).toBe('6281234567890@s.whatsapp.net');
            expect(n.pushName).toBe('TestUser');
            expect(n.isGroup).toBe(false);
            expect(n.isFromMe).toBe(false);
            expect(n.text).toBe('hello');
            expect(n.messageType).toBe('text');
            expect(n.attachments).toHaveLength(0);
            expect(n.quoted).toBeNull();
            expect(n.location).toBeNull();
            expect(n.messageId).toBe('MSG_TEST_123');
            expect(n.raw).toBe(raw);
        });

        test('should normalize a group message', () => {
            const raw = makeBaileysMsg({
                key: {
                    remoteJid: '120363@g.us',
                    id: 'GRP_MSG_1',
                    fromMe: false,
                    participant: '628111@s.whatsapp.net',
                },
            });
            const n = normalizeMessage(raw);
            expect(n.chatId).toBe('120363@g.us');
            expect(n.isGroup).toBe(true);
            expect(n.senderId).toBe('628111@s.whatsapp.net');
        });

        test('should normalize an image message', () => {
            const raw = makeBaileysMsg({
                message: {
                    imageMessage: { caption: 'check this', mimetype: 'image/jpeg', fileLength: 5000 },
                },
            });
            const n = normalizeMessage(raw);
            expect(n.messageType).toBe('image');
            expect(n.text).toBe('check this');
            expect(n.attachments).toHaveLength(1);
            expect(n.attachments[0].type).toBe('image');
        });

        test('should normalize a document message', () => {
            const raw = makeBaileysMsg({
                message: {
                    documentMessage: {
                        fileName: 'report.pdf',
                        mimetype: 'application/pdf',
                        fileLength: 10000,
                        caption: 'rangkum ini',
                    },
                },
            });
            const n = normalizeMessage(raw);
            expect(n.messageType).toBe('document');
            expect(n.text).toBe('rangkum ini');
            expect(n.attachments[0].fileName).toBe('report.pdf');
        });

        test('should normalize a location message', () => {
            const raw = makeBaileysMsg({
                message: {
                    locationMessage: {
                        degreesLatitude: -6.2088,
                        degreesLongitude: 106.8456,
                        name: 'Monas',
                        address: 'Jakarta Pusat',
                    },
                },
            });
            const n = normalizeMessage(raw);
            expect(n.messageType).toBe('location');
            expect(n.location).not.toBeNull();
            expect(n.location.latitude).toBeCloseTo(-6.2088);
            expect(n.location.longitude).toBeCloseTo(106.8456);
            expect(n.location.name).toBe('Monas');
        });

        test('should normalize a voice note', () => {
            const raw = makeBaileysMsg({
                message: {
                    audioMessage: { mimetype: 'audio/ogg; codecs=opus', ptt: true, seconds: 15 },
                },
            });
            const n = normalizeMessage(raw);
            expect(n.messageType).toBe('audio');
            expect(n.attachments[0].ptt).toBe(true);
        });

        test('should handle viewOnce wrapper', () => {
            const raw = makeBaileysMsg({
                message: {
                    viewOnceMessage: {
                        message: { imageMessage: { caption: 'secret', mimetype: 'image/jpeg' } },
                    },
                },
            });
            const n = normalizeMessage(raw);
            expect(n.messageType).toBe('image');
            expect(n.text).toBe('secret');
        });

        test('should handle null message gracefully', () => {
            expect(normalizeMessage(null)).toBeNull();
        });

        test('should handle isFromMe', () => {
            const raw = makeBaileysMsg({ key: { fromMe: true } });
            const n = normalizeMessage(raw);
            expect(n.isFromMe).toBe(true);
        });

        test('should use default pushName when missing', () => {
            const raw = makeBaileysMsg({ pushName: undefined });
            const n = normalizeMessage(raw);
            expect(n.pushName).toBe('User');
        });

        test('should compute timestamp in milliseconds', () => {
            const raw = makeBaileysMsg({ messageTimestamp: 1700000000 });
            const n = normalizeMessage(raw);
            expect(n.timestamp).toBe(1700000000000);
        });
    });
});
