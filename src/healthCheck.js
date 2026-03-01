/**
 * Health Check Server Module
 * 
 * Server Express yang menyediakan endpoint untuk monitoring
 * status bot dengan dashboard stats dan user list.
 * 
 * @author Tama El Pablo
 * @version 2.1.0
 */

const express = require('express');
const { getStats, getAllUsers, cleanupExpiredSessions } = require('./database');
const pkg = require('../package.json');

const PORT = process.env.HEALTH_CHECK_PORT || 8008;

let serverInstance = null;
let startTime = Date.now();

/**
 * Membuat dan menjalankan Health Check server
 * 
 * @returns {Promise<Object>} - Express app dan server instance
 */
const startHealthCheckServer = () => {
    return new Promise((resolve, reject) => {
        const app = express();

        // Middleware untuk JSON
        app.use(express.json());

        // Health Check endpoint utama
        app.get('/', (req, res) => {
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            
            res.status(200).json({
                status: 'ok',
                uptime: uptime,
                uptimeFormatted: formatUptime(uptime),
                timestamp: new Date().toISOString(),
                service: 'AI WhatsApp Chatbot - Tama',
                version: pkg.version,
                author: 'Tama El Pablo',
                endpoints: {
                    health: '/health',
                    status: '/status',
                    dashboard: '/dashboard',
                    users: '/users',
                    stats: '/stats',
                    capabilities: '/capabilities'
                }
            });
        });

        // Health endpoint alternatif
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'ok',
                healthy: true
            });
        });

        // Status endpoint dengan detail lebih
        app.get('/status', (req, res) => {
            const memUsage = process.memoryUsage();
            
            res.status(200).json({
                status: 'ok',
                uptime: Math.floor((Date.now() - startTime) / 1000),
                memory: {
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
                    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
                },
                pid: process.pid,
                nodeVersion: process.version
            });
        });

        // Dashboard endpoint dengan stats lengkap
        app.get('/dashboard', (req, res) => {
            try {
                const memUsage = process.memoryUsage();
                const uptime = Math.floor((Date.now() - startTime) / 1000);
                const stats = getStats();
                const users = getAllUsers();
                
                res.status(200).json({
                    status: 'ok',
                    bot: {
                        name: 'Tama AI Bot',
                        version: pkg.version,
                        author: 'Tama El Pablo',
                        contact: {
                            whatsapp: '082210819939',
                            instagram: 'tam.aspx'
                        }
                    },
                    server: {
                        uptime: uptime,
                        uptimeFormatted: formatUptime(uptime),
                        memory: {
                            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
                            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
                            rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
                        },
                        pid: process.pid,
                        nodeVersion: process.version
                    },
                    database: {
                        totalMessages: stats.totalMessages,
                        activeMessages: stats.activeMessages,
                        expiredMessages: stats.expiredMessages,
                        totalChats: stats.totalChats,
                        activeChats: stats.activeChats,
                        totalUsers: stats.totalUsers,
                        sessionExpiryHours: stats.sessionExpiryHours
                    },
                    users: users.map(u => ({
                        phone: u.phoneNumber,
                        name: u.name,
                        messageCount: u.messageCount,
                        lastSeen: new Date(u.lastSeen).toISOString(),
                        isActive: u.isActive,
                        isGroup: u.isGroup
                    })),
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('[Dashboard] Error:', error.message);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to load dashboard data'
                });
            }
        });

        // Users list endpoint (phone numbers)
        app.get('/users', (req, res) => {
            try {
                const users = getAllUsers();
                
                res.status(200).json({
                    status: 'ok',
                    count: users.length,
                    users: users.map(u => ({
                        phone: u.phoneNumber,
                        name: u.name,
                        messageCount: u.messageCount,
                        firstSeen: new Date(u.firstSeen).toISOString(),
                        lastSeen: new Date(u.lastSeen).toISOString(),
                        isActive: u.isActive,
                        isGroup: u.isGroup
                    }))
                });
            } catch (error) {
                console.error('[Users] Error:', error.message);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to load users'
                });
            }
        });

        // Capabilities endpoint — dependency status check
        app.get('/capabilities', (req, res) => {
            try {
                const { getSummary } = require('./capabilities');
                const summary = getSummary();
                res.status(200).json({
                    status: summary.fail === 0 ? 'ok' : 'degraded',
                    ...summary,
                });
            } catch (error) {
                console.error('[Capabilities] Error:', error.message);
                res.status(500).json({ status: 'error', message: error.message });
            }
        });

        // Stats endpoint
        app.get('/stats', (req, res) => {
            try {
                const stats = getStats();
                
                res.status(200).json({
                    status: 'ok',
                    ...stats
                });
            } catch (error) {
                console.error('[Stats] Error:', error.message);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to load stats'
                });
            }
        });

        // Cleanup endpoint (trigger manual cleanup of expired sessions)
        app.post('/cleanup', (req, res) => {
            try {
                const result = cleanupExpiredSessions();
                
                res.status(200).json({
                    status: 'ok',
                    message: `Cleaned up ${result.deletedCount} expired messages`,
                    ...result
                });
            } catch (error) {
                console.error('[Cleanup] Error:', error.message);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to cleanup'
                });
            }
        });

        // 404 handler
        app.use((req, res) => {
            res.status(404).json({
                status: 'error',
                message: 'Endpoint not found jir 😭'
            });
        });

        // Error handler
        app.use((err, req, res, next) => {
            console.error('[Health Check] Error:', err.message);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error euy 😓'
            });
        });

        serverInstance = app.listen(PORT, () => {
            console.log(`[Health Check] Server running di port ${PORT} 🚀`);
            startTime = Date.now();
            resolve({ app, server: serverInstance });
        });

        serverInstance.on('error', (err) => {
            console.error('[Health Check] Failed to start server:', err.message);
            reject(err);
        });
    });
};

/**
 * Menghentikan Health Check server
 * 
 * @returns {Promise<void>}
 */
const stopHealthCheckServer = () => {
    return new Promise((resolve, reject) => {
        if (serverInstance) {
            serverInstance.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    serverInstance = null;
                    console.log('[Health Check] Server stopped');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

/**
 * Format uptime ke string yang readable
 * 
 * @param {number} seconds - Uptime dalam detik
 * @returns {string} - Formatted uptime string
 */
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
};

/**
 * Get current server instance (untuk testing)
 */
const getServerInstance = () => serverInstance;

/**
 * Reset start time (untuk testing)
 */
const resetStartTime = () => {
    startTime = Date.now();
};

module.exports = {
    startHealthCheckServer,
    stopHealthCheckServer,
    formatUptime,
    getServerInstance,
    resetStartTime,
    PORT
};
