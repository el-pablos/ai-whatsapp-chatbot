/**
 * Document Handler Module
 * Handles PDF and DOCX file reading with AI integration
 * 
 * Features:
 * - Native PDF text extraction
 * - DOCX text extraction
 * - AI-powered analysis and summarization
 * - Full text reading with context
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');

// Constants
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141/v1/chat/completions';
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 50000; // Max chars to process

/**
 * Extract text from PDF buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<Object>} - Extracted content with metadata
 */
const extractPdfText = async (buffer) => {
    try {
        const data = await pdfParse(buffer, {
            // Options for better text extraction
            max: 0, // No page limit
            version: 'v2.0.550'
        });
        
        return {
            success: true,
            text: data.text,
            metadata: {
                pages: data.numpages,
                info: data.info || {},
                version: data.version
            }
        };
    } catch (error) {
        console.error('[Document] PDF extraction error:', error.message);
        return {
            success: false,
            error: error.message,
            text: '',
            metadata: {}
        };
    }
};

/**
 * Extract text from DOCX buffer
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<Object>} - Extracted content with metadata
 */
const extractDocxText = async (buffer) => {
    try {
        // Extract raw text
        const result = await mammoth.extractRawText({ buffer });
        
        // Also get HTML for structure info
        const htmlResult = await mammoth.convertToHtml({ buffer });
        
        return {
            success: true,
            text: result.value,
            metadata: {
                warnings: result.messages || [],
                hasFormatting: htmlResult.value.includes('<strong>') || 
                              htmlResult.value.includes('<em>') ||
                              htmlResult.value.includes('<h1>')
            }
        };
    } catch (error) {
        console.error('[Document] DOCX extraction error:', error.message);
        return {
            success: false,
            error: error.message,
            text: '',
            metadata: {}
        };
    }
};

/**
 * Detect document type from filename or mimetype
 * @param {string} filename - File name
 * @param {string} mimetype - MIME type
 * @returns {string} - Document type: 'pdf', 'docx', or 'unknown'
 */
const detectDocumentType = (filename, mimetype) => {
    const ext = filename?.toLowerCase().split('.').pop();
    
    if (ext === 'pdf' || mimetype === 'application/pdf') {
        return 'pdf';
    }
    
    if (ext === 'docx' || 
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return 'docx';
    }
    
    if (ext === 'doc' || mimetype === 'application/msword') {
        return 'doc'; // Old format, not fully supported
    }
    
    return 'unknown';
};

/**
 * Get AI analysis of document content
 * @param {string} text - Document text
 * @param {string} filename - Document filename
 * @param {string} userRequest - What user wants to do with document
 * @param {Array} history - Chat history for context
 * @returns {Promise<string>} - AI response
 */
const analyzeDocumentWithAI = async (text, filename, userRequest = '', history = []) => {
    try {
        // Truncate text if too long
        const truncatedText = text.length > MAX_TEXT_LENGTH 
            ? text.substring(0, MAX_TEXT_LENGTH) + '\n\n[... dokumen terpotong karena terlalu panjang ...]'
            : text;

        const systemPrompt = `Lo adalah Tama, AI assistant yang ahli dalam membaca dan menganalisis dokumen.
Personality: santai tapi pinter, suka becanda tapi tetep informatif, pake bahasa gaul Jakarta.

KEMAMPUAN ANALISIS DOKUMEN:
1. BACA TELITI - Pahami isi dokumen secara menyeluruh
2. IDENTIFIKASI - Temukan poin-poin penting, data, dan informasi kunci
3. ANALISIS - Berikan insight dan hubungan antar informasi
4. RANGKUM - Buat ringkasan yang jelas dan mudah dipahami
5. JAWAB - Jawab pertanyaan spesifik tentang dokumen dengan akurat

FORMAT RESPONS:
- Mulai dengan konfirmasi file yang dibaca
- Berikan overview singkat isi dokumen
- Detail informasi penting
- Jawab pertanyaan user jika ada
- Gunakan emoji biar ga boring 📄✨

PENTING:
- Jangan bilang "saya tidak bisa membaca file" karena TEXT SUDAH DIEKSTRAK
- Analisis BERDASARKAN TEXT yang diberikan
- Jika user tanya spesifik, fokus jawab itu
- Tetap santai tapi akurat`;

        const userMessage = userRequest 
            ? `User kirim file "${filename}" dan minta: ${userRequest}\n\n===== ISI DOKUMEN =====\n${truncatedText}\n===== END DOKUMEN =====`
            : `User kirim file "${filename}", tolong baca dan analisis isinya.\n\n===== ISI DOKUMEN =====\n${truncatedText}\n===== END DOKUMEN =====`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-5).map(h => ({
                role: h.role,
                content: h.content
            })),
            { role: 'user', content: userMessage }
        ];

        const response = await axios.post(COPILOT_API_URL, {
            model: 'claude-sonnet-4-20250514',
            messages,
            max_tokens: 2000,
            temperature: 0.7
        }, {
            timeout: 90000,
            headers: { 'Content-Type': 'application/json' }
        });

        return response.data.choices[0].message.content;

    } catch (error) {
        console.error('[Document] AI analysis error:', error.message);
        throw new Error('Gagal menganalisis dokumen dengan AI');
    }
};

/**
 * Process document and return AI analysis
 * @param {Buffer} buffer - Document buffer
 * @param {string} filename - Document filename
 * @param {string} mimetype - MIME type
 * @param {string} userRequest - User's request about the document
 * @param {Array} history - Chat history
 * @returns {Promise<Object>} - Processing result
 */
const processDocument = async (buffer, filename, mimetype, userRequest = '', history = []) => {
    // Check file size
    if (buffer.length > MAX_DOCUMENT_SIZE) {
        return {
            success: false,
            error: 'File terlalu besar (max 10MB)',
            analysis: 'waduh file nya gede bgt bro 😅 max 10MB ya'
        };
    }

    // Detect document type
    const docType = detectDocumentType(filename, mimetype);
    
    if (docType === 'unknown') {
        return {
            success: false,
            error: 'Unsupported document type',
            analysis: 'sori bro, w cuma bisa baca PDF sama DOCX 📄'
        };
    }

    if (docType === 'doc') {
        return {
            success: false,
            error: 'Old DOC format not fully supported',
            analysis: 'wah ini format DOC lama bro, convert dulu ke DOCX ya biar w bisa baca 📄'
        };
    }

    console.log(`[Document] Processing ${docType}: ${filename}`);

    // Extract text based on document type
    let extraction;
    if (docType === 'pdf') {
        extraction = await extractPdfText(buffer);
    } else if (docType === 'docx') {
        extraction = await extractDocxText(buffer);
    }

    if (!extraction.success) {
        return {
            success: false,
            error: extraction.error,
            analysis: `duh error pas baca ${docType.toUpperCase()} nya 😓 ${extraction.error}`
        };
    }

    // Check if we got any text
    if (!extraction.text || extraction.text.trim().length < 10) {
        return {
            success: false,
            error: 'No text content found',
            analysis: `hmm ${docType.toUpperCase()} nya kayaknya kosong atau isinya gambar doang bro, ga ada text yang bisa w baca 🤔`
        };
    }

    console.log(`[Document] Extracted ${extraction.text.length} chars from ${filename}`);

    // Get AI analysis
    try {
        const analysis = await analyzeDocumentWithAI(
            extraction.text,
            filename,
            userRequest,
            history
        );

        return {
            success: true,
            docType,
            filename,
            textLength: extraction.text.length,
            metadata: extraction.metadata,
            analysis
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            analysis: 'duh AI nya lagi error bro, coba lagi nanti ya 😓'
        };
    }
};

/**
 * Check if file is a supported document
 * @param {string} filename - Filename
 * @param {string} mimetype - MIME type
 * @returns {boolean}
 */
const isSupportedDocument = (filename, mimetype) => {
    const docType = detectDocumentType(filename, mimetype);
    return docType === 'pdf' || docType === 'docx';
};

/**
 * Get quick document info without full AI analysis
 * @param {Buffer} buffer - Document buffer
 * @param {string} filename - Filename
 * @param {string} mimetype - MIME type
 * @returns {Promise<Object>}
 */
const getDocumentInfo = async (buffer, filename, mimetype) => {
    const docType = detectDocumentType(filename, mimetype);
    
    let extraction;
    if (docType === 'pdf') {
        extraction = await extractPdfText(buffer);
    } else if (docType === 'docx') {
        extraction = await extractDocxText(buffer);
    } else {
        return { success: false, error: 'Unsupported type' };
    }

    if (!extraction.success) {
        return extraction;
    }

    // Get word count and preview
    const words = extraction.text.trim().split(/\s+/).filter(w => w.length > 0);
    const preview = extraction.text.substring(0, 500).trim();

    return {
        success: true,
        docType,
        filename,
        textLength: extraction.text.length,
        wordCount: words.length,
        preview: preview + (extraction.text.length > 500 ? '...' : ''),
        metadata: extraction.metadata
    };
};

module.exports = {
    extractPdfText,
    extractDocxText,
    detectDocumentType,
    analyzeDocumentWithAI,
    processDocument,
    isSupportedDocument,
    getDocumentInfo,
    MAX_DOCUMENT_SIZE,
    MAX_TEXT_LENGTH
};
