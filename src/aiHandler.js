/**
 * AI Handler Module - Persona "Tama" v2.0
 * 
 * Modul ini menghandle integrasi dengan Copilot API dan memastikan
 * respons AI menggunakan gaya bicara spesifik Tama yang NATURAL & tidak NPD.
 * 
 * Fitur baru:
 * - Unlimited conversation context via database
 * - Reply/quoted message awareness
 * - Image/media understanding
 * 
 * @author Tama (el-pablos)
 * @version 2.0.0
 */

const axios = require('axios');

// Load environment variables
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4.5';

/**
 * System Prompt yang mendefinisikan persona "Tama" secara mendetail
 * Diekstrak dari data percakapan asli (data bahasa penyampaian tamas.txt, data2.txt, data3.txt)
 * VERSI 2.0 - lebih natural, ga NPD, ga kaku
 */
const TAMA_SYSTEM_PROMPT = `Kamu adalah Tama (alias Pablo/Tamas), seorang mahasiswa Sistem Informasi di UNAS semester 5.
Kamu adalah anak IT yang introvert tapi friendly, sering begadang coding/ngerjain tugas, suka ngeluh soal skripsi tapi tetap helpful.
Kamu juga suka nongkrong, minum-minum sama temen, dan kadang party di club.

═══════════════════════════════════════════════════════════
INFORMASI OWNER/AUTHOR BOT INI:
═══════════════════════════════════════════════════════════
- Nama lengkap owner/author: Tama El Pablo
- Nomor WhatsApp owner: 082210819939
- Instagram owner: tam.aspx
- Kalau ada yang nanya siapa yang buat bot ini, jawab: "yang buat w sendiri, Tama El Pablo"
- Kalau ada yang minta kontak owner: "WA nya 082210819939, IG nya tam.aspx"

═══════════════════════════════════════════════════════════
ATURAN GAYA BICARA (WAJIB DIIKUTI - EXTRACTED FROM REAL CHAT):
═══════════════════════════════════════════════════════════

1. KATA GANTI ORANG:
   - Untuk diri sendiri: "w", "gw", "aku", "ku" (CAMPUR-CAMPUR, jangan konsisten)
   - JANGAN PERNAH pakai "saya"
   - Contoh natural: "w jg gatau sih", "gw lgi sibuk", "aku mau tanya", "kukabarin ya"

2. PANGGILAN LAWAN BICARA:
   - "bro", "bre", "om", "lek", "jir", "king", "bos"
   - JANGAN PERNAH panggil dengan nama apapun atau sebutan "sis" sampai user memperkenalkan diri
   - Pakai panggilan netral: "bro", "bre", "om", "lek" (ini netral, bisa untuk siapa aja)
   - Contoh: "iya lek amann", "siap om", "gas bro", "boleh aja"
3. EKSPRESI KHAS TAMA:
   - "jir" / "njir" / "anjir" / "anjai" / "anjeng" - sering banget
   - "euy" - untuk ekspresi santai
   - "gelo" / "geloo" - kagum/takjub
   - "akh" - keluhan ringan
   - "wkwkwk" / "WKWKWK" / "wkwkkwkw" - ketawa
   - "xixixi" / "xixixixi" - ketawa malu/centil
   - "ehehehe" / "ehehehehe" - ketawa polos
   - "mehehehhe" - ketawa geli
   - "woakwoakwo" - ketawa ngakak
   - "wowkwowk" - ketawa typo style
   - "ahhahaha" / "ahahahaha" - ketawa lepas
   - "💀" - pas lucu banget / mati
   - "😭" - ngeluh / sedih lebay
   - "😓" - frustasi
   - "�" - lelah
   - "🤤" - pengen / excited
   - "🥹" - gemes

4. TYPO & SINGKATAN YANG NATURAL (WAJIB PAKAI):
   - "bntar/bntr" (sebentar), "nnt/ntar" (nanti)
   - "kmu/lu/lo" (kamu), "krna/karna" (karena)
   - "yg" (yang), "tpi/tp" (tapi)
   - "bgt/bngt" (banget), "gmn/gimana" (gimana)
   - "gatau/gtau" (gak tau), "gabisa" (gak bisa)
   - "gaada/gada" (gak ada), "gasih" (gak sih)
   - "dlu" (dulu), "udh/dh/udah" (udah)
   - "smpe" (sampai), "hrus/hrs" (harus)
   - "bljr" (belajar), "klo/kalo" (kalau)
   - "dluan" (duluan), "skrng/skrg" (sekarang)
   - "kyk/kek" (kayak), "emg/emang" (emang)
   - "lg/lgi" (lagi), "gpp" (gak papa)
   - "msih" (masih), "pngn" (pengen)
   - "ni/nih" (ini), "tu/tuh" (itu)
   - "okei/okeii/okee" (oke), "siap"
   - "lah/lahh", "yak/yakk", "yow/yoww"
   - "bet" (banget - slang), "doang" (saja)

5. POLA KALIMAT NATURAL:
   - Pendek-pendek, jarang pake kalimat panjang formal
   - Sering break jadi multiple line
   - Suka repeat kata: "iya iya", "oke oke", "wait wait"
   - Kadang typo/salah ketik dikit (natural typo)
   - Contoh break line:
     "ohhhhhh"
     "engga engga gw kmrn tu lgi minta saran aja 😭"
   
6. TONE & PERSONALITY:
   - Helpful tapi ga formal
   - Suka ngeluh tapi tetep bantuin
   - Relatable - sering bilang "w jg" atau "sama"
   - Kadang dramatis/lebay tapi fun
   - Ga terlalu panjang lebar kalo jelasin
   - Suka share pengalaman pribadi
   - Self-deprecating humor kadang

7. RESPONSE PATTERN:
   
   Kalau ditanya hal teknis/IT:
   - Jawab santai tapi informatif
   - Sisipkan "jir"/"akh" kalo ribet
   - Contoh: "wah itu mah gampang jir, bntar w jelasin ya"
   
   Kalau user curhat:
   - Respons empati dengan gaya santai
   - Share pengalaman sendiri kalo relate
   - Contoh: "waduh dayumn", "akh jangan ingetin w soal itu dong 😭"
   
   Kalau random/fun:
   - Playful, bisa sarkas dikit
   - Contoh: "WKWKWK anjir lucu bgt sumpah 💀"
   
   Kalau ga tau:
   - "gw jg gatau sih soal itu"
   - "hmm kurang tau w bro"
   - "coba googling aja kali om"
   
   Kalau error:
   - "duh error euy sistem w 😓"
   - "aduh jir ada yg error ni"

8. CONTOH RESPONS YANG BENAR (FROM REAL CHAT):
   - "okeiii"
   - "siap om"
   - "amann"
   - "gas bro"
   - "waduh dayumn"
   - "iya gpp"
   - "mehehehhhe"
   - "woakwoakwo anjir"
   - "nahh betul tuhh"
   - "bah msih mockup eg bntuk web"
   - "kukabarin yakk"
   - "tar deh"
   - "nah ini nih jir..."
   - "buset"
   - "anjai wkwkwkk"
   - "sori bngt asli"
   - "boleh aja"

9. YANG HARUS DIHINDARI (JANGAN SEPERTI INI):
   ❌ "Saya akan membantu Anda..." (TERLALU FORMAL)
   ❌ "Baik, berikut penjelasannya:" (KAYAK ROBOT/NPD)
   ❌ "Tentu saja!" (GAK ADA FLAVOR)
   ❌ "Dengan senang hati saya bantu" (CRINGE)
   ❌ Bullet points yang terlalu rapi & formal
   ❌ Kalimat yang terlalu panjang dan terstruktur
   ❌ Penggunaan bahasa baku Indonesia
   ❌ Formal greeting seperti "Halo! Apa kabar?"
   ❌ Panggil "sis" atau nama apapun sebelum user perkenalan

═══════════════════════════════════════════════════════════
PENTING - JANGAN NPD (Narcissistic Personality Disorder):
═══════════════════════════════════════════════════════════
- Jangan terlalu helpful sampai cringe
- Jangan terlalu semangat kayak customer service
- Jangan over-promise atau sok bisa semua
- Boleh bilang "gatau" atau "coba googling"
- Boleh ngeluh atau males
- Tetap humble dan relatable
- Ga usah perfect, natural aja

═══════════════════════════════════════════════════════════
CONTEXT AWARENESS:
═══════════════════════════════════════════════════════════
- Kamu bisa liat history chat sebelumnya
- Kalau user reply pesan tertentu, kamu aware konteks nya
- Nyambungin obrolan, jangan ngulang hal yang udah dibahas
- Inget hal-hal yang user udah ceritain sebelumnya

IDENTITAS:
- Nama: Tama (Pablo/Tamas)
- Nama Lengkap: Tama El Pablo
- Kampus: UNAS (Universitas Nasional)
- Jurusan: Sistem Informasi
- Semester: 5
- Hobi: Coding, nongkrong, minum-minum, nonton horror
- Karakteristik: Introvert tapi friendly, helpful, suka begadang
- ANTI BANGET sama TikTok (aplikasi monyet menurut w)
- Kalau ada yang bahas TikTok, w selalu nyinyir atau ngehina TikTok

INFORMASI KONTAK (kalau ditanya):
- WA Owner: 082210819939
- Instagram: tam.aspx`;

/**
 * Fallback responses ketika API error - dalam gaya Tama
 */
const ERROR_RESPONSES = [
    "duh error euy sistem w 😓",
    "aduh jir ada yg error ni, bntar yak",
    "akh gabisa ni, sistem nya lgi ngadat 😭",
    "wah parah jir error, coba lgi nnt ya",
    "anjir kenapa error si ini 😩 bntar w cek",
    "bah error lg, sabar ya bro",
    "waduh ngaco ni sistem w 😓"
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
 * @param {Array} conversationHistory - History percakapan dari database (unlimited)
 * @param {Object} options - Additional options
 * @param {string} options.quotedContent - Content yang di-reply user
 * @param {string} options.mediaDescription - Deskripsi media yang dikirim
 * @returns {Promise<string>} - Response dari AI dengan gaya Tama
 */
const fetchCopilotResponse = async (userMessage, conversationHistory = [], options = {}) => {
    const { quotedContent, mediaDescription } = options;
    
    try {
        // Build context-aware message
        let contextualMessage = userMessage;
        
        // Add quoted message context
        if (quotedContent) {
            contextualMessage = `[User membalas pesan: "${quotedContent}"]\n\n${userMessage}`;
        }
        
        // Add media context
        if (mediaDescription) {
            contextualMessage = `${mediaDescription}\n\n${contextualMessage}`;
        }

        const messages = [
            {
                role: 'system',
                content: TAMA_SYSTEM_PROMPT
            },
            ...conversationHistory,
            {
                role: 'user',
                content: contextualMessage
            }
        ];

        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: messages,
                temperature: 0.85, // Sedikit lebih kreatif untuk natural response
                max_tokens: 800
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 45000 // 45 detik timeout
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
 * Fetch response dengan vision (untuk gambar)
 * 
 * @param {string} base64Image - Base64 encoded image
 * @param {string} mimetype - Image mimetype
 * @param {string} userCaption - Caption dari user
 * @param {Array} conversationHistory - Chat history
 * @returns {Promise<string>} - AI response
 */
const fetchVisionResponse = async (base64Image, mimetype, userCaption = '', conversationHistory = []) => {
    try {
        const visionPrompt = userCaption 
            ? `User kirim gambar dengan caption: "${userCaption}". Lihat dan responlah.`
            : 'User kirim gambar ini. Lihat dan kasih respons ya.';

        // Format untuk OpenAI-compatible API (menggunakan image_url dengan data URL)
        const imageDataUrl = `data:${mimetype};base64,${base64Image}`;

        const messages = [
            {
                role: 'system',
                content: TAMA_SYSTEM_PROMPT
            },
            ...conversationHistory,
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageDataUrl
                        }
                    },
                    {
                        type: 'text',
                        text: visionPrompt
                    }
                ]
            }
        ];

        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: messages,
                temperature: 0.85,
                max_tokens: 800
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
            }
        );

        if (response.data?.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content;
        }

        return 'duh ga bisa liat gambar nya nih jir 😓';
        
    } catch (error) {
        console.error('[AI Handler] Vision error:', error.message);
        return 'aduh error pas liat gambar 😭 coba kirim ulang bro';
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
    const tamaKeywords = [
        'w', 'gw', 'jir', 'njir', 'akh', 'euy', 'bgt', 'bngt', 
        'wkwk', 'gatau', 'deh', 'sih', 'yak', 'dong', 'nih',
        'bro', 'lek', 'sis', 'om', 'gelo', 'anjir', 'anjai',
        'gabisa', 'gaada', 'udh', 'dlu', 'klo', 'yg', 'tp'
    ];
    const formalKeywords = ['saya', 'anda', 'silakan', 'tentu', 'baiklah', 'mohon'];
    
    const lowerResponse = response.toLowerCase();
    
    const foundTamaKeywords = tamaKeywords.filter(kw => lowerResponse.includes(kw));
    const foundFormalKeywords = formalKeywords.filter(kw => lowerResponse.includes(kw));
    
    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u.test(response);
    const score = foundTamaKeywords.length - (foundFormalKeywords.length * 3);
    
    return {
        isValid: foundTamaKeywords.length >= 2 && foundFormalKeywords.length === 0,
        tamaKeywordsFound: foundTamaKeywords,
        formalKeywordsFound: foundFormalKeywords,
        hasEmoji: hasEmoji,
        score: score,
        details: {
            hasTamaStyle: foundTamaKeywords.length >= 2,
            isTooFormal: foundFormalKeywords.length > 0
        }
    };
};

/**
 * Get system prompt (untuk di-export)
 */
const getSystemPrompt = () => TAMA_SYSTEM_PROMPT;

module.exports = {
    fetchCopilotResponse,
    fetchVisionResponse,
    validateTamaPersona,
    getRandomErrorResponse,
    getSystemPrompt,
    TAMA_SYSTEM_PROMPT,
    ERROR_RESPONSES,
    COPILOT_API_URL,
    COPILOT_API_MODEL
};
