/**
 * Tests for Live Verifier module
 */

const {
    needsVerification,
    generateSearchQuery,
    getCachedResult,
    clearCache,
    CACHE_TTL,
} = require('../src/liveVerifier');

// Clear cache before each test to avoid test pollution
beforeEach(() => {
    clearCache();
});

describe('liveVerifier', () => {
    describe('needsVerification()', () => {
        // ── Should return TRUE ──

        test('return true untuk klaim harga Bitcoin', () => {
            const result = needsVerification(
                'Bitcoin saat ini harganya sekitar $100,000 USD',
                'berapa harga bitcoin sekarang'
            );
            expect(result.needsCheck).toBe(true);
            expect(result.checkType).toBe('price_data');
            expect(result.searchQuery).toBeTruthy();
        });

        test('return true untuk "presiden Indonesia saat ini"', () => {
            const result = needsVerification(
                'Presiden Indonesia saat ini adalah Prabowo Subianto',
                'siapa presiden Indonesia saat ini'
            );
            expect(result.needsCheck).toBe(true);
            expect(['person_info', 'factual_claim']).toContain(result.checkType);
        });

        test('return true untuk berita terbaru', () => {
            const result = needsVerification(
                'Berita terkini gempa bumi di Jawa Barat',
                'berita terbaru hari ini'
            );
            expect(result.needsCheck).toBe(true);
            expect(result.checkType).toBe('news_event');
        });

        test('return true untuk versi software', () => {
            const result = needsVerification(
                'Node.js versi terbaru adalah v22',
                'versi terbaru nodejs'
            );
            expect(result.needsCheck).toBe(true);
            expect(['technical_version', 'factual_claim']).toContain(result.checkType);
        });

        test('return true untuk statistik/angka', () => {
            const result = needsVerification(
                'Populasi Indonesia saat ini sekitar 275 juta jiwa',
                'berapa populasi indonesia'
            );
            expect(result.needsCheck).toBe(true);
        });

        test('return true untuk event terkini', () => {
            const result = needsVerification(
                'Trending di Twitter baru-baru ini tentang AI',
                'apa yang trending minggu ini'
            );
            expect(result.needsCheck).toBe(true);
            expect(result.checkType).toBe('news_event');
        });

        test('return true untuk data cuaca/harga terbaru', () => {
            const result = needsVerification(
                'Harga emas hari ini sekitar Rp 1.200.000 per gram',
                'harga emas hari ini'
            );
            expect(result.needsCheck).toBe(true);
            expect(result.checkType).toBe('price_data');
        });

        // ── Should return FALSE ──

        test('return false untuk opini personal', () => {
            const result = needsVerification(
                'Menurut gw React lebih bagus dari Vue',
                'menurut gw mana yang lebih bagus react atau vue'
            );
            expect(result.needsCheck).toBe(false);
        });

        test('return false untuk curhat/emosi', () => {
            const result = needsVerification(
                'iya paham bre, sabar ya',
                'sedih banget bre teman gw udah ga mau ngobrol'
            );
            expect(result.needsCheck).toBe(false);
        });

        test('return false untuk small talk/greeting', () => {
            const result = needsVerification(
                'yoo apa kabar king',
                'halo tama'
            );
            expect(result.needsCheck).toBe(false);
        });

        test('return false untuk coding help', () => {
            const result = needsVerification(
                'coba tambahin try catch di function itu',
                'error di code gw, function undefined'
            );
            expect(result.needsCheck).toBe(false);
        });

        test('return false untuk saran/advice', () => {
            const result = needsVerification(
                'saranin sih belajar dari basic dulu',
                'rekomendasiin buku buat belajar JS dong'
            );
            expect(result.needsCheck).toBe(false);
        });

        test('return false untuk humor/jokes', () => {
            const result = needsVerification(
                'wkwk ada ada aja',
                'jokes lucu dong'
            );
            expect(result.needsCheck).toBe(false);
        });

        // ── checkType correctness ──

        test('checkType correct untuk setiap kategori', () => {
            clearCache();
            const price = needsVerification('BTC price $100k', 'harga bitcoin sekarang');
            expect(price.checkType).toBe('price_data');
            clearCache();

            const news = needsVerification('berita viral hari ini', 'berita terbaru indonesia');
            expect(['news_event', 'factual_claim']).toContain(news.checkType);
            clearCache();

            const tech = needsVerification('React version terbaru', 'react latest version');
            expect(['technical_version', 'factual_claim']).toContain(tech.checkType);
        });

        // ── searchQuery generation ──

        test('searchQuery generation yang relevant', () => {
            const result = needsVerification(
                'Bitcoin sekarang $100k',
                'berapa harga bitcoin sekarang'
            );
            expect(result.searchQuery).toBeTruthy();
            expect(result.searchQuery.length).toBeGreaterThan(5);
            expect(result.searchQuery.length).toBeLessThanOrEqual(150);
        });
    });

    describe('generateSearchQuery()', () => {
        test('clean up casual words dari query', () => {
            const query = generateSearchQuery('tolong kasih tau harga bitcoin dong bro', 'price_data');
            expect(query).not.toMatch(/\b(tolong|dong|bro)\b/i);
        });

        test('tambahkan context berdasarkan check type', () => {
            const priceQuery = generateSearchQuery('emas batangan', 'price_data');
            expect(priceQuery).toMatch(/terbaru/i);

            const newsQuery = generateSearchQuery('banjir jakarta', 'news_event');
            expect(newsQuery).toMatch(/terbaru/i);
        });
    });

    describe('caching', () => {
        test('return cached result untuk query yang sama', () => {
            const result1 = needsVerification('BTC $100k', 'harga bitcoin sekarang');
            const cached = getCachedResult('harga bitcoin sekarang');
            expect(cached).toBeTruthy();
            expect(cached.result.needsCheck).toBe(result1.needsCheck);
        });

        test('clearCache removes all entries', () => {
            needsVerification('BTC $100k', 'harga bitcoin');
            clearCache();
            const cached = getCachedResult('harga bitcoin');
            expect(cached).toBeNull();
        });
    });

    describe('edge cases', () => {
        test('handle null/empty input', () => {
            expect(needsVerification(null, null).needsCheck).toBe(false);
            expect(needsVerification('', '').needsCheck).toBe(false);
            expect(needsVerification('test', '').needsCheck).toBe(false);
        });
    });
});
