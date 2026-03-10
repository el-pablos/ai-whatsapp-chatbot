/**
 * Runtime Logger — Captures console output for dashboard streaming
 *
 * Intercepts console.log/warn/error and stores entries in a ring buffer.
 * Provides SSE streaming and REST API for the dashboard Server Logs page.
 *
 * @author Tama El Pablo
 */

const MAX_BUFFER_SIZE = 2000;

/** @type {Array<{id: number, timestamp: string, time: string, level: string, message: string}>} */
const logBuffer = [];
let logIdCounter = 0;

/** @type {Set<import('http').ServerResponse>} */
const sseClients = new Set();

/**
 * Classify a log message into a level tag
 */
function classifyLevel(method, message) {
    if (method === 'error') return 'error';
    if (method === 'warn') return 'warn';

    const msg = typeof message === 'string' ? message : '';
    if (/\berror\b|\bERROR\b|\bfail(ed)?\b|\bcrash/i.test(msg)) return 'error';
    if (/\bwarn(ing)?\b|\bWARN\b|\b⚠️/.test(msg)) return 'warn';
    if (/✅|✔|success|connected|started|running|online/i.test(msg)) return 'success';
    if (/\[debug\]|\bdebug\b/i.test(msg)) return 'debug';
    return 'info';
}

/**
 * Format arguments into a single string (like console does)
 */
function formatArgs(args) {
    return args.map(a => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return `${a.message}\n${a.stack || ''}`;
        try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
}

/**
 * Push a log entry into the buffer and broadcast to SSE clients
 */
function pushLog(method, args) {
    const now = new Date();
    const entry = {
        id: ++logIdCounter,
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString('en-GB', { hour12: false }),
        level: classifyLevel(method, args[0]),
        message: formatArgs(args),
    };

    logBuffer.push(entry);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
        logBuffer.splice(0, logBuffer.length - MAX_BUFFER_SIZE);
    }

    // Broadcast to SSE clients
    const data = `data: ${JSON.stringify(entry)}\n\n`;
    for (const client of sseClients) {
        try {
            client.write(data);
        } catch {
            sseClients.delete(client);
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  INTERCEPT CONSOLE
// ═══════════════════════════════════════════════════════════

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

let interceptActive = false;

function activateIntercept() {
    if (interceptActive) return;
    interceptActive = true;

    console.log = function (...args) {
        originalLog.apply(console, args);
        pushLog('log', args);
    };
    console.error = function (...args) {
        originalError.apply(console, args);
        pushLog('error', args);
    };
    console.warn = function (...args) {
        originalWarn.apply(console, args);
        pushLog('warn', args);
    };
}

// ═══════════════════════════════════════════════════════════
//  SSE HANDLER
// ═══════════════════════════════════════════════════════════

function handleSSE(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.write(':ok\n\n');

    sseClients.add(res);

    req.on('close', () => {
        sseClients.delete(res);
    });
}

// ═══════════════════════════════════════════════════════════
//  REST API
// ═══════════════════════════════════════════════════════════

/** Get recent logs (REST) */
function getRecentLogs(limit = 200) {
    return logBuffer.slice(-limit);
}

/** Get stats */
function getLogStats() {
    const total = logBuffer.length;
    const errors = logBuffer.filter(l => l.level === 'error').length;
    return { total, errors, clients: sseClients.size };
}

/** Clear buffer */
function clearLogs() {
    logBuffer.length = 0;
}

module.exports = {
    activateIntercept,
    handleSSE,
    getRecentLogs,
    getLogStats,
    clearLogs,
    sseClients,
};
