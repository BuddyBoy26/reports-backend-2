"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessor = void 0;
const pdfreader_1 = require("pdfreader");
class DocumentProcessor {
    async processPDF(buffer) {
        try {
            console.log('[DocumentProcessor] Processing PDF, size:', buffer.length);
            return new Promise((resolve, reject) => {
                let fullText = '';
                let maxPage = 0;
                new pdfreader_1.PdfReader().parseBuffer(buffer, (err, item) => {
                    if (err) {
                        console.error('[DocumentProcessor] PdfReader error:', err);
                        reject(new Error(`PDF parsing failed: ${err.message}`));
                        return;
                    }
                    if (!item) {
                        // End of file
                        if (!fullText || fullText.trim().length === 0) {
                            reject(new Error('No text found in PDF. This might be a scanned document.'));
                            return;
                        }
                        console.log('[DocumentProcessor] Extracted text length:', fullText.length);
                        console.log('[DocumentProcessor] Pages:', maxPage);
                        resolve({
                            text: fullText,
                            pages: maxPage
                        });
                        return;
                    }
                    if (item.page) {
                        maxPage = Math.max(maxPage, item.page);
                    }
                    if (item.text) {
                        fullText += item.text + ' ';
                    }
                });
            });
        }
        catch (error) {
            console.error('[DocumentProcessor] Error:', error);
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }
}
exports.DocumentProcessor = DocumentProcessor;
