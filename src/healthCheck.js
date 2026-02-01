/**
 * Health Check Server Module
 * 
 * Server Express sederhana yang menyediakan endpoint untuk monitoring
 * status bot. Akan diakses via domain Cloudflare.
 */

const express = require('express');

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
                version: '1.0.0'
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
