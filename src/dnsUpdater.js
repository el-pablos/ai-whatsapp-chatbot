/**
 * Cloudflare DNS Updater Module
 * 
 * Script otomatis untuk update/create DNS record A di Cloudflare
 * agar domain mengarah ke IP VPS saat ini.
 */

const axios = require('axios');

// Cloudflare Configuration dari environment
const CF_ZONE_ID = process.env.CF_ZONE_ID;
const CF_DNS_API_TOKEN = process.env.CF_DNS_API_TOKEN;
const CF_TARGET_DOMAIN = process.env.CF_TARGET_DOMAIN;

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * Mendapatkan Public IP VPS saat ini
 * Menggunakan layanan ipify
 * 
 * @returns {Promise<string>} - Public IP address
 */
const getPublicIP = async () => {
    try {
        // Coba beberapa layanan untuk redundancy
        const services = [
            'https://api.ipify.org?format=json',
            'https://api.my-ip.io/v2/ip.json',
            'https://ipinfo.io/json'
        ];

        for (const service of services) {
            try {
                const response = await axios.get(service, { timeout: 5000 });
                const ip = response.data.ip || response.data;
                
                // Validasi format IP
                if (isValidIP(ip)) {
                    console.log(`[DNS Updater] Public IP detected: ${ip}`);
                    return ip;
                }
            } catch (e) {
                continue; // Coba service berikutnya
            }
        }

        throw new Error('Gagal mendapatkan public IP dari semua service');
    } catch (error) {
        console.error('[DNS Updater] Error getting public IP:', error.message);
        throw error;
    }
};

/**
 * Validasi format IPv4
 * 
 * @param {string} ip - IP address untuk divalidasi
 * @returns {boolean}
 */
const isValidIP = (ip) => {
    if (typeof ip !== 'string') return false;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
};

/**
 * Mendapatkan DNS record yang sudah ada di Cloudflare
 * 
 * @param {string} domain - Domain yang dicari
 * @returns {Promise<Object|null>} - DNS record atau null jika tidak ada
 */
const getDNSRecord = async (domain = CF_TARGET_DOMAIN) => {
    try {
        const response = await axios.get(
            `${CLOUDFLARE_API_BASE}/zones/${CF_ZONE_ID}/dns_records`,
            {
                params: {
                    type: 'A',
                    name: domain
                },
                headers: {
                    'Authorization': `Bearer ${CF_DNS_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.data.success && response.data.result.length > 0) {
            const record = response.data.result[0];
            console.log(`[DNS Updater] Found existing record: ${record.name} -> ${record.content}`);
            return record;
        }

        console.log(`[DNS Updater] No existing record found for ${domain}`);
        return null;
    } catch (error) {
        console.error('[DNS Updater] Error getting DNS record:', error.message);
        if (error.response) {
            console.error('[DNS Updater] Response:', error.response.data);
        }
        throw error;
    }
};

/**
 * Membuat DNS record A baru di Cloudflare
 * 
 * @param {string} ip - IP address untuk record
 * @param {string} domain - Domain name
 * @returns {Promise<Object>} - Created DNS record
 */
const createDNSRecord = async (ip, domain = CF_TARGET_DOMAIN) => {
    try {
        const payload = {
            type: 'A',
            name: domain,
            content: ip,
            ttl: 1, // Auto TTL
            proxied: true // Gunakan Cloudflare proxy untuk hide IP & port forwarding
        };

        console.log(`[DNS Updater] Creating DNS record:`, payload);

        const response = await axios.post(
            `${CLOUDFLARE_API_BASE}/zones/${CF_ZONE_ID}/dns_records`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${CF_DNS_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.data.success) {
            console.log(`[DNS Updater] Successfully created DNS record: ${domain} -> ${ip}`);
            return response.data.result;
        }

        throw new Error(response.data.errors?.[0]?.message || 'Failed to create DNS record');
    } catch (error) {
        console.error('[DNS Updater] Error creating DNS record:', error.message);
        if (error.response) {
            console.error('[DNS Updater] Response:', error.response.data);
        }
        throw error;
    }
};

/**
 * Update DNS record A yang sudah ada di Cloudflare
 * 
 * @param {string} recordId - ID record yang akan diupdate
 * @param {string} ip - IP address baru
 * @param {string} domain - Domain name
 * @returns {Promise<Object>} - Updated DNS record
 */
const updateDNSRecord = async (recordId, ip, domain = CF_TARGET_DOMAIN) => {
    try {
        const payload = {
            type: 'A',
            name: domain,
            content: ip,
            ttl: 1, // Auto TTL
            proxied: true
        };

        console.log(`[DNS Updater] Updating DNS record ${recordId}:`, payload);

        const response = await axios.put(
            `${CLOUDFLARE_API_BASE}/zones/${CF_ZONE_ID}/dns_records/${recordId}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${CF_DNS_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.data.success) {
            console.log(`[DNS Updater] Successfully updated DNS record: ${domain} -> ${ip}`);
            return response.data.result;
        }

        throw new Error(response.data.errors?.[0]?.message || 'Failed to update DNS record');
    } catch (error) {
        console.error('[DNS Updater] Error updating DNS record:', error.message);
        if (error.response) {
            console.error('[DNS Updater] Response:', error.response.data);
        }
        throw error;
    }
};

/**
 * Main function untuk sync DNS record
 * Akan otomatis create atau update sesuai kondisi
 * 
 * @returns {Promise<Object>} - Result dengan status operasi
 */
const syncDNSRecord = async () => {
    console.log('[DNS Updater] Starting DNS sync...');
    
    // Validasi environment
    if (!CF_ZONE_ID || !CF_DNS_API_TOKEN || !CF_TARGET_DOMAIN) {
        throw new Error('Missing Cloudflare configuration in environment variables');
    }

    try {
        // 1. Dapatkan public IP saat ini
        const currentIP = await getPublicIP();

        // 2. Cek apakah record sudah ada
        const existingRecord = await getDNSRecord();

        // 3. Create atau Update
        if (existingRecord) {
            // Cek apakah IP berbeda
            if (existingRecord.content === currentIP) {
                console.log(`[DNS Updater] IP unchanged (${currentIP}), skip update`);
                return {
                    action: 'skipped',
                    reason: 'IP unchanged',
                    ip: currentIP,
                    domain: CF_TARGET_DOMAIN
                };
            }

            // Update dengan IP baru
            const updatedRecord = await updateDNSRecord(existingRecord.id, currentIP);
            return {
                action: 'updated',
                oldIP: existingRecord.content,
                newIP: currentIP,
                domain: CF_TARGET_DOMAIN,
                record: updatedRecord
            };
        } else {
            // Create record baru
            const newRecord = await createDNSRecord(currentIP);
            return {
                action: 'created',
                ip: currentIP,
                domain: CF_TARGET_DOMAIN,
                record: newRecord
            };
        }
    } catch (error) {
        console.error('[DNS Updater] Sync failed:', error.message);
        return {
            action: 'failed',
            error: error.message,
            domain: CF_TARGET_DOMAIN
        };
    }
};

/**
 * Build Cloudflare API payload untuk testing
 * 
 * @param {string} ip - IP address
 * @param {string} domain - Domain
 * @returns {Object} - Payload object
 */
const buildPayload = (ip, domain = CF_TARGET_DOMAIN) => {
    return {
        type: 'A',
        name: domain,
        content: ip,
        ttl: 1,
        proxied: true
    };
};

module.exports = {
    getPublicIP,
    isValidIP,
    getDNSRecord,
    createDNSRecord,
    updateDNSRecord,
    syncDNSRecord,
    buildPayload,
    CLOUDFLARE_API_BASE
};
