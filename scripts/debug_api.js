/**
 * Debug script to test Copilot API with the current tools schema.
 * Usage: node scripts/debug_api.js
 */
const axios = require('axios');
const { getToolsForAPI } = require('../src/toolRegistry');

const API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4.6';

async function testRequest(label, tools) {
    const body = {
        model: MODEL,
        messages: [
            { role: 'system', content: 'Kamu Tama AI. Jawab singkat.' },
            { role: 'user', content: 'hay' },
        ],
        temperature: 0.85,
    };
    if (tools) {
        body.tools = tools;
        body.tool_choice = 'auto';
    }

    console.log(`\n── TEST: ${label} ──`);
    console.log(`  Tools count: ${tools ? tools.length : 0}`);
    console.log(`  Payload size: ${JSON.stringify(body).length} chars`);

    try {
        const res = await axios.post(`${API_URL}/v1/chat/completions`, body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
        console.log(`  ✅ SUCCESS — response: "${res.data.choices?.[0]?.message?.content?.substring(0, 80)}..."`);
        return true;
    } catch (err) {
        console.log(`  ❌ FAILED — ${err.response?.status} ${err.response?.statusText}`);
        if (err.response?.data) {
            console.log(`  Error body:`, JSON.stringify(err.response.data).substring(0, 500));
        }
        return false;
    }
}

async function main() {
    const allTools = getToolsForAPI();
    console.log(`Total tools: ${allTools.length}`);
    console.log(`Tool names: ${allTools.map(t => t.function.name).join(', ')}`);

    // Test all tools together — underscore names should work now
    await testRequest('All 25 tools (underscore names)', allTools);
}

main().catch(console.error);
