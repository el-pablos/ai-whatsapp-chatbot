/**
 * Tests for Feature Registry
 */

const {
    FEATURES,
    getAllFeatures,
    getFeatureById,
    getFeaturesByModule,
    getUserFacingFeatures,
    generateCapabilityCards,
} = require('../src/featureRegistry');

describe('Feature Registry', () => {
    describe('FEATURES array', () => {
        test('should have 30+ features', () => {
            expect(FEATURES.length).toBeGreaterThanOrEqual(30);
        });

        test('each feature should have required properties', () => {
            FEATURES.forEach(f => {
                expect(f).toHaveProperty('id');
                expect(f).toHaveProperty('name');
                expect(f).toHaveProperty('module');
                expect(f).toHaveProperty('description');
                expect(f).toHaveProperty('trigger');
                expect(f).toHaveProperty('input');
                expect(f).toHaveProperty('output');
                expect(f).toHaveProperty('examples');
                expect(typeof f.id).toBe('string');
                expect(typeof f.name).toBe('string');
                expect(typeof f.module).toBe('string');
                expect(typeof f.description).toBe('string');
                expect(Array.isArray(f.examples)).toBe(true);
            });
        });

        test('feature IDs should be unique', () => {
            const ids = FEATURES.map(f => f.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        test('feature IDs should use dot-separated namespace', () => {
            FEATURES.forEach(f => {
                expect(f.id).toMatch(/^[a-z]+\.[a-z0-9_]+$/);
            });
        });
    });

    describe('getAllFeatures()', () => {
        test('should return the full FEATURES array', () => {
            const result = getAllFeatures();
            expect(result).toBe(FEATURES);
            expect(result.length).toBe(FEATURES.length);
        });
    });

    describe('getFeatureById()', () => {
        test('should find ai.chat', () => {
            const f = getFeatureById('ai.chat');
            expect(f).not.toBeNull();
            expect(f.name).toContain('AI Chat');
            expect(f.module).toBe('aiHandler');
        });

        test('should find ai.vision', () => {
            const f = getFeatureById('ai.vision');
            expect(f).not.toBeNull();
            expect(f.module).toBe('aiHandler');
        });

        test('should find document.extract', () => {
            const f = getFeatureById('document.extract');
            expect(f).not.toBeNull();
            expect(f.module).toBe('documentHandler');
        });

        test('should find youtube.info', () => {
            expect(getFeatureById('youtube.info')).not.toBeNull();
        });

        test('should find web.search', () => {
            expect(getFeatureById('web.search')).not.toBeNull();
        });

        test('should find weather.forecast', () => {
            expect(getFeatureById('weather.forecast')).not.toBeNull();
        });

        test('should find tarot.reading', () => {
            expect(getFeatureById('tarot.reading')).not.toBeNull();
        });

        test('should find calendar.today', () => {
            expect(getFeatureById('calendar.today')).not.toBeNull();
        });

        test('should find file.create', () => {
            expect(getFeatureById('file.create')).not.toBeNull();
        });

        test('should return null for unknown ID', () => {
            expect(getFeatureById('nonexistent.feature')).toBeNull();
        });
    });

    describe('getFeaturesByModule()', () => {
        test('should find aiHandler features', () => {
            const features = getFeaturesByModule('aiHandler');
            expect(features.length).toBeGreaterThanOrEqual(2);
            features.forEach(f => expect(f.module).toBe('aiHandler'));
        });

        test('should find documentHandler features', () => {
            const features = getFeaturesByModule('documentHandler');
            expect(features.length).toBeGreaterThanOrEqual(2);
        });

        test('should find youtubeHandler features', () => {
            const features = getFeaturesByModule('youtubeHandler');
            expect(features.length).toBeGreaterThanOrEqual(2);
        });

        test('should find calendarHandler features', () => {
            const features = getFeaturesByModule('calendarHandler');
            expect(features.length).toBeGreaterThanOrEqual(4);
        });

        test('should find tarotHandler features', () => {
            const features = getFeaturesByModule('tarotHandler');
            expect(features.length).toBeGreaterThanOrEqual(2);
        });

        test('should return empty for unknown module', () => {
            expect(getFeaturesByModule('fakeModule')).toEqual([]);
        });
    });

    describe('getUserFacingFeatures()', () => {
        test('should exclude system.* features', () => {
            const userFeatures = getUserFacingFeatures();
            userFeatures.forEach(f => {
                expect(f.id.startsWith('system.')).toBe(false);
            });
        });

        test('should only include features with examples', () => {
            const userFeatures = getUserFacingFeatures();
            userFeatures.forEach(f => {
                expect(f.examples.length).toBeGreaterThan(0);
            });
        });

        test('should have fewer features than total', () => {
            expect(getUserFacingFeatures().length).toBeLessThan(FEATURES.length);
        });
    });

    describe('generateCapabilityCards()', () => {
        test('should return a non-empty string', () => {
            const cards = generateCapabilityCards();
            expect(typeof cards).toBe('string');
            expect(cards.length).toBeGreaterThan(100);
        });

        test('should contain feature IDs', () => {
            const cards = generateCapabilityCards();
            expect(cards).toContain('[ai.chat]');
            expect(cards).toContain('[web.search]');
            expect(cards).toContain('[tarot.reading]');
        });

        test('should NOT contain system features', () => {
            const cards = generateCapabilityCards();
            expect(cards).not.toContain('[system.dns]');
            expect(cards).not.toContain('[system.healthcheck]');
        });

        test('each line should have ID, name, description, trigger, examples', () => {
            const cards = generateCapabilityCards();
            const lines = cards.split('\n').filter(Boolean);
            lines.forEach(line => {
                expect(line).toMatch(/^\[.+\]/); // starts with [feature.id]
                expect(line).toContain('trigger:');
                expect(line).toContain('examples:');
            });
        });
    });

    describe('Feature coverage', () => {
        test('should cover all expected modules', () => {
            const modules = [...new Set(FEATURES.map(f => f.module))];
            expect(modules).toContain('aiHandler');
            expect(modules).toContain('documentHandler');
            expect(modules).toContain('youtubeHandler');
            expect(modules).toContain('webSearchHandler');
            expect(modules).toContain('weatherHandler');
            expect(modules).toContain('locationHandler');
            expect(modules).toContain('stickerHandler');
            expect(modules).toContain('voiceHandler');
            expect(modules).toContain('moodHandler');
            expect(modules).toContain('tarotHandler');
            expect(modules).toContain('calendarHandler');
            expect(modules).toContain('fileCreator');
            expect(modules).toContain('backupHandler');
            expect(modules).toContain('database');
        });

        test('should have every feature category', () => {
            const categories = [...new Set(FEATURES.map(f => f.id.split('.')[0]))];
            expect(categories).toContain('ai');
            expect(categories).toContain('document');
            expect(categories).toContain('youtube');
            expect(categories).toContain('web');
            expect(categories).toContain('weather');
            expect(categories).toContain('location');
            expect(categories).toContain('media');
            expect(categories).toContain('sticker');
            expect(categories).toContain('voice');
            expect(categories).toContain('mood');
            expect(categories).toContain('tarot');
            expect(categories).toContain('calendar');
            expect(categories).toContain('file');
            expect(categories).toContain('admin');
            expect(categories).toContain('system');
        });
    });
});
