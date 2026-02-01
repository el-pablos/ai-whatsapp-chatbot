/**
 * Location Handler Module - Geolocation & Maps
 * 
 * Handle location sharing, search places via OpenStreetMap/Nominatim,
 * dan kirim lokasi via WhatsApp
 * 
 * @author Tama (el-pablos)
 * @version 2.0.0
 */

const axios = require('axios');

// OpenStreetMap Nominatim API (free, no API key needed)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'TamaWhatsAppBot/2.0 (educational project)';

/**
 * Search for a place using OpenStreetMap Nominatim
 * 
 * @param {string} query - Search query (e.g., "Starbucks Jakarta")
 * @param {Object} options - Search options
 * @param {number} options.limit - Max results (default 5)
 * @param {string} options.countryCode - Country code filter (e.g., 'id' for Indonesia)
 * @returns {Promise<Array>} - Array of place results
 */
const searchPlace = async (query, options = {}) => {
    const { limit = 5, countryCode = 'id' } = options;
    
    try {
        const response = await axios.get(`${NOMINATIM_URL}/search`, {
            params: {
                q: query,
                format: 'json',
                addressdetails: 1,
                limit,
                countrycodes: countryCode,
                'accept-language': 'id,en'
            },
            headers: {
                'User-Agent': USER_AGENT
            },
            timeout: 10000
        });

        return response.data.map(place => ({
            name: place.display_name,
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon),
            type: place.type,
            category: place.category,
            address: place.address,
            importance: place.importance,
            osmId: place.osm_id,
            gmapsUrl: `https://www.google.com/maps?q=${place.lat},${place.lon}`,
            osmUrl: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}&zoom=17`
        }));
        
    } catch (error) {
        console.error('[Location] Error searching place:', error.message);
        return [];
    }
};

/**
 * Get place details by coordinates (reverse geocoding)
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>} - Place details
 */
const reverseGeocode = async (latitude, longitude) => {
    try {
        const response = await axios.get(`${NOMINATIM_URL}/reverse`, {
            params: {
                lat: latitude,
                lon: longitude,
                format: 'json',
                addressdetails: 1,
                'accept-language': 'id,en'
            },
            headers: {
                'User-Agent': USER_AGENT
            },
            timeout: 10000
        });

        const data = response.data;
        return {
            name: data.display_name,
            address: data.address,
            latitude,
            longitude,
            gmapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
            osmUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=17`
        };
        
    } catch (error) {
        console.error('[Location] Error reverse geocoding:', error.message);
        return null;
    }
};

/**
 * Format location for WhatsApp message
 * 
 * @param {Object} place - Place object from search
 * @returns {Object} - WhatsApp location message format
 */
const formatLocationMessage = (place) => {
    return {
        location: {
            degreesLatitude: place.latitude,
            degreesLongitude: place.longitude,
            name: place.name.split(',')[0], // First part of name
            address: place.name
        }
    };
};

/**
 * Generate text response with location info
 * 
 * @param {Object} place - Place object
 * @returns {string} - Formatted text response
 */
const formatLocationText = (place) => {
    const shortName = place.name.split(',').slice(0, 2).join(',');
    return `📍 *${shortName}*

🗺️ Google Maps: ${place.gmapsUrl}
🌐 OpenStreetMap: ${place.osmUrl}

Koordinat: ${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`;
};

/**
 * Parse location request from user message
 * Detect keywords like "lokasi", "dimana", "alamat", "cari tempat"
 * 
 * @param {string} message - User message
 * @returns {Object|null} - { type: 'search'|'share', query: string } or null
 */
const parseLocationRequest = (message) => {
    const lowerMsg = message.toLowerCase();
    
    // Patterns for location search/share
    const searchPatterns = [
        /(?:kirim(?:in)?|share|bagi(?:in)?|kasih)\s+(?:lokasi|alamat|tempat)\s+(.+)/i,
        /(?:lokasi|alamat|dimana)\s+(.+?)(?:\s+dong|\s+bro|\s+jir|\?|$)/i,
        /(?:cari(?:in)?|search)\s+(?:lokasi|tempat|alamat)\s+(.+)/i,
        /(?:mau|pengen|butuh)\s+(?:lokasi|alamat)\s+(.+)/i,
        /(?:tolong|please|pls)\s+(?:kirim|share)\s+(?:lokasi|alamat)\s+(.+)/i
    ];
    
    for (const pattern of searchPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            return {
                type: 'search',
                query: match[1].trim()
            };
        }
    }
    
    // Check for general location keywords
    const locationKeywords = ['lokasi', 'alamat', 'dimana', 'where', 'tempat'];
    if (locationKeywords.some(kw => lowerMsg.includes(kw))) {
        // Extract potential place name
        const words = message.split(/\s+/);
        const kwIndex = words.findIndex(w => 
            locationKeywords.some(kw => w.toLowerCase().includes(kw))
        );
        
        if (kwIndex >= 0 && kwIndex < words.length - 1) {
            const query = words.slice(kwIndex + 1).join(' ').replace(/[?.!,]/g, '');
            if (query.length > 2) {
                return {
                    type: 'search',
                    query
                };
            }
        }
    }
    
    return null;
};

/**
 * Handle incoming location message from user
 * 
 * @param {Object} locationMsg - Location message from Baileys
 * @returns {Promise<Object>} - Location info with reverse geocoding
 */
const handleIncomingLocation = async (locationMsg) => {
    const lat = locationMsg.degreesLatitude;
    const lon = locationMsg.degreesLongitude;
    
    const details = await reverseGeocode(lat, lon);
    
    return {
        latitude: lat,
        longitude: lon,
        name: locationMsg.name || 'Lokasi User',
        address: locationMsg.address || details?.name || 'Unknown',
        details,
        gmapsUrl: `https://www.google.com/maps?q=${lat},${lon}`
    };
};

/**
 * Check if message is asking for location/place
 * 
 * @param {string} message - User message
 * @returns {boolean}
 */
const isLocationRequest = (message) => {
    return parseLocationRequest(message) !== null;
};

/**
 * Search nearby places
 * 
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {string} type - Place type (cafe, restaurant, etc)
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array>}
 */
const searchNearby = async (latitude, longitude, type, radius = 1000) => {
    try {
        // Use Overpass API for nearby search
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        
        // Convert radius to degrees (approximate)
        const radiusDeg = radius / 111000;
        
        const query = `
            [out:json][timeout:25];
            (
                node["amenity"="${type}"](${latitude - radiusDeg},${longitude - radiusDeg},${latitude + radiusDeg},${longitude + radiusDeg});
                way["amenity"="${type}"](${latitude - radiusDeg},${longitude - radiusDeg},${latitude + radiusDeg},${longitude + radiusDeg});
            );
            out center 10;
        `;

        const response = await axios.post(overpassUrl, query, {
            headers: {
                'Content-Type': 'text/plain',
                'User-Agent': USER_AGENT
            },
            timeout: 30000
        });

        return response.data.elements.map(el => {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            return {
                name: el.tags?.name || `${type} tanpa nama`,
                latitude: lat,
                longitude: lon,
                type: el.tags?.amenity,
                address: el.tags?.['addr:street'] || '',
                gmapsUrl: `https://www.google.com/maps?q=${lat},${lon}`
            };
        });
        
    } catch (error) {
        console.error('[Location] Error searching nearby:', error.message);
        return [];
    }
};

module.exports = {
    searchPlace,
    reverseGeocode,
    formatLocationMessage,
    formatLocationText,
    parseLocationRequest,
    handleIncomingLocation,
    isLocationRequest,
    searchNearby
};
