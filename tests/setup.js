/**
 * Jest Setup - Environment preparation before tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CF_ZONE_ID = 'test-zone-id-123';
process.env.CF_ACCOUNT_ID = 'test-account-id-456';
process.env.CF_DNS_API_TOKEN = 'test-dns-token-789';
process.env.CF_TARGET_DOMAIN = 'test.tams.codes';
process.env.COPILOT_API_URL = 'http://localhost:4141';
process.env.COPILOT_API_MODEL = 'gpt-4o';
process.env.HEALTH_CHECK_PORT = '8888'; // Different port for testing

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (uncomment if needed)
// global.console = {
//     ...console,
//     log: jest.fn(),
//     error: jest.fn(),
//     warn: jest.fn()
// };
