/**
 * Tests for Tool Registry
 */

const {
    TOOLS,
    getAllTools,
    getToolByName,
    getToolsForAPI,
    getToolsForOwner,
    executeTool,
    getToolSummary,
} = require('../src/toolRegistry');

describe('Tool Registry', () => {
    describe('TOOLS array', () => {
        test('should have 25 tools', () => {
            expect(TOOLS).toHaveLength(25);
        });

        test('each tool should have required properties', () => {
            TOOLS.forEach(t => {
                expect(t).toHaveProperty('name');
                expect(t).toHaveProperty('description');
                expect(t).toHaveProperty('parameters');
                expect(t).toHaveProperty('execute');
                expect(typeof t.name).toBe('string');
                expect(typeof t.description).toBe('string');
                expect(typeof t.parameters).toBe('object');
                expect(typeof t.execute).toBe('function');
            });
        });

        test('tool names should be unique', () => {
            const names = TOOLS.map(t => t.name);
            expect(new Set(names).size).toBe(names.length);
        });

        test('tool names should use dot-separated namespace', () => {
            TOOLS.forEach(t => {
                expect(t.name).toMatch(/^[a-z]+\.[a-z0-9_]+$/);
            });
        });

        test('parameters should have type "object"', () => {
            TOOLS.forEach(t => {
                expect(t.parameters.type).toBe('object');
                expect(t.parameters).toHaveProperty('properties');
                expect(t.parameters).toHaveProperty('required');
            });
        });
    });

    describe('getAllTools()', () => {
        test('should return the full TOOLS array', () => {
            const result = getAllTools();
            expect(result).toBe(TOOLS);
        });
    });

    describe('getToolByName()', () => {
        test('should find document.extract_text', () => {
            const t = getToolByName('document.extract_text');
            expect(t).not.toBeNull();
            expect(t.name).toBe('document.extract_text');
        });

        test('should find web.search', () => {
            const t = getToolByName('web.search');
            expect(t).not.toBeNull();
            expect(t.parameters.properties).toHaveProperty('query');
        });

        test('should find youtube.get_info', () => {
            expect(getToolByName('youtube.get_info')).not.toBeNull();
        });

        test('should find weather.forecast', () => {
            const t = getToolByName('weather.forecast');
            expect(t).not.toBeNull();
            expect(t.parameters.properties).toHaveProperty('city');
        });

        test('should find tarot.reading', () => {
            const t = getToolByName('tarot.reading');
            expect(t).not.toBeNull();
            expect(t.parameters.properties).toHaveProperty('question');
        });

        test('should find file.create', () => {
            const t = getToolByName('file.create');
            expect(t).not.toBeNull();
            expect(t.parameters.required).toContain('fileName');
            expect(t.parameters.required).toContain('content');
        });

        test('should find admin.backup', () => {
            const t = getToolByName('admin.backup');
            expect(t).not.toBeNull();
            expect(t.requiresOwner).toBe(true);
        });

        test('should return null for unknown name', () => {
            expect(getToolByName('nonexistent.tool')).toBeNull();
        });
    });

    describe('getToolsForAPI()', () => {
        test('should return OpenAI-compatible format', () => {
            const tools = getToolsForAPI();
            tools.forEach(t => {
                expect(t.type).toBe('function');
                expect(t.function).toHaveProperty('name');
                expect(t.function).toHaveProperty('description');
                expect(t.function).toHaveProperty('parameters');
            });
        });

        test('should exclude owner-only tools', () => {
            const tools = getToolsForAPI();
            const names = tools.map(t => t.function.name);
            expect(names).not.toContain('admin.backup');
        });

        test('should include normal tools', () => {
            const tools = getToolsForAPI();
            const names = tools.map(t => t.function.name);
            expect(names).toContain('web.search');
            expect(names).toContain('weather.forecast');
            expect(names).toContain('tarot.reading');
        });
    });

    describe('getToolsForOwner()', () => {
        test('should include ALL tools (including owner-only)', () => {
            const tools = getToolsForOwner();
            expect(tools.length).toBe(TOOLS.length);
            const names = tools.map(t => t.function.name);
            expect(names).toContain('admin.backup');
        });

        test('should return OpenAI-compatible format', () => {
            const tools = getToolsForOwner();
            tools.forEach(t => {
                expect(t.type).toBe('function');
                expect(t.function).toHaveProperty('name');
            });
        });

        test('should have more tools than getToolsForAPI', () => {
            expect(getToolsForOwner().length).toBeGreaterThan(getToolsForAPI().length);
        });
    });

    describe('executeTool()', () => {
        test('should return error for unknown tool', async () => {
            const result = await executeTool('fake.tool', {}, {});
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unknown tool');
        });

        test('should execute document.supported_formats', async () => {
            const result = await executeTool('document.supported_formats', {}, {});
            expect(result.success).toBe(true);
            expect(result.formats).toBeDefined();
        });

        test('should execute calendar.today', async () => {
            const result = await executeTool('calendar.today', {}, {});
            expect(result.success).toBe(true);
            expect(result.text).toBeDefined();
        });

        test('should execute calendar.holidays', async () => {
            const result = await executeTool('calendar.holidays', {}, {});
            expect(result.success).toBe(true);
            expect(result.text).toBeDefined();
        });

        test('should execute admin.stats', async () => {
            // stats may fail without DB init, but executeTool should catch
            const result = await executeTool('admin.stats', {}, {});
            // It will either succeed or return error gracefully
            expect(result).toHaveProperty('success');
        });

        test('should execute file.create', async () => {
            const result = await executeTool('file.create', {
                fileName: 'test.md',
                content: '# Hello\nWorld',
            }, {});
            expect(result.success).toBe(true);
            expect(result.fileName).toBe('test.md');
            expect(result.content).toBe('# Hello\nWorld');
            expect(result.type).toBe('file');
        });

        test('should execute document.get_info', async () => {
            const result = await executeTool('document.get_info', { filename: 'test.pdf' }, {});
            expect(result.success).toBe(true);
        });

        test('should handle execution errors gracefully', async () => {
            const result = await executeTool('document.extract_text', {}, { mediaBuffer: null });
            expect(result.success).toBe(false);
        });

        test('should execute tarot.yesno', async () => {
            const result = await executeTool('tarot.yesno', { question: 'will it rain?' }, {});
            expect(result.success).toBe(true);
            expect(result.text).toBeDefined();
        });
    });

    describe('getToolSummary()', () => {
        test('should return a non-empty string', () => {
            const summary = getToolSummary();
            expect(typeof summary).toBe('string');
            expect(summary.length).toBeGreaterThan(100);
        });

        test('should contain tool names', () => {
            const summary = getToolSummary();
            expect(summary).toContain('web.search');
            expect(summary).toContain('weather.forecast');
            expect(summary).toContain('file.create');
        });

        test('should have parameter names in parentheses', () => {
            const summary = getToolSummary();
            expect(summary).toContain('web.search(query)');
            expect(summary).toContain('file.create(fileName, content)');
        });

        test('each line should describe one tool', () => {
            const summary = getToolSummary();
            const lines = summary.split('\n').filter(Boolean);
            expect(lines).toHaveLength(TOOLS.length);
        });
    });

    describe('Tool categories coverage', () => {
        test('should have document tools', () => {
            const docTools = TOOLS.filter(t => t.name.startsWith('document.'));
            expect(docTools.length).toBeGreaterThanOrEqual(2);
        });

        test('should have youtube tools', () => {
            const ytTools = TOOLS.filter(t => t.name.startsWith('youtube.'));
            expect(ytTools.length).toBeGreaterThanOrEqual(3);
        });

        test('should have calendar tools', () => {
            const calTools = TOOLS.filter(t => t.name.startsWith('calendar.'));
            expect(calTools.length).toBeGreaterThanOrEqual(5);
        });

        test('should have admin tools', () => {
            const adminTools = TOOLS.filter(t => t.name.startsWith('admin.'));
            expect(adminTools.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('requiresMedia tools', () => {
        test('document.extract_text should require document media', () => {
            const t = getToolByName('document.extract_text');
            expect(t.requiresMedia).toBe('document');
        });

        test('sticker.make should require image/video media', () => {
            const t = getToolByName('sticker.make');
            expect(t.requiresMedia).toBe('image_or_video');
        });

        test('voice.transcribe should require audio', () => {
            const t = getToolByName('voice.transcribe');
            expect(t.requiresMedia).toBe('audio');
        });
    });
});
