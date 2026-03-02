/**
 * Tests for Python Runner utility
 *
 * All tests mock child_process.execFile — no real Python needed.
 */

// Mock child_process before requiring module
jest.mock('child_process', () => ({
    execFile: jest.fn(),
}));

const { execFile } = require('child_process');
const { runPython, runPythonJSON, findPythonBin, isPythonAvailable, resetPythonBinCache, TOOLS_DIR, DEFAULT_TIMEOUT } = require('../src/pythonRunner');
const path = require('path');

beforeEach(() => {
    jest.clearAllMocks();
    resetPythonBinCache();
});

describe('pythonRunner', () => {
    // ─── findPythonBin ──────────────────────────────────────
    describe('findPythonBin', () => {
        test('should use PYTHON_BIN env if set', async () => {
            process.env.PYTHON_BIN = '/usr/local/bin/python3.11';
            const bin = await findPythonBin();
            expect(bin).toBe('/usr/local/bin/python3.11');
            delete process.env.PYTHON_BIN;
        });

        test('should try python3 first', async () => {
            delete process.env.PYTHON_BIN;
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (bin === 'python3') cb(null, 'Python 3.11.0', '');
                else cb(new Error('not found'));
            });

            const bin = await findPythonBin();
            expect(bin).toBe('python3');
        });

        test('should fallback to python if python3 not available', async () => {
            delete process.env.PYTHON_BIN;
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (bin === 'python3') cb(new Error('not found'));
                else if (bin === 'python') cb(null, 'Python 3.10.0', '');
                else cb(new Error('not found'));
            });

            const bin = await findPythonBin();
            expect(bin).toBe('python');
        });

        test('should throw if no python found', async () => {
            delete process.env.PYTHON_BIN;
            execFile.mockImplementation((bin, args, opts, cb) => {
                cb(new Error('not found'));
            });

            await expect(findPythonBin()).rejects.toThrow('Python not found');
        });

        test('should cache python binary on subsequent calls', async () => {
            process.env.PYTHON_BIN = '/usr/bin/python3';
            const bin1 = await findPythonBin();
            const bin2 = await findPythonBin();
            expect(bin1).toBe(bin2);
            expect(bin1).toBe('/usr/bin/python3');
            delete process.env.PYTHON_BIN;
        });
    });

    // ─── isPythonAvailable ──────────────────────────────────
    describe('isPythonAvailable', () => {
        test('should return true when python is found', async () => {
            process.env.PYTHON_BIN = 'python3';
            const result = await isPythonAvailable();
            expect(result).toBe(true);
            delete process.env.PYTHON_BIN;
        });

        test('should return false when python is not found', async () => {
            delete process.env.PYTHON_BIN;
            execFile.mockImplementation((bin, args, opts, cb) => {
                cb(new Error('not found'));
            });

            const result = await isPythonAvailable();
            expect(result).toBe(false);
        });
    });

    // ─── runPython ──────────────────────────────────────────
    describe('runPython', () => {
        beforeEach(() => {
            process.env.PYTHON_BIN = 'python3';
        });

        afterEach(() => {
            delete process.env.PYTHON_BIN;
        });

        test('should execute python script and return output', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    cb(null, '{"success": true}', '');
                } else {
                    cb(null, 'Python 3.11', '');
                }
            });

            const result = await runPython('test_script.py', ['--arg', 'value']);
            expect(result.stdout).toBe('{"success": true}');
            expect(result.stderr).toBe('');
            expect(result.code).toBe(0);
        });

        test('should resolve script path relative to tools/ dir', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    cb(null, 'ok', '');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            await runPython('pptx_generator.py', []);
            const callArgs = execFile.mock.calls.find(c => c[1][0].endsWith('.py'));
            expect(callArgs[1][0]).toBe(path.join(TOOLS_DIR, 'pptx_generator.py'));
        });

        test('should use absolute path directly', async () => {
            const absPath = '/absolute/script.py';
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    cb(null, 'ok', '');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            await runPython(absPath, []);
            const callArgs = execFile.mock.calls.find(c => c[1][0] === absPath);
            expect(callArgs).toBeTruthy();
        });

        test('should return non-zero code on error without killing', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    const err = new Error('exit 1');
                    err.code = 1;
                    cb(err, '', 'some error');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            const result = await runPython('fail.py', []);
            expect(result.code).toBe(1);
            expect(result.stderr).toBe('some error');
        });

        test('should reject on timeout (killed process)', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    const err = new Error('killed');
                    err.killed = true;
                    cb(err, '', '');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            await expect(runPython('slow.py', [], { timeout: 1000 }))
                .rejects.toThrow('timed out');
        });
    });

    // ─── runPythonJSON ──────────────────────────────────────
    describe('runPythonJSON', () => {
        beforeEach(() => {
            process.env.PYTHON_BIN = 'python3';
        });

        afterEach(() => {
            delete process.env.PYTHON_BIN;
        });

        test('should parse JSON stdout on success', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    cb(null, '{"success": true, "slides": 5}', '');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            const result = await runPythonJSON('gen.py', ['--in', 'spec.json']);
            expect(result).toEqual({ success: true, slides: 5 });
        });

        test('should throw on non-zero exit code', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    const err = new Error('exit 1');
                    err.code = 1;
                    cb(err, '{"success": false, "error": "bad spec"}', '');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            await expect(runPythonJSON('gen.py', []))
                .rejects.toThrow('bad spec');
        });

        test('should throw on non-JSON stdout', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    cb(null, 'not json output', '');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            await expect(runPythonJSON('gen.py', []))
                .rejects.toThrow('Failed to parse Python JSON');
        });

        test('should throw stderr on non-zero exit when stdout is not JSON', async () => {
            execFile.mockImplementation((bin, args, opts, cb) => {
                if (args[0] && args[0].endsWith('.py')) {
                    const err = new Error('exit 1');
                    err.code = 1;
                    cb(err, '', 'ModuleNotFoundError: No module named pptx');
                } else {
                    cb(null, 'Python 3', '');
                }
            });

            await expect(runPythonJSON('gen.py', []))
                .rejects.toThrow('ModuleNotFoundError');
        });
    });

    // ─── Constants ──────────────────────────────────────────
    describe('constants', () => {
        test('TOOLS_DIR should point to tools/ directory', () => {
            expect(TOOLS_DIR).toContain('tools');
        });

        test('DEFAULT_TIMEOUT should be 60 seconds', () => {
            expect(DEFAULT_TIMEOUT).toBe(60000);
        });
    });

    // ─── resetPythonBinCache ────────────────────────────────
    describe('resetPythonBinCache', () => {
        test('should allow re-detection after reset', async () => {
            process.env.PYTHON_BIN = '/first/python3';
            const bin1 = await findPythonBin();
            expect(bin1).toBe('/first/python3');

            resetPythonBinCache();
            process.env.PYTHON_BIN = '/second/python3';
            const bin2 = await findPythonBin();
            expect(bin2).toBe('/second/python3');

            delete process.env.PYTHON_BIN;
        });
    });
});
