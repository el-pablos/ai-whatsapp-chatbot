# Contributing to Tama AI WhatsApp Bot

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ai-whatsapp-chatbot.git`
3. Add upstream remote: `git remote add upstream https://github.com/el-pablos/ai-whatsapp-chatbot.git`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Copilot API running locally (port 4141)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run tests to verify setup
npm test

# Start development
npm start
```

### Project Structure

```
src/
├── bot.js              # Main bot entry point
├── aiHandler.js        # AI/LLM integration
├── database.js         # SQLite operations
├── mediaHandler.js     # Media processing
├── documentHandler.js  # Document reading (70+ formats)
├── youtubeHandler.js   # YouTube download
├── locationHandler.js  # Location/map features
├── calendarHandler.js  # Date/calendar features
├── moodHandler.js      # Mood analysis
├── tarotHandler.js     # Tarot reading system
├── messageUtils.js     # Message utilities
├── healthCheck.js      # Health server
└── dnsUpdater.js       # Cloudflare DNS

tests/
├── *.test.js           # Jest test files
└── setup.js            # Test configuration
```

## Code Style

### General Guidelines

- Use meaningful variable/function names
- Add JSDoc comments for functions
- Keep functions focused and small
- Handle errors gracefully

### JavaScript Style

```javascript
// Good ✓
const processMessage = async (message) => {
    if (!message) return null;
    
    const result = await analyzeContent(message);
    return result;
};

// Bad ✗
const proc = async (m) => {
    var r = await analyze(m);
    return r;
};
```

### Commit Messages

Use conventional commits format:

```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
refactor: code improvement
chore: maintenance tasks
```

Example: `feat(document): add EPUB support`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/documentHandler.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Writing Tests

- Place tests in `tests/` directory
- Name files as `*.test.js`
- Mock external APIs (axios, etc.)
- Test both success and error cases

```javascript
describe('myFunction', () => {
    it('should handle valid input', async () => {
        const result = await myFunction('valid');
        expect(result).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
        const result = await myFunction(null);
        expect(result.success).toBe(false);
    });
});
```

### Coverage Requirements

- Minimum 70% line coverage
- All new features must have tests
- Bug fixes should include regression tests

## Pull Request Process

### Before Submitting

1. Update your branch with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. Run tests and ensure they pass:
   ```bash
   npm test
   ```

3. Update documentation if needed

4. Add CHANGELOG entry for significant changes

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG updated (for features/fixes)
- [ ] No console.log left in code
- [ ] No hardcoded credentials
- [ ] Error handling included

### Review Process

1. Submit PR with clear description
2. Address review feedback
3. Squash commits if requested
4. Wait for approval before merge

## Issue Guidelines

### Bug Reports

Include:
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error logs (sanitized)
- Environment details

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternatives considered
- Willingness to implement

### Security Issues

**Do NOT open public issues for security vulnerabilities.**

See [SECURITY.md](SECURITY.md) for reporting process.

## Questions?

Feel free to open a discussion or reach out to maintainers.

Thank you for contributing! 🎉
