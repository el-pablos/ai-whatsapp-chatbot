/**
 * Document Handler Module - Universal Document Reader
 * Supports ALL document formats with AI integration
 * NO SIZE LIMITS - NO TEXT LENGTH LIMITS
 * 
 * Supported Formats:
 * - Documents: PDF, DOC, DOCX, ODT, RTF, TXT, MD, HTML, etc.
 * - Ebooks: EPUB, MOBI, AZW, FB2, etc.
 * - Presentations: PPT, PPTX, ODP, KEY, etc.
 * - Archives: ZIP, RAR, 7Z, TAR, GZ, etc.
 * - And 50+ more formats!
 * 
 * @author Tama El Pablo
 * @version 2.3.0
 */

// pdf-parse: support both v1 (exports function) and v2 (exports { PDFParse } class)
let pdfParse;
try {
    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
        // v1.x - exports a function directly
        pdfParse = pdfModule;
    } else if (pdfModule && typeof pdfModule.PDFParse === 'function') {
        // v2.x - exports { PDFParse } class with loadPDF method
        pdfParse = async (buffer, options) => {
            const parser = new pdfModule.PDFParse();
            const result = await parser.loadPDF(buffer, options);
            return result;
        };
    } else if (pdfModule && pdfModule.default && typeof pdfModule.default === 'function') {
        // v2.x alternative export
        pdfParse = pdfModule.default;
    } else {
        console.error('[Document] pdf-parse module loaded but no usable export found:', Object.keys(pdfModule || {}));
        pdfParse = null;
    }
} catch (loadError) {
    console.error('[Document] Failed to load pdf-parse:', loadError.message);
    pdfParse = null;
}
const mammoth = require('mammoth');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const AdmZip = require('adm-zip');

const execAsync = promisify(exec);

// Constants
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4.5';
const TEMP_DIR = path.join(process.cwd(), 'temp_docs');

// ============================================
// SUPPORTED DOCUMENT FORMATS - 70+ FORMATS!
// ============================================
const DOCUMENT_FORMATS = {
    // Text Documents
    text: ['txt', 'md', 'markdown', 'rst', 'tex', 'log', 'csv', 'json', 'xml', 'yaml', 'yml', 'ini', 'cfg', 'conf'],
    
    // Office Documents
    office: ['doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf', 'wpd', 'wps', 'abw', 'zabw', 'lwp', 'hwp', 'pages'],
    
    // PDF
    pdf: ['pdf'],
    
    // Spreadsheets
    spreadsheet: ['xls', 'xlsx', 'xlsm', 'ods', 'csv', 'tsv'],
    
    // Presentations
    presentation: ['ppt', 'pptx', 'pptm', 'ppsx', 'pps', 'odp', 'pot', 'potx', 'key', 'dps'],
    
    // Ebooks
    ebook: ['epub', 'mobi', 'azw', 'azw3', 'azw4', 'fb2', 'lit', 'lrf', 'pdb', 'pml', 'prc', 'rb', 'snb', 'tcr', 'txtz', 'chm', 'djvu', 'djv'],
    
    // Comic Books
    comic: ['cbr', 'cbz', 'cbc'],
    
    // Web
    web: ['html', 'htm', 'htmlz', 'xhtml', 'mhtml', 'mht'],
    
    // Archives
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz', 'tbz2', 'xz', 'txz', 'lzo', 'z', 'rz']
};

// Get all supported extensions
const ALL_SUPPORTED_EXTENSIONS = Object.values(DOCUMENT_FORMATS).flat();

/**
 * Ensure temp directory exists
 */
const ensureTempDir = async () => {
    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });
    } catch (e) { }
};

/**
 * Cleanup temp file
 */
const cleanupTemp = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (e) { }
};

/**
 * Cleanup temp directory
 */
const cleanupTempDir = async (dirPath) => {
    try {
        await fs.rm(dirPath, { recursive: true, force: true });
    } catch (e) { }
};

/**
 * Generate progress bar visual
 * @param {number} percent - Progress percentage (0-100)
 * @returns {string} Visual progress bar
 */
const generateProgressBar = (percent) => {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
};

/**
 * Get random progress message based on current progress
 * @param {number} current - Current chunk number
 * @param {number} total - Total chunks
 * @returns {string} Progress message
 */
const getProgressMessage = (current, total) => {
    const messages = {
        start: [
            'mulai baca nih... sabar ya bro 📖',
            'lagi loading dokumen nya nih cuy...',
            'otak AI lagi panas nih wkwk 🧠'
        ],
        middle: [
            'masih proses nih... lu santai dulu ☕',
            'wah panjang juga ya file nya wkwk',
            'tetep ya, lagi analisis mendalam nih 🔍',
            'sabar bro, AI butuh mikir juga ahahaha',
            'hampir setengah jalan nih! 💪'
        ],
        almostDone: [
            'bentar lagi kelar nih! 🎯',
            'tinggal dikit lagi cuy!',
            'finishing touches ya bro ✨',
            'hampir selesai, prepare the confetti 🎉'
        ],
        done: [
            'kelar juga akhirnya! 🎊',
            'done bro! siap kirim hasil nya',
            'selesai! ez pz lemon squeezy 🍋'
        ]
    };

    const progress = current / total;
    
    if (current === total) {
        return messages.done[Math.floor(Math.random() * messages.done.length)];
    } else if (progress >= 0.8) {
        return messages.almostDone[Math.floor(Math.random() * messages.almostDone.length)];
    } else if (progress >= 0.3) {
        return messages.middle[Math.floor(Math.random() * messages.middle.length)];
    } else {
        return messages.start[Math.floor(Math.random() * messages.start.length)];
    }
};

/**
 * Detect document type from filename or mimetype
 */
const detectDocumentType = (filename, mimetype) => {
    const ext = filename?.toLowerCase().split('.').pop();
    
    // Handle compound extensions
    const lowerFilename = filename?.toLowerCase() || '';
    if (lowerFilename.endsWith('.tar.gz') || lowerFilename.endsWith('.tgz')) return { type: 'archive', ext: 'tar.gz' };
    if (lowerFilename.endsWith('.tar.bz2') || lowerFilename.endsWith('.tbz2')) return { type: 'archive', ext: 'tar.bz2' };
    if (lowerFilename.endsWith('.tar.xz') || lowerFilename.endsWith('.txz')) return { type: 'archive', ext: 'tar.xz' };
    if (lowerFilename.endsWith('.tar.7z')) return { type: 'archive', ext: 'tar.7z' };
    if (lowerFilename.endsWith('.tar.z')) return { type: 'archive', ext: 'tar.z' };
    if (lowerFilename.endsWith('.tar.lzo')) return { type: 'archive', ext: 'tar.lzo' };
    
    for (const [type, extensions] of Object.entries(DOCUMENT_FORMATS)) {
        if (extensions.includes(ext)) {
            return { type, ext };
        }
    }
    
    // Check by mimetype
    if (mimetype?.includes('pdf')) return { type: 'pdf', ext: 'pdf' };
    if (mimetype?.includes('word') || mimetype?.includes('document')) return { type: 'office', ext: 'docx' };
    if (mimetype?.includes('presentation')) return { type: 'presentation', ext: 'pptx' };
    if (mimetype?.includes('spreadsheet')) return { type: 'spreadsheet', ext: 'xlsx' };
    if (mimetype?.includes('text')) return { type: 'text', ext: 'txt' };
    if (mimetype?.includes('zip')) return { type: 'archive', ext: 'zip' };
    if (mimetype?.includes('rar')) return { type: 'archive', ext: 'rar' };
    
    return { type: 'unknown', ext };
};

/**
 * Check if document is supported
 */
const isSupportedDocument = (filename, mimetype) => {
    const { type } = detectDocumentType(filename, mimetype);
    return type !== 'unknown';
};

/**
 * Extract text from PDF
 */
const extractPdfText = async (buffer) => {
    try {
        if (!pdfParse) {
            throw new Error('pdf-parse module not available');
        }
        console.log(`[Document] Extracting PDF text, buffer size: ${buffer.length}`);
        const data = await pdfParse(buffer);
        console.log(`[Document] PDF extracted: ${data.numpages || '?'} pages, ${data.text?.length || 0} chars`);
        return {
            success: true,
            text: data.text,
            metadata: { pages: data.numpages, info: data.info }
        };
    } catch (error) {
        console.error(`[Document] pdf-parse failed: ${error.message}, trying pdftotext...`);
        // Fallback to pdftotext command
        try {
            await ensureTempDir();
            const tempPath = path.join(TEMP_DIR, `temp_${Date.now()}.pdf`);
            await fs.writeFile(tempPath, buffer);
            const { stdout } = await execAsync(`pdftotext -layout "${tempPath}" -`, { maxBuffer: 500 * 1024 * 1024 });
            await cleanupTemp(tempPath);
            console.log(`[Document] pdftotext succeeded: ${stdout?.length || 0} chars`);
            return { success: true, text: stdout, metadata: {} };
        } catch (e) {
            console.error(`[Document] pdftotext also failed: ${e.message}`);
            return { success: false, error: error.message, text: '', metadata: {} };
        }
    }
};

/**
 * Extract text from DOCX with multi-layer fallback
 * 
 * DOCX is a ZIP containing XML files. WhatsApp forwarding/re-compression
 * can corrupt the ZIP structure. Fallback chain:
 *  1. mammoth (proper DOCX parser)
 *  2. AdmZip → manually read word/document.xml → strip XML tags
 *  3. Raw buffer scan for XML text content
 *  4. Brute-force UTF-8 decode (strips binary noise)
 */
const extractDocxText = async (buffer) => {
    // ── Method 1: mammoth (best quality) ──
    try {
        console.log(`[Document] Extracting DOCX text via mammoth, buffer size: ${buffer.length}`);
        const result = await mammoth.extractRawText({ buffer });
        if (result.value && result.value.trim().length > 0) {
            console.log(`[Document] DOCX extracted via mammoth: ${result.value.length} chars`);
            return { success: true, text: result.value, metadata: { method: 'mammoth' } };
        }
    } catch (error) {
        console.warn(`[Document] mammoth failed: ${error.message}`);
    }

    // ── Method 2: AdmZip → extract word/document.xml ──
    try {
        console.log('[Document] Trying AdmZip fallback for DOCX...');
        const zip = new AdmZip(buffer);
        const docEntry = zip.getEntry('word/document.xml');
        if (docEntry) {
            const xmlContent = docEntry.getData().toString('utf-8');
            // Strip XML tags, keep text content
            const text = xmlContent
                .replace(/<w:br[^>]*\/>/gi, '\n')        // line breaks
                .replace(/<\/w:p>/gi, '\n')               // paragraph ends
                .replace(/<\/w:tr>/gi, '\n')              // table row ends
                .replace(/<[^>]+>/g, '')                   // all remaining tags
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/\n{3,}/g, '\n\n')               // collapse excessive newlines
                .trim();
            if (text.length > 0) {
                console.log(`[Document] DOCX extracted via AdmZip: ${text.length} chars`);
                return { success: true, text, metadata: { method: 'admzip' } };
            }
        }
    } catch (zipError) {
        console.warn(`[Document] AdmZip fallback failed: ${zipError.message}`);
    }

    // ── Method 3: Raw XML scan (for partially corrupted ZIPs) ──
    try {
        console.log('[Document] Trying raw XML scan fallback...');
        const rawStr = buffer.toString('utf-8', 0, Math.min(buffer.length, 5 * 1024 * 1024));
        // Find XML text nodes: <w:t> or <w:t xml:space="preserve">
        const textMatches = rawStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (textMatches && textMatches.length > 0) {
            const text = textMatches
                .map(m => m.replace(/<[^>]+>/g, ''))
                .join(' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
            if (text.length > 10) {
                console.log(`[Document] DOCX extracted via raw XML scan: ${text.length} chars`);
                return { success: true, text, metadata: { method: 'raw_xml_scan' } };
            }
        }
    } catch (rawError) {
        console.warn(`[Document] Raw XML scan failed: ${rawError.message}`);
    }

    // ── Method 4: Brute-force UTF-8 (last resort) ──
    try {
        console.log('[Document] Trying brute-force UTF-8 decode...');
        const rawText = buffer.toString('utf-8');
        // Strip binary noise — keep only printable chars, newlines, tabs
        const cleaned = rawText
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
            .replace(/<[^>]+>/g, ' ')           // strip any XML/HTML tags
            .replace(/PK[\x00-\xFF]{2,20}/g, '') // strip ZIP headers
            .replace(/\s{3,}/g, ' ')
            .trim();
        // Only use if we got meaningful text (not just garbage)
        const words = cleaned.split(/\s+/).filter(w => w.length >= 2 && /[a-zA-Z\u00C0-\u024F\u0400-\u04FF]/.test(w));
        if (words.length >= 5) {
            const text = words.join(' ');
            console.log(`[Document] DOCX extracted via brute-force: ${text.length} chars (${words.length} words)`);
            return { success: true, text, metadata: { method: 'brute_force', partial: true } };
        }
    } catch (bruteError) {
        console.warn(`[Document] Brute-force decode failed: ${bruteError.message}`);
    }

    console.error('[Document] All DOCX extraction methods failed');
    return { success: false, error: 'Semua metode ekstraksi DOCX gagal — file mungkin corrupt atau bukan DOCX asli', text: '', metadata: {} };
};

/**
 * Extract text from DOC (old format) using antiword or catdoc
 */
const extractDocText = async (buffer) => {
    await ensureTempDir();
    const tempPath = path.join(TEMP_DIR, `temp_${Date.now()}.doc`);
    
    try {
        await fs.writeFile(tempPath, buffer);
        
        // Try antiword first
        try {
            const { stdout } = await execAsync(`antiword "${tempPath}"`, { maxBuffer: 500 * 1024 * 1024 });
            await cleanupTemp(tempPath);
            return { success: true, text: stdout, metadata: {} };
        } catch {
            // Fallback to catdoc
            const { stdout } = await execAsync(`catdoc "${tempPath}"`, { maxBuffer: 500 * 1024 * 1024 });
            await cleanupTemp(tempPath);
            return { success: true, text: stdout, metadata: {} };
        }
    } catch (error) {
        await cleanupTemp(tempPath);
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Extract text from ODT, RTF, and other office formats using LibreOffice
 */
const extractOfficeText = async (buffer, ext) => {
    await ensureTempDir();
    const tempPath = path.join(TEMP_DIR, `temp_${Date.now()}.${ext}`);
    const baseName = path.basename(tempPath, `.${ext}`);
    const txtPath = path.join(TEMP_DIR, `${baseName}.txt`);
    
    try {
        await fs.writeFile(tempPath, buffer);
        
        // Convert to text using LibreOffice
        await execAsync(`libreoffice --headless --convert-to txt:Text --outdir "${TEMP_DIR}" "${tempPath}"`, 
            { timeout: 120000, maxBuffer: 500 * 1024 * 1024 });
        
        const text = await fs.readFile(txtPath, 'utf-8');
        await cleanupTemp(tempPath);
        await cleanupTemp(txtPath);
        
        return { success: true, text, metadata: {} };
    } catch (error) {
        await cleanupTemp(tempPath);
        await cleanupTemp(txtPath);
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Extract text from presentations
 */
const extractPresentationText = async (buffer, ext) => {
    await ensureTempDir();
    const tempPath = path.join(TEMP_DIR, `temp_${Date.now()}.${ext}`);
    const baseName = path.basename(tempPath, `.${ext}`);
    const pdfPath = path.join(TEMP_DIR, `${baseName}.pdf`);
    
    try {
        await fs.writeFile(tempPath, buffer);
        
        // Use LibreOffice to convert to PDF first, then extract text
        await execAsync(`libreoffice --headless --convert-to pdf --outdir "${TEMP_DIR}" "${tempPath}"`,
            { timeout: 180000, maxBuffer: 500 * 1024 * 1024 });
        
        const pdfBuffer = await fs.readFile(pdfPath);
        const result = await extractPdfText(pdfBuffer);
        
        await cleanupTemp(tempPath);
        await cleanupTemp(pdfPath);
        
        return result;
    } catch (error) {
        await cleanupTemp(tempPath);
        await cleanupTemp(pdfPath);
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Extract text from ebooks using Calibre
 */
const extractEbookText = async (buffer, ext) => {
    await ensureTempDir();
    const tempPath = path.join(TEMP_DIR, `temp_${Date.now()}.${ext}`);
    const txtPath = path.join(TEMP_DIR, `temp_${Date.now()}_output.txt`);
    
    try {
        await fs.writeFile(tempPath, buffer);
        
        // Use ebook-convert from Calibre
        await execAsync(`ebook-convert "${tempPath}" "${txtPath}"`, 
            { timeout: 180000, maxBuffer: 500 * 1024 * 1024 });
        
        const text = await fs.readFile(txtPath, 'utf-8');
        await cleanupTemp(tempPath);
        await cleanupTemp(txtPath);
        
        return { success: true, text, metadata: { format: ext } };
    } catch (error) {
        await cleanupTemp(tempPath);
        await cleanupTemp(txtPath);
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Extract text from HTML
 */
const extractHtmlText = async (buffer) => {
    try {
        const html = buffer.toString('utf-8');
        // Simple HTML tag removal
        const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#\d+;/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return { success: true, text, metadata: {} };
    } catch (error) {
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Extract text from plain text files
 */
const extractPlainText = async (buffer) => {
    try {
        const text = buffer.toString('utf-8');
        return { success: true, text, metadata: {} };
    } catch (error) {
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Extract text from DJVU
 */
const extractDjvuText = async (buffer) => {
    await ensureTempDir();
    const tempPath = path.join(TEMP_DIR, `temp_${Date.now()}.djvu`);
    
    try {
        await fs.writeFile(tempPath, buffer);
        const { stdout } = await execAsync(`djvutxt "${tempPath}"`, { maxBuffer: 500 * 1024 * 1024 });
        await cleanupTemp(tempPath);
        return { success: true, text: stdout, metadata: {} };
    } catch (error) {
        await cleanupTemp(tempPath);
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Format file size
 */
const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

/**
 * Extract and list archive contents
 */
const extractArchiveContents = async (buffer, ext, filename) => {
    await ensureTempDir();
    const tempPath = path.join(TEMP_DIR, `temp_${Date.now()}.${ext.replace('.', '_')}`);
    const extractDir = path.join(TEMP_DIR, `extract_${Date.now()}`);
    
    try {
        await fs.writeFile(tempPath, buffer);
        await fs.mkdir(extractDir, { recursive: true });
        
        let fileList = [];
        let extractedTexts = [];
        
        // Extract based on archive type
        if (ext === 'zip' || ext === 'cbz') {
            try {
                const zip = new AdmZip(tempPath);
                const entries = zip.getEntries();
                
                for (const entry of entries) {
                    if (!entry.isDirectory) {
                        fileList.push({
                            name: entry.entryName,
                            size: entry.header.size,
                            compressed: entry.header.compressedSize
                        });
                        
                        // Try to extract text from supported files inside (limit preview)
                        const innerExt = entry.entryName.split('.').pop().toLowerCase();
                        if (DOCUMENT_FORMATS.text.includes(innerExt) && entry.header.size < 100000) {
                            try {
                                const content = entry.getData().toString('utf-8');
                                extractedTexts.push({ 
                                    file: entry.entryName, 
                                    content: content.substring(0, 3000) 
                                });
                            } catch (e) { }
                        }
                    }
                }
            } catch (e) {
                // Fallback to unzip command
                const { stdout } = await execAsync(`unzip -l "${tempPath}"`, { maxBuffer: 100 * 1024 * 1024 });
                fileList = stdout.split('\n').filter(l => l.trim()).map(l => ({ name: l.trim() }));
            }
        } else if (ext === 'rar' || ext === 'cbr') {
            // Use unrar command
            try {
                const { stdout } = await execAsync(`unrar l "${tempPath}"`, { maxBuffer: 100 * 1024 * 1024 });
                const lines = stdout.split('\n');
                for (const line of lines) {
                    const match = line.match(/^\s*(\d+)\s+\d+\s+\d+%\s+[\d-]+\s+[\d:]+\s+(.+)$/);
                    if (match) {
                        fileList.push({ name: match[2], size: parseInt(match[1]) });
                    }
                }
                if (fileList.length === 0) {
                    fileList = lines.filter(l => l.trim() && !l.includes('UNRAR') && !l.includes('----')).map(l => ({ name: l.trim() }));
                }
            } catch (e) {
                fileList = [{ name: 'RAR archive (install unrar to see contents)', error: e.message }];
            }
        } else if (ext.includes('tar') || ext === 'tgz' || ext === 'tbz' || ext === 'tbz2' || ext === 'txz') {
            // Use tar command
            try {
                const { stdout } = await execAsync(`tar -tvf "${tempPath}"`, { maxBuffer: 100 * 1024 * 1024 });
                const lines = stdout.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 6) {
                        const size = parseInt(parts[2]) || 0;
                        const name = parts.slice(5).join(' ');
                        fileList.push({ name, size });
                    }
                }
            } catch (e) {
                // Try simple list
                const { stdout } = await execAsync(`tar -tf "${tempPath}"`, { maxBuffer: 100 * 1024 * 1024 });
                fileList = stdout.split('\n').filter(l => l.trim()).map(name => ({ name }));
            }
        } else if (ext === '7z') {
            try {
                const { stdout } = await execAsync(`7z l "${tempPath}"`, { maxBuffer: 100 * 1024 * 1024 });
                const lines = stdout.split('\n');
                let inList = false;
                for (const line of lines) {
                    if (line.includes('----')) {
                        inList = !inList;
                        continue;
                    }
                    if (inList && line.trim()) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length >= 6) {
                            const size = parseInt(parts[3]) || 0;
                            const name = parts.slice(5).join(' ');
                            if (name && !name.startsWith('D')) {
                                fileList.push({ name, size });
                            }
                        }
                    }
                }
            } catch (e) {
                fileList = [{ name: '7z archive (install p7zip to see contents)', error: e.message }];
            }
        } else if (ext === 'gz' && !filename.includes('.tar.')) {
            // Single gzipped file
            try {
                const { stdout } = await execAsync(`zcat "${tempPath}"`, { maxBuffer: 500 * 1024 * 1024 });
                await cleanupTemp(tempPath);
                return { 
                    success: true, 
                    text: stdout, 
                    metadata: { type: 'compressed_file', uncompressedSize: stdout.length } 
                };
            } catch (e) {
                await cleanupTemp(tempPath);
                return { success: false, error: e.message, text: '', metadata: {} };
            }
        }
        
        await cleanupTemp(tempPath);
        await cleanupTempDir(extractDir);
        
        // Create summary
        const totalSize = fileList.reduce((sum, f) => sum + (f.size || 0), 0);
        const fileTypes = {};
        fileList.forEach(f => {
            const fExt = f.name?.split('.').pop()?.toLowerCase() || 'unknown';
            fileTypes[fExt] = (fileTypes[fExt] || 0) + 1;
        });
        
        const typesSummary = Object.entries(fileTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([t, c]) => `${t}: ${c}`)
            .join(', ');
        
        const summary = `📦 *ARSIP:* ${filename}\n` +
            `📁 *Total files:* ${fileList.length}\n` +
            `💾 *Total size:* ${formatSize(totalSize)}\n` +
            `📋 *Tipe file:* ${typesSummary}\n\n` +
            `📂 *Daftar file:*\n` +
            fileList.slice(0, 100).map((f, i) => 
                `${i + 1}. ${f.name}${f.size ? ` (${formatSize(f.size)})` : ''}`
            ).join('\n') +
            (fileList.length > 100 ? `\n\n... dan ${fileList.length - 100} file lainnya` : '') +
            (extractedTexts.length > 0 ? 
                `\n\n📄 *Preview text files:*\n${extractedTexts.slice(0, 3).map(t => 
                    `\n--- ${t.file} ---\n${t.content.substring(0, 1000)}${t.content.length > 1000 ? '...' : ''}`
                ).join('\n')}` : '');
        
        return { 
            success: true, 
            text: summary, 
            metadata: { 
                fileCount: fileList.length, 
                totalSize,
                fileTypes,
                files: fileList.slice(0, 500) 
            } 
        };
        
    } catch (error) {
        await cleanupTemp(tempPath);
        await cleanupTempDir(extractDir);
        return { success: false, error: error.message, text: '', metadata: {} };
    }
};

/**
 * Universal text extraction - routes to appropriate handler
 */
const extractText = async (buffer, filename, mimetype) => {
    const { type, ext } = detectDocumentType(filename, mimetype);
    
    console.log(`[Document] Extracting text from ${filename} (type: ${type}, ext: ${ext})`);
    
    switch (type) {
        case 'pdf':
            return await extractPdfText(buffer);
            
        case 'office':
            if (ext === 'docx' || ext === 'docm' || ext === 'dotx') {
                return await extractDocxText(buffer);
            } else if (ext === 'doc' || ext === 'dot') {
                return await extractDocText(buffer);
            } else {
                return await extractOfficeText(buffer, ext);
            }
            
        case 'presentation':
            return await extractPresentationText(buffer, ext);
            
        case 'spreadsheet':
            if (ext === 'csv' || ext === 'tsv') {
                return await extractPlainText(buffer);
            }
            return await extractOfficeText(buffer, ext);
            
        case 'ebook':
            if (ext === 'djvu' || ext === 'djv') {
                return await extractDjvuText(buffer);
            }
            return await extractEbookText(buffer, ext);
            
        case 'comic':
            return await extractArchiveContents(buffer, ext, filename);
            
        case 'web':
            return await extractHtmlText(buffer);
            
        case 'text':
            return await extractPlainText(buffer);
            
        case 'archive':
            return await extractArchiveContents(buffer, ext, filename);
            
        default:
            // Try plain text as last resort
            try {
                const text = buffer.toString('utf-8');
                // Check if it's readable text
                if (text && text.length > 0 && !/[\x00-\x08\x0E-\x1F]/.test(text.substring(0, 1000))) {
                    return { success: true, text, metadata: { guessed: true } };
                }
            } catch (e) { }
            return { success: false, error: 'Unsupported format', text: '', metadata: {} };
    }
};

/**
 * Get AI analysis of document - NO LIMITS
 * @param {string} text - Document text content
 * @param {string} filename - Document filename
 * @param {string} userRequest - User's request/question about the document
 * @param {Array} history - Conversation history
 * @param {Function} onProgress - Progress callback function(current, total, message)
 */
const analyzeDocumentWithAI = async (text, filename, userRequest = '', history = [], onProgress = null) => {
    try {
        // Split into chunks if very large (for API token management)
        const chunks = [];
        const CHUNK_SIZE = 15000; // 15k chars per chunk (~4-5k tokens) to stay safely within context window
        
        if (text.length > CHUNK_SIZE) {
            for (let i = 0; i < text.length; i += CHUNK_SIZE) {
                chunks.push(text.substring(i, i + CHUNK_SIZE));
            }
            console.log(`[Document] Split into ${chunks.length} chunks for analysis`);
            
            // Notify about multi-chunk analysis starting
            if (onProgress && chunks.length > 1) {
                await onProgress(0, chunks.length, `📊 Dokumen besar terdeteksi! Dibagi jadi ${chunks.length} bagian buat dianalisis...`);
            }
        } else {
            chunks.push(text);
        }

        const systemPrompt = `Lo adalah Tama AI, AI assistant EXPERT yang bisa baca dan analisis SEMUA jenis dokumen.
Gaya bicara: santai, gaul, pake "w/gw", "lu", "cuy", "bre", "ez", "gacor", "sabi".
Ketawa pake: "wokwokwow", "aowkaowka", "ahahaha".

KEMAMPUAN SUPER:
1. 📖 BACA SEMUA - PDF, Word, Excel, PPT, Ebook, Archive, dll
2. 🔍 ANALISIS MENDALAM - Pahami struktur, konten, dan konteks
3. 📊 EXTRACT DATA - Ambil info penting dari dokumen apapun
4. 📝 RANGKUM - Buat ringkasan komprehensif
5. 💡 INSIGHT - Kasih analisis dan rekomendasi
6. 📦 ARCHIVE - Bisa liat isi file arsip/zip

FORMAT RESPONS:
📄 *File:* [nama file]
📊 *Tipe:* [jenis dokumen]
📏 *Ukuran:* [panjang text]

🔍 *Overview:*
[ringkasan singkat isi dokumen]

📋 *Detail Penting:*
[point-point utama dari dokumen]

💡 *Insight:*
[analisis dan rekomendasi lo]

RULES:
- JANGAN PERNAH bilang ga bisa baca file
- Analisis BERDASARKAN TEXT yang diekstrak
- Jawab pertanyaan user dengan DETAIL
- Kalo dokumen panjang, fokus bagian relevan
- Pake emoji biar engaging! 🎯✨`;

        // For very long documents, analyze in parts
        let fullAnalysis = '';
        
        for (let i = 0; i < chunks.length; i++) {
            const isMultiPart = chunks.length > 1;
            const chunkInfo = isMultiPart ? ` (Bagian ${i + 1}/${chunks.length})` : '';
            
            let userMessage;
            if (i === 0) {
                userMessage = userRequest 
                    ? `File "${filename}"${chunkInfo}, user minta: ${userRequest}\n\n===== ISI DOKUMEN =====\n${chunks[i]}\n===== END =====`
                    : `Baca dan analisis file "${filename}"${chunkInfo}:\n\n===== ISI DOKUMEN =====\n${chunks[i]}\n===== END =====`;
            } else {
                userMessage = `Lanjutan dokumen "${filename}"${chunkInfo}:\n\n===== LANJUTAN =====\n${chunks[i]}\n===== END =====\n\nLanjutkan analisis.`;
            }

            // Skip conversation history for document analysis to avoid context overflow
            // The document content itself provides sufficient context
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];

            // Retry logic with exponential backoff
            let response;
            const MAX_RETRIES = 3;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    response = await axios.post(`${COPILOT_API_URL}/v1/chat/completions`, {
                        model: COPILOT_API_MODEL,
                        messages,
                        temperature: 0.7
                    }, {
                        timeout: 300000, // 5 minutes for very large docs
                        headers: { 'Content-Type': 'application/json' }
                    });
                    break; // Success, exit retry loop
                } catch (retryError) {
                    const status = retryError.response?.status;
                    console.error(`[Document] Chunk ${i + 1}/${chunks.length} attempt ${attempt + 1} failed: ${retryError.message}`);
                    if (attempt < MAX_RETRIES - 1 && (status === 500 || status === 429 || status === 502 || status === 503)) {
                        const delay = Math.pow(2, attempt + 1) * 2000; // 4s, 8s, 16s
                        console.log(`[Document] Retrying in ${delay / 1000}s...`);
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        throw retryError;
                    }
                }
            }

            fullAnalysis += response.data.choices[0].message.content;
            
            // Send progress update after each chunk
            if (onProgress && chunks.length > 1) {
                const progressPercent = Math.round(((i + 1) / chunks.length) * 100);
                const progressBar = generateProgressBar(progressPercent);
                const statusEmoji = i + 1 === chunks.length ? '✅' : '⏳';
                
                await onProgress(
                    i + 1, 
                    chunks.length, 
                    `${statusEmoji} *Progres Analisis:* ${i + 1}/${chunks.length} bagian\n${progressBar} ${progressPercent}%\n\n_${getProgressMessage(i + 1, chunks.length)}_`
                );
            }
            
            if (i < chunks.length - 1) {
                fullAnalysis += '\n\n---\n\n';
                // Delay between chunks to avoid rate limiting
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        return fullAnalysis;

    } catch (error) {
        console.error('[Document] AI analysis error:', error.message);
        throw new Error('Gagal menganalisis dokumen dengan AI: ' + error.message);
    }
};

/**
 * Process document - MAIN ENTRY POINT - NO LIMITS
 * @param {Buffer} buffer - Document buffer
 * @param {string} filename - Document filename
 * @param {string} mimetype - Document mimetype
 * @param {string} userRequest - User's request about the document
 * @param {Array} history - Conversation history
 * @param {Function} onProgress - Progress callback function(current, total, message)
 */
const processDocument = async (buffer, filename, mimetype, userRequest = '', history = [], onProgress = null) => {
    const { type, ext } = detectDocumentType(filename, mimetype);
    
    if (type === 'unknown') {
        return {
            success: false,
            error: 'Unsupported document type',
            analysis: `sori bro, format .${ext} belum ke-support 😅 coba convert dulu ke format lain ya`
        };
    }

    console.log(`[Document] Processing ${type}: ${filename} (${formatSize(buffer.length)}) - NO LIMITS`);

    // Extract text - NO SIZE LIMITS
    const extraction = await extractText(buffer, filename, mimetype);

    if (!extraction.success) {
        // For DOCX failures: attach the error details + hint about fallback
        const isDocx = ['docx', 'docm', 'dotx'].includes(ext);
        return {
            success: false,
            error: extraction.error,
            analysis: isDocx
                ? `duh DOCX nya corrupt/ga bisa dibaca bro 😓 file mungkin rusak pas di-forward WhatsApp. ${extraction.error}`
                : `duh error pas baca ${filename} 😓 ${extraction.error}`,
            // Pass the raw buffer so bot.js can offer a fallback
            rawBuffer: isDocx ? buffer : null,
            docType: type,
            ext
        };
    }

    if (!extraction.text || extraction.text.trim().length < 5) {
        return {
            success: false,
            error: 'No text content',
            analysis: `hmm file ${filename} kayaknya kosong atau isinya gambar/binary doang bro 🤔`,
            docType: type,
            ext
        };
    }

    console.log(`[Document] Extracted ${formatSize(extraction.text.length)} text from ${filename}${extraction.metadata?.method ? ` (method: ${extraction.metadata.method})` : ''}`);

    // Warn if extraction was partial/degraded  
    const isPartial = extraction.metadata?.partial === true || extraction.metadata?.method === 'brute_force';
    if (isPartial) {
        console.warn(`[Document] ⚠️ DOCX extraction was partial — quality may be degraded`);
    }

    // Get AI analysis - NO TEXT LENGTH LIMITS
    try {
        const analysis = await analyzeDocumentWithAI(
            extraction.text,
            filename,
            userRequest,
            history,
            onProgress  // Pass progress callback
        );

        return {
            success: true,
            docType: type,
            ext,
            filename,
            textLength: extraction.text.length,
            metadata: extraction.metadata,
            analysis
        };
    } catch (error) {
        console.error('[Document] Full error:', error);
        
        // Provide helpful error messages based on error type
        let errorMessage = error.message;
        if (error.response?.status === 404) {
            errorMessage = 'API endpoint tidak ditemukan - pastikan Copilot API running di localhost:4141';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Copilot API ga bisa diakses - pastikan service nya running';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Timeout pas connect ke AI - dokumen mungkin terlalu besar';
        }
        
        return {
            success: false,
            error: errorMessage,
            analysis: `duh AI nya error bro 😓 ${errorMessage}`
        };
    }
};

/**
 * Get quick document info
 */
const getDocumentInfo = async (buffer, filename, mimetype) => {
    const { type, ext } = detectDocumentType(filename, mimetype);
    
    if (type === 'unknown') {
        return { success: false, error: 'Unsupported type' };
    }

    const extraction = await extractText(buffer, filename, mimetype);
    
    if (!extraction.success) {
        return extraction;
    }

    const words = extraction.text.trim().split(/\s+/).filter(w => w.length > 0);
    const preview = extraction.text.substring(0, 2000).trim();

    return {
        success: true,
        docType: type,
        ext,
        filename,
        textLength: extraction.text.length,
        wordCount: words.length,
        preview: preview + (extraction.text.length > 2000 ? '...' : ''),
        metadata: extraction.metadata
    };
};

/**
 * Get list of all supported formats
 */
const getSupportedFormats = () => {
    return {
        total: ALL_SUPPORTED_EXTENSIONS.length,
        categories: DOCUMENT_FORMATS,
        all: ALL_SUPPORTED_EXTENSIONS
    };
};

module.exports = {
    // Extraction functions
    extractPdfText,
    extractDocxText,
    extractDocText,
    extractOfficeText,
    extractPresentationText,
    extractEbookText,
    extractHtmlText,
    extractPlainText,
    extractDjvuText,
    extractArchiveContents,
    extractText,
    
    // Main functions
    detectDocumentType,
    analyzeDocumentWithAI,
    processDocument,
    isSupportedDocument,
    getDocumentInfo,
    getSupportedFormats,
    
    // Utilities
    ensureTempDir,
    cleanupTemp,
    cleanupTempDir,
    formatSize,
    generateProgressBar,
    getProgressMessage,
    
    // Constants
    DOCUMENT_FORMATS,
    ALL_SUPPORTED_EXTENSIONS
};
