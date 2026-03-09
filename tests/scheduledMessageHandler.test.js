/**
 * Tests for Scheduled Message Handler
 */

jest.mock('../src/database');
jest.mock('../src/reminderHandler');

const {
    scheduleMessage,
    listScheduledMessages,
    processPendingMessages,
    parseScheduleCommand,
    formatScheduleTime,
} = require('../src/scheduledMessageHandler');

const db = require('../src/database');
const { parseTimeString } = require('../src/reminderHandler');

describe('Scheduled Message Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        db.createScheduledMessage.mockReturnValue({ id: 1 });
        db.getPendingScheduledMessages.mockReturnValue([]);
        db.getUserScheduledMessages.mockReturnValue([]);
        db.markScheduledMessageSent.mockReturnValue(undefined);
        parseTimeString.mockImplementation((str) => {
            if (!str || str === 'invalid') return null;
            if (str === 'past') return new Date('2020-01-01');
            const d = new Date();
            d.setMinutes(d.getMinutes() + 30);
            return d;
        });
    });

    describe('scheduleMessage', () => {
        test('should schedule message for self', () => {
            const result = scheduleMessage('user1', 'user1', 'Hello', '30 menit lagi', false);
            expect(result.success).toBe(true);
            expect(result.message).toContain('dijadwalkan');
            expect(db.createScheduledMessage).toHaveBeenCalled();
        });

        test('should allow owner to schedule to other chat', () => {
            const result = scheduleMessage('owner', 'other-chat', 'Hello', '30 menit lagi', true);
            expect(result.success).toBe(true);
        });

        test('should prevent non-owner from scheduling to other chat', () => {
            const result = scheduleMessage('user1', 'other-chat', 'Hello', '30 menit lagi', false);
            expect(result.success).toBe(false);
            expect(result.message).toContain('owner');
        });

        test('should fail for empty message', () => {
            const result = scheduleMessage('user1', 'user1', '', '30 menit lagi', false);
            expect(result.success).toBe(false);
        });

        test('should fail for empty time', () => {
            const result = scheduleMessage('user1', 'user1', 'Hello', '', false);
            expect(result.success).toBe(false);
        });

        test('should fail for unparseable time', () => {
            const result = scheduleMessage('user1', 'user1', 'Hello', 'invalid', false);
            expect(result.success).toBe(false);
        });

        test('should fail for past time', () => {
            const result = scheduleMessage('user1', 'user1', 'Hello', 'past', false);
            expect(result.success).toBe(false);
            expect(result.message).toContain('masa depan');
        });
    });

    describe('listScheduledMessages', () => {
        test('should return empty message when no messages', () => {
            db.getUserScheduledMessages.mockReturnValue([]);
            const result = listScheduledMessages('user1');
            expect(result).toContain('Belum ada pesan terjadwal');
        });

        test('should format message list', () => {
            db.getUserScheduledMessages.mockReturnValue([
                { id: 1, target_chat_id: 'chat1', message_text: 'Hello', send_at: new Date().toISOString(), status: 'pending' },
            ]);
            const result = listScheduledMessages('user1');
            expect(result).toContain('Hello');
            expect(result).toContain('⏳');
        });

        test('should show sent status', () => {
            db.getUserScheduledMessages.mockReturnValue([
                { id: 1, target_chat_id: 'chat1', message_text: 'Hi', send_at: new Date().toISOString(), status: 'sent' },
            ]);
            const result = listScheduledMessages('user1');
            expect(result).toContain('✅');
        });
    });

    describe('processPendingMessages', () => {
        test('should process and send pending messages', async () => {
            db.getPendingScheduledMessages.mockReturnValue([
                { id: 1, target_chat_id: 'chat1', message_text: 'Hello' },
                { id: 2, target_chat_id: 'chat2', message_text: 'World' },
            ]);
            const mockSend = jest.fn().mockResolvedValue(undefined);
            const count = await processPendingMessages(mockSend);
            expect(count).toBe(2);
            expect(mockSend).toHaveBeenCalledTimes(2);
            expect(db.markScheduledMessageSent).toHaveBeenCalledTimes(2);
        });

        test('should return 0 when no pending messages', async () => {
            db.getPendingScheduledMessages.mockReturnValue([]);
            const count = await processPendingMessages(jest.fn());
            expect(count).toBe(0);
        });

        test('should continue on send error', async () => {
            db.getPendingScheduledMessages.mockReturnValue([
                { id: 1, target_chat_id: 'chat1', message_text: 'Fail' },
                { id: 2, target_chat_id: 'chat2', message_text: 'Ok' },
            ]);
            const mockSend = jest.fn()
                .mockRejectedValueOnce(new Error('network'))
                .mockResolvedValueOnce(undefined);
            const count = await processPendingMessages(mockSend);
            expect(count).toBe(1);
        });
    });

    describe('parseScheduleCommand', () => {
        test('should parse /schedule list', () => {
            expect(parseScheduleCommand('/schedule list')).toEqual({ action: 'list' });
        });

        test('should parse /schedule create', () => {
            const result = parseScheduleCommand('/schedule besok jam 10 | Jangan lupa meeting');
            expect(result.action).toBe('create');
            expect(result.time).toBe('besok jam 10');
            expect(result.message).toBe('Jangan lupa meeting');
        });

        test('should parse with target', () => {
            const result = parseScheduleCommand('/schedule jam 3 sore | Hello | 628123@s.whatsapp.net');
            expect(result.target).toBe('628123@s.whatsapp.net');
        });

        test('should return null for insufficient parts', () => {
            expect(parseScheduleCommand('/schedule just time')).toBeNull();
        });

        test('should return null for empty', () => {
            expect(parseScheduleCommand('')).toBeNull();
            expect(parseScheduleCommand(null)).toBeNull();
        });
    });

    describe('formatScheduleTime', () => {
        test('should format date in Indonesian', () => {
            const date = new Date('2025-06-15T10:30:00');
            const result = formatScheduleTime(date);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });
});
