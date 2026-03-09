/**
 * Tests for Reminder Handler
 */

jest.mock('../src/database');

jest.mock('node-cron', () => ({
    schedule: jest.fn(),
}));

const {
    createReminder,
    listReminders,
    deleteReminder,
    parseTimeString,
    formatReminderMessage,
    formatRemindAt,
    startReminderCron,
} = require('../src/reminderHandler');

const db = require('../src/database');
const cron = require('node-cron');

describe('Reminder Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        db.createReminder.mockReturnValue({ id: 1 });
        db.getPendingReminders.mockReturnValue([]);
        db.getUserReminders.mockReturnValue([]);
        db.deleteReminder.mockReturnValue(false);
    });

    describe('parseTimeString', () => {
        test('should return null for empty input', () => {
            expect(parseTimeString(null)).toBeNull();
            expect(parseTimeString('')).toBeNull();
        });

        test('should parse "30 menit lagi"', () => {
            const result = parseTimeString('30 menit lagi');
            expect(result).toBeInstanceOf(Date);
            expect(result.getTime()).toBeGreaterThan(Date.now());
        });

        test('should parse "2 jam lagi"', () => {
            const result = parseTimeString('2 jam lagi');
            expect(result).toBeInstanceOf(Date);
            const diff = result.getTime() - Date.now();
            expect(diff).toBeGreaterThan(1.9 * 60 * 60 * 1000);
        });

        test('should parse "5 hari lagi"', () => {
            const result = parseTimeString('5 hari lagi');
            expect(result).toBeInstanceOf(Date);
        });

        test('should parse "jam 3 sore"', () => {
            const result = parseTimeString('jam 3 sore');
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(15);
        });

        test('should parse "jam 10 pagi"', () => {
            const result = parseTimeString('jam 10 pagi');
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(10);
        });

        test('should parse "besok jam 10"', () => {
            const result = parseTimeString('besok jam 10');
            expect(result).toBeInstanceOf(Date);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            expect(result.getDate()).toBe(tomorrow.getDate());
        });

        test('should parse "lusa jam 8"', () => {
            const result = parseTimeString('lusa jam 8');
            expect(result).toBeInstanceOf(Date);
        });

        test('should parse "tanggal 15 jam 10"', () => {
            const result = parseTimeString('tanggal 15 jam 10');
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(10);
        });

        test('should parse "pukul 14:30"', () => {
            const result = parseTimeString('pukul 14:30');
            expect(result).toBeInstanceOf(Date);
        });

        test('should return null for unparseable string', () => {
            expect(parseTimeString('entah kapan')).toBeNull();
        });
    });

    describe('createReminder', () => {
        test('should create reminder with valid inputs', () => {
            const result = createReminder('user1', 'chat1', 'Makan siang', '30 menit lagi');
            expect(result.success).toBe(true);
            expect(result.id).toBe(1);
            expect(result.message).toBe('Makan siang');
            expect(result.remindAt).toBeInstanceOf(Date);
            expect(db.createReminder).toHaveBeenCalled();
        });

        test('should fail with unparseable time', () => {
            const result = createReminder('user1', 'chat1', 'test', 'kapan kapan');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should fail with empty message', () => {
            const result = createReminder('user1', 'chat1', '', '30 menit lagi');
            expect(result.success).toBe(false);
        });

        test('should fail with whitespace-only message', () => {
            const result = createReminder('user1', 'chat1', '   ', '30 menit lagi');
            expect(result.success).toBe(false);
        });
    });

    describe('listReminders', () => {
        test('should return empty message when no reminders', () => {
            db.getUserReminders.mockReturnValue([]);
            const result = listReminders('user1');
            expect(result).toContain('belum ada reminder');
        });

        test('should format reminder list', () => {
            db.getUserReminders.mockReturnValue([
                { id: 1, message: 'Makan', remind_at: '2025-01-01 10:00:00' },
                { id: 2, message: 'Kerja', remind_at: '2025-01-01 14:00:00' },
            ]);
            const result = listReminders('user1');
            expect(result).toContain('Makan');
            expect(result).toContain('Kerja');
            expect(result).toContain('[ID:1]');
            expect(result).toContain('[ID:2]');
        });
    });

    describe('deleteReminder', () => {
        test('should delete existing reminder', () => {
            db.deleteReminder.mockReturnValue(true);
            const result = deleteReminder('user1', 5);
            expect(result.success).toBe(true);
            expect(result.message).toContain('dihapus');
        });

        test('should fail for nonexistent reminder', () => {
            db.deleteReminder.mockReturnValue(false);
            const result = deleteReminder('user1', 999);
            expect(result.success).toBe(false);
            expect(result.error).toContain('ga ketemu');
        });
    });

    describe('formatReminderMessage', () => {
        test('should format reminder notification', () => {
            const result = formatReminderMessage({ message: 'Makan siang' });
            expect(result).toContain('REMINDER');
            expect(result).toContain('Makan siang');
        });
    });

    describe('formatRemindAt', () => {
        test('should format date in Indonesian', () => {
            const date = new Date('2025-03-15T10:30:00');
            const result = formatRemindAt(date);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('startReminderCron', () => {
        test('should register cron schedule', () => {
            const mockSock = { sendMessage: jest.fn() };
            startReminderCron(mockSock);
            expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
        });
    });
});
