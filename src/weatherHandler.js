/**
 * Weather Handler Module - BMKG Weather & Earthquake API
 * 
 * Fitur:
 * - Real-time weather dari BMKG (Badan Meteorologi Klimatologi dan Geofisika)
 * - Data gempa terkini
 * - Forecast cuaca 3-7 hari
 * - Support untuk semua kota di Indonesia
 * 
 * API Source: https://api.bmkg.go.id/publik/prakiraan-cuaca
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

const axios = require('axios');

// BMKG API Endpoints
const BMKG_WEATHER_API = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
const BMKG_EARTHQUAKE_API = 'https://data.bmkg.go.id/DataMKG/TEWS';

// Common Indonesian cities with their ADM4 codes
// Format: adm4 = provinsi.kota/kab.kecamatan.kelurahan
const CITY_CODES = {
    // DKI Jakarta
    'jakarta': '31.74.04.1001',
    'jakarta pusat': '31.71.01.1001',
    'jakarta utara': '31.72.01.1001',
    'jakarta barat': '31.73.01.1001',
    'jakarta selatan': '31.74.01.1001',
    'jakarta timur': '31.75.01.1001',
    
    // Jawa Barat
    'bandung': '32.73.01.1001',
    'bekasi': '32.75.01.1001',
    'bogor': '32.71.01.1001',
    'depok': '32.76.01.1001',
    'cirebon': '32.74.01.1001',
    'tasikmalaya': '32.78.01.1001',
    'sukabumi': '32.72.01.1001',
    
    // Jawa Tengah
    'semarang': '33.74.01.1001',
    'solo': '33.72.01.1001',
    'surakarta': '33.72.01.1001',
    'magelang': '33.71.01.1001',
    'pekalongan': '33.75.01.1001',
    'tegal': '33.76.01.1001',
    
    // Jawa Timur
    'surabaya': '35.78.01.1001',
    'malang': '35.73.01.1001',
    'kediri': '35.71.01.1001',
    'blitar': '35.72.01.1001',
    'madiun': '35.77.01.1001',
    'mojokerto': '35.76.01.1001',
    'pasuruan': '35.75.01.1001',
    
    // Banten
    'tangerang': '36.71.01.1001',
    'tangerang selatan': '36.74.01.1001',
    'serang': '36.73.01.1001',
    'cilegon': '36.72.01.1001',
    
    // Yogyakarta
    'yogyakarta': '34.71.01.1001',
    'jogja': '34.71.01.1001',
    'jogjakarta': '34.71.01.1001',
    'sleman': '34.04.01.1001',
    'bantul': '34.02.01.1001',
    
    // Bali
    'denpasar': '51.71.01.1001',
    'bali': '51.71.01.1001',
    'badung': '51.03.01.1001',
    'gianyar': '51.04.01.1001',
    'ubud': '51.04.01.1001',
    
    // Sumatera Utara
    'medan': '12.71.01.1001',
    'pematang siantar': '12.72.01.1001',
    'binjai': '12.75.01.1001',
    
    // Sumatera Barat
    'padang': '13.71.01.1001',
    'bukittinggi': '13.73.01.1001',
    
    // Sumatera Selatan
    'palembang': '16.71.01.1001',
    'lubuklinggau': '16.74.01.1001',
    
    // Riau
    'pekanbaru': '14.71.01.1001',
    'dumai': '14.72.01.1001',
    
    // Lampung
    'bandar lampung': '18.71.01.1001',
    'lampung': '18.71.01.1001',
    
    // Kalimantan
    'balikpapan': '64.71.01.1001',
    'samarinda': '64.72.01.1001',
    'pontianak': '61.71.01.1001',
    'banjarmasin': '63.71.01.1001',
    'palangkaraya': '62.71.01.1001',
    
    // Sulawesi
    'makassar': '73.71.01.1001',
    'manado': '71.71.01.1001',
    'palu': '72.71.01.1001',
    'kendari': '74.71.01.1001',
    
    // Papua
    'jayapura': '94.71.01.1001',
    'sorong': '92.71.01.1001',
    
    // Lainnya
    'ambon': '81.71.01.1001',
    'kupang': '53.71.01.1001',
    'mataram': '52.71.01.1001',
    'lombok': '52.71.01.1001',
    'batam': '21.71.01.1001'
};

// City name aliases
const CITY_ALIASES = {
    'jkt': 'jakarta',
    'bdg': 'bandung', 
    'sby': 'surabaya',
    'smg': 'semarang',
    'mdn': 'medan',
    'mlg': 'malang',
    'dps': 'denpasar',
    'jogja': 'yogyakarta',
    'jogjakarta': 'yogyakarta',
    'tangsel': 'tangerang selatan',
    'jaksel': 'jakarta selatan',
    'jakut': 'jakarta utara',
    'jakbar': 'jakarta barat',
    'jaktim': 'jakarta timur',
    'jakpus': 'jakarta pusat'
};

/**
 * Normalize city name (handle aliases and variations)
 */
const normalizeCity = (city) => {
    const lower = city.toLowerCase().trim();
    return CITY_ALIASES[lower] || lower;
};

/**
 * Get ADM4 code for a city
 */
const getCityCode = (city) => {
    const normalized = normalizeCity(city);
    return CITY_CODES[normalized] || null;
};

/**
 * Get all available cities
 */
const getAvailableCities = () => {
    return Object.keys(CITY_CODES);
};

/**
 * Fetch weather data from BMKG API
 * 
 * @param {string} cityOrCode - City name or ADM4 code
 * @returns {Promise<Object>} Weather data
 */
const getWeather = async (cityOrCode) => {
    try {
        // Determine if it's a code or city name
        let adm4Code = cityOrCode;
        let cityName = cityOrCode;
        
        if (!cityOrCode.includes('.')) {
            // It's a city name, look up the code
            adm4Code = getCityCode(cityOrCode);
            if (!adm4Code) {
                return {
                    success: false,
                    error: 'CITY_NOT_FOUND',
                    message: `Kota "${cityOrCode}" tidak ditemukan. Coba: ${getAvailableCities().slice(0, 10).join(', ')}...`
                };
            }
        }

        console.log(`[Weather] Fetching weather for code: ${adm4Code}`);

        const response = await axios.get(BMKG_WEATHER_API, {
            params: { adm4: adm4Code },
            timeout: 15000,
            headers: {
                'User-Agent': 'TamaWhatsAppBot/2.0'
            }
        });

        const data = response.data;
        
        if (!data || !data.data || !data.data[0]) {
            return {
                success: false,
                error: 'NO_DATA',
                message: 'Tidak ada data cuaca untuk lokasi ini'
            };
        }

        const location = data.lokasi || data.data[0].lokasi;
        const weatherData = data.data[0].cuaca;
        
        // Flatten weather array (BMKG returns nested arrays by day)
        const allForecasts = weatherData.flat();
        
        // Get current/nearest forecast
        const now = new Date();
        let currentForecast = allForecasts[0];
        
        for (const forecast of allForecasts) {
            const forecastTime = new Date(forecast.local_datetime || forecast.datetime);
            if (forecastTime <= now) {
                currentForecast = forecast;
            } else {
                break;
            }
        }

        return {
            success: true,
            location: {
                province: location.provinsi,
                city: location.kotkab,
                district: location.kecamatan,
                village: location.desa,
                lat: location.lat,
                lon: location.lon,
                timezone: location.timezone
            },
            current: {
                datetime: currentForecast.local_datetime,
                temperature: currentForecast.t,
                humidity: currentForecast.hu,
                weather: currentForecast.weather_desc,
                weatherEn: currentForecast.weather_desc_en,
                weatherCode: currentForecast.weather,
                windSpeed: currentForecast.ws,
                windDirection: currentForecast.wd,
                visibility: currentForecast.vs_text,
                cloudCover: currentForecast.tcc,
                icon: currentForecast.image
            },
            forecasts: allForecasts.slice(0, 12).map(f => ({
                datetime: f.local_datetime,
                temperature: f.t,
                humidity: f.hu,
                weather: f.weather_desc,
                weatherEn: f.weather_desc_en,
                icon: f.image
            })),
            raw: data
        };

    } catch (error) {
        console.error('[Weather] Error fetching weather:', error.message);
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return {
                success: false,
                error: 'NETWORK_ERROR',
                message: 'Tidak bisa terhubung ke server BMKG'
            };
        }
        
        return {
            success: false,
            error: 'API_ERROR',
            message: `Error: ${error.message}`
        };
    }
};

/**
 * Get latest earthquake data from BMKG
 */
const getLatestEarthquake = async () => {
    try {
        const response = await axios.get(`${BMKG_EARTHQUAKE_API}/autogempa.json`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'TamaWhatsAppBot/2.0'
            }
        });

        const gempa = response.data?.Infogempa?.gempa;
        
        if (!gempa) {
            return {
                success: false,
                error: 'NO_DATA',
                message: 'Tidak ada data gempa terbaru'
            };
        }

        return {
            success: true,
            earthquake: {
                date: gempa.Tanggal,
                time: gempa.Jam,
                datetime: gempa.DateTime,
                magnitude: gempa.Magnitude,
                depth: gempa.Kedalaman,
                location: gempa.Wilayah,
                coordinates: gempa.Coordinates,
                latitude: gempa.Lintang,
                longitude: gempa.Bujur,
                potential: gempa.Potensi,
                felt: gempa.Dirasakan,
                shakemap: gempa.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}.jpg` : null
            }
        };

    } catch (error) {
        console.error('[Weather] Error fetching earthquake:', error.message);
        return {
            success: false,
            error: 'API_ERROR',
            message: `Error: ${error.message}`
        };
    }
};

/**
 * Get list of recent earthquakes (felt)
 */
const getRecentEarthquakes = async () => {
    try {
        const response = await axios.get(`${BMKG_EARTHQUAKE_API}/gempadirasakan.json`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'TamaWhatsAppBot/2.0'
            }
        });

        const gempaList = response.data?.Infogempa?.gempa;
        
        if (!gempaList || gempaList.length === 0) {
            return {
                success: false,
                error: 'NO_DATA',
                message: 'Tidak ada data gempa dirasakan'
            };
        }

        return {
            success: true,
            earthquakes: gempaList.slice(0, 5).map(g => ({
                date: g.Tanggal,
                time: g.Jam,
                magnitude: g.Magnitude,
                depth: g.Kedalaman,
                location: g.Wilayah,
                felt: g.Dirasakan
            }))
        };

    } catch (error) {
        console.error('[Weather] Error fetching earthquakes:', error.message);
        return {
            success: false,
            error: 'API_ERROR',
            message: `Error: ${error.message}`
        };
    }
};

/**
 * Format weather data for WhatsApp message
 */
const formatWeatherMessage = (weatherData) => {
    if (!weatherData.success) {
        return `❌ ${weatherData.message}`;
    }

    const { location, current, forecasts } = weatherData;
    const weatherEmoji = getWeatherEmoji(current.weatherCode);
    
    let message = `${weatherEmoji} *Prakiraan Cuaca BMKG*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `📍 *Lokasi:* ${location.district}, ${location.city}\n`;
    message += `🏛️ *Provinsi:* ${location.province}\n\n`;
    
    message += `*🌡️ Cuaca Saat Ini:*\n`;
    message += `• Kondisi: ${current.weather}\n`;
    message += `• Suhu: ${current.temperature}°C\n`;
    message += `• Kelembaban: ${current.humidity}%\n`;
    message += `• Angin: ${current.windSpeed} km/jam (${current.windDirection})\n`;
    message += `• Jarak Pandang: ${current.visibility}\n`;
    message += `• Tutupan Awan: ${current.cloudCover}%\n\n`;
    
    message += `*📅 Prakiraan Beberapa Jam:*\n`;
    
    // Show next 4 forecasts
    for (let i = 1; i < Math.min(5, forecasts.length); i++) {
        const f = forecasts[i];
        const time = formatTime(f.datetime);
        const emoji = getWeatherEmoji(getWeatherCodeFromDesc(f.weather));
        message += `${emoji} ${time}: ${f.weather} (${f.temperature}°C)\n`;
    }
    
    message += `\n⏰ Update: ${formatTime(current.datetime)}`;
    message += `\n📡 Sumber: BMKG Indonesia`;
    
    return message;
};

/**
 * Format earthquake data for WhatsApp message
 */
const formatEarthquakeMessage = (quakeData) => {
    if (!quakeData.success) {
        return `❌ ${quakeData.message}`;
    }

    const eq = quakeData.earthquake;
    
    let message = `🔴 *Info Gempa Terkini BMKG*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `📅 *Tanggal:* ${eq.date}\n`;
    message += `⏰ *Waktu:* ${eq.time}\n`;
    message += `📍 *Lokasi:* ${eq.location}\n`;
    message += `📊 *Magnitudo:* ${eq.magnitude} SR\n`;
    message += `🔽 *Kedalaman:* ${eq.depth}\n`;
    message += `🌊 *Potensi:* ${eq.potential}\n`;
    
    if (eq.felt && eq.felt !== '-') {
        message += `👥 *Dirasakan:* ${eq.felt}\n`;
    }
    
    message += `\n📡 Sumber: BMKG Indonesia`;
    
    return message;
};

/**
 * Get weather emoji based on weather code
 */
const getWeatherEmoji = (code) => {
    const emojiMap = {
        0: '☀️',   // Cerah
        1: '🌤️',   // Cerah Berawan
        2: '⛅',   // Berawan Sebagian  
        3: '☁️',   // Berawan
        4: '🌥️',   // Berawan Tebal
        5: '🌫️',   // Udara Kabur
        10: '🌫️',  // Asap
        45: '🌫️',  // Kabut
        60: '🌧️',  // Hujan Ringan
        61: '🌧️',  // Hujan Ringan
        63: '🌧️',  // Hujan Sedang
        65: '🌧️',  // Hujan Lebat
        80: '🌦️',  // Hujan Lokal
        95: '⛈️',  // Hujan Petir
        97: '⛈️'   // Hujan Petir
    };
    return emojiMap[code] || '🌡️';
};

/**
 * Get weather code from description
 */
const getWeatherCodeFromDesc = (desc) => {
    const lower = desc.toLowerCase();
    if (lower.includes('cerah') && !lower.includes('berawan')) return 0;
    if (lower.includes('cerah berawan')) return 1;
    if (lower.includes('berawan sebagian')) return 2;
    if (lower.includes('berawan')) return 3;
    if (lower.includes('hujan ringan')) return 61;
    if (lower.includes('hujan sedang')) return 63;
    if (lower.includes('hujan lebat')) return 65;
    if (lower.includes('hujan petir') || lower.includes('petir')) return 95;
    if (lower.includes('kabut') || lower.includes('kabur')) return 45;
    return 3;
};

/**
 * Format datetime string to readable time
 */
const formatTime = (datetime) => {
    try {
        const date = new Date(datetime);
        return date.toLocaleString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch {
        return datetime;
    }
};

/**
 * Detect weather-related queries in message
 * 
 * @param {string} message - User message
 * @returns {Object|null} - { type: 'weather'|'earthquake', city?: string }
 */
const detectWeatherQuery = (message) => {
    const lower = message.toLowerCase();
    
    // Earthquake patterns
    const earthquakePatterns = [
        /(?:info|kabar|data|berita|update)\s*gempa/i,
        /gempa\s*(?:terbaru|terkini|hari\s*ini|terakhir)/i,
        /ada\s*gempa/i,
        /gempa\s*(?:dimana|di\s*mana)/i,
        /^gempa$/i
    ];
    
    for (const pattern of earthquakePatterns) {
        if (pattern.test(lower)) {
            return { type: 'earthquake' };
        }
    }
    
    // Weather patterns
    const weatherPatterns = [
        /(?:cuaca|weather)\s+(?:di\s+)?(.+?)(?:\s+(?:hari\s*ini|sekarang|besok|gimana|bagaimana))?\s*[\?\!]?$/i,
        /(?:gimana|bagaimana|gmn)\s+cuaca\s+(?:di\s+)?(.+)/i,
        /prakiraan\s+(?:cuaca\s+)?(?:di\s+)?(.+)/i,
        /(?:hujan|panas|mendung)\s+(?:ga|gak|tidak)?\s*(?:di\s+)?(.+)/i,
        /(?:mau|bakal)\s+(?:hujan|cerah)\s+(?:ga|gak)?\s*(?:di\s+)?(.+)/i
    ];
    
    for (const pattern of weatherPatterns) {
        const match = lower.match(pattern);
        if (match && match[1]) {
            const city = match[1].replace(/[\?\!\.]+$/, '').trim();
            if (city.length > 1) {
                return { type: 'weather', city };
            }
        }
    }
    
    // Simple weather keyword check
    if (/(?:cuaca|weather|prakiraan)\s*$/i.test(lower)) {
        return { type: 'weather', city: null };
    }
    
    // Check for city name followed by weather word
    const cityWeatherPattern = /^(.+?)\s+(?:cuaca|weather|hujan|cerah|mendung|panas)/i;
    const cityMatch = lower.match(cityWeatherPattern);
    if (cityMatch && cityMatch[1]) {
        const potentialCity = cityMatch[1].trim();
        if (getCityCode(potentialCity)) {
            return { type: 'weather', city: potentialCity };
        }
    }
    
    return null;
};

/**
 * Process weather/earthquake request and return formatted response
 */
const processWeatherRequest = async (query) => {
    if (query.type === 'earthquake') {
        const data = await getLatestEarthquake();
        return formatEarthquakeMessage(data);
    }
    
    if (query.type === 'weather') {
        const city = query.city || 'jakarta';
        const data = await getWeather(city);
        return formatWeatherMessage(data);
    }
    
    return null;
};

module.exports = {
    getWeather,
    getLatestEarthquake,
    getRecentEarthquakes,
    formatWeatherMessage,
    formatEarthquakeMessage,
    detectWeatherQuery,
    processWeatherRequest,
    getCityCode,
    getAvailableCities,
    normalizeCity,
    // Expose for testing
    CITY_CODES,
    getWeatherEmoji,
    formatTime
};
