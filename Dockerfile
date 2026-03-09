# ───────────────────────────────────────────────────
# Tama AI WhatsApp Chatbot — Multi-stage Dockerfile
# ───────────────────────────────────────────────────

# Stage 1: Build dashboard frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY src/dashboard/frontend/ src/dashboard/frontend/
RUN npx vite build

# Stage 2: Production image
FROM node:22-alpine
LABEL maintainer="el-pablos <yeteprem.end23juni@gmail.com>"
LABEL description="Tama AI WhatsApp Chatbot v4.1.0"

# Install system deps for better-sqlite3, yt-dlp, ffmpeg
RUN apk add --no-cache python3 make g++ ffmpeg curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && apk del curl

WORKDIR /app

# Copy package files and install production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY src/ src/
COPY ecosystem.config.js ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /build/src/dashboard/public/ src/dashboard/public/

# Create data & auth directories
RUN mkdir -p data auth_info_multi tmp

# Environment defaults
ENV NODE_ENV=production
ENV HEALTH_CHECK_PORT=8008
ENV DASHBOARD_PORT=6666

# Expose ports
EXPOSE 8008 6666

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:8008/health || exit 1

# Run bot
CMD ["node", "src/bot.js"]
