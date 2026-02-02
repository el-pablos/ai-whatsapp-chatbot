/**
 * Mood Handler Module - Tama Bot v2.0
 * 
 * Fitur untuk membaca mood/emosi seseorang berdasarkan deskripsi cerita mereka.
 * Berguna untuk sesi curhat dan memberikan respons yang empati.
 * 
 * @author Tama (el-pablos)
 * @version 1.0.0
 */

const axios = require('axios');

// Load environment variables
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4.5';

/**
 * Daftar emosi dan mood yang bisa dideteksi
 */
const MOOD_CATEGORIES = {
    positive: {
        happy: { emoji: '😊', label: 'Senang/Bahagia', intensity: ['gembira', 'bahagia', 'senang banget'] },
        excited: { emoji: '🤩', label: 'Excited/Antusias', intensity: ['semangat', 'bersemangat', 'super excited'] },
        peaceful: { emoji: '😌', label: 'Tenang/Damai', intensity: ['lega', 'tenang', 'damai'] },
        grateful: { emoji: '🥹', label: 'Bersyukur', intensity: ['thankful', 'bersyukur', 'berterima kasih'] },
        loved: { emoji: '🥰', label: 'Dicintai/Disayang', intensity: ['merasa dicintai', 'bahagia banget'] },
        confident: { emoji: '😎', label: 'Percaya Diri', intensity: ['pede', 'yakin', 'confident banget'] },
        hopeful: { emoji: '✨', label: 'Penuh Harapan', intensity: ['optimis', 'berharap', 'yakin akan membaik'] }
    },
    negative: {
        sad: { emoji: '😢', label: 'Sedih', intensity: ['sedih dikit', 'sedih', 'sangat sedih'] },
        anxious: { emoji: '😰', label: 'Cemas/Khawatir', intensity: ['gelisah', 'cemas', 'sangat cemas'] },
        angry: { emoji: '😤', label: 'Marah/Kesal', intensity: ['kesal', 'marah', 'marah banget'] },
        frustrated: { emoji: '😩', label: 'Frustasi', intensity: ['frustasi ringan', 'frustasi', 'sangat frustasi'] },
        lonely: { emoji: '😔', label: 'Kesepian', intensity: ['sendiri', 'kesepian', 'sangat kesepian'] },
        stressed: { emoji: '😫', label: 'Stres', intensity: ['tekanan', 'stres', 'sangat stres'] },
        overwhelmed: { emoji: '🥺', label: 'Kewalahan', intensity: ['capek', 'kewalahan', 'burnout'] },
        hurt: { emoji: '💔', label: 'Terluka/Sakit Hati', intensity: ['kecewa', 'sakit hati', 'sangat terluka'] },
        jealous: { emoji: '😒', label: 'Cemburu/Iri', intensity: ['iri dikit', 'cemburu', 'cemburu banget'] },
        guilty: { emoji: '😣', label: 'Merasa Bersalah', intensity: ['menyesal', 'bersalah', 'sangat bersalah'] }
    },
    neutral: {
        confused: { emoji: '😕', label: 'Bingung', intensity: ['agak bingung', 'bingung', 'sangat bingung'] },
        bored: { emoji: '😑', label: 'Bosan', intensity: ['males', 'bosan', 'bosan banget'] },
        indifferent: { emoji: '😐', label: 'Biasa Aja', intensity: ['netral', 'biasa', 'ga ada feeling'] },
        curious: { emoji: '🤔', label: 'Penasaran', intensity: ['penasaran dikit', 'penasaran', 'sangat penasaran'] },
        tired: { emoji: '😴', label: 'Lelah', intensity: ['capek dikit', 'lelah', 'exhausted'] }
    }
};

/**
 * Keywords untuk mendeteksi mood secara cepat
 */
const MOOD_KEYWORDS = {
    happy: ['senang', 'bahagia', 'happy', 'senyum', 'ketawa', 'gembira', 'girang'],
    sad: ['sedih', 'nangis', 'menangis', 'galau', 'patah hati', 'menyedihkan'],
    anxious: ['cemas', 'khawatir', 'takut', 'gelisah', 'worried', 'nervous', 'deg-degan'],
    angry: ['marah', 'kesal', 'bete', 'sebel', 'jengkel', 'geram', 'emosi'],
    stressed: ['stres', 'stress', 'pusing', 'mumet', 'tekanan', 'deadline'],
    lonely: ['sendiri', 'kesepian', 'sendirian', 'ga ada temen', 'sepi'],
    frustrated: ['frustasi', 'gagal', 'capek', 'bosen', 'jenuh', 'males'],
    confused: ['bingung', 'ga ngerti', 'ga paham', 'pusing', 'dilema'],
    excited: ['excited', 'antusias', 'semangat', 'ga sabar', 'pengen banget'],
    grateful: ['bersyukur', 'thankful', 'grateful', 'berterima kasih'],
    hurt: ['sakit hati', 'disakitin', 'dikhianatin', 'dibohongin', 'kecewa'],
    overwhelmed: ['kewalahan', 'burnout', 'capek banget', 'ga kuat', 'terlalu banyak']
};

/**
 * Quick mood detection dari keywords
 * 
 * @param {string} text - Teks untuk dianalisis
 * @returns {Object|null} - Detected mood atau null
 */
const quickMoodDetect = (text) => {
    const lowerText = text.toLowerCase();
    
    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                // Find mood in categories
                for (const [category, moods] of Object.entries(MOOD_CATEGORIES)) {
                    if (moods[mood]) {
                        return {
                            mood: mood,
                            category: category,
                            ...moods[mood]
                        };
                    }
                }
            }
        }
    }
    
    return null;
};

/**
 * Analisis mood menggunakan AI
 * 
 * @param {string} description - Deskripsi/cerita dari user
 * @param {Array} conversationHistory - History percakapan untuk konteks
 * @returns {Promise<Object>} - Mood analysis result
 */
const analyzeMood = async (description, conversationHistory = []) => {
    try {
        // Quick detection dulu
        const quickResult = quickMoodDetect(description);
        
        const prompt = `Kamu adalah AI yang ahli dalam membaca emosi dan mood seseorang dari cerita/deskripsi mereka.

Analisis cerita/curhat ini:
"${description}"

Berikan analisis mood dalam format JSON (HANYA JSON, tanpa markdown code block):
{
    "primaryMood": "nama mood utama (sad/happy/anxious/angry/stressed/lonely/frustrated/confused/excited/grateful/hurt/overwhelmed/peaceful/hopeful/confident/loved)",
    "intensity": 1-10 (seberapa kuat emosi ini),
    "secondaryMood": "mood sekunder jika ada atau null",
    "triggers": ["hal-hal yang memicu emosi ini"],
    "summary": "ringkasan kondisi emosi dalam 1-2 kalimat",
    "advice": "saran singkat yang supportive dalam gaya casual Tama (pakai w, gw, bro, dll)"
}

Analisis dengan empati dan perhatian. Jangan judgemental.`;

        const messages = [
            {
                role: 'system',
                content: 'Kamu adalah AI yang ahli membaca emosi. Respond dalam format JSON saja.'
            },
            ...conversationHistory.slice(-5), // Last 5 messages for context
            {
                role: 'user',
                content: prompt
            }
        ];

        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 600
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        if (response.data?.choices?.[0]?.message?.content) {
            const content = response.data.choices[0].message.content;
            
            // Parse JSON response
            try {
                // Remove markdown code blocks if present
                const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const result = JSON.parse(jsonStr);
                
                // Add emoji and category
                const moodInfo = findMoodInfo(result.primaryMood);
                
                return {
                    success: true,
                    ...result,
                    emoji: moodInfo?.emoji || '🤔',
                    category: moodInfo?.category || 'neutral',
                    label: moodInfo?.label || result.primaryMood
                };
            } catch (parseError) {
                console.error('[Mood] JSON parse error:', parseError.message);
                
                // Fallback to quick detect
                if (quickResult) {
                    return {
                        success: true,
                        primaryMood: quickResult.mood,
                        emoji: quickResult.emoji,
                        category: quickResult.category,
                        label: quickResult.label,
                        intensity: 5,
                        summary: 'Mood terdeteksi dari keywords',
                        advice: 'w disini buat dengerin lo curhat bro 🙏'
                    };
                }
                
                return {
                    success: false,
                    error: 'Gagal parsing mood',
                    rawContent: content
                };
            }
        }

        return {
            success: false,
            error: 'No response from AI'
        };
        
    } catch (error) {
        console.error('[Mood] Error analyzing mood:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Find mood info from categories
 */
const findMoodInfo = (moodName) => {
    const normalizedMood = moodName?.toLowerCase();
    
    for (const [category, moods] of Object.entries(MOOD_CATEGORIES)) {
        if (moods[normalizedMood]) {
            return {
                ...moods[normalizedMood],
                category: category
            };
        }
    }
    
    return null;
};

/**
 * Generate supportive response berdasarkan mood
 * 
 * @param {Object} moodAnalysis - Hasil analisis mood
 * @returns {string} - Supportive message
 */
const generateMoodResponse = (moodAnalysis) => {
    if (!moodAnalysis.success) {
        return 'hmm w coba baca mood lo tp agak susah nih 😅 coba ceritain lebih detail bro';
    }
    
    const { primaryMood, emoji, intensity, summary, advice, secondaryMood, triggers } = moodAnalysis;
    
    let response = `🔮 *Mood Reading*\n\n`;
    response += `${emoji} *Mood Utama:* ${moodAnalysis.label || primaryMood}\n`;
    response += `📊 *Intensitas:* ${'●'.repeat(Math.ceil(intensity / 2))}${'○'.repeat(5 - Math.ceil(intensity / 2))} (${intensity}/10)\n`;
    
    if (secondaryMood) {
        const secondaryInfo = findMoodInfo(secondaryMood);
        response += `${secondaryInfo?.emoji || '•'} *Mood Sekunder:* ${secondaryInfo?.label || secondaryMood}\n`;
    }
    
    response += `\n📝 *Ringkasan:*\n${summary}\n`;
    
    if (triggers && triggers.length > 0) {
        response += `\n🎯 *Pemicu:*\n`;
        triggers.forEach((trigger, idx) => {
            response += `  ${idx + 1}. ${trigger}\n`;
        });
    }
    
    response += `\n💬 *Saran w:*\n${advice}`;
    
    return response;
};

/**
 * Format mood untuk quick display
 * 
 * @param {string} moodName - Nama mood
 * @returns {string} - Formatted string
 */
const formatMood = (moodName) => {
    const info = findMoodInfo(moodName);
    if (info) {
        return `${info.emoji} ${info.label}`;
    }
    return `🤔 ${moodName}`;
};

/**
 * Check if message is asking for mood reading
 * 
 * @param {string} message - User message
 * @returns {boolean}
 */
const isMoodRequest = (message) => {
    const lowerMsg = message.toLowerCase();
    
    // Explicit mood/curhat keywords
    const explicitKeywords = [
        'baca mood', 'mood w', 'mood gw', 'mood ku', 'mood aku',
        'perasaan w', 'perasaan gw', 'perasaan ku', 'perasaan aku',
        'feeling w', 'feeling gw', 'feeling ku', 'feeling aku',
        'curhat dong', 'mau curhat', 'dengerin curhat', 'denger curhat',
        'cerita dong', 'mau cerita', 'dengerin cerita'
    ];
    
    if (explicitKeywords.some(keyword => lowerMsg.includes(keyword))) {
        return true;
    }
    
    // Pattern: "lagi [feeling]" or "ngerasa [feeling]"
    const feelingPatterns = [
        /\b(w|gw|gue|aku|ku)\s+(lagi|lg)\s+\w+/i,  // "w lagi sedih", "gw lagi berat"
        /\b(lagi|lg)\s+(ngerasa|ngrasa|merasa|feel)\b/i, // "lagi ngerasa", "lagi merasa"
        /\b(ngerasa|ngrasa|merasa)\s+.{3,}/i,  // "ngerasa hari ini berat"
        /\bhari ini.*(berat|sedih|capek|lelah|stress|stres|galau|down)/i, // "hari ini agak berat"
        /\b(berat|sedih|capek|lelah|stress|stres|galau|down).*(hari ini|akhir-akhir ini|belakangan)/i
    ];
    
    if (feelingPatterns.some(pattern => pattern.test(lowerMsg))) {
        return true;
    }
    
    return false;
};

/**
 * Get all available moods for reference
 * 
 * @returns {Object} - All mood categories
 */
const getAllMoods = () => MOOD_CATEGORIES;

module.exports = {
    analyzeMood,
    generateMoodResponse,
    quickMoodDetect,
    findMoodInfo,
    formatMood,
    isMoodRequest,
    getAllMoods,
    MOOD_CATEGORIES,
    MOOD_KEYWORDS
};
