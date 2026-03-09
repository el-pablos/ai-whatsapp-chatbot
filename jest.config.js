/**
 * Jest Configuration
 */

module.exports = {
    testEnvironment: 'node',
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/bot.js', // Exclude main entry karena butuh WA connection
        '!src/database.js', // Exclude karena butuh real SQLite
        '!src/mediaHandler.js', // Exclude karena butuh real file ops
        '!src/locationHandler.js' // Exclude karena butuh network
    ],
    coverageThreshold: {
        global: {
            branches: 10,
            functions: 18,
            lines: 23,
            statements: 23
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
