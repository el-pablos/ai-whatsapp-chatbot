/**
 * Python Runner — reusable utility to call Python scripts from Node.js
 *
 * Handles:
 *   - Auto-detect python3/python binary
 *   - Configurable via PYTHON_BIN env
 *   - Promise-based with stdout/stderr/code
 *   - Timeout support
 *
 * @author  Tama El Pablo
 * @version 1.0.0
 */

const { execFile } = require('child_process');
const path = require('path');

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT = 60_000; // 60 seconds
const TOOLS_DIR = path.join(__dirname, '..', 'tools');

// ═══════════════════════════════════════════════════════════
//  PYTHON BINARY DETECTION
// ═══════════════════════════════════════════════════════════

let _cachedPythonBin = null;

/**
 * Find the Python binary path.
 * Priority: PYTHON_BIN env → python3 → python
 * @returns {Promise<string>} resolved python binary name/path
 */
const findPythonBin = async () => {
    if (_cachedPythonBin) return _cachedPythonBin;

    // 1. Env override
    if (process.env.PYTHON_BIN) {
        _cachedPythonBin = process.env.PYTHON_BIN;
        return _cachedPythonBin;
    }

    // 2. Try python3
    const tryBin = (bin) => new Promise((resolve) => {
        execFile(bin, ['--version'], { timeout: 5000 }, (err) => {
            resolve(!err);
        });
    });

    if (await tryBin('python3')) {
        _cachedPythonBin = 'python3';
        return _cachedPythonBin;
    }

    if (await tryBin('python')) {
        _cachedPythonBin = 'python';
        return _cachedPythonBin;
    }

    throw new Error('Python not found. Install Python 3 or set PYTHON_BIN env variable.');
};

/**
 * Check if Python is available on the system.
 * @returns {Promise<boolean>}
 */
const isPythonAvailable = async () => {
    try {
        await findPythonBin();
        return true;
    } catch {
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
//  CORE: runPython
// ═══════════════════════════════════════════════════════════

/**
 * Execute a Python script with arguments.
 *
 * @param {string} scriptPath - Absolute or relative path to .py file
 * @param {string[]} args - CLI arguments to pass
 * @param {object} opts
 * @param {number} opts.timeout - Timeout in ms (default: 60s)
 * @param {string} opts.cwd - Working directory
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
const runPython = async (scriptPath, args = [], opts = {}) => {
    const pythonBin = await findPythonBin();
    const timeout = opts.timeout || DEFAULT_TIMEOUT;
    const cwd = opts.cwd || process.cwd();

    // Resolve script path relative to tools/ if not absolute
    const resolvedScript = path.isAbsolute(scriptPath)
        ? scriptPath
        : path.join(TOOLS_DIR, scriptPath);

    return new Promise((resolve, reject) => {
        const child = execFile(
            pythonBin,
            [resolvedScript, ...args],
            {
                timeout,
                cwd,
                maxBuffer: 10 * 1024 * 1024, // 10MB
                windowsHide: true,
            },
            (err, stdout, stderr) => {
                if (err && err.killed) {
                    return reject(new Error(`Python script timed out after ${timeout}ms`));
                }
                // Return even on non-zero exit (caller decides)
                resolve({
                    stdout: stdout || '',
                    stderr: stderr || '',
                    code: err ? err.code || 1 : 0,
                });
            },
        );
    });
};

/**
 * Execute a Python script and parse JSON output from stdout.
 *
 * @param {string} scriptPath - Path to .py file
 * @param {string[]} args - CLI arguments
 * @param {object} opts - Options (same as runPython)
 * @returns {Promise<object>} Parsed JSON from stdout
 */
const runPythonJSON = async (scriptPath, args = [], opts = {}) => {
    const result = await runPython(scriptPath, args, opts);

    if (result.code !== 0) {
        // Try parsing error JSON from stdout
        try {
            const parsed = JSON.parse(result.stdout);
            if (parsed.error || parsed.errors) {
                throw new Error(parsed.error || parsed.errors.join('; '));
            }
        } catch (parseErr) {
            if (parseErr.message && !parseErr.message.includes('Unexpected')) {
                throw parseErr; // Re-throw parsed error
            }
        }
        throw new Error(
            `Python script exited with code ${result.code}: ${result.stderr || result.stdout || 'unknown error'}`
        );
    }

    try {
        return JSON.parse(result.stdout);
    } catch {
        throw new Error(`Failed to parse Python JSON output: ${result.stdout.substring(0, 200)}`);
    }
};

/**
 * Reset cached python binary (for testing)
 */
const resetPythonBinCache = () => {
    _cachedPythonBin = null;
};

module.exports = {
    findPythonBin,
    isPythonAvailable,
    runPython,
    runPythonJSON,
    resetPythonBinCache,
    TOOLS_DIR,
    DEFAULT_TIMEOUT,
};
