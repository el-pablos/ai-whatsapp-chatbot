/**
 * Translate Handler — AI-powered translation
 * 
 * @author Tama El Pablo
 */

const SUPPORTED_LANGUAGES = {
    id: 'Bahasa Indonesia',
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese (Mandarin)',
    ar: 'Arabic',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    th: 'Thai',
    vi: 'Vietnamese',
    ms: 'Malay',
    hi: 'Hindi',
    tr: 'Turkish',
    nl: 'Dutch',
    pl: 'Polish',
    sv: 'Swedish',
};

/**
 * Detect target language dari command /translate
 * @param {string} text — misal "/translate en ini contoh kalimat"
 * @returns {{ langCode: string, langName: string, textToTranslate: string } | null}
 */
const parseTranslateCommand = (text) => {
    if (!text) return null;
    const match = text.match(/^\/translate\s+(\w{2})\s+(.+)$/is);
    if (!match) return null;
    const code = match[1].toLowerCase();
    const langName = SUPPORTED_LANGUAGES[code];
    if (!langName) return null;
    return { langCode: code, langName, textToTranslate: match[2].trim() };
};

/**
 * Terjemahkan teks pake AI
 * @param {string} text — text yg mau ditranslate
 * @param {string} targetLang — lang name, misal "English"
 * @param {Function} aiCall — function(prompt) => string
 * @returns {Promise<string>}
 */
const translateText = async (text, targetLang, aiCall) => {
    const prompt = `Translate the following text to ${targetLang}. Only respond with the translation, no explanation:\n\n${text}`;
    const result = await aiCall(prompt);
    return result;
};

/**
 * Format hasil translate buat output
 */
const formatTranslation = (original, translated, langName) => {
    return `🌐 *Terjemahan ke ${langName}:*\n\n${translated}`;
};

/**
 * List bahasa yg didukung
 */
const listLanguages = () => {
    const lines = Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) =>
        `  \`${code}\` — ${name}`
    );
    return `🌐 *Bahasa yang didukung:*\n${lines.join('\n')}\n\n_Contoh: /translate en Halo apa kabar_`;
};

module.exports = {
    SUPPORTED_LANGUAGES,
    parseTranslateCommand,
    translateText,
    formatTranslation,
    listLanguages,
};
