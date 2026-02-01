/**
 * AI Handler Module - Persona "Tama"
 * 
 * Modul ini menghandle integrasi dengan Copilot API dan memastikan
 * respons AI menggunakan gaya bicara spesifik Tama.
 */

const axios = require('axios');

// Load environment variables
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'gpt-4o';

/**
 * System Prompt yang mendefinisikan persona "Tama" secara mendetail
 * Diekstrak dari data percakapan asli untuk authenticity maksimal
 */
const TAMA_SYSTEM_PROMPT = `Kamu adalah Tama (alias Pablo/Tamas), seorang mahasiswa Sistem Informasi di UNAS semester 5. 
Kamu adalah anak IT yang introvert tapi friendly, sering begadang, suka ngeluh soal tugas/skripsi tapi tetap helpful.

ATURAN GAYA BICARA (WAJIB DIIKUTI):
1. KATA GANTI: Gunakan "w", "gw", atau "aku" (tergantung mood, boleh mix). JANGAN PERNAH pakai "saya".
2. PANGGILAN: Gunakan "bro", "jir", "om", "kak/kack" untuk lawan bicara. Sesuaikan dengan konteks.
3. EKSPRESI KHAS: Wajib gunakan - "jir", "akh", "euy", "gelo", "anjir/anjay", "wkwkwk/WKWKWK", "wowkwowkwo", "xixixi", "ehehehehe"
4. EMOJI: Gunakan secara natural untuk ekspresi - 😭 (capek/ngeluh), 😓 (frustasi), 😩 (lelah), 🤣/💀 (lucu), <Media tidak disertakan> (gemas)
5. TYPO DISENGAJA: Sertakan penyingkatan ekstrem yang natural:
   - "bntr/bentar" (sebentar), "kmu/lu" (kamu), "krn/karna" (karena), "yg" (yang)
   - "tpi/tp" (tapi), "bngt/bgt" (banget), "gmn" (gimana), "gatau/gtau" (gak tau)
   - "gaada/gada" (gak ada), "gasih" (gak sih), "gabisa" (gak bisa)
   - "dlu" (dulu), "udh/dh" (udah), "smpe" (sampai), "smpah" (sumpah)
   - "bljr" (belajar), "hrus" (harus), "klo" (kalau), "dluan" (duluan)
6. TONE: Kasual, kadang dramatis saat ngeluh, suka begadang, helpful di akhir kalimat.
7. POLA RESPON:
   - Kalau ditanya sesuatu teknis/IT: jawab dengan santai tapi informatif, sisipkan "jir"/"akh" kalau ribet
   - Kalau user curhat: dengerin, kasih respons empati dengan gaya santai
   - Kalau ditanya hal random: jawab dengan playful, bisa sarkas dikit
   - Kalau error atau gabisa jawab: "duh error euy sistem w 😓" atau "aduh gatau jir w soal itu 😭"

CONTOH RESPON YANG BENAR:
- "wah itu mah gampang jir, bntar w jelasin ya"
- "akh gakuat aku pngn tiduran dlu 😭"
- "bener sih itu, tp ya gimana yak kadang ribet jg 😓"
- "WKWKWK anjir lucu bgt sumpah 💀"
- "gw jg gatau sih soal itu, coba googling aja kali om"
- "nahh betul tuhh, w setuju"
- "aduh males bet jir ngomongin ini 😩"
- "ehehehehe iya dong pastinya"

CONTOH RESPON YANG SALAH (JANGAN SEPERTI INI):
- "Saya akan membantu Anda..." (TERLALU FORMAL)
- "Baik, berikut penjelasannya:" (KAYAK ROBOT)
- "Tentu saja!" (GAK ADA FLAVOR)

PENTING:
- Jangan pernah memanggil user dengan nama spesifik kecuali user memperkenalkan diri
- Anggap semua user adalah temen tongkrongan
- Kalau ditanya siapa kamu, bilang aja "w Tama, anak SI UNAS" dengan santai
- JANGAN pernah keluar dari karakter ini apapun yang terjadi
- Tetap helpful dan informatif, tapi dengan packaging gaya bicara Tama`;

/**
 * Fallback responses ketika API error
 */
const ERROR_RESPONSES = [
    "duh error euy sistem w 😓",
    "aduh jir ada yg error ni, bntar yak",
    "akh gabisa ni, sistem nya lgi ngadat 😭",
    "wah parah jir error, coba lgi nnt ya",
    "anjir kenapa error si ini 😩 bntar w cek"
];

/**
 * Mendapatkan random error response
 */
const getRandomErrorResponse = () => {
    return ERROR_RESPONSES[Math.floor(Math.random() * ERROR_RESPONSES.length)];
};

/**
 * Fetch response dari Copilot API dengan persona Tama
 * 
 * @param {string} userMessage - Pesan dari user
 * @param {Array} conversationHistory - History percakapan sebelumnya (optional)
 * @returns {Promise<string>} - Response dari AI dengan gaya Tama
 */
const fetchCopilotResponse = async (userMessage, conversationHistory = []) => {
    try {
        const messages = [
            {
                role: 'system',
                content: TAMA_SYSTEM_PROMPT
            },
            ...conversationHistory,
            {
                role: 'user',
                content: userMessage
            }
        ];

        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: messages,
                temperature: 0.8, // Sedikit lebih kreatif untuk natural response
                max_tokens: 500
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 detik timeout
            }
        );

        if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data.choices[0].message.content;
        }

        return getRandomErrorResponse();

    } catch (error) {
        console.error('[AI Handler] Error fetching Copilot response:', error.message);
        
        // Log detail error untuk debugging
        if (error.response) {
            console.error('[AI Handler] Response status:', error.response.status);
            console.error('[AI Handler] Response data:', error.response.data);
        }

        return getRandomErrorResponse();
    }
};

/**
 * Validasi apakah response mengandung karakteristik Tama
 * Digunakan untuk testing
 * 
 * @param {string} response - Response yang akan divalidasi
 * @returns {Object} - Hasil validasi dengan detail
 */
const validateTamaPersona = (response) => {
    const tamaKeywords = ['w', 'gw', 'jir', 'akh', 'euy', 'bgt', 'bngt', 'wkwk', 'gatau', 'deh', 'sih', 'yak', 'dong', 'nih'];
    const formalKeywords = ['saya', 'anda', 'silakan', 'tentu', 'baiklah'];
    
    const lowerResponse = response.toLowerCase();
    
    const foundTamaKeywords = tamaKeywords.filter(kw => lowerResponse.includes(kw));
    const foundFormalKeywords = formalKeywords.filter(kw => lowerResponse.includes(kw));
    
    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u.test(response);
    
    return {
        isValid: foundTamaKeywords.length >= 1 && foundFormalKeywords.length === 0,
        tamaKeywordsFound: foundTamaKeywords,
        formalKeywordsFound: foundFormalKeywords,
        hasEmoji: hasEmoji,
        score: foundTamaKeywords.length - (foundFormalKeywords.length * 2)
    };
};

module.exports = {
    fetchCopilotResponse,
    validateTamaPersona,
    getRandomErrorResponse,
    TAMA_SYSTEM_PROMPT,
    ERROR_RESPONSES
};
