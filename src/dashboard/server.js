/**
 * Dashboard Admin Server — Express API + SPA serving
 *
 * Runs on port DASHBOARD_PORT (default 6666), SEPARATE from health check (8008).
 * Serves React SPA from public/ and provides JSON API under /api/*.
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const {
    // Admin users
    initDefaultAdmin,
    getAdminByUsername,
    getAdminById,
    updateAdminLastLogin,
    updateAdminPassword,
    createAdminSession,
    getAdminSession,
    deleteAdminSession,
    cleanExpiredSessions,
    // Activity logs
    logActivity,
    getActivityLogs,
    getActivityLogsByAdmin,
    // Allowlist
    addToAllowlist,
    removeFromAllowlist,
    toggleAllowlist,
    updateAllowlistEntry,
    getAllowlist,
    refreshAllowlistCache,
    normalizePhoneNumber,
    getActiveAllowlistCount,
    // Config
    setConfig,
    getConfig,
    getAllConfigs,
    getAllConfigRows,
    deleteConfig,
    initDefaultConfigs,
    // Feature toggles
    setFeatureToggle,
    getFeatureToggle,
    getAllFeatureToggles,
    isFeatureEnabled,
    refreshFeatureToggleCache,
    // Stats & users
    getStats,
    getAllUsers,
    getUserProfile,
    getUserPreferences,
    getConversationHistory,
    cleanupExpiredSessions,
    initDatabase,
} = require('../database');

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 6666;
const SESSION_HOURS = parseInt(process.env.DASHBOARD_SESSION_HOURS, 10) || 24;

const app = express();

// ═══════════════════════════════════════════════════════════
//  MIDDLEWARE
// ═══════════════════════════════════════════════════════════

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets from built frontend
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), { maxAge: '7d' }));

// ═══════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════

function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies.dashboard_token;
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const session = getAdminSession(token);
    if (!session || !session.admin_active) {
        res.clearCookie('dashboard_token');
        return res.status(401).json({ success: false, error: 'Session expired' });
    }
    req.admin = session;
    next();
}

// ═══════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════

app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });

        const admin = getAdminByUsername(username);
        if (!admin || !admin.is_active) return res.status(401).json({ success: false, error: 'Username atau password salah' });

        const match = bcrypt.compareSync(password, admin.password_hash);
        if (!match) return res.status(401).json({ success: false, error: 'Username atau password salah' });

        // Create session
        const token = crypto.randomBytes(48).toString('hex');
        const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600000).toISOString();
        const ip = req.ip || req.connection?.remoteAddress || '';
        const ua = req.headers['user-agent'] || '';
        createAdminSession(admin.id, token, ip, ua, expiresAt);
        updateAdminLastLogin(admin.id);
        logActivity(admin.id, 'login', null, null, ip);

        res.cookie('dashboard_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_HOURS * 3600000,
        });

        return res.json({ success: true, data: { id: admin.id, username: admin.username, display_name: admin.display_name, role: admin.role } });
    } catch (err) {
        console.error('[Dashboard] Login error:', err.message);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    const token = req.cookies.dashboard_token;
    deleteAdminSession(token);
    logActivity(req.admin.admin_id, 'logout', null, null, req.ip);
    res.clearCookie('dashboard_token');
    return res.json({ success: true, data: null });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    return res.json({
        success: true,
        data: { id: req.admin.admin_id, username: req.admin.username, display_name: req.admin.display_name, role: req.admin.role },
    });
});

// ═══════════════════════════════════════════════════════════
//  ALLOWLIST API
// ═══════════════════════════════════════════════════════════

app.get('/api/allowlist', requireAuth, (req, res) => {
    try {
        const entries = getAllowlist();
        return res.json({ success: true, data: entries });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/allowlist', requireAuth, (req, res) => {
    try {
        const { phone_number, display_name, notes } = req.body || {};
        if (!phone_number) return res.status(400).json({ success: false, error: 'phone_number wajib diisi' });
        const normalized = normalizePhoneNumber(phone_number);
        if (!normalized || normalized.length < 10) return res.status(400).json({ success: false, error: 'Format nomor ga valid (min 10 digit, format 628xxx)' });
        const result = addToAllowlist(normalized, display_name, req.admin.username, notes);
        logActivity(req.admin.admin_id, 'allowlist_add', normalized, display_name, req.ip);
        return res.json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/allowlist/:phone', requireAuth, (req, res) => {
    try {
        const phone = req.params.phone;
        const ok = updateAllowlistEntry(phone, req.body || {});
        if (!ok) return res.status(404).json({ success: false, error: 'Nomor ga ketemu' });
        logActivity(req.admin.admin_id, 'allowlist_update', phone, JSON.stringify(req.body), req.ip);
        return res.json({ success: true, data: null });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/allowlist/:phone', requireAuth, (req, res) => {
    try {
        const phone = req.params.phone;
        const ok = removeFromAllowlist(phone);
        if (!ok) return res.status(404).json({ success: false, error: 'Nomor ga ketemu' });
        logActivity(req.admin.admin_id, 'allowlist_delete', phone, null, req.ip);
        return res.json({ success: true, data: null });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/allowlist/:phone/toggle', requireAuth, (req, res) => {
    try {
        const phone = req.params.phone;
        // Get current state and toggle
        const all = getAllowlist();
        const entry = all.find(e => e.phone_number === phone);
        if (!entry) return res.status(404).json({ success: false, error: 'Nomor ga ketemu' });
        const newState = !entry.is_active;
        toggleAllowlist(phone, newState);
        logActivity(req.admin.admin_id, 'allowlist_toggle', phone, `is_active: ${newState}`, req.ip);
        return res.json({ success: true, data: { is_active: newState } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  CONFIG API
// ═══════════════════════════════════════════════════════════

app.get('/api/config', requireAuth, (req, res) => {
    try {
        const rows = getAllConfigRows();
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/config/:key', requireAuth, (req, res) => {
    try {
        const { value } = req.body || {};
        if (value === undefined) return res.status(400).json({ success: false, error: 'value wajib diisi' });
        setConfig(req.params.key, value, null, null, req.admin.username);
        // Update process.env if applicable
        const envMap = { copilot_api_model: 'COPILOT_API_MODEL', session_expiry_hours: 'SESSION_EXPIRY_HOURS', log_level: 'LOG_LEVEL', bot_name: 'BOT_NAME' };
        if (envMap[req.params.key]) process.env[envMap[req.params.key]] = String(value);
        logActivity(req.admin.admin_id, 'config_update', req.params.key, String(value), req.ip);
        return res.json({ success: true, data: null });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/config/reset', requireAuth, (req, res) => {
    try {
        initDefaultConfigs();
        logActivity(req.admin.admin_id, 'config_reset', null, null, req.ip);
        return res.json({ success: true, data: null });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  FEATURE TOGGLE API
// ═══════════════════════════════════════════════════════════

app.get('/api/features', requireAuth, (req, res) => {
    try {
        const { getAllFeatures } = require('../featureRegistry');
        const features = getAllFeatures();
        const toggles = getAllFeatureToggles();
        const merged = features.map(f => ({
            ...f,
            is_enabled: toggles[f.id] === undefined ? true : toggles[f.id],
        }));
        return res.json({ success: true, data: merged });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/features/:featureId', requireAuth, (req, res) => {
    try {
        const { is_enabled } = req.body || {};
        if (is_enabled === undefined) return res.status(400).json({ success: false, error: 'is_enabled wajib diisi' });
        setFeatureToggle(req.params.featureId, !!is_enabled, is_enabled ? null : req.admin.username);
        logActivity(req.admin.admin_id, 'feature_toggle', req.params.featureId, `enabled: ${!!is_enabled}`, req.ip);
        return res.json({ success: true, data: null });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  CHAT MONITOR API
// ═══════════════════════════════════════════════════════════

app.get('/api/chats', requireAuth, (req, res) => {
    try {
        const hours = parseInt(req.query.hours, 10) || 24;
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const db = initDatabase();
        const cutoff = Date.now() - hours * 3600000;
        const rows = db.prepare(
            `SELECT chat_id, MAX(timestamp) as last_msg, COUNT(*) as msg_count, MAX(sender_name) as sender_name
             FROM conversations WHERE timestamp > ? GROUP BY chat_id ORDER BY last_msg DESC LIMIT ?`
        ).all(cutoff, limit);
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/chats/:chatId', requireAuth, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
        const db = initDatabase();
        const rows = db.prepare(
            `SELECT * FROM conversations WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?`
        ).all(req.params.chatId, limit);
        return res.json({ success: true, data: rows.reverse() });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/chats/:chatId/user', requireAuth, (req, res) => {
    try {
        const profile = getUserProfile(req.params.chatId);
        const prefs = getUserPreferences(req.params.chatId);
        return res.json({ success: true, data: { profile, preferences: prefs } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  ANALYTICS API
// ═══════════════════════════════════════════════════════════

app.get('/api/analytics/messages', requireAuth, (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 7;
        const db = initDatabase();
        const rows = db.prepare(
            `SELECT DATE(created_at) as date, COUNT(*) as count FROM conversations
             WHERE created_at > datetime('now', '-${days} days') GROUP BY date ORDER BY date`
        ).all();
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/analytics/top-users', requireAuth, (req, res) => {
    try {
        const db = initDatabase();
        const rows = db.prepare(
            `SELECT c.sender_jid, COUNT(*) as count, MAX(c.sender_name) as name
             FROM conversations c WHERE c.role = 'user'
             GROUP BY c.sender_jid ORDER BY count DESC LIMIT 10`
        ).all();
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/analytics/message-types', requireAuth, (req, res) => {
    try {
        const db = initDatabase();
        const rows = db.prepare(
            `SELECT COALESCE(media_type, 'text') as type, COUNT(*) as count FROM conversations GROUP BY type`
        ).all();
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/analytics/peak-hours', requireAuth, (req, res) => {
    try {
        const db = initDatabase();
        const rows = db.prepare(
            `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count FROM conversations GROUP BY hour ORDER BY hour`
        ).all();
        return res.json({ success: true, data: rows });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/analytics/overview', requireAuth, (req, res) => {
    try {
        const stats = getStats();
        const mem = process.memoryUsage();
        const db = initDatabase();
        const todayCount = db.prepare(
            `SELECT COUNT(DISTINCT sender_jid) as count FROM conversations WHERE DATE(created_at) = DATE('now')`
        ).get();
        return res.json({
            success: true,
            data: {
                totalUsers: stats.totalUsers,
                totalMessages: stats.totalMessages,
                activeToday: todayCount.count,
                uptime: process.uptime(),
                memory: { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, rss: mem.rss },
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  SYSTEM API
// ═══════════════════════════════════════════════════════════

app.get('/api/system/logs', requireAuth, (req, res) => {
    try {
        // Return recent activity logs as app logs
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
        const logs = getActivityLogs(limit, 0);
        return res.json({ success: true, data: logs });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/system/health', (req, res) => {
    return res.json({ success: true, data: { status: 'ok', dashboard_uptime: process.uptime(), port: DASHBOARD_PORT } });
});

app.get('/api/system/activity', requireAuth, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const logs = getActivityLogs(limit, 0);
        return res.json({ success: true, data: logs });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/system/cleanup', requireAuth, (req, res) => {
    try {
        const expiredSessions = cleanExpiredSessions();
        const msgCleanup = cleanupExpiredSessions();
        logActivity(req.admin.admin_id, 'system_cleanup', null, JSON.stringify({ expiredSessions, msgCleanup: msgCleanup.deletedCount }), req.ip);
        return res.json({ success: true, data: { expiredSessions, messagesDeleted: msgCleanup.deletedCount } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  USER MANAGEMENT API
// ═══════════════════════════════════════════════════════════

app.get('/api/users', requireAuth, (req, res) => {
    try {
        const users = getAllUsers();
        // Mask phone numbers for security
        const masked = users.map(u => ({
            ...u,
            phoneNumber: u.phoneNumber.length > 6 ? u.phoneNumber.slice(0, 4) + '***' + u.phoneNumber.slice(-3) : u.phoneNumber,
            phoneFull: u.phoneNumber, // full for admin use
        }));
        return res.json({ success: true, data: masked });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/users/:jid', requireAuth, (req, res) => {
    try {
        const profile = getUserProfile(req.params.jid);
        const prefs = getUserPreferences(req.params.jid);
        return res.json({ success: true, data: { profile, preferences: prefs } });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  ADMIN PASSWORD CHANGE
// ═══════════════════════════════════════════════════════════

app.post('/api/auth/change-password', requireAuth, (req, res) => {
    try {
        const { old_password, new_password } = req.body || {};
        if (!old_password || !new_password) return res.status(400).json({ success: false, error: 'Password lama dan baru wajib diisi' });
        if (new_password.length < 6) return res.status(400).json({ success: false, error: 'Password baru minimal 6 karakter' });
        const admin = getAdminById(req.admin.admin_id);
        if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
        const match = bcrypt.compareSync(old_password, admin.password_hash);
        if (!match) return res.status(401).json({ success: false, error: 'Password lama salah' });
        const hash = bcrypt.hashSync(new_password, 12);
        updateAdminPassword(admin.id, hash);
        logActivity(admin.id, 'password_change', null, null, req.ip);
        return res.json({ success: true, data: null });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
//  SPA CATCH-ALL: serve index.html for non-API routes
// ═══════════════════════════════════════════════════════════

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API endpoint not found' });
    }
    const indexPath = path.join(__dirname, 'public', 'index.html');
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    return res.status(200).send(`<!DOCTYPE html><html><head><title>Tama AI Dashboard</title></head><body style="background:#0C0E1A;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="text-align:center"><h1>Tama AI Dashboard</h1><p>Frontend belum di-build. Jalankan: <code>cd src/dashboard/frontend && npm run build</code></p></div></body></html>`);
});

// ═══════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════

let dashboardServer = null;

function startDashboardServer() {
    // Init defaults
    try { initDefaultAdmin(); } catch (e) { console.error('[Dashboard] initDefaultAdmin error:', e.message); }
    try { initDefaultConfigs(); } catch (e) { console.error('[Dashboard] initDefaultConfigs error:', e.message); }
    try { cleanExpiredSessions(); } catch (e) { /* ignore */ }

    return new Promise((resolve) => {
        dashboardServer = app.listen(DASHBOARD_PORT, '0.0.0.0', () => {
            console.log(`📊 Dashboard server running at http://localhost:${DASHBOARD_PORT}`);
            resolve(dashboardServer);
        });
    });
}

function stopDashboardServer() {
    return new Promise((resolve) => {
        if (dashboardServer) {
            dashboardServer.close(() => { dashboardServer = null; resolve(); });
        } else {
            resolve();
        }
    });
}

module.exports = { startDashboardServer, stopDashboardServer, app };
