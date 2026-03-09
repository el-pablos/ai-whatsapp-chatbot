/**
 * Document Chunker — split documents into overlapping chunks for RAG
 *
 * Pecah dokumen jadi chunk-chunk kecil buat di-embed.
 * Support overlap biar context ga putus di batas chunk.
 * Handle berbagai format: plain text, markdown, conversational.
 *
 * @author Tama El Pablo
 */

const DEFAULT_CHUNK_SIZE = parseInt(process.env.RAG_CHUNK_SIZE, 10) || 500;
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.RAG_CHUNK_OVERLAP, 10) || 100;
const MIN_CHUNK_SIZE = 50;
const MAX_CHUNK_SIZE = 4000;

/**
 * Split text into overlapping chunks
 *
 * @param {string} text - full document text
 * @param {object} [options={}]
 * @param {number} [options.chunkSize=500] - target chars per chunk
 * @param {number} [options.overlap=100] - overlap chars between chunks
 * @param {string} [options.documentId] - parent document ID
 * @param {object} [options.metadata={}] - metadata to attach to every chunk
 * @returns {Array<{ id: string, text: string, index: number, metadata: object }>}
 */
const chunkText = (text, options = {}) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return [];
    }

    try {

    const chunkSize = _clamp(options.chunkSize || DEFAULT_CHUNK_SIZE, MIN_CHUNK_SIZE, MAX_CHUNK_SIZE);
    const overlap = Math.min(options.overlap ?? DEFAULT_CHUNK_OVERLAP, Math.floor(chunkSize / 2));
    const documentId = options.documentId || _generateId();
    const metadata = options.metadata || {};

    const cleanText = text.replace(/\r\n/g, '\n').trim();

    // Try splitting by paragraphs first for natural boundaries
    const paragraphs = cleanText.split(/\n\n+/);
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
        const trimmedPara = paragraph.trim();
        if (!trimmedPara) continue;

        // If adding this paragraph exceeds chunk size, finalize current chunk
        if (currentChunk.length + trimmedPara.length + 1 > chunkSize && currentChunk.length > 0) {
            chunks.push(_createChunk(currentChunk.trim(), chunkIndex, documentId, metadata));
            chunkIndex++;

            // Overlap: keep tail of current chunk
            if (overlap > 0) {
                currentChunk = _getOverlapText(currentChunk, overlap) + '\n\n' + trimmedPara;
            } else {
                currentChunk = trimmedPara;
            }
        } else {
            currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
        }

        // If single paragraph is way too big, force-split it
        if (currentChunk.length > chunkSize * 1.5) {
            const forceSplit = _forceSplitText(currentChunk, chunkSize, overlap);
            for (let i = 0; i < forceSplit.length - 1; i++) {
                chunks.push(_createChunk(forceSplit[i].trim(), chunkIndex, documentId, metadata));
                chunkIndex++;
            }
            // Keep last piece as ongoing chunk
            currentChunk = forceSplit[forceSplit.length - 1];
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
        chunks.push(_createChunk(currentChunk.trim(), chunkIndex, documentId, metadata));
    }

    return chunks;
    } catch (err) {
        console.error('[DocumentChunker] chunkText failed:', err.message);
        return [];
    }
};

/**
 * Split markdown document with heading awareness
 *
 * @param {string} markdown
 * @param {object} [options={}]
 * @returns {Array<{ id: string, text: string, index: number, metadata: object }>}
 */
const chunkMarkdown = (markdown, options = {}) => {
    if (!markdown || typeof markdown !== 'string') return [];

    try {

    const documentId = options.documentId || _generateId();
    const chunkSize = _clamp(options.chunkSize || DEFAULT_CHUNK_SIZE, MIN_CHUNK_SIZE, MAX_CHUNK_SIZE);
    const metadata = options.metadata || {};

    // Split by headings
    const sections = markdown.split(/(?=^#{1,6}\s)/m);
    const chunks = [];
    let chunkIndex = 0;
    let currentHeading = '';

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        // Extract heading
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
        if (headingMatch) {
            currentHeading = headingMatch[2].trim();
        }

        // If section fits in one chunk, add it directly
        if (trimmed.length <= chunkSize) {
            chunks.push(_createChunk(trimmed, chunkIndex, documentId, {
                ...metadata,
                heading: currentHeading
            }));
            chunkIndex++;
        } else {
            // Section too big, sub-chunk it
            const subChunks = chunkText(trimmed, {
                chunkSize,
                overlap: options.overlap,
                documentId,
                metadata: { ...metadata, heading: currentHeading }
            });

            for (const sub of subChunks) {
                sub.index = chunkIndex;
                sub.id = `${documentId}_chunk_${chunkIndex}`;
                chunks.push(sub);
                chunkIndex++;
            }
        }
    }

    return chunks;
    } catch (err) {
        console.error('[DocumentChunker] chunkMarkdown failed:', err.message);
        return [];
    }
};

/**
 * Split conversational text (WhatsApp-style messages)
 *
 * @param {string} chatText
 * @param {object} [options={}]
 * @returns {Array<{ id: string, text: string, index: number, metadata: object }>}
 */
const chunkConversation = (chatText, options = {}) => {
    if (!chatText || typeof chatText !== 'string') return [];

    try {

    const documentId = options.documentId || _generateId();
    const chunkSize = _clamp(options.chunkSize || DEFAULT_CHUNK_SIZE, MIN_CHUNK_SIZE, MAX_CHUNK_SIZE);
    const metadata = { ...options.metadata, type: 'conversation' };

    // Split by message boundaries (timestamp patterns or line breaks)
    const messages = chatText.split(/\n(?=\[?\d{1,2}[\/\-\.]\d{1,2}|(?:\w+:))/);

    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const msg of messages) {
        const trimmed = msg.trim();
        if (!trimmed) continue;

        if (currentChunk.length + trimmed.length + 1 > chunkSize && currentChunk.length > 0) {
            chunks.push(_createChunk(currentChunk.trim(), chunkIndex, documentId, metadata));
            chunkIndex++;
            currentChunk = trimmed;
        } else {
            currentChunk = currentChunk ? currentChunk + '\n' + trimmed : trimmed;
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(_createChunk(currentChunk.trim(), chunkIndex, documentId, metadata));
    }

    return chunks;
    } catch (err) {
        console.error('[DocumentChunker] chunkConversation failed:', err.message);
        return [];
    }
};

/**
 * Estimate the number of chunks a text would produce
 *
 * @param {string} text
 * @param {number} [chunkSize]
 * @param {number} [overlap]
 * @returns {number}
 */
const estimateChunks = (text, chunkSize, overlap) => {
    if (!text) return 0;
    const size = chunkSize || DEFAULT_CHUNK_SIZE;
    const lap = overlap ?? DEFAULT_CHUNK_OVERLAP;
    const step = Math.max(size - lap, MIN_CHUNK_SIZE);
    return Math.max(1, Math.ceil(text.length / step));
};

// ─── Internal helpers ────────────────────────────────────────

let _idCounter = 0;

const _generateId = () => {
    _idCounter++;
    return `doc_${Date.now()}_${_idCounter}`;
};

const _createChunk = (text, index, documentId, metadata) => {
    return {
        id: `${documentId}_chunk_${index}`,
        text,
        index,
        metadata: {
            ...metadata,
            documentId,
            chunkIndex: index,
            charCount: text.length
        }
    };
};

const _clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Get overlap text from end of a string
 * Tries to break at word boundary
 */
const _getOverlapText = (text, overlapSize) => {
    if (text.length <= overlapSize) return text;

    const tail = text.substring(text.length - overlapSize);
    // Try to break at word boundary
    const wordBreak = tail.indexOf(' ');
    if (wordBreak > 0 && wordBreak < overlapSize * 0.5) {
        return tail.substring(wordBreak + 1);
    }
    return tail;
};

/**
 * Force-split text that's too large for one chunk
 * Splits at sentence boundaries when possible
 */
const _forceSplitText = (text, chunkSize, overlap) => {
    const pieces = [];
    let remaining = text;

    while (remaining.length > chunkSize) {
        let splitPoint = chunkSize;

        // Try to find sentence boundary near chunkSize
        const searchZone = remaining.substring(Math.floor(chunkSize * 0.7), chunkSize);
        const sentenceEnd = searchZone.lastIndexOf('. ');
        if (sentenceEnd > 0) {
            splitPoint = Math.floor(chunkSize * 0.7) + sentenceEnd + 2;
        } else {
            // Try word boundary
            const spaceIdx = remaining.lastIndexOf(' ', chunkSize);
            if (spaceIdx > chunkSize * 0.5) {
                splitPoint = spaceIdx + 1;
            }
        }

        pieces.push(remaining.substring(0, splitPoint));

        // Apply overlap
        const overlapStart = Math.max(0, splitPoint - overlap);
        remaining = remaining.substring(overlapStart);
    }

    if (remaining.length > 0) {
        pieces.push(remaining);
    }

    return pieces;
};

module.exports = {
    chunkText,
    chunkMarkdown,
    chunkConversation,
    estimateChunks,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_CHUNK_OVERLAP,
    MIN_CHUNK_SIZE,
    MAX_CHUNK_SIZE,
    _generateId,
    _getOverlapText,
    _forceSplitText
};
