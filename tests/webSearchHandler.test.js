/**
 * Unit Tests - Web Search Handler
 * 
 * Test cases untuk validasi:
 * 1. NO-SEARCH GUARD - Should NOT trigger search for conversational chat
 * 2. EXPLICIT SEARCH - Should trigger search when user explicitly asks
 * 3. EXTERNAL DATA NEED - Should trigger for time-sensitive data
 * 4. Edge cases and comprehensive coverage
 * 
 * @version 2.0.0
 */

const {
    detectSearchRequest,
    noSearchGuard,
    checkExplicitSearchRequest,
    parseWebSearchMarker,
    isInfoQuery
} = require('../src/webSearchHandler');

describe('Web Search Handler - v2.0 Anti Auto-Search', () => {

    // NO-SEARCH GUARD TESTS - Must NOT trigger search
    describe('NO-SEARCH GUARD - Should NOT trigger search', () => {

        describe('Greetings', () => {
            it('should NOT search for "hai"', () => {
                expect(detectSearchRequest('hai')).toBeNull();
            });
            it('should NOT search for "halo"', () => {
                expect(detectSearchRequest('halo')).toBeNull();
            });
            it('should NOT search for "assalamualaikum"', () => {
                expect(detectSearchRequest('assalamualaikum')).toBeNull();
            });
            it('should NOT search for "good morning"', () => {
                expect(detectSearchRequest('good morning')).toBeNull();
            });
        });

        describe('Acknowledgements', () => {
            it('should NOT search for "ok"', () => {
                expect(detectSearchRequest('ok')).toBeNull();
            });
            it('should NOT search for "oke sip"', () => {
                expect(detectSearchRequest('oke sip')).toBeNull();
            });
            it('should NOT search for "mantap"', () => {
                expect(detectSearchRequest('mantap')).toBeNull();
            });
            it('should NOT search for "makasih"', () => {
                expect(detectSearchRequest('makasih')).toBeNull();
            });
            it('should NOT search for "thanks"', () => {
                expect(detectSearchRequest('thanks')).toBeNull();
            });
        });

        describe('Laughter', () => {
            it('should NOT search for "wkwk"', () => {
                expect(detectSearchRequest('wkwk')).toBeNull();
            });
            it('should NOT search for "wkwkwk"', () => {
                expect(detectSearchRequest('wkwkwk')).toBeNull();
            });
            it('should NOT search for "haha"', () => {
                expect(detectSearchRequest('haha')).toBeNull();
            });
            it('should NOT search for "lol"', () => {
                expect(detectSearchRequest('lol')).toBeNull();
            });
        });

        describe('Small Talk', () => {
            it('should NOT search for "apa kabar"', () => {
                expect(detectSearchRequest('apa kabar')).toBeNull();
            });
            it('should NOT search for "gimana kabar"', () => {
                expect(detectSearchRequest('gimana kabar')).toBeNull();
            });
            it('should NOT search for "lagi apa"', () => {
                expect(detectSearchRequest('lagi apa')).toBeNull();
            });
            it('should NOT search for "gimana lu?"', () => {
                expect(detectSearchRequest('gimana lu?')).toBeNull();
            });
            it('should NOT search for "sibuk?"', () => {
                expect(detectSearchRequest('sibuk?')).toBeNull();
            });
        });

        describe('Short Responses', () => {
            it('should NOT search for "iya"', () => {
                expect(detectSearchRequest('iya')).toBeNull();
            });
            it('should NOT search for "ga"', () => {
                expect(detectSearchRequest('ga')).toBeNull();
            });
            it('should NOT search for "mungkin"', () => {
                expect(detectSearchRequest('mungkin')).toBeNull();
            });
            it('should NOT search for "cie"', () => {
                expect(detectSearchRequest('cie')).toBeNull();
            });
        });

        describe('Questions About the Bot Itself', () => {
            it('should NOT search for "lu bisa apa"', () => {
                expect(detectSearchRequest('lu bisa apa')).toBeNull();
            });
            it('should NOT search for "limit lu berapa"', () => {
                expect(detectSearchRequest('limit lu berapa')).toBeNull();
            });
            it('should NOT search for "kira kira limit lu berapa se maksimal mungkin nya"', () => {
                expect(detectSearchRequest('kira kira limit lu berapa se maksimal mungkin nya')).toBeNull();
            });
            it('should NOT search for "ya lu limit nya berapa buat bales chat gw ini"', () => {
                expect(detectSearchRequest('ya lu limit nya berapa buat bales chat gw ini')).toBeNull();
            });
        });

        describe('Conversational Questions', () => {
            it('should NOT search for "berapa lama ini"', () => {
                expect(detectSearchRequest('berapa lama ini')).toBeNull();
            });
            it('should NOT search for "gimana caranya"', () => {
                expect(detectSearchRequest('gimana caranya')).toBeNull();
            });
            it('should NOT search for "kapan bisa selesai"', () => {
                expect(detectSearchRequest('kapan bisa selesai')).toBeNull();
            });
            it('should NOT search for "menurut lu gimana"', () => {
                expect(detectSearchRequest('menurut lu gimana')).toBeNull();
            });
            it('should NOT search for "apa sih"', () => {
                expect(detectSearchRequest('apa sih')).toBeNull();
            });
        });

        describe('Meta-Conversation', () => {
            it('should NOT search for "maksud lu apa"', () => {
                expect(detectSearchRequest('maksud lu apa')).toBeNull();
            });
            it('should NOT search for "bisa jelasin"', () => {
                expect(detectSearchRequest('bisa jelasin')).toBeNull();
            });
            it('should NOT search for "bukan searching ke web"', () => {
                expect(detectSearchRequest('bukan searching ke web')).toBeNull();
            });
            it('should NOT search for "jangan search"', () => {
                expect(detectSearchRequest('jangan search')).toBeNull();
            });
        });

        describe('Short Messages', () => {
            it('should NOT search for "iya bener"', () => {
                expect(detectSearchRequest('iya bener')).toBeNull();
            });
            it('should NOT search for "mantap dah"', () => {
                expect(detectSearchRequest('mantap dah')).toBeNull();
            });
            it('should NOT search for "ok gas"', () => {
                expect(detectSearchRequest('ok gas')).toBeNull();
            });
        });

    });

    // SHOULD TRIGGER SEARCH
    describe('SHOULD trigger search', () => {

        describe('Explicit Search Commands', () => {
            it('should trigger for "cari info tentang AI"', () => {
                const result = detectSearchRequest('cari info tentang AI');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should trigger for "/search quantum computing"', () => {
                const result = detectSearchRequest('/search quantum computing');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
                expect(result.query).toBe('quantum computing');
            });

            it('should trigger for "googling resep nasi goreng"', () => {
                const result = detectSearchRequest('googling resep nasi goreng');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should trigger for "cariin harga laptop"', () => {
                const result = detectSearchRequest('cariin harga laptop');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should trigger for "cari di internet tentang blockchain"', () => {
                const result = detectSearchRequest('cari di internet tentang blockchain');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });
        });

        describe('External Data Needs', () => {
            it('should trigger for "harga bitcoin sekarang berapa"', () => {
                const result = detectSearchRequest('harga bitcoin sekarang berapa');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should trigger for "cuaca jakarta hari ini"', () => {
                const result = detectSearchRequest('cuaca jakarta hari ini');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });

            it('should trigger for "berita terbaru hari ini"', () => {
                const result = detectSearchRequest('berita terbaru hari ini');
                expect(result).not.toBeNull();
                expect(result.isSearch).toBe(true);
            });
        });

    });

    // Bug Regression Tests
    describe('Bug Regression Tests', () => {
        it('should NOT search for the exact bug case 1', () => {
            const result = detectSearchRequest('kira kira limit lu berapa se maksimal mungkin nya');
            expect(result).toBeNull();
        });

        it('should NOT search for the exact bug case 2', () => {
            const result = detectSearchRequest('ya lu limit nya berapa buat bales chat gw ini, bukan searching ke web');
            expect(result).toBeNull();
        });

        it('should NOT search for "gimana kabar lu?"', () => {
            expect(detectSearchRequest('gimana kabar lu?')).toBeNull();
        });

        it('should NOT search for "apa kabar king?"', () => {
            expect(detectSearchRequest('apa kabar king?')).toBeNull();
        });
    });

    // noSearchGuard Tests
    describe('noSearchGuard function', () => {
        it('should block empty/null messages', () => {
            expect(noSearchGuard(null)).toBe(true);
            expect(noSearchGuard('')).toBe(true);
        });

        it('should block short messages (<15 chars)', () => {
            expect(noSearchGuard('hai')).toBe(true);
            expect(noSearchGuard('oke sip')).toBe(true);
        });

        it('should NOT block explicit search', () => {
            expect(noSearchGuard('cari info AI')).toBe(false);
        });

        it('should block greetings', () => {
            expect(noSearchGuard('halo gimana kabar')).toBe(true);
        });
    });

    // checkExplicitSearchRequest Tests
    describe('checkExplicitSearchRequest function', () => {
        it('should detect /search command', () => {
            const result = checkExplicitSearchRequest('/search test query');
            expect(result).not.toBeNull();
            expect(result.query).toBe('test query');
        });

        it('should return null for non-search', () => {
            expect(checkExplicitSearchRequest('halo apa kabar')).toBeNull();
        });
    });

    // isInfoQuery deprecation
    describe('isInfoQuery (deprecated)', () => {
        it('should always return false', () => {
            expect(isInfoQuery('apa itu blockchain')).toBe(false);
            expect(isInfoQuery('berapa harga')).toBe(false);
        });
    });

    // Edge Cases
    describe('Edge Cases', () => {
        it('should handle null', () => {
            expect(detectSearchRequest(null)).toBeNull();
        });
        it('should handle empty string', () => {
            expect(detectSearchRequest('')).toBeNull();
        });
        it('should handle whitespace', () => {
            expect(detectSearchRequest('   ')).toBeNull();
        });
    });

    // AI-driven web search marker [WEBSEARCH:query]
    describe('parseWebSearchMarker - AI-driven search', () => {
        it('should parse valid WEBSEARCH marker', () => {
            const result = parseWebSearchMarker('[WEBSEARCH:Claude Sonnet 4.5 vs 4.6]');
            expect(result).not.toBeNull();
            expect(result.needsSearch).toBe(true);
            expect(result.query).toBe('Claude Sonnet 4.5 vs 4.6');
        });

        it('should parse marker embedded in AI response', () => {
            const response = '[WEBSEARCH:bitcoin price today]\n\nbntar ya w cariin dulu...';
            const result = parseWebSearchMarker(response);
            expect(result).not.toBeNull();
            expect(result.query).toBe('bitcoin price today');
        });

        it('should return null for no marker', () => {
            expect(parseWebSearchMarker('normal response without marker')).toBeNull();
        });

        it('should return null for empty query', () => {
            expect(parseWebSearchMarker('[WEBSEARCH:]')).toBeNull();
        });

        it('should return null for null input', () => {
            expect(parseWebSearchMarker(null)).toBeNull();
        });

        it('should return null for too short query', () => {
            expect(parseWebSearchMarker('[WEBSEARCH:ab]')).toBeNull();
        });

        it('should handle query with special characters', () => {
            const result = parseWebSearchMarker('[WEBSEARCH:iPhone 17 Pro Max release date 2026]');
            expect(result).not.toBeNull();
            expect(result.query).toBe('iPhone 17 Pro Max release date 2026');
        });
    });

});
