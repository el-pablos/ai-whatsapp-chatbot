/**
 * Poll Handler — polling system
 * 
 * @author Tama El Pablo
 */

const {
    createPoll: dbCreatePoll,
    getPoll: dbGetPoll,
    getActivePoll: dbGetActivePoll,
    votePoll: dbVotePoll,
    closePoll: dbClosePoll,
    getPollResults: dbGetPollResults,
} = require('./database');

/**
 * Buat poll baru
 * @param {string} chatId — chat ID
 * @param {string} creatorId — user ID pembuat
 * @param {string} question — pertanyaan poll
 * @param {string[]} options — array pilihan
 * @returns {{ success: boolean, pollId?: number, message: string }}
 */
const createPoll = (chatId, creatorId, question, options) => {
    if (!question) return { success: false, message: 'Pertanyaan poll nya apa bro?' };
    if (!options || options.length < 2) return { success: false, message: 'Minimal 2 pilihan buat poll bro' };
    if (options.length > 10) return { success: false, message: 'Maksimal 10 pilihan aja bro' };

    // Cek apakah udah ada active poll di chat ini
    const existing = dbGetActivePoll(chatId);
    if (existing) return { success: false, message: 'Masih ada poll aktif di chat ini, close dulu pake /poll close' };

    const result = dbCreatePoll(chatId, creatorId, question, options);
    return { success: true, pollId: result.id, message: formatPollMessage(question, options, result.id) };
};

/**
 * Vote di poll
 * @param {string} chatId
 * @param {string} voterId
 * @param {number} optionIndex — index pilihan (1-based)
 * @returns {{ success: boolean, message: string }}
 */
const votePoll = (chatId, voterId, optionIndex) => {
    const poll = dbGetActivePoll(chatId);
    if (!poll) return { success: false, message: 'Ga ada poll aktif di chat ini bro' };

    const options = JSON.parse(poll.options);
    if (optionIndex < 1 || optionIndex > options.length) {
        return { success: false, message: `Pilihan ga valid, pilih 1-${options.length}` };
    }

    dbVotePoll(poll.id, voterId, optionIndex);
    return { success: true, message: `Vote kamu ke "${options[optionIndex - 1]}" udah tercatat ✅` };
};

/**
 * Close poll dan tampilkan hasil
 * @param {string} chatId
 * @param {string} userId — harus creator atau owner
 * @param {string} ownerJid
 * @returns {{ success: boolean, message: string }}
 */
const closePoll = (chatId, userId, ownerJid) => {
    const poll = dbGetActivePoll(chatId);
    if (!poll) return { success: false, message: 'Ga ada poll aktif buat di-close bro' };

    // Hanya creator atau owner yg bisa close
    if (poll.creator_id !== userId && userId !== ownerJid) {
        return { success: false, message: 'Cuma pembuat poll atau owner yg bisa close' };
    }

    dbClosePoll(poll.id);
    const results = dbGetPollResults(poll.id);
    return { success: true, message: formatPollResults(poll.question, JSON.parse(poll.options), results) };
};

/**
 * Show hasil poll saat ini tanpa close
 * @param {string} chatId
 * @returns {string}
 */
const showPollResults = (chatId) => {
    const poll = dbGetActivePoll(chatId);
    if (!poll) return 'Ga ada poll aktif di chat ini bro';

    const results = dbGetPollResults(poll.id);
    return formatPollResults(poll.question, JSON.parse(poll.options), results, false);
};

/**
 * Format pesan poll baru
 */
const formatPollMessage = (question, options, pollId) => {
    const optionLines = options.map((opt, i) =>
        `  ${i + 1}. ${opt}`
    ).join('\n');
    return `📊 *POLL #${pollId}*\n\n*${question}*\n\n${optionLines}\n\n_Vote: /vote [nomor]_\n_Close: /poll close_`;
};

/**
 * Format hasil poll
 */
const formatPollResults = (question, options, results, isClosed = true) => {
    const totalVotes = results.reduce((sum, r) => sum + r.count, 0);
    const header = isClosed ? '📊 *HASIL POLL (CLOSED)*' : '📊 *HASIL POLL (LIVE)*';

    const resultLines = options.map((opt, i) => {
        const voteData = results.find(r => r.option_index === (i + 1));
        const count = voteData ? voteData.count : 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const bar = generateBar(pct);
        return `  ${i + 1}. ${opt}\n     ${bar} ${pct}% (${count} votes)`;
    }).join('\n');

    return `${header}\n\n*${question}*\n\n${resultLines}\n\n_Total: ${totalVotes} votes_`;
};

/**
 * Generate visual bar
 */
const generateBar = (pct) => {
    const filled = Math.round(pct / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
};

/**
 * Parse poll command
 * @param {string} text
 */
const parsePollCommand = (text) => {
    if (!text) return null;

    // /poll close
    if (/^\/poll\s+close$/i.test(text)) return { action: 'close' };

    // /poll results
    if (/^\/poll\s+results?$/i.test(text)) return { action: 'results' };

    // /poll Pertanyaan? | pilihan1 | pilihan2 | pilihan3
    const match = text.match(/^\/poll\s+(.+)$/is);
    if (match) {
        const parts = match[1].split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 3) {
            return { action: 'create', question: parts[0], options: parts.slice(1) };
        }
    }

    return null;
};

/**
 * Parse vote command
 * @param {string} text — "/vote 2"
 */
const parseVoteCommand = (text) => {
    if (!text) return null;
    const match = text.match(/^\/vote\s+(\d+)$/i);
    return match ? parseInt(match[1], 10) : null;
};

module.exports = {
    createPoll,
    votePoll,
    closePoll,
    showPollResults,
    formatPollMessage,
    formatPollResults,
    generateBar,
    parsePollCommand,
    parseVoteCommand,
};
