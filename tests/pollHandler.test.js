/**
 * Tests for Poll Handler
 */

jest.mock('../src/database');

const {
    createPoll,
    votePoll,
    closePoll,
    showPollResults,
    formatPollMessage,
    formatPollResults,
    generateBar,
    parsePollCommand,
    parseVoteCommand,
} = require('../src/pollHandler');

const db = require('../src/database');

describe('Poll Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        db.createPoll.mockReturnValue({ id: 1 });
        db.getActivePoll.mockReturnValue(null);
        db.getPollResults.mockReturnValue([]);
    });

    describe('createPoll', () => {
        test('should create poll with valid inputs', () => {
            db.getActivePoll.mockReturnValue(null);
            const result = createPoll('chat1', 'user1', 'Makan apa?', ['Nasi', 'Mie', 'Roti']);
            expect(result.success).toBe(true);
            expect(result.pollId).toBe(1);
            expect(result.message).toContain('Makan apa?');
        });

        test('should fail without question', () => {
            const result = createPoll('chat1', 'user1', '', ['A', 'B']);
            expect(result.success).toBe(false);
        });

        test('should fail with less than 2 options', () => {
            const result = createPoll('chat1', 'user1', 'Q?', ['A']);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Minimal 2');
        });

        test('should fail with more than 10 options', () => {
            const opts = Array.from({ length: 11 }, (_, i) => `opt${i}`);
            const result = createPoll('chat1', 'user1', 'Q?', opts);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Maksimal 10');
        });

        test('should fail when active poll exists', () => {
            db.getActivePoll.mockReturnValue({ id: 1 });
            const result = createPoll('chat1', 'user1', 'Q?', ['A', 'B']);
            expect(result.success).toBe(false);
            expect(result.message).toContain('poll aktif');
        });
    });

    describe('votePoll', () => {
        test('should record valid vote', () => {
            db.getActivePoll.mockReturnValue({ id: 1, options: '["A","B","C"]' });
            const result = votePoll('chat1', 'user1', 2);
            expect(result.success).toBe(true);
            expect(result.message).toContain('B');
            expect(db.votePoll).toHaveBeenCalledWith(1, 'user1', 2);
        });

        test('should fail when no active poll', () => {
            db.getActivePoll.mockReturnValue(null);
            const result = votePoll('chat1', 'user1', 1);
            expect(result.success).toBe(false);
        });

        test('should fail for invalid option index (too high)', () => {
            db.getActivePoll.mockReturnValue({ id: 1, options: '["A","B"]' });
            const result = votePoll('chat1', 'user1', 5);
            expect(result.success).toBe(false);
        });

        test('should fail for invalid option index (0)', () => {
            db.getActivePoll.mockReturnValue({ id: 1, options: '["A","B"]' });
            const result = votePoll('chat1', 'user1', 0);
            expect(result.success).toBe(false);
        });
    });

    describe('closePoll', () => {
        test('should close poll by creator', () => {
            db.getActivePoll.mockReturnValue({ id: 1, creator_id: 'user1', question: 'Q?', options: '["A","B"]' });
            db.getPollResults.mockReturnValue([{ option_index: 1, count: 3 }]);
            const result = closePoll('chat1', 'user1', 'owner@jid');
            expect(result.success).toBe(true);
            expect(db.closePoll).toHaveBeenCalledWith(1);
        });

        test('should close poll by owner', () => {
            db.getActivePoll.mockReturnValue({ id: 1, creator_id: 'user1', question: 'Q?', options: '["A","B"]' });
            db.getPollResults.mockReturnValue([]);
            const result = closePoll('chat1', 'owner@jid', 'owner@jid');
            expect(result.success).toBe(true);
        });

        test('should fail for non-creator non-owner', () => {
            db.getActivePoll.mockReturnValue({ id: 1, creator_id: 'user1', question: 'Q?', options: '["A"]' });
            const result = closePoll('chat1', 'user2', 'owner@jid');
            expect(result.success).toBe(false);
        });

        test('should fail when no active poll', () => {
            db.getActivePoll.mockReturnValue(null);
            const result = closePoll('chat1', 'user1', 'owner@jid');
            expect(result.success).toBe(false);
        });
    });

    describe('showPollResults', () => {
        test('should show results for active poll', () => {
            db.getActivePoll.mockReturnValue({ id: 1, question: 'Q?', options: '["A","B"]' });
            db.getPollResults.mockReturnValue([{ option_index: 1, count: 2 }]);
            const result = showPollResults('chat1');
            expect(result).toContain('LIVE');
            expect(result).toContain('Q?');
        });

        test('should return message when no active poll', () => {
            db.getActivePoll.mockReturnValue(null);
            expect(showPollResults('chat1')).toContain('Ga ada poll aktif');
        });
    });

    describe('formatPollMessage', () => {
        test('should format poll with options', () => {
            const result = formatPollMessage('Makan apa?', ['Nasi', 'Mie'], 1);
            expect(result).toContain('POLL #1');
            expect(result).toContain('Makan apa?');
            expect(result).toContain('1. Nasi');
            expect(result).toContain('2. Mie');
            expect(result).toContain('/vote');
        });
    });

    describe('formatPollResults', () => {
        test('should format closed results', () => {
            const results = [{ option_index: 1, count: 5 }, { option_index: 2, count: 3 }];
            const result = formatPollResults('Q?', ['A', 'B'], results, true);
            expect(result).toContain('CLOSED');
            expect(result).toContain('8 votes');
        });

        test('should format live results', () => {
            const result = formatPollResults('Q?', ['A', 'B'], [], false);
            expect(result).toContain('LIVE');
        });
    });

    describe('generateBar', () => {
        test('should generate full bar at 100%', () => {
            expect(generateBar(100)).toBe('██████████');
        });

        test('should generate empty bar at 0%', () => {
            expect(generateBar(0)).toBe('░░░░░░░░░░');
        });

        test('should generate half bar at 50%', () => {
            const bar = generateBar(50);
            expect(bar).toContain('█');
            expect(bar).toContain('░');
            expect(bar.length).toBe(10);
        });
    });

    describe('parsePollCommand', () => {
        test('should parse /poll close', () => {
            expect(parsePollCommand('/poll close')).toEqual({ action: 'close' });
        });

        test('should parse /poll results', () => {
            expect(parsePollCommand('/poll results')).toEqual({ action: 'results' });
        });

        test('should parse /poll result (singular)', () => {
            expect(parsePollCommand('/poll result')).toEqual({ action: 'results' });
        });

        test('should parse /poll create command', () => {
            const result = parsePollCommand('/poll Makan apa? | Nasi | Mie | Roti');
            expect(result.action).toBe('create');
            expect(result.question).toBe('Makan apa?');
            expect(result.options).toEqual(['Nasi', 'Mie', 'Roti']);
        });

        test('should return null for insufficient parts', () => {
            expect(parsePollCommand('/poll Only question')).toBeNull();
        });

        test('should return null for empty', () => {
            expect(parsePollCommand('')).toBeNull();
            expect(parsePollCommand(null)).toBeNull();
        });
    });

    describe('parseVoteCommand', () => {
        test('should parse /vote number', () => {
            expect(parseVoteCommand('/vote 2')).toBe(2);
        });

        test('should return null for invalid', () => {
            expect(parseVoteCommand('/vote abc')).toBeNull();
        });

        test('should return null for empty', () => {
            expect(parseVoteCommand('')).toBeNull();
            expect(parseVoteCommand(null)).toBeNull();
        });
    });
});
