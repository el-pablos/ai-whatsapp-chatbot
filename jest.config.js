/**
 * Jest Configuration
 */

module.exports = {
    testEnvironment: 'node',
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/bot.js' // Exclude main entry karena butuh WA connection
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 30000,
    clearMocks: true,
    resetMocks: true
};
