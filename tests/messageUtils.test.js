/**
 * Tests for messageUtils module
 * Message splitting and chunked sending functionality
 */

const { splitMessage, parseBubbles, multiBubbleSend, WA_MESSAGE_LIMIT, MESSAGE_DELAY, BUBBLE_DELIMITER } = require('../src/messageUtils');

describe('messageUtils', () => {
    describe('splitMessage', () => {
        it('should return single chunk for short messages', () => {
            const shortText = 'This is a short message';
            const chunks = splitMessage(shortText);
            
            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe(shortText);
        });

        it('should not split message under limit', () => {
            const text = 'A'.repeat(3000);
            const chunks = splitMessage(text);
            
            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe(text);
        });

        it('should split message exceeding limit', () => {
            const text = 'A'.repeat(5000);
            const chunks = splitMessage(text);
            
            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks.join('')).toBe(text);
        });

        it('should respect custom maxLength', () => {
            const text = 'A'.repeat(500);
            const chunks = splitMessage(text, 200);
            
            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach(chunk => {
                expect(chunk.length).toBeLessThanOrEqual(200);
            });
        });

        it('should split at paragraph breaks preferentially', () => {
            const paragraph1 = 'This is paragraph one with some content.';
            const paragraph2 = 'This is paragraph two with more content.';
            const text = paragraph1 + '\n\n' + paragraph2;
            
            const chunks = splitMessage(text, 50);
            
            // Should contain natural splits
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should split at section separators (---)', () => {
            const section1 = 'Section 1 content here';
            const section2 = 'Section 2 content here';
            const text = section1 + '\n\n---\n\n' + section2;
            
            const chunks = splitMessage(text, 40);
            
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('should split at emoji separators (🔮)', () => {
            const section1 = 'First tarot card analysis';
            const section2 = 'Second tarot card analysis';
            const text = section1 + '\n\n🔮 ' + section2;
            
            const chunks = splitMessage(text, 40);
            
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('should split at numbered headers', () => {
            const text = 'Intro.\n\n1. First point here.\n\n2. Second point here.';
            const chunks = splitMessage(text, 30);
            
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('should split at periods as last resort', () => {
            const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
            const chunks = splitMessage(text, 20);
            
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('should handle empty string', () => {
            const chunks = splitMessage('');
            
            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe('');
        });

        it('should handle string with only whitespace', () => {
            const chunks = splitMessage('   \n\n   ');
            
            expect(chunks).toHaveLength(1);
        });

        it('should preserve content when splitting', () => {
            const text = 'First part content. Second part content. Third part content.';
            const chunks = splitMessage(text, 30);
            
            // All chunks should have content
            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach(chunk => {
                expect(chunk.trim().length).toBeGreaterThan(0);
            });
            
            // Total length should be close to original
            const totalLength = chunks.join('').length;
            expect(totalLength).toBeGreaterThanOrEqual(text.length - 10);
        });

        it('should handle tarot-style reading with multiple cards', () => {
            const tarotReading = `
🔮 CELTIC CROSS READING 🔮

📍 Posisi 1: THE FOOL
Kartu ini menunjukkan awal yang baru...

---

📍 Posisi 2: THE MAGICIAN  
Kartu ini menunjukkan kemampuan...

---

📍 Posisi 3: THE HIGH PRIESTESS
Kartu ini menunjukkan intuisi...
            `.trim();

            const chunks = splitMessage(tarotReading, 100);
            
            // Should split at natural card boundaries
            expect(chunks.length).toBeGreaterThan(1);
            
            // Each chunk should not exceed limit
            chunks.forEach(chunk => {
                expect(chunk.length).toBeLessThanOrEqual(100);
            });
        });

        it('should handle markdown-style headers', () => {
            const text = '# Title\n\nSome content here.\n\n## Subtitle\n\nMore content.';
            const chunks = splitMessage(text, 30);
            
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('should handle bold text separators', () => {
            const text = 'Intro.\n\n**Section 1:**\nContent 1.\n\n**Section 2:**\nContent 2.';
            const chunks = splitMessage(text, 30);
            
            expect(chunks.length).toBeGreaterThan(1);
        });
    });

    describe('Constants', () => {
        it('should have proper WA_MESSAGE_LIMIT', () => {
            expect(WA_MESSAGE_LIMIT).toBe(3800);
        });

        it('should have proper MESSAGE_DELAY', () => {
            expect(MESSAGE_DELAY).toBe(500);
        });
    });

    describe('Edge cases', () => {
        it('should handle text with no natural break points', () => {
            const text = 'A'.repeat(100);
            const chunks = splitMessage(text, 30);
            
            // Should still split, even if not at natural points
            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks.join('')).toBe(text);
        });

        it('should handle text with consecutive separators', () => {
            const text = 'Text\n\n---\n\n---\n\nMore text';
            const chunks = splitMessage(text, 20);
            
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should handle unicode characters', () => {
            const text = '你好世界！这是测试。第二句话。';
            const chunks = splitMessage(text, 10);
            
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('should handle emoji-heavy text', () => {
            const text = '🎴🔮✨💫🌟 Card reading 🎴🔮✨💫🌟 More content';
            const chunks = splitMessage(text, 20);
            
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should handle very long lines without breaks', () => {
            const text = 'word '.repeat(1000);
            const chunks = splitMessage(text, 100);
            
            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach(chunk => {
                expect(chunk.length).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('BUBBLE_DELIMITER', () => {
        it('should be ---BUBBLE---', () => {
            expect(BUBBLE_DELIMITER).toBe('---BUBBLE---');
        });
    });

    describe('parseBubbles', () => {
        it('should return single element for text without delimiter', () => {
            const result = parseBubbles('hello cuy');
            expect(result).toEqual(['hello cuy']);
        });

        it('should split text at BUBBLE_DELIMITER', () => {
            const text = 'hey\n---BUBBLE---\napa kabar';
            const result = parseBubbles(text);
            expect(result).toEqual(['hey', 'apa kabar']);
        });

        it('should handle multiple delimiters', () => {
            const text = 'satu\n---BUBBLE---\ndua\n---BUBBLE---\ntiga';
            const result = parseBubbles(text);
            expect(result).toEqual(['satu', 'dua', 'tiga']);
        });

        it('should trim whitespace from bubbles', () => {
            const text = '  hey  \n---BUBBLE---\n  cuy  ';
            const result = parseBubbles(text);
            expect(result).toEqual(['hey', 'cuy']);
        });

        it('should filter out empty bubbles', () => {
            const text = 'hey\n---BUBBLE---\n\n---BUBBLE---\ncuy';
            const result = parseBubbles(text);
            expect(result).toEqual(['hey', 'cuy']);
        });

        it('should return empty array for empty input', () => {
            expect(parseBubbles('')).toEqual([]);
            expect(parseBubbles(null)).toEqual([]);
            expect(parseBubbles(undefined)).toEqual([]);
        });

        it('should split long bubbles further via splitMessage', () => {
            const longText = 'A'.repeat(5000);
            const text = `short\n---BUBBLE---\n${longText}`;
            const result = parseBubbles(text);
            expect(result.length).toBeGreaterThan(2); // short + multiple chunks from longText
        });
    });

    describe('multiBubbleSend', () => {
        let mockSock;

        beforeEach(() => {
            mockSock = {
                sendMessage: jest.fn().mockResolvedValue({ key: { id: 'test-id' } }),
            };
        });

        it('should send single bubble as smartSend', async () => {
            await multiBubbleSend(mockSock, 'chat@s.whatsapp.net', 'hello');
            expect(mockSock.sendMessage).toHaveBeenCalledTimes(1);
        });

        it('should send multiple bubbles as separate messages', async () => {
            const text = 'first\n---BUBBLE---\nsecond\n---BUBBLE---\nthird';
            await multiBubbleSend(mockSock, 'chat@s.whatsapp.net', text);
            expect(mockSock.sendMessage).toHaveBeenCalledTimes(3);
        });

        it('should quote only the first bubble', async () => {
            const text = 'first\n---BUBBLE---\nsecond';
            const quoted = { key: { id: 'quoted-msg' } };
            await multiBubbleSend(mockSock, 'chat@s.whatsapp.net', text, { quoted });
            expect(mockSock.sendMessage).toHaveBeenNthCalledWith(
                1,
                'chat@s.whatsapp.net',
                { text: 'first' },
                { quoted }
            );
            expect(mockSock.sendMessage).toHaveBeenNthCalledWith(
                2,
                'chat@s.whatsapp.net',
                { text: 'second' },
                {}
            );
        });

        it('should do nothing for empty text', async () => {
            await multiBubbleSend(mockSock, 'chat@s.whatsapp.net', '');
            expect(mockSock.sendMessage).not.toHaveBeenCalled();
        });

        it('should throw on send failure', async () => {
            mockSock.sendMessage.mockRejectedValue(new Error('send failed'));
            await expect(
                multiBubbleSend(mockSock, 'chat@s.whatsapp.net', 'a\n---BUBBLE---\nb')
            ).rejects.toThrow('send failed');
        });
    });
});
