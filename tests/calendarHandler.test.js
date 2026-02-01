/**
 * Calendar Handler Test Suite
 * 
 * @jest-environment node
 */

const {
    getTodayInfo,
    getUpcomingHolidays,
    getZodiac,
    calculateAge,
    parseDateFromString,
    getCountdown,
    getMonthCalendar,
    detectCalendarIntent,
    formatCalendarResponse,
    NATIONAL_HOLIDAYS,
    DAYS_ID,
    MONTHS_ID
} = require('../src/calendarHandler');

describe('Calendar Handler Module', () => {

    describe('getTodayInfo', () => {
        it('should return today date info', () => {
            const info = getTodayInfo();
            
            expect(info).toHaveProperty('date');
            expect(info).toHaveProperty('dayName');
            expect(info).toHaveProperty('dayNumber');
            expect(info).toHaveProperty('month');
            expect(info).toHaveProperty('year');
            expect(info).toHaveProperty('time');
            expect(info).toHaveProperty('isWeekend');
            expect(info).toHaveProperty('weekNumber');
        });

        it('should have valid day name', () => {
            const info = getTodayInfo();
            expect(DAYS_ID).toContain(info.dayName);
        });

        it('should have valid month name', () => {
            const info = getTodayInfo();
            expect(MONTHS_ID).toContain(info.month);
        });
    });

    describe('getZodiac', () => {
        it('should return Aries for March 25', () => {
            const zodiac = getZodiac(3, 25);
            expect(zodiac.name).toBe('Aries');
        });

        it('should return Capricorn for December 25', () => {
            const zodiac = getZodiac(12, 25);
            expect(zodiac.name).toBe('Capricorn');
        });

        it('should return Capricorn for January 10', () => {
            const zodiac = getZodiac(1, 10);
            expect(zodiac.name).toBe('Capricorn');
        });

        it('should return Leo for August 15', () => {
            const zodiac = getZodiac(8, 15);
            expect(zodiac.name).toBe('Leo');
        });

        it('should include symbol and element', () => {
            const zodiac = getZodiac(6, 15);
            expect(zodiac).toHaveProperty('symbol');
            expect(zodiac).toHaveProperty('element');
        });
    });

    describe('calculateAge', () => {
        it('should calculate age correctly', () => {
            const birthYear = new Date().getFullYear() - 25;
            const result = calculateAge(birthYear, 1, 1);
            
            expect(result.age).toBeGreaterThanOrEqual(24);
            expect(result.age).toBeLessThanOrEqual(25);
        });

        it('should include next birthday info', () => {
            const result = calculateAge(2000, 6, 15);
            
            expect(result).toHaveProperty('nextBirthday');
            expect(result).toHaveProperty('daysUntilBirthday');
        });
    });

    describe('parseDateFromString', () => {
        it('should parse "1 januari" format', () => {
            const result = parseDateFromString('1 januari');
            expect(result.day).toBe(1);
            expect(result.month).toBe(1);
        });

        it('should parse "15 august" format', () => {
            const result = parseDateFromString('15 august');
            expect(result.day).toBe(15);
            expect(result.month).toBe(8);
        });

        it('should parse "1/1/2000" format', () => {
            const result = parseDateFromString('1/1/2000');
            expect(result.day).toBe(1);
            expect(result.month).toBe(1);
            expect(result.year).toBe(2000);
        });

        it('should parse "15-8" format', () => {
            const result = parseDateFromString('15-8');
            expect(result.day).toBe(15);
            expect(result.month).toBe(8);
        });

        it('should parse "1 jan 2000" format', () => {
            const result = parseDateFromString('1 jan 2000');
            expect(result.day).toBe(1);
            expect(result.month).toBe(1);
            expect(result.year).toBe(2000);
        });

        it('should return null for invalid format', () => {
            const result = parseDateFromString('invalid');
            expect(result).toBeNull();
        });
    });

    describe('getUpcomingHolidays', () => {
        it('should return array of holidays', () => {
            const holidays = getUpcomingHolidays(3);
            
            expect(Array.isArray(holidays)).toBe(true);
            expect(holidays.length).toBeLessThanOrEqual(3);
        });

        it('should include required fields', () => {
            const holidays = getUpcomingHolidays(1);
            
            if (holidays.length > 0) {
                expect(holidays[0]).toHaveProperty('name');
                expect(holidays[0]).toHaveProperty('date');
                expect(holidays[0]).toHaveProperty('daysUntil');
            }
        });
    });

    describe('getCountdown', () => {
        it('should return countdown for future date', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            
            const countdown = getCountdown(futureDate);
            
            expect(countdown.passed).toBe(false);
            expect(countdown.days).toBeGreaterThanOrEqual(9);
        });

        it('should return passed=true for past date', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            
            const countdown = getCountdown(pastDate);
            
            expect(countdown.passed).toBe(true);
        });
    });

    describe('getMonthCalendar', () => {
        it('should return calendar string', () => {
            const calendar = getMonthCalendar();
            
            expect(typeof calendar).toBe('string');
            expect(calendar).toContain('📅');
            expect(calendar).toContain('Min');
            expect(calendar).toContain('Sen');
        });

        it('should show specific month when provided', () => {
            const calendar = getMonthCalendar(12, 2025);
            
            expect(calendar).toContain('Desember');
            expect(calendar).toContain('2025');
        });
    });

    describe('detectCalendarIntent', () => {
        it('should detect "hari ini" intent', () => {
            const result = detectCalendarIntent('tanggal hari ini berapa?');
            expect(result.intent).toBe('today');
        });

        it('should detect "libur" intent', () => {
            const result = detectCalendarIntent('kapan libur nasional?');
            expect(result.intent).toBe('holidays');
        });

        it('should detect "kalender" intent', () => {
            const result = detectCalendarIntent('tampilkan kalender');
            expect(result.intent).toBe('calendar');
        });

        it('should detect "zodiak" intent', () => {
            const result = detectCalendarIntent('apa zodiak ku?');
            expect(result.intent).toBe('zodiac');
        });

        it('should detect specific month in calendar intent', () => {
            const result = detectCalendarIntent('kalender bulan desember');
            expect(result.intent).toBe('calendar');
            expect(result.month).toBe(12);
        });

        it('should return null for non-calendar messages', () => {
            const result = detectCalendarIntent('halo apa kabar');
            expect(result).toBeNull();
        });
    });

    describe('formatCalendarResponse', () => {
        it('should format today response', () => {
            const response = formatCalendarResponse('today');
            
            expect(response).toContain('📅');
            expect(response).toContain('WIB');
        });

        it('should format holidays response', () => {
            const response = formatCalendarResponse('holidays');
            
            expect(response).toContain('Libur Nasional');
        });

        it('should format calendar response', () => {
            const response = formatCalendarResponse('calendar');
            
            expect(response).toContain('Min');
            expect(response).toContain('Sen');
        });

        it('should format zodiac response with date', () => {
            const response = formatCalendarResponse('zodiac', { month: 8, day: 15 });
            
            expect(response).toContain('Leo');
            expect(response).toContain('♌');
        });

        it('should prompt for date when zodiac has no data', () => {
            const response = formatCalendarResponse('zodiac');
            
            expect(response).toContain('tanggal lahir');
        });
    });

    describe('NATIONAL_HOLIDAYS', () => {
        it('should have holidays defined', () => {
            expect(Object.keys(NATIONAL_HOLIDAYS).length).toBeGreaterThan(0);
        });

        it('should include Hari Kemerdekaan', () => {
            expect(NATIONAL_HOLIDAYS['2025-08-17']).toBe('Hari Kemerdekaan RI');
        });

        it('should include Natal', () => {
            expect(NATIONAL_HOLIDAYS['2025-12-25']).toBe('Hari Raya Natal');
        });
    });

    describe('Constants', () => {
        it('should have 7 days', () => {
            expect(DAYS_ID.length).toBe(7);
        });

        it('should have 12 months', () => {
            expect(MONTHS_ID.length).toBe(12);
        });

        it('should start with Minggu', () => {
            expect(DAYS_ID[0]).toBe('Minggu');
        });

        it('should start with Januari', () => {
            expect(MONTHS_ID[0]).toBe('Januari');
        });
    });
});
