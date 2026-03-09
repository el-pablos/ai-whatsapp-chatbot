/**
 * PDF Editor Handler — merge, extract pages, compress PDF
 * 
 * @author Tama El Pablo
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Merge multiple PDF buffers jadi satu
 * @param {Buffer[]} pdfBuffers — array of PDF buffers
 * @returns {Promise<Buffer>}
 */
const mergePDFs = async (pdfBuffers) => {
    if (!pdfBuffers || pdfBuffers.length < 2) {
        throw new Error('Minimal 2 file PDF buat merge bro');
    }

    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
        const pdf = await PDFDocument.load(buffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
    }

    const bytes = await mergedPdf.save();
    return Buffer.from(bytes);
};

/**
 * Extract halaman tertentu dari PDF
 * @param {Buffer} pdfBuffer — buffer PDF sumber
 * @param {number[]} pageNumbers — array nomor halaman (1-indexed)
 * @returns {Promise<Buffer>}
 */
const extractPages = async (pdfBuffer, pageNumbers) => {
    if (!pdfBuffer || !pageNumbers?.length) {
        throw new Error('Buffer PDF dan nomor halaman harus diisi');
    }

    const sourcePdf = await PDFDocument.load(pdfBuffer);
    const totalPages = sourcePdf.getPageCount();
    const newPdf = await PDFDocument.create();

    // Validasi dan convert ke 0-indexed
    const validPages = pageNumbers
        .filter(p => p >= 1 && p <= totalPages)
        .map(p => p - 1);

    if (validPages.length === 0) {
        throw new Error(`Halaman ga valid. PDF ini cuma punya ${totalPages} halaman`);
    }

    const pages = await newPdf.copyPages(sourcePdf, validPages);
    pages.forEach(page => newPdf.addPage(page));

    const bytes = await newPdf.save();
    return Buffer.from(bytes);
};

/**
 * Get info tentang PDF
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{pageCount: number, title: string|null, author: string|null}>}
 */
const getPDFInfo = async (pdfBuffer) => {
    const pdf = await PDFDocument.load(pdfBuffer);
    return {
        pageCount: pdf.getPageCount(),
        title: pdf.getTitle() || null,
        author: pdf.getAuthor() || null,
    };
};

/**
 * Parse command PDF
 * @param {string} text — misal "/pdf merge" atau "/pdf extract 1,3,5"
 * @returns {{ action: string, params: any } | null}
 */
const parsePDFCommand = (text) => {
    if (!text) return null;

    const mergeMatch = text.match(/^\/pdf\s+merge$/i);
    if (mergeMatch) return { action: 'merge', params: null };

    const extractMatch = text.match(/^\/pdf\s+extract\s+([\d,\s-]+)$/i);
    if (extractMatch) {
        const pages = parsePageRange(extractMatch[1]);
        return { action: 'extract', params: { pages } };
    }

    const infoMatch = text.match(/^\/pdf\s+info$/i);
    if (infoMatch) return { action: 'info', params: null };

    return null;
};

/**
 * Parse range halaman — "1,3,5" atau "1-5" atau "1,3-5,8"
 * @param {string} input
 * @returns {number[]}
 */
const parsePageRange = (input) => {
    const pages = new Set();
    const parts = input.split(',').map(s => s.trim());

    for (const part of parts) {
        const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                pages.add(i);
            }
        } else {
            const num = parseInt(part, 10);
            if (!isNaN(num)) pages.add(num);
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
};

module.exports = {
    mergePDFs,
    extractPages,
    getPDFInfo,
    parsePDFCommand,
    parsePageRange,
};
