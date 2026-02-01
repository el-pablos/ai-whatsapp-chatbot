/**
 * Calendar Handler Module
 * 
 * Modul untuk menangani fitur kalender:
 * - Cek tanggal hari ini
 * - Cek hari dalam seminggu
 * - Cek bulan & tahun
 * - Cek hari libur nasional Indonesia
 * - Countdown ke event tertentu
 * - Info zodiak berdasarkan tanggal lahir
 * 
 * @author Tama El Pablo
 * @version 2.1.0
 */

// Daftar hari libur nasional Indonesia 2024-2026
const NATIONAL_HOLIDAYS = {
    // 2024
    '2024-01-01': 'Tahun Baru Masehi',
    '2024-02-08': 'Tahun Baru Imlek 2575',
    '2024-03-11': 'Isra Miraj',
    '2024-03-12': 'Hari Raya Nyepi',
    '2024-03-29': 'Wafat Isa Almasih',
    '2024-03-31': 'Hari Paskah',
    '2024-04-10': 'Hari Raya Idul Fitri',
    '2024-04-11': 'Hari Raya Idul Fitri',
    '2024-05-01': 'Hari Buruh Internasional',
    '2024-05-09': 'Kenaikan Isa Almasih',
    '2024-05-23': 'Hari Raya Waisak',
    '2024-06-01': 'Hari Lahir Pancasila',
    '2024-06-17': 'Hari Raya Idul Adha',
    '2024-07-07': 'Tahun Baru Hijriah',
    '2024-08-17': 'Hari Kemerdekaan RI',
    '2024-09-16': 'Maulid Nabi Muhammad',
    '2024-12-25': 'Hari Raya Natal',
    
    // 2025
    '2025-01-01': 'Tahun Baru Masehi',
    '2025-01-27': 'Isra Miraj',
    '2025-01-29': 'Tahun Baru Imlek 2576',
    '2025-03-29': 'Hari Raya Nyepi',
    '2025-03-31': 'Hari Raya Idul Fitri',
    '2025-04-01': 'Hari Raya Idul Fitri',
    '2025-04-18': 'Wafat Isa Almasih',
    '2025-05-01': 'Hari Buruh Internasional',
    '2025-05-12': 'Hari Raya Waisak',
    '2025-05-29': 'Kenaikan Isa Almasih',
    '2025-06-01': 'Hari Lahir Pancasila',
    '2025-06-06': 'Hari Raya Idul Adha',
    '2025-06-27': 'Tahun Baru Hijriah',
    '2025-08-17': 'Hari Kemerdekaan RI',
    '2025-09-05': 'Maulid Nabi Muhammad',
    '2025-12-25': 'Hari Raya Natal',
    
    // 2026
    '2026-01-01': 'Tahun Baru Masehi',
    '2026-01-17': 'Tahun Baru Imlek 2577',
    '2026-01-17': 'Isra Miraj',
    '2026-03-19': 'Hari Raya Nyepi',
    '2026-03-20': 'Hari Raya Idul Fitri',
    '2026-03-21': 'Hari Raya Idul Fitri',
    '2026-04-03': 'Wafat Isa Almasih',
    '2026-05-01': 'Hari Buruh Internasional',
    '2026-05-01': 'Hari Raya Waisak',
    '2026-05-14': 'Kenaikan Isa Almasih',
    '2026-05-27': 'Hari Raya Idul Adha',
    '2026-06-01': 'Hari Lahir Pancasila',
    '2026-06-16': 'Tahun Baru Hijriah',
    '2026-08-17': 'Hari Kemerdekaan RI',
    '2026-08-26': 'Maulid Nabi Muhammad',
    '2026-12-25': 'Hari Raya Natal',
};

// Nama hari Indonesia
const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Nama bulan Indonesia  
const MONTHS_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Zodiak
const ZODIACS = [
    { name: 'Capricorn', symbol: '♑', start: [12, 22], end: [1, 19], element: 'Tanah' },
    { name: 'Aquarius', symbol: '♒', start: [1, 20], end: [2, 18], element: 'Udara' },
    { name: 'Pisces', symbol: '♓', start: [2, 19], end: [3, 20], element: 'Air' },
    { name: 'Aries', symbol: '♈', start: [3, 21], end: [4, 19], element: 'Api' },
    { name: 'Taurus', symbol: '♉', start: [4, 20], end: [5, 20], element: 'Tanah' },
    { name: 'Gemini', symbol: '♊', start: [5, 21], end: [6, 20], element: 'Udara' },
    { name: 'Cancer', symbol: '♋', start: [6, 21], end: [7, 22], element: 'Air' },
    { name: 'Leo', symbol: '♌', start: [7, 23], end: [8, 22], element: 'Api' },
    { name: 'Virgo', symbol: '♍', start: [8, 23], end: [9, 22], element: 'Tanah' },
    { name: 'Libra', symbol: '♎', start: [9, 23], end: [10, 22], element: 'Udara' },
    { name: 'Scorpio', symbol: '♏', start: [10, 23], end: [11, 21], element: 'Air' },
    { name: 'Sagittarius', symbol: '♐', start: [11, 22], end: [12, 21], element: 'Api' },
];

/**
 * Format tanggal ke string Indonesia
 * @param {Date} date 
 * @returns {string}
 */
const formatDateIndonesian = (date) => {
    const day = DAYS_ID[date.getDay()];
    const dateNum = date.getDate();
    const month = MONTHS_ID[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}, ${dateNum} ${month} ${year}`;
};

/**
 * Format tanggal ke YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Get info hari ini
 * @returns {Object}
 */
const getTodayInfo = () => {
    const now = new Date();
    const dateKey = formatDateKey(now);
    const holiday = NATIONAL_HOLIDAYS[dateKey] || null;
    
    return {
        date: formatDateIndonesian(now),
        dateKey: dateKey,
        dayName: DAYS_ID[now.getDay()],
        dayNumber: now.getDate(),
        month: MONTHS_ID[now.getMonth()],
        monthNumber: now.getMonth() + 1,
        year: now.getFullYear(),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        isHoliday: !!holiday,
        holidayName: holiday,
        weekNumber: getWeekNumber(now)
    };
};

/**
 * Get week number dalam tahun
 * @param {Date} date 
 * @returns {number}
 */
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Get upcoming holidays
 * @param {number} limit - Jumlah libur yang ditampilkan
 * @returns {Array}
 */
const getUpcomingHolidays = (limit = 5) => {
    const now = new Date();
    const upcoming = [];
    
    // Sort holidays by date
    const sortedHolidays = Object.entries(NATIONAL_HOLIDAYS)
        .map(([dateKey, name]) => ({
            dateKey,
            name,
            date: new Date(dateKey)
        }))
        .filter(h => h.date >= now)
        .sort((a, b) => a.date - b.date)
        .slice(0, limit);
    
    for (const holiday of sortedHolidays) {
        const daysUntil = Math.ceil((holiday.date - now) / (1000 * 60 * 60 * 24));
        upcoming.push({
            name: holiday.name,
            date: formatDateIndonesian(holiday.date),
            dateKey: holiday.dateKey,
            daysUntil: daysUntil
        });
    }
    
    return upcoming;
};

/**
 * Get zodiak dari tanggal lahir
 * @param {number} month - Bulan (1-12)
 * @param {number} day - Tanggal
 * @returns {Object|null}
 */
const getZodiac = (month, day) => {
    for (const zodiac of ZODIACS) {
        const [startMonth, startDay] = zodiac.start;
        const [endMonth, endDay] = zodiac.end;
        
        // Handle Capricorn yang cross year
        if (zodiac.name === 'Capricorn') {
            if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
                return zodiac;
            }
        } else {
            if ((month === startMonth && day >= startDay) || 
                (month === endMonth && day <= endDay)) {
                return zodiac;
            }
        }
    }
    return null;
};

/**
 * Hitung umur dari tanggal lahir
 * @param {number} year 
 * @param {number} month 
 * @param {number} day 
 * @returns {Object}
 */
const calculateAge = (year, month, day) => {
    const now = new Date();
    const birthDate = new Date(year, month - 1, day);
    
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
        age--;
    }
    
    // Next birthday
    let nextBirthday = new Date(now.getFullYear(), month - 1, day);
    if (nextBirthday <= now) {
        nextBirthday = new Date(now.getFullYear() + 1, month - 1, day);
    }
    
    const daysUntilBirthday = Math.ceil((nextBirthday - now) / (1000 * 60 * 60 * 24));
    
    return {
        age: age,
        nextBirthday: formatDateIndonesian(nextBirthday),
        daysUntilBirthday: daysUntilBirthday
    };
};

/**
 * Parse tanggal dari string user
 * Supports: "1 jan", "1 januari", "1-1", "01/01", "1 januari 2000"
 * @param {string} dateStr 
 * @returns {Object|null}
 */
const parseDateFromString = (dateStr) => {
    const str = dateStr.toLowerCase().trim();
    
    // Map nama bulan
    const monthNames = {
        'jan': 1, 'januari': 1, 'january': 1,
        'feb': 2, 'februari': 2, 'february': 2,
        'mar': 3, 'maret': 3, 'march': 3,
        'apr': 4, 'april': 4,
        'mei': 5, 'may': 5,
        'jun': 6, 'juni': 6, 'june': 6,
        'jul': 7, 'juli': 7, 'july': 7,
        'agu': 8, 'agustus': 8, 'aug': 8, 'august': 8,
        'sep': 9, 'sept': 9, 'september': 9,
        'okt': 10, 'oktober': 10, 'oct': 10, 'october': 10,
        'nov': 11, 'november': 11,
        'des': 12, 'desember': 12, 'dec': 12, 'december': 12
    };
    
    let day, month, year;
    
    // Pattern: "1 januari 2000" or "1 jan"
    const textPattern = /(\d{1,2})\s*([a-z]+)\s*(\d{4})?/;
    const textMatch = str.match(textPattern);
    
    if (textMatch) {
        day = parseInt(textMatch[1]);
        month = monthNames[textMatch[2]];
        year = textMatch[3] ? parseInt(textMatch[3]) : null;
        
        if (month && day >= 1 && day <= 31) {
            return { day, month, year };
        }
    }
    
    // Pattern: "1-1" or "01/01" or "1/1/2000"
    const numPattern = /(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{2,4}))?/;
    const numMatch = str.match(numPattern);
    
    if (numMatch) {
        day = parseInt(numMatch[1]);
        month = parseInt(numMatch[2]);
        year = numMatch[3] ? parseInt(numMatch[3]) : null;
        
        // Handle 2-digit year
        if (year && year < 100) {
            year = year > 50 ? 1900 + year : 2000 + year;
        }
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return { day, month, year };
        }
    }
    
    return null;
};

/**
 * Countdown ke tanggal tertentu
 * @param {Date} targetDate 
 * @returns {Object}
 */
const getCountdown = (targetDate) => {
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff <= 0) {
        return {
            passed: true,
            days: 0,
            hours: 0,
            minutes: 0
        };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
        passed: false,
        days,
        hours,
        minutes,
        formatted: `${days} hari, ${hours} jam, ${minutes} menit`
    };
};

/**
 * Get calendar view untuk bulan tertentu (simple ASCII calendar)
 * @param {number} month - 1-12
 * @param {number} year 
 * @returns {string}
 */
const getMonthCalendar = (month = null, year = null) => {
    const now = new Date();
    month = month || (now.getMonth() + 1);
    year = year || now.getFullYear();
    
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    let calendar = `📅 ${MONTHS_ID[month - 1]} ${year}\n`;
    calendar += `━━━━━━━━━━━━━━━━━━━━━\n`;
    calendar += `Min  Sen  Sel  Rab  Kam  Jum  Sab\n`;
    
    // Add empty spaces for first week
    let line = '';
    for (let i = 0; i < startDay; i++) {
        line += '     ';
    }
    
    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isHoliday = NATIONAL_HOLIDAYS[dateKey];
        const isToday = now.getDate() === day && now.getMonth() === month - 1 && now.getFullYear() === year;
        
        let dayStr = String(day).padStart(2, ' ');
        if (isToday) {
            dayStr = `[${dayStr}]`;
        } else if (isHoliday) {
            dayStr = `*${dayStr}*`;
        } else {
            dayStr = ` ${dayStr} `;
        }
        
        line += dayStr + ' ';
        
        if ((startDay + day) % 7 === 0) {
            calendar += line + '\n';
            line = '';
        }
    }
    
    if (line) {
        calendar += line + '\n';
    }
    
    // Add legend
    calendar += `━━━━━━━━━━━━━━━━━━━━━\n`;
    calendar += `[xx] = Hari ini | *xx* = Libur`;
    
    return calendar;
};

/**
 * Detect apakah pesan terkait kalender
 * @param {string} message 
 * @returns {Object|null}
 */
const detectCalendarIntent = (message) => {
    const msg = message.toLowerCase();
    
    // Intent: Hari ini / Tanggal sekarang
    if (/(hari ini|tanggal (ber)?apa|sekarang tanggal|tgl hari ini)/i.test(msg)) {
        return { intent: 'today' };
    }
    
    // Intent: Cek libur
    if (/(libur|holiday|tanggal merah|hari besar|cuti)/i.test(msg)) {
        return { intent: 'holidays' };
    }
    
    // Intent: Kalender bulan
    if (/(kalender|calendar|bulan ini|lihat bulan)/i.test(msg)) {
        // Check if specific month mentioned
        const monthMatch = msg.match(/(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i);
        if (monthMatch) {
            const monthNames = {
                'januari': 1, 'februari': 2, 'maret': 3, 'april': 4, 'mei': 5, 'juni': 6,
                'juli': 7, 'agustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
            };
            return { intent: 'calendar', month: monthNames[monthMatch[1].toLowerCase()] };
        }
        return { intent: 'calendar' };
    }
    
    // Intent: Zodiak
    if (/(zodiak|zodiac|bintang|horoscope)/i.test(msg)) {
        return { intent: 'zodiac' };
    }
    
    // Intent: Ultah / Tanggal lahir
    if (/(ultah|ulang tahun|birthday|lahir|umur)/i.test(msg)) {
        return { intent: 'birthday' };
    }
    
    // Intent: Countdown
    if (/(countdown|berapa hari (lagi|ke)|hitung mundur)/i.test(msg)) {
        return { intent: 'countdown' };
    }
    
    return null;
};

/**
 * Format calendar response dengan gaya Tama
 * @param {string} intent 
 * @param {Object} data 
 * @returns {string}
 */
const formatCalendarResponse = (intent, data = {}) => {
    switch (intent) {
        case 'today': {
            const today = getTodayInfo();
            let response = `📅 ${today.date}\n`;
            response += `🕐 Jam ${today.time} WIB\n\n`;
            
            if (today.isHoliday) {
                response += `🎉 HARI LIBUR: ${today.holidayName}!\n`;
            } else if (today.isWeekend) {
                response += `🛋️ Weekend nih, santai dulu lah\n`;
            } else {
                response += `📝 Hari kerja biasa\n`;
            }
            
            response += `\nMinggu ke-${today.weekNumber} dalam tahun ${today.year}`;
            return response;
        }
        
        case 'holidays': {
            const holidays = getUpcomingHolidays(5);
            let response = `📅 Libur Nasional Terdekat:\n\n`;
            
            for (const h of holidays) {
                const emoji = h.daysUntil === 0 ? '🎉' : (h.daysUntil <= 7 ? '⏰' : '📌');
                response += `${emoji} ${h.name}\n`;
                response += `   ${h.date}\n`;
                response += `   ${h.daysUntil === 0 ? 'HARI INI!' : `${h.daysUntil} hari lagi`}\n\n`;
            }
            
            return response;
        }
        
        case 'calendar': {
            return getMonthCalendar(data.month);
        }
        
        case 'zodiac': {
            if (data.month && data.day) {
                const zodiac = getZodiac(data.month, data.day);
                if (zodiac) {
                    return `${zodiac.symbol} Zodiak kamu: ${zodiac.name}\n\nElemen: ${zodiac.element}`;
                }
            }
            return `kasih tau tanggal lahir kamu dong buat cek zodiak\nformat: "zodiak 1 januari" atau "zodiak 1/1"`;
        }
        
        case 'birthday': {
            if (data.year && data.month && data.day) {
                const age = calculateAge(data.year, data.month, data.day);
                const zodiac = getZodiac(data.month, data.day);
                
                let response = `🎂 Info Ulang Tahun:\n\n`;
                response += `📅 Umur: ${age.age} tahun\n`;
                response += `🎁 Ultah berikutnya: ${age.nextBirthday}\n`;
                response += `⏳ ${age.daysUntilBirthday} hari lagi\n`;
                
                if (zodiac) {
                    response += `\n${zodiac.symbol} Zodiak: ${zodiac.name}`;
                }
                
                return response;
            }
            return `kasih tau tanggal lahir lengkap dong\nformat: "ultah 1 januari 2000" atau "ultah 1/1/2000"`;
        }
        
        default:
            return null;
    }
};

module.exports = {
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
};
