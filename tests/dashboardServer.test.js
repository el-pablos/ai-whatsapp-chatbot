/**
 * Tests for Dashboard Server
 */

const request = require('supertest');

// Mock database module
jest.mock('../src/database', () => ({
    initDatabase: jest.fn(() => ({
        prepare: jest.fn(() => ({
            all: jest.fn(() => []),
            get: jest.fn(() => ({ count: 0, c: 0 })),
            run: jest.fn(() => ({ changes: 0, lastInsertRowid: 1 })),
        })),
    })),
    initDefaultAdmin: jest.fn(),
    initDefaultConfigs: jest.fn(),
    cleanExpiredSessions: jest.fn(() => 0),
    getAdminByUsername: jest.fn(),
    getAdminById: jest.fn(),
    updateAdminLastLogin: jest.fn(),
    updateAdminPassword: jest.fn(),
    createAdminSession: jest.fn(() => ({ id: 1 })),
    getAdminSession: jest.fn(),
    deleteAdminSession: jest.fn(),
    logActivity: jest.fn(),
    getActivityLogs: jest.fn(() => []),
    getActivityLogsByAdmin: jest.fn(() => []),
    addToAllowlist: jest.fn(() => ({ id: 1 })),
    removeFromAllowlist: jest.fn(() => true),
    toggleAllowlist: jest.fn(),
    updateAllowlistEntry: jest.fn(() => true),
    getAllowlist: jest.fn(() => []),
    refreshAllowlistCache: jest.fn(),
    normalizePhoneNumber: jest.fn((p) => p.replace(/\D/g, '').replace(/^0/, '62')),
    getActiveAllowlistCount: jest.fn(() => 0),
    getTotalAllowlistCount: jest.fn(() => 0),
    setConfig: jest.fn(),
    getConfig: jest.fn(),
    getAllConfigs: jest.fn(() => ({})),
    getAllConfigRows: jest.fn(() => []),
    deleteConfig: jest.fn(),
    setFeatureToggle: jest.fn(),
    getFeatureToggle: jest.fn(),
    getAllFeatureToggles: jest.fn(() => ({})),
    isFeatureEnabled: jest.fn(() => true),
    refreshFeatureToggleCache: jest.fn(),
    getStats: jest.fn(() => ({ totalUsers: 0, totalMessages: 0 })),
    getAllUsers: jest.fn(() => []),
    getUserProfile: jest.fn(() => null),
    getUserPreferences: jest.fn(() => null),
    getConversationHistory: jest.fn(() => []),
    cleanupExpiredSessions: jest.fn(() => ({ deletedCount: 0 })),
    isPhoneAllowed: jest.fn(() => true),
}));

jest.mock('../src/featureRegistry', () => ({
    getAllFeatures: jest.fn(() => [
        { id: 'ai_chat', name: 'AI Chat', description: 'Chat AI' },
    ]),
}));

const bcrypt = require('bcryptjs');
const db = require('../src/database');
const { app } = require('../src/dashboard/server');

describe('Dashboard Server', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Re-apply mock return values cleared by resetMocks
        db.initDatabase.mockReturnValue({
            prepare: jest.fn(() => ({
                all: jest.fn(() => []),
                get: jest.fn(() => ({ count: 0, c: 0 })),
                run: jest.fn(() => ({ changes: 0, lastInsertRowid: 1 })),
            })),
        });
        db.getAdminByUsername.mockReturnValue(null);
        db.getAdminSession.mockReturnValue(null);
        db.getAllowlist.mockReturnValue([]);
        db.getAllConfigRows.mockReturnValue([]);
        db.getAllFeatureToggles.mockReturnValue({});
        db.getStats.mockReturnValue({ totalUsers: 0, totalMessages: 0 });
        db.getAllUsers.mockReturnValue([]);
        db.getActivityLogs.mockReturnValue([]);
        db.normalizePhoneNumber.mockImplementation((p) => p.replace(/\D/g, '').replace(/^0/, '62'));
        db.cleanupExpiredSessions.mockReturnValue({ deletedCount: 0 });
        db.cleanExpiredSessions.mockReturnValue(0);
        db.createAdminSession.mockReturnValue({ id: 1 });
        db.addToAllowlist.mockReturnValue({ id: 1 });
        db.removeFromAllowlist.mockReturnValue(true);
        db.updateAllowlistEntry.mockReturnValue(true);
        db.getUserProfile.mockReturnValue(null);
        db.getUserPreferences.mockReturnValue(null);
        db.isFeatureEnabled.mockReturnValue(true);
    });

    // ──────────────────────────────────────────────────
    //  AUTH
    // ──────────────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        test('should reject missing credentials', async () => {
            const res = await request(app).post('/api/auth/login').send({});
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        test('should reject unknown user', async () => {
            db.getAdminByUsername.mockReturnValue(null);
            const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
            expect(res.status).toBe(401);
        });

        test('should reject wrong password', async () => {
            db.getAdminByUsername.mockReturnValue({
                id: 1, username: 'admin', is_active: 1,
                password_hash: bcrypt.hashSync('correct', 10),
                display_name: 'Admin', role: 'admin',
            });
            const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
            expect(res.status).toBe(401);
        });

        test('should login successfully', async () => {
            db.getAdminByUsername.mockReturnValue({
                id: 1, username: 'admin', is_active: 1,
                password_hash: bcrypt.hashSync('admin123', 10),
                display_name: 'Admin', role: 'admin',
            });
            const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe('admin');
            expect(res.headers['set-cookie']).toBeDefined();
        });
    });

    describe('GET /api/auth/me', () => {
        test('should reject without auth', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });

        test('should return user with valid session', async () => {
            db.getAdminSession.mockReturnValue({
                admin_id: 1, username: 'admin', display_name: 'Admin', role: 'admin', admin_active: 1,
            });
            const res = await request(app).get('/api/auth/me').set('Cookie', 'dashboard_token=valid-token');
            expect(res.status).toBe(200);
            expect(res.body.data.username).toBe('admin');
        });
    });

    // ──────────────────────────────────────────────────
    //  ALLOWLIST
    // ──────────────────────────────────────────────────
    describe('Allowlist API', () => {
        const authCookie = 'dashboard_token=valid-token';
        beforeEach(() => {
            db.getAdminSession.mockReturnValue({
                admin_id: 1, username: 'admin', display_name: 'Admin', role: 'admin', admin_active: 1,
            });
        });

        test('GET /api/allowlist should return entries', async () => {
            db.getAllowlist.mockReturnValue([{ phone_number: '6281234567890', is_active: true }]);
            const res = await request(app).get('/api/allowlist').set('Cookie', authCookie);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        test('POST /api/allowlist should add number', async () => {
            const res = await request(app).post('/api/allowlist').set('Cookie', authCookie)
                .send({ phone_number: '6281234567890', display_name: 'Test' });
            expect(res.status).toBe(200);
            expect(db.addToAllowlist).toHaveBeenCalled();
        });

        test('POST /api/allowlist should reject without phone', async () => {
            const res = await request(app).post('/api/allowlist').set('Cookie', authCookie).send({});
            expect(res.status).toBe(400);
        });

        test('DELETE /api/allowlist/:phone should remove', async () => {
            const res = await request(app).delete('/api/allowlist/6281234567890').set('Cookie', authCookie);
            expect(res.status).toBe(200);
            expect(db.removeFromAllowlist).toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────
    //  CONFIG
    // ──────────────────────────────────────────────────
    describe('Config API', () => {
        const authCookie = 'dashboard_token=valid-token';
        beforeEach(() => {
            db.getAdminSession.mockReturnValue({
                admin_id: 1, username: 'admin', display_name: 'Admin', role: 'admin', admin_active: 1,
            });
        });

        test('GET /api/config should return configs', async () => {
            db.getAllConfigRows.mockReturnValue([{ config_key: 'bot_name', config_value: 'Tama' }]);
            const res = await request(app).get('/api/config').set('Cookie', authCookie);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });

        test('PUT /api/config/:key should update', async () => {
            const res = await request(app).put('/api/config/bot_name').set('Cookie', authCookie).send({ value: 'NewBot' });
            expect(res.status).toBe(200);
            expect(db.setConfig).toHaveBeenCalled();
        });
    });

    // ──────────────────────────────────────────────────
    //  FEATURES
    // ──────────────────────────────────────────────────
    describe('Features API', () => {
        const authCookie = 'dashboard_token=valid-token';
        beforeEach(() => {
            db.getAdminSession.mockReturnValue({
                admin_id: 1, username: 'admin', display_name: 'Admin', role: 'admin', admin_active: 1,
            });
            const { getAllFeatures } = require('../src/featureRegistry');
            getAllFeatures.mockReturnValue([
                { id: 'ai_chat', name: 'AI Chat', description: 'Chat AI' },
            ]);
        });

        test('GET /api/features should merge feature list with toggles', async () => {
            const res = await request(app).get('/api/features').set('Cookie', authCookie);
            expect(res.status).toBe(200);
            expect(res.body.data[0].id).toBe('ai_chat');
            expect(res.body.data[0]).toHaveProperty('is_enabled');
        });

        test('PUT /api/features/:id should toggle feature', async () => {
            const res = await request(app).put('/api/features/ai_chat').set('Cookie', authCookie).send({ is_enabled: false });
            expect(res.status).toBe(200);
            expect(db.setFeatureToggle).toHaveBeenCalledWith('ai_chat', false, 'admin');
        });
    });

    // ──────────────────────────────────────────────────
    //  SYSTEM
    // ──────────────────────────────────────────────────
    describe('System API', () => {
        test('GET /api/system/health should be public', async () => {
            const res = await request(app).get('/api/system/health');
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('ok');
        });
    });

    // ──────────────────────────────────────────────────
    //  SPA CATCH-ALL
    // ──────────────────────────────────────────────────
    describe('Catch-all', () => {
        test('GET /nonexistent-api should return 404', async () => {
            const res = await request(app).get('/api/nonexistent');
            expect(res.status).toBe(404);
        });

        test('GET / should serve HTML', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            // Should serve HTML (either built SPA or fallback)
            expect(res.text).toContain('Tama AI Dashboard');
        });
    });
});
