/**
 * QR Code Handler — generate QR code dari teks atau URL
 * 
 * @author Tama El Pablo
 */

const QRCode = require('qrcode');

/**
 * Generate QR code sebagai buffer PNG
 * @param {string} text — teks/URL yang mau dijadiin QR
 * @param {object} options — opsi tambahan
 * @returns {Promise<Buffer>}
 */
const generateQRCode = async (text, options = {}) => {
    if (!text) throw new Error('Teks ga boleh kosong buat generate QR');

    const qrOptions = {
        type: 'png',
        width: options.width || 400,
        margin: options.margin || 2,
        color: {
            dark: options.darkColor || '#000000',
            light: options.lightColor || '#ffffff',
        },
        errorCorrectionLevel: 'M',
    };

    return QRCode.toBuffer(text, qrOptions);
};

/**
 * Parse command /qr
 * @param {string} text — misal "/qr https://example.com"
 * @returns {string|null}
 */
const parseQRCommand = (text) => {
    if (!text) return null;
    const match = text.match(/^\/qr\s+(.+)$/is);
    return match ? match[1].trim() : null;
};

/**
 * Generate QR code dan return info buat kirim
 * @param {string} content — teks/URL
 * @returns {Promise<{buffer: Buffer, caption: string}>}
 */
const createQRResponse = async (content) => {
    const buffer = await generateQRCode(content);
    const isUrl = /^https?:\/\//i.test(content);
    const caption = isUrl
        ? `📱 QR Code buat: ${content}`
        : `📱 QR Code generated`;
    return { buffer, caption };
};

module.exports = {
    generateQRCode,
    parseQRCommand,
    createQRResponse,
};
