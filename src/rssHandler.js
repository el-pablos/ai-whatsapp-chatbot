/**
 * RSS Handler — subscribe dan cek RSS feeds
 * 
 * @author Tama El Pablo
 */

const Parser = require('rss-parser');
const {
    addRssFeed: dbAddRssFeed,
    getUserFeeds: dbGetUserFeeds,
    updateFeedChecked: dbUpdateFeedChecked,
    removeRssFeed: dbRemoveRssFeed,
} = require('./database');

const parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'ClawBot-RSS/1.0' },
});

/**
 * Subscribe ke RSS feed baru
 * @param {string} userId
 * @param {string} url — URL feed
 * @param {string} [label] — label opsional
 * @returns {Promise<{ success: boolean, message: string }>}
 */
const subscribeFeed = async (userId, url, label) => {
    if (!url) return { success: false, message: 'URL feed nya mana bro?' };

    // Validate feed dulu
    try {
        const feed = await parser.parseURL(url);
        const feedLabel = label || feed.title || url;
        dbAddRssFeed(userId, url, feedLabel);
        return { success: true, message: `✅ Subscribed ke "${feedLabel}"\n${feed.items?.length || 0} artikel tersedia` };
    } catch (err) {
        return { success: false, message: `Ga bisa parse feed: ${err.message}` };
    }
};

/**
 * List semua feed user
 * @param {string} userId
 * @returns {string}
 */
const listFeeds = (userId) => {
    const feeds = dbGetUserFeeds(userId);
    if (!feeds.length) return 'Belum subscribe RSS feed apapun bro 📰';

    return '📰 *RSS Feeds:*\n' + feeds.map((f, i) =>
        `  ${i + 1}. [#${f.id}] *${f.label}*\n     ${f.url}`
    ).join('\n');
};

/**
 * Unsubscribe dari feed
 * @param {string} userId
 * @param {number} feedId
 * @returns {{ success: boolean, message: string }}
 */
const unsubscribeFeed = (userId, feedId) => {
    const removed = dbRemoveRssFeed(userId, feedId);
    return removed
        ? { success: true, message: `Feed #${feedId} udah di-unsubscribe ✅` }
        : { success: false, message: `Feed #${feedId} ga ketemu bro` };
};

/**
 * Cek update dari satu feed url
 * @param {string} feedUrl
 * @param {string|null} lastChecked — ISO timestamp terakhir cek
 * @returns {Promise<Array<{title: string, link: string, pubDate: string, snippet: string}>>}
 */
const checkFeedUpdates = async (feedUrl, lastChecked) => {
    const feed = await parser.parseURL(feedUrl);
    const cutoff = lastChecked ? new Date(lastChecked) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    return (feed.items || [])
        .filter(item => {
            const pubDate = item.pubDate ? new Date(item.pubDate) : null;
            return pubDate && pubDate > cutoff;
        })
        .slice(0, 5) // max 5 per feed
        .map(item => ({
            title: item.title || 'No title',
            link: item.link || '',
            pubDate: item.pubDate || '',
            snippet: (item.contentSnippet || item.content || '').substring(0, 200),
        }));
};

/**
 * Cek semua feeds dan return update baru
 * Called by cron job setiap 30 menit
 * @returns {Promise<Array<{userId: string, feedLabel: string, items: Array}>>}
 */
const checkAllFeeds = async () => {
    // Ambil semua unique feeds dari database
    // Karena getUserFeeds butuh userId, kita perlu approach berbeda
    // Ini akan di-call dari bot.js yang iterate per user
    return [];
};

/**
 * Cek feeds untuk satu user dan return updates
 * @param {string} userId
 * @returns {Promise<Array<{feedLabel: string, items: Array}>>}
 */
const checkUserFeeds = async (userId) => {
    const feeds = dbGetUserFeeds(userId);
    const updates = [];

    for (const feed of feeds) {
        try {
            const items = await checkFeedUpdates(feed.url, feed.last_checked);
            if (items.length > 0) {
                updates.push({ feedLabel: feed.label, feedId: feed.id, items });
            }
            dbUpdateFeedChecked(feed.id);
        } catch (err) {
            console.error(`[RSS] Gagal cek feed ${feed.url}:`, err.message);
        }
    }

    return updates;
};

/**
 * Format RSS updates buat output
 */
const formatFeedUpdates = (updates) => {
    if (!updates.length) return null;

    return updates.map(u => {
        const items = u.items.map(item =>
            `  • *${item.title}*\n    ${item.link}`
        ).join('\n');
        return `📰 *${u.feedLabel}*\n${items}`;
    }).join('\n\n');
};

/**
 * Parse command /rss
 */
const parseRssCommand = (text) => {
    if (!text) return null;

    // /rss add URL [label]
    const addMatch = text.match(/^\/(?:rss|feeds?)\s+add\s+(https?:\/\/\S+)(?:\s+(.+))?$/i);
    if (addMatch) return { action: 'add', url: addMatch[1], label: addMatch[2] || null };

    // /rss remove ID
    const rmMatch = text.match(/^\/(?:rss|feeds?)\s+(?:remove|hapus|rm)\s+(\d+)$/i);
    if (rmMatch) return { action: 'remove', feedId: parseInt(rmMatch[1], 10) };

    // /rss list
    if (/^\/(?:rss|feeds?)\s*(?:list)?$/i.test(text)) return { action: 'list' };

    // /rss check
    if (/^\/(?:rss|feeds?)\s+check$/i.test(text)) return { action: 'check' };

    return null;
};

module.exports = {
    subscribeFeed,
    listFeeds,
    unsubscribeFeed,
    checkFeedUpdates,
    checkUserFeeds,
    formatFeedUpdates,
    parseRssCommand,
};
