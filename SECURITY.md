# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.3.x   | :white_check_mark: |
| 2.2.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please follow these steps:

1. **Do NOT** open a public issue
2. Send a detailed report to the maintainer
3. Include steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Considerations

### ⚠️ CRITICAL: Dashboard & API Endpoints

The health check server exposes several endpoints that **MUST be protected** in production:

| Endpoint | Risk Level | Recommendation |
|----------|------------|----------------|
| `/health` | Low | Safe for public |
| `/stats` | Medium | Protect with auth |
| `/dashboard` | **HIGH** | Always protect |
| `/users` | **HIGH** | Always protect |
| `/cleanup` | **HIGH** | Always protect |

**Production Checklist:**
- [ ] Bind to `localhost` only (default)
- [ ] Use reverse proxy with authentication
- [ ] Implement IP allowlist
- [ ] Never expose dashboard publicly without auth

### ⚠️ Sensitive Files - NEVER COMMIT

These files/folders contain sensitive data and must **NEVER** be committed to version control:

```
auth_info_baileys/    # WhatsApp session credentials
data/chat_memory.db   # User conversation data
.env                  # API keys and secrets
downloads/            # Temporary downloaded files
temp_docs/            # Temporary document files
logs/                 # May contain sensitive data
```

Ensure your `.gitignore` includes all of these.

### ⚠️ WhatsApp Integration

- This bot uses the unofficial WhatsApp Web API (Baileys)
- WhatsApp may ban accounts using unofficial APIs
- Use at your own risk for personal/educational purposes only
- Never use for spam or harassment

### ⚠️ AI API Keys

- Never log or expose API responses containing user data
- Rate limit AI requests to prevent abuse
- Monitor for unusual usage patterns

## Data Privacy

### Data Collected
- Chat messages (stored locally in SQLite)
- Phone numbers (for session management)
- Media files (processed temporarily, then deleted)

### Data Retention
- Chat memory: Configurable (default 24h session expiry)
- Temporary files: Deleted after processing
- Logs: Rotate regularly to prevent data accumulation

### User Rights
Users should be informed about:
- What data is collected
- How long it's stored
- How to request data deletion (`/clear` command)

## Best Practices

1. **Environment Variables**
   - Use `.env` for all secrets
   - Never hardcode credentials
   - Use `.env.example` as template

2. **Logging**
   - Don't log message content in production
   - Don't log phone numbers
   - Use appropriate log levels

3. **Access Control**
   - Implement rate limiting
   - Use authentication for admin features
   - Monitor for abuse

4. **Updates**
   - Keep dependencies updated
   - Monitor for security advisories
   - Test updates before deploying
