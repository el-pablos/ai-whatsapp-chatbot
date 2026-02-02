/**
 * Tests for Tarot Handler
 */

const {
    MAJOR_ARCANA,
    SUITS,
    SPREADS,
    getAllCards,
    drawCards,
    formatCard,
    performReading,
    yesNoReading,
    isTarotRequest,
    isYesNoQuestion,
    getSpreadFromMessage
} = require('../src/tarotHandler');

describe('Tarot Handler', () => {
    describe('MAJOR_ARCANA', () => {
        test('should have 22 cards', () => {
            expect(MAJOR_ARCANA).toHaveLength(22);
        });

        test('should have The Fool as card 0', () => {
            expect(MAJOR_ARCANA[0].id).toBe(0);
            expect(MAJOR_ARCANA[0].name).toBe('The Fool');
        });

        test('should have The World as card 21', () => {
            expect(MAJOR_ARCANA[21].id).toBe(21);
            expect(MAJOR_ARCANA[21].name).toBe('The World');
        });

        test('each card should have required properties', () => {
            MAJOR_ARCANA.forEach(card => {
                expect(card).toHaveProperty('id');
                expect(card).toHaveProperty('name');
                expect(card).toHaveProperty('nameId');
                expect(card).toHaveProperty('emoji');
                expect(card).toHaveProperty('upright');
                expect(card).toHaveProperty('reversed');
                
                expect(card.upright).toHaveProperty('keywords');
                expect(card.upright).toHaveProperty('meaning');
                expect(card.upright).toHaveProperty('love');
                expect(card.upright).toHaveProperty('career');
                expect(card.upright).toHaveProperty('advice');
            });
        });
    });

    describe('SUITS', () => {
        test('should have 4 suits', () => {
            expect(Object.keys(SUITS)).toHaveLength(4);
        });

        test('should have wands, cups, swords, pentacles', () => {
            expect(SUITS).toHaveProperty('wands');
            expect(SUITS).toHaveProperty('cups');
            expect(SUITS).toHaveProperty('swords');
            expect(SUITS).toHaveProperty('pentacles');
        });

        test('each suit should have 14 cards', () => {
            Object.values(SUITS).forEach(suit => {
                expect(suit.cards).toHaveLength(14);
            });
        });

        test('suits should have element and domain', () => {
            Object.values(SUITS).forEach(suit => {
                expect(suit).toHaveProperty('element');
                expect(suit).toHaveProperty('domain');
                expect(suit).toHaveProperty('emoji');
            });
        });
    });

    describe('SPREADS', () => {
        test('should have multiple spread types', () => {
            expect(SPREADS).toHaveProperty('single');
            expect(SPREADS).toHaveProperty('threeCard');
            expect(SPREADS).toHaveProperty('loveSpread');
            expect(SPREADS).toHaveProperty('celticCross');
            expect(SPREADS).toHaveProperty('yesNo');
        });

        test('single spread should have 1 position', () => {
            expect(SPREADS.single.positions).toHaveLength(1);
        });

        test('three card spread should have 3 positions', () => {
            expect(SPREADS.threeCard.positions).toHaveLength(3);
        });

        test('celtic cross should have 10 positions', () => {
            expect(SPREADS.celticCross.positions).toHaveLength(10);
        });
    });

    describe('getAllCards', () => {
        test('should return 78 cards total', () => {
            const cards = getAllCards();
            expect(cards).toHaveLength(78);
        });

        test('should have 22 major arcana cards', () => {
            const cards = getAllCards();
            const majorCards = cards.filter(c => c.type === 'major');
            expect(majorCards).toHaveLength(22);
        });

        test('should have 56 minor arcana cards', () => {
            const cards = getAllCards();
            const minorCards = cards.filter(c => c.type === 'minor');
            expect(minorCards).toHaveLength(56);
        });
    });

    describe('drawCards', () => {
        test('should draw requested number of cards', () => {
            const cards = drawCards(3);
            expect(cards).toHaveLength(3);
        });

        test('should draw 1 card by default', () => {
            const cards = drawCards();
            expect(cards).toHaveLength(1);
        });

        test('drawn cards should have isReversed property', () => {
            const cards = drawCards(5);
            cards.forEach(card => {
                expect(card).toHaveProperty('isReversed');
                expect(typeof card.isReversed).toBe('boolean');
            });
        });

        test('should not reverse when allowReversed is false', () => {
            const cards = drawCards(10, false);
            cards.forEach(card => {
                expect(card.isReversed).toBe(false);
            });
        });

        test('should return unique cards (no duplicates)', () => {
            const cards = drawCards(10);
            const ids = cards.map(c => c.type === 'major' ? c.id : `${c.suit}_${c.rank}`);
            const uniqueIds = [...new Set(ids)];
            expect(uniqueIds).toHaveLength(10);
        });
    });

    describe('formatCard', () => {
        test('should format major arcana card', () => {
            const cards = drawCards(1, false);
            const card = cards[0];
            card.type = 'major';
            card.name = 'The Fool';
            card.nameId = 'Si Bodoh';
            card.emoji = '🃏';
            card.upright = {
                keywords: ['Awal baru', 'Spontanitas'],
                meaning: 'Test meaning',
                love: 'Test love',
                career: 'Test career',
                advice: 'Test advice'
            };
            card.reversed = card.upright;
            card.isReversed = false;
            
            const formatted = formatCard(card, 'Test Position');
            expect(formatted).toContain('The Fool');
            expect(formatted).toContain('Si Bodoh');
            expect(formatted).toContain('Test Position');
        });

        test('should indicate reversed state', () => {
            const cards = drawCards(1, false);
            const card = cards[0];
            card.isReversed = true;
            card.type = 'minor';
            card.name = 'Ace of Wands';
            card.nameId = 'Ace Tongkat';
            card.suitEmoji = '🪄';
            card.element = 'Api';
            card.domain = 'Aksi';
            card.upright = 'Test upright';
            card.reversed = 'Test reversed';
            
            const formatted = formatCard(card);
            expect(formatted).toContain('Terbalik');
        });
    });

    describe('yesNoReading', () => {
        test('should return reading with answer', () => {
            const result = yesNoReading('Will I succeed?');
            expect(result).toHaveProperty('question');
            expect(result).toHaveProperty('card');
            expect(result).toHaveProperty('answer');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('text');
        });

        test('answer should be YA, TIDAK, or MUNGKIN', () => {
            const result = yesNoReading('Test question');
            expect(['YA', 'TIDAK', 'MUNGKIN']).toContain(result.answer);
        });

        test('confidence should be between 0 and 100', () => {
            const result = yesNoReading('Test question');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
        });

        test('text should contain question', () => {
            const result = yesNoReading('Will I be rich?');
            expect(result.text).toContain('Will I be rich?');
        });
    });

    describe('isTarotRequest', () => {
        test('should detect "tarot"', () => {
            expect(isTarotRequest('mau tarot dong')).toBe(true);
        });

        test('should detect "baca tarot"', () => {
            expect(isTarotRequest('baca tarot w dong')).toBe(true);
        });

        test('should detect "ramalan"', () => {
            expect(isTarotRequest('ramal nasib w')).toBe(true);
        });

        test('should detect "tarik kartu"', () => {
            expect(isTarotRequest('tarik kartu dong')).toBe(true);
        });

        test('should not detect regular messages', () => {
            expect(isTarotRequest('halo apa kabar')).toBe(false);
        });
    });

    describe('isYesNoQuestion', () => {
        test('should detect "apakah"', () => {
            expect(isYesNoQuestion('apakah dia suka sama w')).toBe(true);
        });

        test('should detect "kira-kira"', () => {
            expect(isYesNoQuestion('kira-kira bakal sukses ga')).toBe(true);
        });

        test('should detect "bisa ga"', () => {
            expect(isYesNoQuestion('bisa ga w dapet kerja')).toBe(true);
        });

        test('should not detect regular questions', () => {
            expect(isYesNoQuestion('siapa nama kamu')).toBe(false);
        });
    });

    describe('getSpreadFromMessage', () => {
        test('should detect celtic cross', () => {
            expect(getSpreadFromMessage('mau tarot lengkap')).toBe('celticCross');
            expect(getSpreadFromMessage('celtic cross dong')).toBe('celticCross');
        });

        test('should detect love spread', () => {
            expect(getSpreadFromMessage('tarot cinta dong')).toBe('loveSpread');
            expect(getSpreadFromMessage('ramalan hubungan')).toBe('loveSpread');
        });

        test('should detect three card spread', () => {
            expect(getSpreadFromMessage('tarot 3 kartu')).toBe('threeCard');
            expect(getSpreadFromMessage('past present future')).toBe('threeCard');
        });

        test('should detect yes/no', () => {
            expect(getSpreadFromMessage('yes no reading')).toBe('yesNo');
        });

        test('should default to single', () => {
            expect(getSpreadFromMessage('tarot aja')).toBe('single');
        });
    });

    describe('performReading (integration)', () => {
        test('should perform single card reading', async () => {
            const result = await performReading('single', 'Test question', []);
            expect(result).toHaveProperty('spread');
            expect(result).toHaveProperty('cards');
            expect(result).toHaveProperty('reading');
            expect(result.cards).toHaveLength(1);
        }, 10000);

        test('should perform three card reading', async () => {
            const result = await performReading('threeCard', 'Test question', []);
            expect(result.cards).toHaveLength(3);
        }, 10000);
    });
});
