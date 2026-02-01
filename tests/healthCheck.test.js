/**
 * Unit Tests - Health Check Server Module
 * 
 * Test cases untuk validasi:
 * 1. Server start dan stop
 * 2. Endpoint responses
 * 3. Uptime formatting
 */

const http = require('http');

const {
    startHealthCheckServer,
    stopHealthCheckServer,
    formatUptime,
    getServerInstance,
    resetStartTime,
    PORT
} = require('../src/healthCheck');

describe('Health Check Server Module', () => {

    let serverInfo = null;

    beforeAll(async () => {
        // Start server once for all tests
        serverInfo = await startHealthCheckServer();
    });

    afterAll(async () => {
        // Stop server after all tests
        await stopHealthCheckServer();
    });

    describe('Server Lifecycle', () => {

        it('should start server successfully', () => {
            expect(serverInfo).toBeDefined();
            expect(serverInfo.app).toBeDefined();
            expect(serverInfo.server).toBeDefined();
        });

        it('should listen on configured port', () => {
            const address = serverInfo.server.address();
            expect(address.port).toBe(parseInt(PORT));
        });

        it('getServerInstance should return active server', () => {
            const instance = getServerInstance();
            expect(instance).toBeDefined();
            expect(instance.listening).toBe(true);
        });

    });

    describe('GET / - Main Health Check Endpoint', () => {

        it('should return 200 status code', async () => {
            const response = await makeRequest('/');
            expect(response.statusCode).toBe(200);
        });

        it('should return JSON with status ok', async () => {
            const response = await makeRequest('/');
            const body = JSON.parse(response.body);

            expect(body.status).toBe('ok');
        });

        it('should include uptime in response', async () => {
            const response = await makeRequest('/');
            const body = JSON.parse(response.body);

            expect(typeof body.uptime).toBe('number');
            expect(body.uptime).toBeGreaterThanOrEqual(0);
        });

        it('should include uptimeFormatted in response', async () => {
            const response = await makeRequest('/');
            const body = JSON.parse(response.body);

            expect(typeof body.uptimeFormatted).toBe('string');
        });

        it('should include timestamp in ISO format', async () => {
            const response = await makeRequest('/');
            const body = JSON.parse(response.body);

            expect(body.timestamp).toBeDefined();
            // Validate ISO format
            expect(() => new Date(body.timestamp)).not.toThrow();
        });

        it('should include service name and version', async () => {
            const response = await makeRequest('/');
            const body = JSON.parse(response.body);

            expect(body.service).toContain('Tama');
            expect(body.version).toBe('2.1.0');
        });

    });

    describe('GET /health - Simple Health Endpoint', () => {

        it('should return 200 status code', async () => {
            const response = await makeRequest('/health');
            expect(response.statusCode).toBe(200);
        });

        it('should return status ok and healthy true', async () => {
            const response = await makeRequest('/health');
            const body = JSON.parse(response.body);

            expect(body.status).toBe('ok');
            expect(body.healthy).toBe(true);
        });

    });

    describe('GET /status - Detailed Status Endpoint', () => {

        it('should return 200 status code', async () => {
            const response = await makeRequest('/status');
            expect(response.statusCode).toBe(200);
        });

        it('should include memory information', async () => {
            const response = await makeRequest('/status');
            const body = JSON.parse(response.body);

            expect(body.memory).toBeDefined();
            expect(body.memory.heapUsed).toBeDefined();
            expect(body.memory.heapTotal).toBeDefined();
            expect(body.memory.rss).toBeDefined();
        });

        it('should include process information', async () => {
            const response = await makeRequest('/status');
            const body = JSON.parse(response.body);

            expect(body.pid).toBe(process.pid);
            expect(body.nodeVersion).toBe(process.version);
        });

    });

    describe('404 Handler', () => {

        it('should return 404 for unknown endpoints', async () => {
            const response = await makeRequest('/unknown-endpoint-xyz');
            expect(response.statusCode).toBe(404);
        });

        it('should return error status for 404', async () => {
            const response = await makeRequest('/nonexistent');
            const body = JSON.parse(response.body);

            expect(body.status).toBe('error');
            expect(body.message).toContain('not found');
        });

    });

    describe('formatUptime', () => {

        it('should format seconds only', () => {
            expect(formatUptime(45)).toBe('45s');
        });

        it('should format minutes and seconds', () => {
            expect(formatUptime(125)).toBe('2m 5s');
        });

        it('should format hours, minutes and seconds', () => {
            expect(formatUptime(3725)).toBe('1h 2m 5s');
        });

        it('should format days, hours, minutes and seconds', () => {
            expect(formatUptime(90061)).toBe('1d 1h 1m 1s');
        });

        it('should handle zero', () => {
            expect(formatUptime(0)).toBe('0s');
        });

        it('should handle large values', () => {
            const result = formatUptime(864000); // 10 days
            expect(result).toContain('10d');
        });

    });

    describe('resetStartTime', () => {

        it('should reset uptime to near zero', async () => {
            // Wait a bit first
            await new Promise(resolve => setTimeout(resolve, 100));
            
            resetStartTime();
            
            const response = await makeRequest('/');
            const body = JSON.parse(response.body);

            // Uptime should be very small after reset
            expect(body.uptime).toBeLessThan(2);
        });

    });

});

/**
 * Helper function untuk HTTP requests
 */
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}
