/**
 * Message Utilities Module
 * 
 * Handles message splitting for WhatsApp character limits
 * and provides utilities for sending long messages.
 * 
 * WhatsApp limits:
 * - Single message: ~65536 chars (theoretical)
 * - Practical limit: ~4000-4096 chars for best display
 * - We'll use 3800 chars as safe limit with smart splitting
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

// Safe character limit for WhatsApp messages
const WA_MESSAGE_LIMIT = 3800;

// Delay between messages to avoid rate limiting (ms)
const MESSAGE_DELAY = 500;

// Multi-bubble delimiter — AI uses this to split responses into separate WA messages
const BUBBLE_DELIMITER = '---BUBBLE---';

/**
 * Split long text into multiple messages
 * Tries to split at natural break points (paragraphs, lines, sentences)
 * 
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum length per message (default: WA_MESSAGE_LIMIT)
 * @returns {string[]} - Array of message chunks
 */
const splitMessage = (text, maxLength = WA_MESSAGE_LIMIT) => {
    if (!text || text.length <= maxLength) {
        return [text];
    }

    const chunks = [];
    let remainingText = text;

    while (remainingText.length > 0) {
        if (remainingText.length <= maxLength) {
            chunks.push(remainingText);
            break;
        }

        // Find the best split point
        let splitIndex = findBestSplitPoint(remainingText, maxLength);
        
        // Extract chunk and trim
        let chunk = remainingText.substring(0, splitIndex).trim();
        remainingText = remainingText.substring(splitIndex).trim();

        if (chunk) {
            chunks.push(chunk);
        }
    }

    return chunks.filter(c => c.length > 0);
};

/**
 * Find the best point to split text
 * Priority: double newline > single newline > period > comma > space
 * 
 * @param {string} text - Text to analyze
 * @param {number} maxLength - Maximum length
 * @returns {number} - Best split index
 */
const findBestSplitPoint = (text, maxLength) => {
    const searchArea = text.substring(0, maxLength);

    // Priority 1: Split at separator lines (━━━━━ or ═════ or ------)
    const separatorMatch = searchArea.lastIndexOf('━━━');
    if (separatorMatch > maxLength * 0.5) {
        // Find the end of the line
        const endOfLine = text.indexOf('\n', separatorMatch);
        if (endOfLine > 0 && endOfLine <= maxLength) {
            return endOfLine + 1;
        }
        return separatorMatch;
    }

    // Priority 2: Split at double newline (paragraph break)
    const doubleNewline = searchArea.lastIndexOf('\n\n');
    if (doubleNewline > maxLength * 0.3) {
        return doubleNewline + 2;
    }

    // Priority 3: Split at section headers (📍, 🌟, ##)
    const headerPatterns = ['📍', '🌟', '##', '**'];
    for (const pattern of headerPatterns) {
        const lastHeader = searchArea.lastIndexOf(`\n${pattern}`);
        if (lastHeader > maxLength * 0.4) {
            return lastHeader + 1;
        }
    }

    // Priority 4: Split at single newline
    const singleNewline = searchArea.lastIndexOf('\n');
    if (singleNewline > maxLength * 0.5) {
        return singleNewline + 1;
    }

    // Priority 5: Split at period followed by space
    const periodSpace = searchArea.lastIndexOf('. ');
    if (periodSpace > maxLength * 0.5) {
        return periodSpace + 2;
    }

    // Priority 6: Split at comma followed by space
    const commaSpace = searchArea.lastIndexOf(', ');
    if (commaSpace > maxLength * 0.6) {
        return commaSpace + 2;
    }

    // Priority 7: Split at any space
    const lastSpace = searchArea.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
        return lastSpace + 1;
    }

    // Fallback: Hard split at maxLength
    return maxLength;
};

/**
 * Send multiple messages with delay
 * 
 * @param {Object} sock - Baileys socket instance
 * @param {string} recipient - Recipient JID
 * @param {string[]} messages - Array of messages to send
 * @param {Object} options - Options (quoted message, etc)
 * @returns {Promise<void>}
 */
const sendChunkedMessages = async (sock, recipient, messages, options = {}) => {
    const { quoted, delay = MESSAGE_DELAY } = options;

    console.log(`[MessageUtils] Sending ${messages.length} chunk(s) to ${recipient}`);

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        // Add part indicator for multi-part messages
        let textToSend = message;
        if (messages.length > 1) {
            textToSend = `${message}\n\n_[${i + 1}/${messages.length}]_`;
        }

        // Only quote the first message
        const msgOptions = i === 0 && quoted ? { quoted } : {};
        
        try {
            console.log(`[MessageUtils] Sending chunk ${i + 1}/${messages.length} (${textToSend.length} chars)`);
            const result = await sock.sendMessage(recipient, { text: textToSend }, msgOptions);
            console.log(`[MessageUtils] Chunk ${i + 1} sent successfully, msgId: ${result?.key?.id || 'unknown'}`);
        } catch (sendError) {
            console.error(`[MessageUtils] FAILED to send chunk ${i + 1}:`, sendError.message);
            throw sendError; // Re-throw so caller knows
        }

        // Delay between messages (except after last)
        if (i < messages.length - 1) {
            await sleep(delay);
        }
    }
};

/**
 * Smart send - automatically splits and sends long messages
 * 
 * @param {Object} sock - Baileys socket instance  
 * @param {string} recipient - Recipient JID
 * @param {string} text - Text to send
 * @param {Object} options - Options (quoted, delay)
 * @returns {Promise<void>}
 */
const smartSend = async (sock, recipient, text, options = {}) => {
    const chunks = splitMessage(text);
    await sendChunkedMessages(sock, recipient, chunks, options);
};

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Estimate reading time for a message
 * @param {string} text - Text to analyze
 * @returns {number} - Estimated seconds to read
 */
const estimateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil((words / wordsPerMinute) * 60);
};

/**
 * Format message with continuation indicator
 * @param {string} text - Original text
 * @param {number} part - Current part number
 * @param {number} total - Total parts
 * @returns {string}
 */
const formatWithPartIndicator = (text, part, total) => {
    if (total <= 1) return text;
    return `${text}\n\n_━━━ Bagian ${part}/${total} ━━━_`;
};

/**
 * Parse AI response into separate bubbles using BUBBLE_DELIMITER.
 * Each bubble that exceeds WA_MESSAGE_LIMIT is further split via splitMessage.
 *
 * @param {string} text - Raw AI response text
 * @returns {string[]} - Array of bubble strings ready to send
 */
const parseBubbles = (text) => {
    if (!text) return [];

    const rawBubbles = text.split(BUBBLE_DELIMITER)
        .map(b => b.trim())
        .filter(b => b.length > 0);

    // If no delimiter was found, return as-is (will be handled by smartSend)
    if (rawBubbles.length <= 1) return rawBubbles;

    // Each bubble may still be too long — split further if needed
    const result = [];
    for (const bubble of rawBubbles) {
        if (bubble.length > WA_MESSAGE_LIMIT) {
            result.push(...splitMessage(bubble));
        } else {
            result.push(bubble);
        }
    }
    return result;
};

/**
 * Multi-bubble send — parse bubbles from AI response then send each as a separate WA message.
 * Falls back to smartSend behavior if no BUBBLE_DELIMITER found.
 *
 * @param {Object} sock - Baileys socket instance
 * @param {string} recipient - Recipient JID
 * @param {string} text - AI response text (may contain ---BUBBLE---)
 * @param {Object} options - Options (quoted, delay)
 * @returns {Promise<void>}
 */
const multiBubbleSend = async (sock, recipient, text, options = {}) => {
    const bubbles = parseBubbles(text);

    if (bubbles.length === 0) return;

    // If single bubble or no delimiter found, delegate to smartSend
    if (bubbles.length === 1) {
        return smartSend(sock, recipient, bubbles[0], options);
    }

    // Send each bubble as a separate message
    const { quoted, delay = MESSAGE_DELAY } = options;
    for (let i = 0; i < bubbles.length; i++) {
        const msgOptions = i === 0 && quoted ? { quoted } : {};
        try {
            await sock.sendMessage(recipient, { text: bubbles[i] }, msgOptions);
        } catch (err) {
            console.error(`[MessageUtils] Failed to send bubble ${i + 1}/${bubbles.length}:`, err.message);
            throw err;
        }
        if (i < bubbles.length - 1) {
            await sleep(delay);
        }
    }
};

module.exports = {
    splitMessage,
    findBestSplitPoint,
    sendChunkedMessages,
    smartSend,
    parseBubbles,
    multiBubbleSend,
    sleep,
    estimateReadingTime,
    formatWithPartIndicator,
    WA_MESSAGE_LIMIT,
    MESSAGE_DELAY,
    BUBBLE_DELIMITER,
};
