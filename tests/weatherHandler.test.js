/**
 * Weather Handler Tests
 * Test BMKG weather & earthquake API integration
 * 
 * @author Tama El Pablo
 */

// Mock axios before importing module
jest.mock('axios');
const axios = require('axios');

const {
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
    CITY_CODES,
    getWeatherEmoji,
    formatTime
} = require('../src/weatherHandler');

describe('WeatherHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('City Code Utilities', () => {
        test('should get city code for Jakarta', () => {
            expect(getCityCode('jakarta')).toBe('31.74.04.1001');
        });

        test('should get city code for Surabaya', () => {
            expect(getCityCode('surabaya')).toBe('35.78.01.1001');
        });

        test('should get city code for Bandung', () => {
            expect(getCityCode('bandung')).toBe('32.73.01.1001');
        });

        test('should handle city aliases', () => {
            expect(getCityCode('jkt')).toBe('31.74.04.1001');
            expect(getCityCode('bdg')).toBe('32.73.01.1001');
            expect(getCityCode('sby')).toBe('35.78.01.1001');
            expect(getCityCode('jogja')).toBe('34.71.01.1001');
        });

        test('should handle case insensitivity', () => {
            expect(getCityCode('JAKARTA')).toBe('31.74.04.1001');
            expect(getCityCode('JaKaRtA')).toBe('31.74.04.1001');
        });

        test('should return null for unknown city', () => {
            expect(getCityCode('random city')).toBeNull();
            expect(getCityCode('narnia')).toBeNull();
        });

        test('should normalize city aliases', () => {
            expect(normalizeCity('jkt')).toBe('jakarta');
            expect(normalizeCity('tangsel')).toBe('tangerang selatan');
            expect(normalizeCity('jaksel')).toBe('jakarta selatan');
        });

        test('should return list of available cities', () => {
            const cities = getAvailableCities();
            expect(cities).toContain('jakarta');
            expect(cities).toContain('surabaya');
            expect(cities).toContain('bandung');
            expect(cities.length).toBeGreaterThan(30);
        });
    });

    describe('getWeather', () => {
        const mockWeatherResponse = {
            data: {
                lokasi: {
                    provinsi: 'DKI Jakarta',
                    kotkab: 'Kota Adm. Jakarta Selatan',
                    kecamatan: 'Pasar Minggu',
                    desa: 'Pasar Minggu',
                    lat: -6.2899,
                    lon: 106.8393,
                    timezone: 'Asia/Jakarta'
                },
                data: [{
                    lokasi: {
                        provinsi: 'DKI Jakarta',
                        kotkab: 'Kota Adm. Jakarta Selatan',
                        kecamatan: 'Pasar Minggu',
                        desa: 'Pasar Minggu',
                        lat: -6.2899,
                        lon: 106.8393,
                        timezone: '+0700'
                    },
                    cuaca: [[
                        {
                            local_datetime: '2024-01-15 09:00:00',
                            t: 28,
                            hu: 80,
                            weather: 3,
                            weather_desc: 'Berawan',
                            weather_desc_en: 'Mostly Cloudy',
                            ws: 5.5,
                            wd: 'SW',
                            vs_text: '> 10 km',
                            tcc: 75,
                            image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/berawan.svg'
                        },
                        {
                            local_datetime: '2024-01-15 12:00:00',
                            t: 31,
                            hu: 70,
                            weather: 61,
                            weather_desc: 'Hujan Ringan',
                            weather_desc_en: 'Light Rain',
                            ws: 8.0,
                            wd: 'W',
                            vs_text: '> 10 km',
                            tcc: 90,
                            image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/hujan-ringan.svg'
                        }
                    ]]
                }]
            }
        };

        test('should fetch weather by city name', async () => {
            axios.get.mockResolvedValueOnce(mockWeatherResponse);

            const result = await getWeather('jakarta');

            expect(result.success).toBe(true);
            expect(result.location.province).toBe('DKI Jakarta');
            expect(result.current.temperature).toBeDefined();
            expect(result.current.weather).toBeDefined();
            expect(axios.get).toHaveBeenCalledWith(
                'https://api.bmkg.go.id/publik/prakiraan-cuaca',
                expect.objectContaining({
                    params: { adm4: '31.74.04.1001' }
                })
            );
        });

        test('should fetch weather by ADM4 code directly', async () => {
            axios.get.mockResolvedValueOnce(mockWeatherResponse);

            const result = await getWeather('31.74.04.1001');

            expect(result.success).toBe(true);
            expect(axios.get).toHaveBeenCalledWith(
                'https://api.bmkg.go.id/publik/prakiraan-cuaca',
                expect.objectContaining({
                    params: { adm4: '31.74.04.1001' }
                })
            );
        });

        test('should return error for unknown city', async () => {
            const result = await getWeather('narnia');

            expect(result.success).toBe(false);
            expect(result.error).toBe('CITY_NOT_FOUND');
            expect(result.message).toContain('tidak ditemukan');
        });

        test('should handle API errors', async () => {
            axios.get.mockRejectedValueOnce(new Error('Network error'));

            const result = await getWeather('jakarta');

            expect(result.success).toBe(false);
            expect(result.error).toBe('API_ERROR');
        });

        test('should handle network connection errors', async () => {
            const connError = new Error('Connection refused');
            connError.code = 'ECONNREFUSED';
            axios.get.mockRejectedValueOnce(connError);

            const result = await getWeather('jakarta');

            expect(result.success).toBe(false);
            expect(result.error).toBe('NETWORK_ERROR');
            expect(result.message.toLowerCase()).toContain('tidak bisa terhubung');
        });

        test('should handle empty API response', async () => {
            axios.get.mockResolvedValueOnce({ data: {} });

            const result = await getWeather('jakarta');

            expect(result.success).toBe(false);
            expect(result.error).toBe('NO_DATA');
        });
    });

    describe('getLatestEarthquake', () => {
        const mockEarthquakeResponse = {
            data: {
                Infogempa: {
                    gempa: {
                        Tanggal: '03 Feb 2024',
                        Jam: '09:50:45 WIB',
                        DateTime: '2024-02-03T02:50:45+00:00',
                        Coordinates: '-6.63,130.00',
                        Lintang: '6.63 LS',
                        Bujur: '130.00 BT',
                        Magnitude: '5.6',
                        Kedalaman: '199 km',
                        Wilayah: '207 km BaratLaut TANIMBAR',
                        Potensi: 'Tidak berpotensi tsunami',
                        Dirasakan: '-',
                        Shakemap: '20240203095334.mmi'
                    }
                }
            }
        };

        test('should fetch latest earthquake data', async () => {
            axios.get.mockResolvedValueOnce(mockEarthquakeResponse);

            const result = await getLatestEarthquake();

            expect(result.success).toBe(true);
            expect(result.earthquake.magnitude).toBe('5.6');
            expect(result.earthquake.location).toBe('207 km BaratLaut TANIMBAR');
            expect(result.earthquake.potential).toBe('Tidak berpotensi tsunami');
        });

        test('should handle API errors', async () => {
            axios.get.mockRejectedValueOnce(new Error('API error'));

            const result = await getLatestEarthquake();

            expect(result.success).toBe(false);
            expect(result.error).toBe('API_ERROR');
        });

        test('should handle empty earthquake data', async () => {
            axios.get.mockResolvedValueOnce({ data: { Infogempa: {} } });

            const result = await getLatestEarthquake();

            expect(result.success).toBe(false);
            expect(result.error).toBe('NO_DATA');
        });
    });

    describe('getRecentEarthquakes', () => {
        const mockEarthquakesResponse = {
            data: {
                Infogempa: {
                    gempa: [
                        {
                            Tanggal: '03 Feb 2024',
                            Jam: '10:00:00 WIB',
                            Magnitude: '4.5',
                            Kedalaman: '100 km',
                            Wilayah: 'Jawa Barat',
                            Dirasakan: 'II-III MMI'
                        },
                        {
                            Tanggal: '03 Feb 2024',
                            Jam: '08:30:00 WIB',
                            Magnitude: '3.8',
                            Kedalaman: '50 km',
                            Wilayah: 'Banten',
                            Dirasakan: 'II MMI'
                        }
                    ]
                }
            }
        };

        test('should fetch recent earthquakes', async () => {
            axios.get.mockResolvedValueOnce(mockEarthquakesResponse);

            const result = await getRecentEarthquakes();

            expect(result.success).toBe(true);
            expect(result.earthquakes.length).toBe(2);
            expect(result.earthquakes[0].magnitude).toBe('4.5');
        });

        test('should limit to 5 earthquakes', async () => {
            const manyEarthquakes = {
                data: {
                    Infogempa: {
                        gempa: Array(10).fill({
                            Tanggal: '03 Feb 2024',
                            Jam: '10:00:00 WIB',
                            Magnitude: '4.0',
                            Kedalaman: '100 km',
                            Wilayah: 'Test',
                            Dirasakan: 'II MMI'
                        })
                    }
                }
            };
            axios.get.mockResolvedValueOnce(manyEarthquakes);

            const result = await getRecentEarthquakes();

            expect(result.success).toBe(true);
            expect(result.earthquakes.length).toBe(5);
        });
    });

    describe('formatWeatherMessage', () => {
        test('should format successful weather data', () => {
            const weatherData = {
                success: true,
                location: {
                    province: 'DKI Jakarta',
                    city: 'Jakarta Selatan',
                    district: 'Pasar Minggu',
                    village: 'Pasar Minggu'
                },
                current: {
                    datetime: '2024-01-15 09:00:00',
                    temperature: 28,
                    humidity: 80,
                    weather: 'Berawan',
                    weatherCode: 3,
                    windSpeed: 5.5,
                    windDirection: 'SW',
                    visibility: '> 10 km',
                    cloudCover: 75
                },
                forecasts: [
                    { datetime: '2024-01-15 09:00:00', temperature: 28, weather: 'Berawan' },
                    { datetime: '2024-01-15 12:00:00', temperature: 31, weather: 'Hujan Ringan' },
                    { datetime: '2024-01-15 15:00:00', temperature: 29, weather: 'Cerah' }
                ]
            };

            const message = formatWeatherMessage(weatherData);

            expect(message).toContain('Prakiraan Cuaca BMKG');
            expect(message).toContain('Pasar Minggu');
            expect(message).toContain('Jakarta Selatan');
            expect(message).toContain('28°C');
            expect(message).toContain('Berawan');
            expect(message).toContain('BMKG Indonesia');
        });

        test('should format error message', () => {
            const errorData = {
                success: false,
                message: 'Kota tidak ditemukan'
            };

            const message = formatWeatherMessage(errorData);

            expect(message).toContain('❌');
            expect(message).toContain('Kota tidak ditemukan');
        });
    });

    describe('formatEarthquakeMessage', () => {
        test('should format earthquake data', () => {
            const quakeData = {
                success: true,
                earthquake: {
                    date: '03 Feb 2024',
                    time: '09:50:45 WIB',
                    location: '207 km BaratLaut TANIMBAR',
                    magnitude: '5.6',
                    depth: '199 km',
                    potential: 'Tidak berpotensi tsunami',
                    felt: 'II-III MMI'
                }
            };

            const message = formatEarthquakeMessage(quakeData);

            expect(message).toContain('Info Gempa Terkini BMKG');
            expect(message).toContain('5.6 SR');
            expect(message).toContain('199 km');
            expect(message).toContain('TANIMBAR');
            expect(message).toContain('tsunami');
        });

        test('should handle felt data', () => {
            const quakeData = {
                success: true,
                earthquake: {
                    date: '03 Feb 2024',
                    time: '09:50:45 WIB',
                    location: 'Jawa Barat',
                    magnitude: '4.5',
                    depth: '100 km',
                    potential: 'Tidak berpotensi tsunami',
                    felt: 'II-III MMI di Bandung'
                }
            };

            const message = formatEarthquakeMessage(quakeData);

            expect(message).toContain('Dirasakan');
            expect(message).toContain('II-III MMI di Bandung');
        });
    });

    describe('detectWeatherQuery', () => {
        describe('Weather queries', () => {
            test('should detect "cuaca jakarta"', () => {
                const result = detectWeatherQuery('cuaca jakarta');
                expect(result).toEqual({ type: 'weather', city: 'jakarta' });
            });

            test('should detect "cuaca di bandung"', () => {
                const result = detectWeatherQuery('cuaca di bandung');
                expect(result).toEqual({ type: 'weather', city: 'bandung' });
            });

            test('should detect "gimana cuaca di surabaya"', () => {
                const result = detectWeatherQuery('gimana cuaca di surabaya');
                expect(result).toEqual({ type: 'weather', city: 'surabaya' });
            });

            test('should detect "prakiraan cuaca medan"', () => {
                const result = detectWeatherQuery('prakiraan cuaca medan');
                expect(result).toEqual({ type: 'weather', city: 'medan' });
            });

            test('should detect "hujan ga di jogja"', () => {
                const result = detectWeatherQuery('hujan ga di jogja');
                expect(result).toEqual({ type: 'weather', city: 'jogja' });
            });

            test('should detect "weather" alone', () => {
                const result = detectWeatherQuery('weather');
                expect(result).toEqual({ type: 'weather', city: null });
            });

            test('should detect "cuaca" alone', () => {
                const result = detectWeatherQuery('cuaca');
                expect(result).toEqual({ type: 'weather', city: null });
            });
        });

        describe('Earthquake queries', () => {
            test('should detect "info gempa"', () => {
                const result = detectWeatherQuery('info gempa');
                expect(result).toEqual({ type: 'earthquake' });
            });

            test('should detect "gempa terbaru"', () => {
                const result = detectWeatherQuery('gempa terbaru');
                expect(result).toEqual({ type: 'earthquake' });
            });

            test('should detect "ada gempa"', () => {
                const result = detectWeatherQuery('ada gempa');
                expect(result).toEqual({ type: 'earthquake' });
            });

            test('should detect "gempa hari ini"', () => {
                const result = detectWeatherQuery('gempa hari ini');
                expect(result).toEqual({ type: 'earthquake' });
            });

            test('should detect "gempa" alone', () => {
                const result = detectWeatherQuery('gempa');
                expect(result).toEqual({ type: 'earthquake' });
            });
        });

        describe('Non-weather queries', () => {
            test('should not detect regular messages', () => {
                expect(detectWeatherQuery('halo')).toBeNull();
                expect(detectWeatherQuery('apa kabar')).toBeNull();
                expect(detectWeatherQuery('gimana caranya')).toBeNull();
            });

            test('should not detect unrelated questions', () => {
                expect(detectWeatherQuery('berapa harga rumah di jakarta')).toBeNull();
                expect(detectWeatherQuery('restoran enak di bandung')).toBeNull();
            });
        });
    });

    describe('processWeatherRequest', () => {
        const mockWeatherResponse = {
            data: {
                lokasi: {
                    provinsi: 'DKI Jakarta',
                    kotkab: 'Jakarta',
                    kecamatan: 'Pasar Minggu',
                    desa: 'Pasar Minggu',
                    lat: -6.28,
                    lon: 106.83,
                    timezone: 'Asia/Jakarta'
                },
                data: [{
                    lokasi: { provinsi: 'DKI Jakarta', kotkab: 'Jakarta', kecamatan: 'PM', desa: 'PM' },
                    cuaca: [[{
                        local_datetime: '2024-01-15 09:00',
                        t: 28, hu: 80, weather: 3, weather_desc: 'Berawan',
                        weather_desc_en: 'Cloudy', ws: 5, wd: 'SW', vs_text: '>10km', tcc: 75
                    }]]
                }]
            }
        };

        test('should process weather request', async () => {
            axios.get.mockResolvedValueOnce(mockWeatherResponse);

            const result = await processWeatherRequest({ type: 'weather', city: 'jakarta' });

            expect(result).toContain('Prakiraan Cuaca BMKG');
            expect(result).toContain('Jakarta');
        });

        test('should process earthquake request', async () => {
            axios.get.mockResolvedValueOnce({
                data: {
                    Infogempa: {
                        gempa: {
                            Tanggal: '03 Feb 2024',
                            Jam: '10:00 WIB',
                            Magnitude: '5.0',
                            Kedalaman: '100 km',
                            Wilayah: 'Jawa Barat',
                            Potensi: 'Tidak berpotensi tsunami',
                            Dirasakan: '-'
                        }
                    }
                }
            });

            const result = await processWeatherRequest({ type: 'earthquake' });

            expect(result).toContain('Info Gempa Terkini BMKG');
            expect(result).toContain('5.0 SR');
        });

        test('should default to Jakarta if no city specified', async () => {
            axios.get.mockResolvedValueOnce(mockWeatherResponse);

            const result = await processWeatherRequest({ type: 'weather', city: null });

            expect(axios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: { adm4: '31.74.04.1001' } // Jakarta code
                })
            );
        });
    });

    describe('Helper Functions', () => {
        describe('getWeatherEmoji', () => {
            test('should return sun for clear weather', () => {
                expect(getWeatherEmoji(0)).toBe('☀️');
                expect(getWeatherEmoji(1)).toBe('🌤️');
            });

            test('should return cloud for cloudy weather', () => {
                expect(getWeatherEmoji(3)).toBe('☁️');
            });

            test('should return rain for rainy weather', () => {
                expect(getWeatherEmoji(61)).toBe('🌧️');
                expect(getWeatherEmoji(63)).toBe('🌧️');
            });

            test('should return thunder for stormy weather', () => {
                expect(getWeatherEmoji(95)).toBe('⛈️');
            });

            test('should return default for unknown codes', () => {
                expect(getWeatherEmoji(999)).toBe('🌡️');
            });
        });

        describe('formatTime', () => {
            test('should format datetime string', () => {
                const result = formatTime('2024-01-15 09:00:00');
                expect(result).toBeDefined();
                // Should contain some time/date info
                expect(result.length).toBeGreaterThan(5);
            });

            test('should handle invalid datetime', () => {
                const result = formatTime('invalid');
                // Should return the input when parsing fails
                expect(result).toBeDefined();
            });
        });
    });

    describe('CITY_CODES', () => {
        test('should have major Indonesian cities', () => {
            expect(CITY_CODES.jakarta).toBeDefined();
            expect(CITY_CODES.surabaya).toBeDefined();
            expect(CITY_CODES.bandung).toBeDefined();
            expect(CITY_CODES.medan).toBeDefined();
            expect(CITY_CODES.makassar).toBeDefined();
            expect(CITY_CODES.denpasar).toBeDefined();
        });

        test('should have valid ADM4 format', () => {
            // ADM4 format: XX.XX.XX.XXXX (2.2.2.4 digits separated by dots)
            const adm4Pattern = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;
            
            for (const [city, code] of Object.entries(CITY_CODES)) {
                expect(code).toMatch(adm4Pattern);
            }
        });
    });
});

describe('Integration Tests', () => {
    describe('Weather + Bot Integration', () => {
        test('weather query should be detected before web search', () => {
            // Weather queries should be caught by detectWeatherQuery
            const weatherMessages = [
                'cuaca jakarta',
                'cuaca di bandung',
                'gimana cuaca surabaya',
                'info gempa'
            ];

            for (const msg of weatherMessages) {
                const result = detectWeatherQuery(msg);
                expect(result).not.toBeNull();
            }
        });

        test('non-weather queries should not trigger weather handler', () => {
            const nonWeatherMessages = [
                'halo',
                'apa kabar',
                'cari restoran jakarta',
                'harga rumah bandung'
            ];

            for (const msg of nonWeatherMessages) {
                const result = detectWeatherQuery(msg);
                expect(result).toBeNull();
            }
        });
    });
});
