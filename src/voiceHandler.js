/**
 * Voice Note Handler Module
 * 
 * Fitur:
 * - Speech-to-Text menggunakan Whisper API via Copilot
 * - Konversi audio ke format yang kompatibel
 * - Text-to-Speech untuk reply voice
 * 
 * @author Tama El Pablo
 * @version 1.0.0
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Config
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const TEMP_DIR = path.join(process.cwd(), 'temp_audio');

/**
 * Pastikan folder temp exists
 */
const ensureTempDir = async () => {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
};

/**
 * Konversi audio ke format WAV (untuk transcription)
 * @param {Buffer} audioBuffer - Audio buffer dari WhatsApp
 * @param {string} inputFormat - Format input (ogg, mp4, etc)
 * @returns {Promise<string>} - Path ke file WAV
 */
const convertToWav = async (audioBuffer, inputFormat = 'ogg') => {
    await ensureTempDir();
    
    const timestamp = Date.now();
    const inputPath = path.join(TEMP_DIR, `input_${timestamp}.${inputFormat}`);
    const outputPath = path.join(TEMP_DIR, `output_${timestamp}.wav`);
    
    try {
        // Write buffer to temp file
        fs.writeFileSync(inputPath, audioBuffer);
        
        // Convert using ffmpeg
        await execAsync(`ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" -y`);
        
        // Cleanup input
        fs.unlinkSync(inputPath);
        
        return outputPath;
        
    } catch (error) {
        // Cleanup on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        throw error;
    }
};

/**
 * Transcribe audio menggunakan Whisper API
 * @param {Buffer} audioBuffer - Audio buffer
 * @param {string} format - Audio format (ogg, mp4, etc)
 * @returns {Promise<Object>} - { success, text, language }
 */
const transcribeAudio = async (audioBuffer, format = 'ogg') => {
    try {
        // Convert to WAV first
        const wavPath = await convertToWav(audioBuffer, format);
        const wavBuffer = fs.readFileSync(wavPath);
        
        // Create form data for API
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', wavBuffer, { filename: 'audio.wav', contentType: 'audio/wav' });
        formData.append('model', 'whisper-1');
        formData.append('language', 'id'); // Indonesian
        
        const response = await axios.post(
            `${COPILOT_API_URL}/v1/audio/transcriptions`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: 60000
            }
        );
        
        // Cleanup wav file
        fs.unlinkSync(wavPath);
        
        if (response.data && response.data.text) {
            console.log(`[Voice] Transcribed: "${response.data.text.substring(0, 50)}..."`);
            return {
                success: true,
                text: response.data.text,
                language: response.data.language || 'id'
            };
        }
        
        return {
            success: false,
            error: 'No transcription result'
        };
        
    } catch (error) {
        console.error('[Voice] Transcription error:', error.message);
        
        // Fallback: try base64 method if form-data fails
        try {
            return await transcribeWithBase64(audioBuffer);
        } catch (fallbackError) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};

/**
 * Alternative transcription using base64
 * @param {Buffer} audioBuffer 
 */
const transcribeWithBase64 = async (audioBuffer) => {
    const base64Audio = audioBuffer.toString('base64');
    
    const response = await axios.post(
        `${COPILOT_API_URL}/v1/chat/completions`,
        {
            model: process.env.COPILOT_API_MODEL || 'claude-sonnet-4.5',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Tolong transcribe audio ini ke text. Hanya berikan hasil transcription saja, tanpa penjelasan tambahan.'
                        },
                        {
                            type: 'input_audio',
                            input_audio: {
                                data: base64Audio,
                                format: 'ogg'
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        },
        { timeout: 60000 }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
        return {
            success: true,
            text: response.data.choices[0].message.content,
            language: 'id'
        };
    }
    
    throw new Error('Failed to transcribe with base64 method');
};

/**
 * Check if message is a voice note
 * @param {Object} msg - Baileys message object
 * @returns {boolean}
 */
const isVoiceNote = (msg) => {
    const audioMsg = msg.message?.audioMessage;
    if (!audioMsg) return false;
    
    // PTT = Push To Talk = Voice Note
    return audioMsg.ptt === true;
};

/**
 * Check if message is any audio
 * @param {Object} msg 
 */
const isAudioMessage = (msg) => {
    return !!(msg.message?.audioMessage);
};

/**
 * Get audio buffer from message
 * @param {Function} downloadMediaMessage - Baileys download function
 * @param {Object} msg - Message object
 * @returns {Promise<Buffer>}
 */
const getAudioBuffer = async (downloadMediaMessage, msg) => {
    try {
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {}
        );
        return buffer;
    } catch (error) {
        console.error('[Voice] Error downloading audio:', error.message);
        throw error;
    }
};

/**
 * Get audio format from message
 * @param {Object} msg 
 */
const getAudioFormat = (msg) => {
    const mimetype = msg.message?.audioMessage?.mimetype || 'audio/ogg';
    
    if (mimetype.includes('opus') || mimetype.includes('ogg')) return 'ogg';
    if (mimetype.includes('mp4') || mimetype.includes('m4a')) return 'mp4';
    if (mimetype.includes('mpeg') || mimetype.includes('mp3')) return 'mp3';
    if (mimetype.includes('wav')) return 'wav';
    
    return 'ogg'; // Default for WhatsApp voice notes
};

/**
 * Cleanup temp files
 */
const cleanupTempAudio = async () => {
    try {
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(TEMP_DIR, file));
            }
        }
    } catch (error) {
        // Ignore cleanup errors
    }
};

/**
 * Format transcription text
 * @param {string} text 
 */
const formatTranscription = (text) => {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
};

// Constants
const SUPPORTED_FORMATS = ['ogg', 'mp3', 'wav', 'm4a', 'opus', 'mp4'];
const MAX_AUDIO_DURATION = 300; // 5 minutes in seconds
const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:4141/v1/audio/transcriptions';

module.exports = {
    transcribeAudio,
    isVoiceNote,
    isAudioMessage,
    getAudioBuffer,
    getAudioFormat,
    convertToWav,
    cleanupTempAudio,
    formatTranscription,
    TEMP_DIR,
    SUPPORTED_FORMATS,
    MAX_AUDIO_DURATION,
    WHISPER_API_URL
};
