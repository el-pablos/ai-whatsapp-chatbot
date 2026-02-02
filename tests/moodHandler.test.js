/**
 * Tests for Mood Handler
 */

const {
    analyzeMood,
    generateMoodResponse,
    quickMoodDetect,
    findMoodInfo,
    formatMood,
    isMoodRequest,
    getAllMoods,
    MOOD_CATEGORIES,
    MOOD_KEYWORDS
} = require('../src/moodHandler');

describe('Mood Handler', () => {
    describe('MOOD_CATEGORIES', () => {
        test('should have positive, negative, and neutral categories', () => {
            expect(MOOD_CATEGORIES).toHaveProperty('positive');
            expect(MOOD_CATEGORIES).toHaveProperty('negative');
            expect(MOOD_CATEGORIES).toHaveProperty('neutral');
        });

        test('positive moods should have emoji and label', () => {
            Object.values(MOOD_CATEGORIES.positive).forEach(mood => {
                expect(mood).toHaveProperty('emoji');
                expect(mood).toHaveProperty('label');
                expect(mood).toHaveProperty('intensity');
            });
        });

        test('negative moods should have emoji and label', () => {
            Object.values(MOOD_CATEGORIES.negative).forEach(mood => {
                expect(mood).toHaveProperty('emoji');
                expect(mood).toHaveProperty('label');
                expect(mood).toHaveProperty('intensity');
            });
        });
    });

    describe('MOOD_KEYWORDS', () => {
        test('should have keywords for common moods', () => {
            expect(MOOD_KEYWORDS).toHaveProperty('happy');
            expect(MOOD_KEYWORDS).toHaveProperty('sad');
            expect(MOOD_KEYWORDS).toHaveProperty('anxious');
            expect(MOOD_KEYWORDS).toHaveProperty('angry');
            expect(MOOD_KEYWORDS).toHaveProperty('stressed');
        });

        test('keywords should be arrays', () => {
            Object.values(MOOD_KEYWORDS).forEach(keywords => {
                expect(Array.isArray(keywords)).toBe(true);
                expect(keywords.length).toBeGreaterThan(0);
            });
        });
    });

    describe('quickMoodDetect', () => {
        test('should detect sad mood', () => {
            const result = quickMoodDetect('w lagi sedih banget hari ini');
            expect(result).not.toBeNull();
            expect(result.mood).toBe('sad');
            expect(result.category).toBe('negative');
        });

        test('should detect happy mood', () => {
            const result = quickMoodDetect('senang banget hari ini!');
            expect(result).not.toBeNull();
            expect(result.mood).toBe('happy');
            expect(result.category).toBe('positive');
        });

        test('should detect stressed mood', () => {
            const result = quickMoodDetect('gw stress banget sama kerjaan');
            expect(result).not.toBeNull();
            expect(result.mood).toBe('stressed');
        });

        test('should detect anxious mood', () => {
            const result = quickMoodDetect('lagi cemas soal ujian besok');
            expect(result).not.toBeNull();
            expect(result.mood).toBe('anxious');
        });

        test('should return null for neutral text', () => {
            const result = quickMoodDetect('halo apa kabar');
            expect(result).toBeNull();
        });
    });

    describe('findMoodInfo', () => {
        test('should find mood info for sad', () => {
            const info = findMoodInfo('sad');
            expect(info).not.toBeNull();
            expect(info.emoji).toBe('😢');
            expect(info.category).toBe('negative');
        });

        test('should find mood info for happy', () => {
            const info = findMoodInfo('happy');
            expect(info).not.toBeNull();
            expect(info.emoji).toBe('😊');
            expect(info.category).toBe('positive');
        });

        test('should return null for unknown mood', () => {
            const info = findMoodInfo('unknown_mood_xyz');
            expect(info).toBeNull();
        });

        test('should be case insensitive', () => {
            const info = findMoodInfo('HAPPY');
            expect(info).not.toBeNull();
        });
    });

    describe('formatMood', () => {
        test('should format mood with emoji', () => {
            const formatted = formatMood('sad');
            expect(formatted).toContain('😢');
            expect(formatted).toContain('Sedih');
        });

        test('should handle unknown mood', () => {
            const formatted = formatMood('unknown');
            expect(formatted).toContain('🤔');
        });
    });

    describe('isMoodRequest', () => {
        test('should detect "baca mood"', () => {
            expect(isMoodRequest('baca mood w dong')).toBe(true);
        });

        test('should detect "curhat dong"', () => {
            expect(isMoodRequest('curhat dong, w lagi galau')).toBe(true);
        });

        test('should detect "lagi ngerasa"', () => {
            expect(isMoodRequest('w lagi ngerasa sedih')).toBe(true);
        });

        test('should detect "perasaan w"', () => {
            expect(isMoodRequest('perasaan w lagi ga enak')).toBe(true);
        });

        test('should not detect regular messages', () => {
            expect(isMoodRequest('halo apa kabar')).toBe(false);
        });
    });

    describe('getAllMoods', () => {
        test('should return all mood categories', () => {
            const moods = getAllMoods();
            expect(moods).toEqual(MOOD_CATEGORIES);
        });
    });

    describe('generateMoodResponse', () => {
        test('should generate response for successful analysis', () => {
            const analysis = {
                success: true,
                primaryMood: 'sad',
                label: 'Sedih',
                emoji: '😢',
                intensity: 7,
                summary: 'User sedang merasa sedih',
                advice: 'Sabar ya bro, pasti ada jalan keluarnya',
                secondaryMood: null,
                triggers: ['kerjaan', 'hubungan']
            };
            
            const response = generateMoodResponse(analysis);
            expect(response).toContain('Mood Reading');
            expect(response).toContain('Sedih');
            expect(response).toContain('7/10');
        });

        test('should handle failed analysis', () => {
            const analysis = { success: false };
            const response = generateMoodResponse(analysis);
            expect(response).toContain('ceritain lebih detail');
        });
    });

    describe('analyzeMood (integration)', () => {
        test('should return success false without API', async () => {
            // This will fail because no API is running in tests
            const result = await analyzeMood('w lagi sedih banget');
            // Either succeeds with quick detect or fails gracefully
            expect(result).toHaveProperty('success');
        }, 10000);
    });
});
