/**
 * Tests for Memory Handler
 */

jest.mock('../src/database');

const {
    saveMemory,
    searchMemory,
    listMemories,
    deleteMemory,
    getRelevantMemories,
    detectMemoryIntent,
    autoCapture,
    VALID_CATEGORIES,
} = require('../src/memoryHandler');

const db = require('../src/database');

describe('Memory Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        db.saveMemory.mockReturnValue({ id: 1, changes: 1 });
        db.searchMemory.mockReturnValue([]);
        db.getMemories.mockReturnValue([]);
        db.deleteMemory.mockReturnValue(false);
    });

    describe('VALID_CATEGORIES', () => {
        test('should contain expected categories', () => {
            expect(VALID_CATEGORIES).toEqual(['preference', 'fact', 'event', 'lesson']);
        });
    });

    describe('saveMemory', () => {
        test('should save valid memory', () => {
            const result = saveMemory('user1', 'preference', 'warna', 'biru');
            expect(result.success).toBe(true);
            expect(result.category).toBe('preference');
            expect(result.key).toBe('warna');
            expect(result.value).toBe('biru');
            expect(db.saveMemory).toHaveBeenCalledWith('user1', 'preference', 'warna', 'biru');
        });

        test('should default to fact for invalid category', () => {
            const result = saveMemory('user1', 'invalid', 'key', 'value');
            expect(result.success).toBe(true);
            expect(result.category).toBe('fact');
        });

        test('should fail without userId', () => {
            const result = saveMemory('', 'fact', 'key', 'value');
            expect(result.success).toBe(false);
        });

        test('should fail without key', () => {
            const result = saveMemory('user1', 'fact', '', 'value');
            expect(result.success).toBe(false);
        });

        test('should fail without value', () => {
            const result = saveMemory('user1', 'fact', 'key', '');
            expect(result.success).toBe(false);
        });

        test('should truncate long key and value', () => {
            const longKey = 'a'.repeat(300);
            const longValue = 'b'.repeat(3000);
            saveMemory('user1', 'fact', longKey, longValue);
            expect(db.saveMemory).toHaveBeenCalledWith(
                'user1', 'fact',
                expect.any(String), expect.any(String)
            );
            const call = db.saveMemory.mock.calls[0];
            expect(call[2].length).toBeLessThanOrEqual(200);
            expect(call[3].length).toBeLessThanOrEqual(2000);
        });
    });

    describe('searchMemory', () => {
        test('should search with query', () => {
            db.searchMemory.mockReturnValue([{ id: 1, key: 'test', value: 'val' }]);
            const result = searchMemory('user1', 'test');
            expect(result).toHaveLength(1);
            expect(db.searchMemory).toHaveBeenCalledWith('user1', 'test');
        });

        test('should return empty for empty query', () => {
            const result = searchMemory('user1', '');
            expect(result).toEqual([]);
        });
    });

    describe('listMemories', () => {
        test('should return empty message when no memories', () => {
            db.getMemories.mockReturnValue([]);
            const result = listMemories('user1');
            expect(result).toContain('belum ada memori');
        });

        test('should format memory list', () => {
            db.getMemories.mockReturnValue([
                { category: 'preference', key: 'warna', value: 'biru' },
                { category: 'fact', key: 'kota', value: 'Jakarta' },
            ]);
            const result = listMemories('user1');
            expect(result).toContain('warna');
            expect(result).toContain('biru');
            expect(result).toContain('Jakarta');
        });

        test('should filter by category', () => {
            listMemories('user1', 'preference');
            expect(db.getMemories).toHaveBeenCalledWith('user1', 'preference');
        });
    });

    describe('deleteMemory', () => {
        test('should delete existing memory', () => {
            db.deleteMemory.mockReturnValue(true);
            const result = deleteMemory('user1', 'warna');
            expect(result.success).toBe(true);
            expect(result.message).toContain('dihapus');
        });

        test('should fail for nonexistent memory', () => {
            db.deleteMemory.mockReturnValue(false);
            const result = deleteMemory('user1', 'nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toContain('ga ketemu');
        });
    });

    describe('getRelevantMemories', () => {
        test('should return empty for no userId', () => {
            expect(getRelevantMemories(null, 'hello')).toEqual([]);
        });

        test('should return empty for no conversationText', () => {
            expect(getRelevantMemories('user1', '')).toEqual([]);
        });

        test('should return empty when no memories exist', () => {
            db.getMemories.mockReturnValue([]);
            expect(getRelevantMemories('user1', 'test')).toEqual([]);
        });

        test('should score and return relevant memories', () => {
            db.getMemories.mockReturnValue([
                { category: 'preference', key: 'warna favorit', value: 'biru' },
                { category: 'fact', key: 'nama kucing', value: 'Milo' },
            ]);
            const result = getRelevantMemories('user1', 'suka warna biru');
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].score).toBeGreaterThan(0);
        });

        test('should boost preference category', () => {
            db.getMemories.mockReturnValue([
                { category: 'preference', key: 'makanan', value: 'nasi goreng' },
                { category: 'event', key: 'makanan', value: 'nasi goreng' },
            ]);
            const result = getRelevantMemories('user1', 'makanan favorit nasi goreng');
            const pref = result.find(m => m.category === 'preference');
            const evt = result.find(m => m.category === 'event');
            expect(pref.score).toBeGreaterThan(evt.score);
        });
    });

    describe('detectMemoryIntent', () => {
        test('should return null for empty text', () => {
            expect(detectMemoryIntent(null)).toBeNull();
            expect(detectMemoryIntent('')).toBeNull();
        });

        test('should detect "ingat ini" pattern', () => {
            const result = detectMemoryIntent('ingat ini: saya tidak suka pedas');
            expect(result).not.toBeNull();
            expect(result.category).toBe('fact');
        });

        test('should detect "panggil aku" pattern', () => {
            const result = detectMemoryIntent('panggil aku Budi');
            expect(result).not.toBeNull();
            expect(result.category).toBe('preference');
            expect(result.value).toContain('budi');
        });

        test('should detect "suka" pattern', () => {
            const result = detectMemoryIntent('gw suka kopi');
            expect(result).not.toBeNull();
            expect(result.category).toBe('preference');
        });

        test('should detect "tinggal di" pattern', () => {
            const result = detectMemoryIntent('gw tinggal di Jakarta');
            expect(result).not.toBeNull();
            expect(result.category).toBe('fact');
        });

        test('should detect "kerja di" pattern', () => {
            const result = detectMemoryIntent('saya kerja di Google');
            expect(result).not.toBeNull();
            expect(result.category).toBe('fact');
        });

        test('should return null for normal text', () => {
            expect(detectMemoryIntent('halo apa kabar')).toBeNull();
        });
    });

    describe('autoCapture', () => {
        test('should return null for no intent', () => {
            expect(autoCapture('user1', 'hello')).toBeNull();
        });

        test('should return null for empty inputs', () => {
            expect(autoCapture(null, 'hello')).toBeNull();
            expect(autoCapture('user1', null)).toBeNull();
        });

        test('should auto-save when intent detected', () => {
            const result = autoCapture('user1', 'gw suka kucing');
            expect(result).not.toBeNull();
            expect(result.success).toBe(true);
            expect(db.saveMemory).toHaveBeenCalled();
        });
    });
});
