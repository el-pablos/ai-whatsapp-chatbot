/**
 * Error Utilities - normalizeError & helpers
 * 
 * Konsisten error handling across all modules.
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

/**
 * Normalize ANY thrown value into a proper Error with a message string.
 * Handles: Error objects, strings, numbers, null, undefined, Axios errors, etc.
 *
 * @param {*} err - Whatever was caught
 * @returns {{ message: string, code: string|null, status: number|null, original: * }}
 */
const normalizeError = (err) => {
    // Already an Error
    if (err instanceof Error) {
        return {
            message: err.message || 'Unknown error',
            code: err.code || null,
            status: err.response?.status || err.output?.statusCode || null,
            original: err
        };
    }

    // Plain string
    if (typeof err === 'string') {
        return { message: err, code: null, status: null, original: err };
    }

    // Object with message property (e.g. Axios response.data)
    if (err && typeof err === 'object' && err.message) {
        return {
            message: String(err.message),
            code: err.code || null,
            status: err.status || err.statusCode || null,
            original: err
        };
    }

    // Fallback
    return {
        message: err != null ? String(err) : 'Unknown error',
        code: null,
        status: null,
        original: err
    };
};

/**
 * Safe error message extraction for user-facing text.
 * Never leaks stack traces or internal details.
 *
 * @param {*} err
 * @param {string} fallback - message shown to users
 * @returns {string}
 */
const safeErrorMessage = (err, fallback = 'Terjadi error, coba lagi ya bro') => {
    const { message } = normalizeError(err);
    // Strip paths, stack traces, internal info
    if (message.includes('\n') || message.length > 200) {
        return fallback;
    }
    return message;
};

module.exports = { normalizeError, safeErrorMessage };
