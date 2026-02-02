/**
 * Backup Handler Module - Auto Session Backup
 * 
 * Fitur:
 * - Auto backup auth_info_baileys setiap 24 jam
 * - Kompres ke ZIP dengan timestamp
 * - Kirim ke owner WhatsApp
 * - Cleanup file lokal setelah kirim
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

const cron = require('node-cron');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

// Config
const AUTH_FOLDER = path.join(process.cwd(), 'auth_info_baileys');
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const OWNER_NUMBER = process.env.WA_OWNER_NUMBER || process.env.WA_PHONE_NUMBER || '';

// Track scheduled job
let backupJob = null;

/**
 * Pastikan folder backup exists
 */
const ensureBackupDir = async () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
};

/**
 * Format tanggal untuk filename
 * @returns {string} Format: YYYY-MM-DD_HH-mm
 */
const getTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hour}-${minute}`;
};

/**
 * Kompres folder auth ke ZIP
 * @returns {Promise<Object>} - { success, filePath, filename, size }
 */
const createBackupZip = async () => {
    await ensureBackupDir();
    
    const timestamp = getTimestamp();
    const filename = `session_backup_${timestamp}.zip`;
    const outputPath = path.join(BACKUP_DIR, filename);
    
    return new Promise((resolve, reject) => {
        // Check if auth folder exists
        if (!fs.existsSync(AUTH_FOLDER)) {
            return resolve({
                success: false,
                error: 'Auth folder tidak ditemukan'
            });
        }
        
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Max compression
        });
        
        output.on('close', () => {
            const stats = fs.statSync(outputPath);
            console.log(`[Backup] Created: ${filename} (${formatSize(stats.size)})`);
            resolve({
                success: true,
                filePath: outputPath,
                filename: filename,
                size: stats.size
            });
        });
        
        archive.on('error', (err) => {
            console.error('[Backup] Archive error:', err.message);
            reject(err);
        });
        
        archive.pipe(output);
        
        // Add entire auth folder to archive
        archive.directory(AUTH_FOLDER, 'auth_info_baileys');
        
        archive.finalize();
    });
};

/**
 * Format file size untuk display
 */
const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Kirim backup ke owner via WhatsApp
 * @param {Object} sock - Baileys socket instance
 * @param {Object} backup - Backup info dari createBackupZip
 * @returns {Promise<boolean>}
 */
const sendBackupToOwner = async (sock, backup) => {
    if (!OWNER_NUMBER) {
        console.log('[Backup] Owner number tidak di-set, skip pengiriman');
        return false;
    }
    
    const ownerJid = `${OWNER_NUMBER.replace(/\D/g, '')}@s.whatsapp.net`;
    
    try {
        const fileBuffer = fs.readFileSync(backup.filePath);
        
        await sock.sendMessage(ownerJid, {
            document: fileBuffer,
            mimetype: 'application/zip',
            fileName: backup.filename,
            caption: `🔐 *Backup Session Harian*\n\n` +
                     `📅 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n` +
                     `📦 Size: ${formatSize(backup.size)}\n\n` +
                     `_Lapor Boss, ini backup session harian. Kalau server crash, pakai ini buat restore._`
        });
        
        console.log(`[Backup] Sent to owner: ${OWNER_NUMBER}`);
        return true;
        
    } catch (error) {
        console.error('[Backup] Error sending to owner:', error.message);
        return false;
    }
};

/**
 * Cleanup file backup lokal
 * @param {string} filePath 
 */
const cleanupBackup = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('[Backup] Cleaned up local file');
        }
    } catch (error) {
        console.error('[Backup] Cleanup error:', error.message);
    }
};

/**
 * Run backup process
 * @param {Object} sock - Baileys socket instance
 */
const runBackup = async (sock) => {
    console.log('[Backup] Starting daily backup...');
    
    try {
        // Create backup
        const backup = await createBackupZip();
        
        if (!backup.success) {
            console.error('[Backup] Failed:', backup.error);
            return { success: false, error: backup.error };
        }
        
        // Send to owner if socket connected
        if (sock) {
            const sent = await sendBackupToOwner(sock, backup);
            
            // Cleanup local file after sending
            if (sent) {
                await cleanupBackup(backup.filePath);
            }
            
            return { success: true, sent, filename: backup.filename };
        }
        
        return { success: true, sent: false, filename: backup.filename };
        
    } catch (error) {
        console.error('[Backup] Error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Schedule daily backup (setiap jam 00:00 WIB)
 * @param {Object} sock - Baileys socket instance
 */
const scheduleBackup = (sock) => {
    // Cancel existing job if any
    if (backupJob) {
        backupJob.stop();
    }
    
    // Schedule: setiap hari jam 00:00
    // Cron format: minute hour day month weekday
    backupJob = cron.schedule('0 0 * * *', async () => {
        console.log('[Backup] Cron triggered - running daily backup');
        await runBackup(sock);
    }, {
        timezone: 'Asia/Jakarta'
    });
    
    console.log('[Backup] Daily backup scheduled at 00:00 WIB');
};

/**
 * Stop scheduled backup
 */
const stopBackup = () => {
    if (backupJob) {
        backupJob.stop();
        backupJob = null;
        console.log('[Backup] Scheduled backup stopped');
    }
};

/**
 * Run backup immediately (manual trigger)
 * @param {Object} sock - Baileys socket instance
 */
const runBackupNow = async (sock) => {
    if (!sock) {
        throw new Error('Socket instance required');
    }
    return await runBackup(sock);
};

/**
 * Clean old backups (keep last 7 days)
 */
const cleanOldBackups = async () => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return;
        
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        for (const file of files) {
            const filePath = path.join(BACKUP_DIR, file);
            const stat = fs.statSync(filePath);
            if (now - stat.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                console.log(`[Backup] Cleaned old backup: ${file}`);
            }
        }
    } catch (err) {
        console.error('[Backup] Error cleaning old backups:', err.message);
    }
};

/**
 * Generate backup filename with timestamp
 */
const generateBackupFilename = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-');
    return `backup_${dateStr}_${timeStr}.zip`;
};

/**
 * Get owner JID for WhatsApp
 */
const getOwnerJid = () => {
    return `${OWNER_NUMBER}@s.whatsapp.net`;
};

module.exports = {
    createBackupZip,
    sendBackupToOwner,
    cleanupBackup,
    runBackup,
    runBackupNow,
    scheduleBackup,
    stopBackup,
    cleanOldBackups,
    generateBackupFilename,
    getOwnerJid,
    formatFileSize: formatSize,
    BACKUP_DIR,
    AUTH_FOLDER,
    OWNER_NUMBER,
    formatSize
};
