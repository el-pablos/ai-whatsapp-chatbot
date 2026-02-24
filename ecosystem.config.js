/**
 * PM2 Ecosystem Configuration
 * 
 * Config untuk manage bot dan copilot-api via PM2
 * Usage: pm2 start ecosystem.config.js
 * 
 * Bootstrap: scripts/bootstrap.sh runs before bot starts
 *   - auto npm install
 *   - auto install yt-dlp, ffmpeg
 *   - creates required directories
 * 
 * @author Tama (el-pablos)
 */

module.exports = {
    apps: [
        {
            name: 'copilot-api',
            cwd: '/root/work/copilot-api',
            script: '/snap/bin/bun',
            args: 'run ./src/main.ts start',
            interpreter: 'none',
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 5000,
            env: {
                NODE_ENV: 'production',
                PATH: '/snap/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
            },
            error_file: '/root/work/ai-whatsapp-chatbot/logs/copilot-api-error.log',
            out_file: '/root/work/ai-whatsapp-chatbot/logs/copilot-api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        },
        {
            name: 'wa-tama-bot',
            cwd: '/root/work/ai-whatsapp-chatbot',
            script: 'scripts/start.sh',
            interpreter: 'bash',
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 5000,
            // Wait for copilot-api to start
            wait_ready: true,
            listen_timeout: 30000,
            env: {
                NODE_ENV: 'production'
            },
            error_file: '/root/work/ai-whatsapp-chatbot/logs/wa-bot-error.log',
            out_file: '/root/work/ai-whatsapp-chatbot/logs/wa-bot-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }
    ]
};
