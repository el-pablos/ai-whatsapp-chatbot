/**
 * Unit Tests - DNS Updater Module (Cloudflare)
 * 
 * Test cases untuk validasi:
 * 1. IP validation
 * 2. Cloudflare API payload structure
 * 3. Mock API calls
 * 4. Error handling
 */

const axios = require('axios');

// Mock axios
jest.mock('axios');

const {
    getPublicIP,
    isValidIP,
    getDNSRecord,
    createDNSRecord,
    updateDNSRecord,
    syncDNSRecord,
    buildPayload,
    CLOUDFLARE_API_BASE
} = require('../src/dnsUpdater');

describe('DNS Updater Module', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isValidIP', () => {

        it('should validate correct IPv4 addresses', () => {
            expect(isValidIP('192.168.1.1')).toBe(true);
            expect(isValidIP('10.0.0.1')).toBe(true);
            expect(isValidIP('255.255.255.255')).toBe(true);
            expect(isValidIP('0.0.0.0')).toBe(true);
            expect(isValidIP('172.16.0.1')).toBe(true);
        });

        it('should reject invalid IPv4 addresses', () => {
            expect(isValidIP('256.1.1.1')).toBe(false);
            expect(isValidIP('192.168.1')).toBe(false);
            expect(isValidIP('192.168.1.1.1')).toBe(false);
            expect(isValidIP('abc.def.ghi.jkl')).toBe(false);
            expect(isValidIP('')).toBe(false);
            expect(isValidIP(null)).toBe(false);
            expect(isValidIP(undefined)).toBe(false);
            expect(isValidIP(12345)).toBe(false);
        });

        it('should reject IPv6 addresses', () => {
            expect(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(false);
            expect(isValidIP('::1')).toBe(false);
        });

    });

    describe('getPublicIP', () => {

        it('should return IP from ipify service', async () => {
            axios.get.mockResolvedValueOnce({
                data: { ip: '203.0.113.50' }
            });

            const result = await getPublicIP();
            expect(result).toBe('203.0.113.50');
        });

        it('should fallback to next service if first fails', async () => {
            // First service fails
            axios.get.mockRejectedValueOnce(new Error('Service unavailable'));
            // Second service succeeds
            axios.get.mockResolvedValueOnce({
                data: { ip: '198.51.100.25' }
            });

            const result = await getPublicIP();
            expect(result).toBe('198.51.100.25');
            expect(axios.get).toHaveBeenCalledTimes(2);
        });

        it('should throw error if all services fail', async () => {
            axios.get.mockRejectedValue(new Error('All services down'));

            await expect(getPublicIP()).rejects.toThrow();
        });

    });

    describe('buildPayload', () => {

        it('should build correct Cloudflare API payload structure', () => {
            const payload = buildPayload('192.168.1.100', 'test.example.com');

            expect(payload).toEqual({
                type: 'A',
                name: 'test.example.com',
                content: '192.168.1.100',
                ttl: 1,
                proxied: true
            });
        });

        it('should use default domain from env when not provided', () => {
            const payload = buildPayload('10.0.0.1');

            expect(payload.type).toBe('A');
            expect(payload.content).toBe('10.0.0.1');
            expect(payload.ttl).toBe(1);
            expect(payload.proxied).toBe(true);
        });

        it('should always set proxied to true', () => {
            const payload = buildPayload('1.2.3.4', 'any.domain.com');
            expect(payload.proxied).toBe(true);
        });

    });

    describe('getDNSRecord', () => {

        it('should return existing record when found', async () => {
            const mockRecord = {
                id: 'record-123',
                type: 'A',
                name: 'test.tams.codes',
                content: '192.168.1.1'
            };

            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    result: [mockRecord]
                }
            });

            const result = await getDNSRecord('test.tams.codes');
            
            expect(result).toEqual(mockRecord);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/dns_records'),
                expect.objectContaining({
                    params: { type: 'A', name: 'test.tams.codes' },
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('Bearer')
                    })
                })
            );
        });

        it('should return null when no record exists', async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    result: []
                }
            });

            const result = await getDNSRecord('nonexistent.domain.com');
            expect(result).toBeNull();
        });

        it('should throw error on API failure', async () => {
            axios.get.mockRejectedValue({
                response: { status: 403, data: { error: 'Forbidden' } },
                message: 'Request failed'
            });

            await expect(getDNSRecord()).rejects.toBeDefined();
        });

    });

    describe('createDNSRecord', () => {

        it('should create record with correct payload', async () => {
            const mockCreatedRecord = {
                id: 'new-record-456',
                type: 'A',
                name: 'test.tams.codes',
                content: '203.0.113.100'
            };

            axios.post.mockResolvedValue({
                data: {
                    success: true,
                    result: mockCreatedRecord
                }
            });

            const result = await createDNSRecord('203.0.113.100', 'test.tams.codes');

            expect(result).toEqual(mockCreatedRecord);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/dns_records'),
                expect.objectContaining({
                    type: 'A',
                    name: 'test.tams.codes',
                    content: '203.0.113.100',
                    proxied: true
                }),
                expect.any(Object)
            );
        });

        it('should throw error when creation fails', async () => {
            axios.post.mockResolvedValue({
                data: {
                    success: false,
                    errors: [{ message: 'Record already exists' }]
                }
            });

            await expect(createDNSRecord('1.2.3.4')).rejects.toThrow('Record already exists');
        });

    });

    describe('updateDNSRecord', () => {

        it('should update record with PUT request', async () => {
            const mockUpdatedRecord = {
                id: 'record-789',
                type: 'A',
                name: 'test.tams.codes',
                content: '198.51.100.50'
            };

            axios.put.mockResolvedValue({
                data: {
                    success: true,
                    result: mockUpdatedRecord
                }
            });

            const result = await updateDNSRecord('record-789', '198.51.100.50', 'test.tams.codes');

            expect(result).toEqual(mockUpdatedRecord);
            expect(axios.put).toHaveBeenCalledWith(
                expect.stringContaining('/dns_records/record-789'),
                expect.objectContaining({
                    type: 'A',
                    content: '198.51.100.50',
                    proxied: true
                }),
                expect.any(Object)
            );
        });

        it('should throw error when update fails', async () => {
            axios.put.mockRejectedValue({
                response: { status: 404, data: { error: 'Record not found' } },
                message: 'Not found'
            });

            await expect(updateDNSRecord('invalid-id', '1.2.3.4')).rejects.toBeDefined();
        });

    });

    describe('syncDNSRecord', () => {

        it('should skip update when IP unchanged', async () => {
            // Mock getPublicIP
            axios.get.mockImplementation((url) => {
                if (url.includes('ipify')) {
                    return Promise.resolve({ data: { ip: '192.168.1.1' } });
                }
                // Cloudflare GET
                return Promise.resolve({
                    data: {
                        success: true,
                        result: [{
                            id: 'record-123',
                            content: '192.168.1.1' // Same IP
                        }]
                    }
                });
            });

            const result = await syncDNSRecord();

            expect(result.action).toBe('skipped');
            expect(result.reason).toBe('IP unchanged');
        });

        it('should update when IP changed', async () => {
            axios.get.mockImplementation((url) => {
                if (url.includes('ipify')) {
                    return Promise.resolve({ data: { ip: '10.0.0.99' } });
                }
                return Promise.resolve({
                    data: {
                        success: true,
                        result: [{
                            id: 'record-123',
                            content: '192.168.1.1' // Different IP
                        }]
                    }
                });
            });

            axios.put.mockResolvedValue({
                data: {
                    success: true,
                    result: { id: 'record-123', content: '10.0.0.99' }
                }
            });

            const result = await syncDNSRecord();

            expect(result.action).toBe('updated');
            expect(result.oldIP).toBe('192.168.1.1');
            expect(result.newIP).toBe('10.0.0.99');
        });

        it('should create when no record exists', async () => {
            axios.get.mockImplementation((url) => {
                if (url.includes('ipify')) {
                    return Promise.resolve({ data: { ip: '172.16.0.50' } });
                }
                return Promise.resolve({
                    data: {
                        success: true,
                        result: [] // No existing record
                    }
                });
            });

            axios.post.mockResolvedValue({
                data: {
                    success: true,
                    result: { id: 'new-record', content: '172.16.0.50' }
                }
            });

            const result = await syncDNSRecord();

            expect(result.action).toBe('created');
            expect(result.ip).toBe('172.16.0.50');
        });

        it('should return failed status on error', async () => {
            axios.get.mockRejectedValue(new Error('Network error'));

            const result = await syncDNSRecord();

            expect(result.action).toBe('failed');
            expect(result.error).toBeDefined();
        });

    });

    describe('CLOUDFLARE_API_BASE', () => {

        it('should be the correct Cloudflare API URL', () => {
            expect(CLOUDFLARE_API_BASE).toBe('https://api.cloudflare.com/client/v4');
        });

    });

});
