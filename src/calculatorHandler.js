/**
 * Calculator Handler — evaluasi matematika, konversi satuan, konversi mata uang
 * 
 * @author Tama El Pablo
 */

const { evaluate, unit } = require('mathjs');
const axios = require('axios');

const EXCHANGE_API = 'https://open.er-api.com/v6/latest';

/**
 * Evaluasi ekspresi matematika
 * @param {string} expression — misal "2+2", "sqrt(144)", "sin(pi/4)"
 * @returns {{ success: boolean, result?: string, error?: string }}
 */
const calculateExpression = (expression) => {
    if (!expression) return { success: false, error: 'Ekspresi kosong' };

    try {
        const result = evaluate(expression);
        return {
            success: true,
            result: typeof result === 'object' ? result.toString() : String(result),
            expression,
        };
    } catch (err) {
        return { success: false, error: `Ga bisa ngitung: ${err.message}` };
    }
};

/**
 * Konversi satuan
 * @param {number} value — nilai
 * @param {string} fromUnit — satuan asal (misal "km")
 * @param {string} toUnit — satuan tujuan (misal "mile")
 * @returns {{ success: boolean, result?: string, error?: string }}
 */
const convertUnit = (value, fromUnit, toUnit) => {
    try {
        const result = unit(value, fromUnit).to(toUnit);
        return {
            success: true,
            result: result.toString(),
            from: `${value} ${fromUnit}`,
            to: `${toUnit}`,
        };
    } catch (err) {
        return { success: false, error: `Ga bisa konversi: ${err.message}` };
    }
};

/**
 * Konversi mata uang via exchangerate API
 * @param {number} amount — jumlah
 * @param {string} fromCurrency — misal "USD"
 * @param {string} toCurrency — misal "IDR"
 * @returns {Promise<{ success: boolean, result?: string, rate?: number, error?: string }>}
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    try {
        const response = await axios.get(`${EXCHANGE_API}/${from}`, { timeout: 10000 });
        const rates = response.data?.rates;

        if (!rates || !rates[to]) {
            return { success: false, error: `Mata uang ${to} ga dikenal` };
        }

        const rate = rates[to];
        const result = amount * rate;
        return {
            success: true,
            result: `${amount.toLocaleString()} ${from} = ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`,
            rate,
            amount,
            from,
            to,
        };
    } catch (err) {
        return { success: false, error: `Gagal ambil exchange rate: ${err.message}` };
    }
};

/**
 * Parse command /calc atau /hitung
 * @param {string} text
 * @returns {{ type: 'math'|'unit'|'currency', params: any } | null}
 */
const parseCalcCommand = (text) => {
    if (!text) return null;

    // /calc 2+2
    const mathMatch = text.match(/^\/(?:calc|hitung)\s+(.+)$/i);
    if (mathMatch) {
        const expr = mathMatch[1].trim();

        // Check konversi mata uang: 100 USD to IDR
        const currMatch = expr.match(/^([\d.,]+)\s*([A-Za-z]{3})\s+(?:to|ke)\s+([A-Za-z]{3})$/i);
        if (currMatch) {
            return {
                type: 'currency',
                params: {
                    amount: parseFloat(currMatch[1].replace(/,/g, '')),
                    from: currMatch[2],
                    to: currMatch[3],
                },
            };
        }

        // Check konversi satuan: 100 km to mile
        const unitMatch = expr.match(/^([\d.]+)\s*(\w+)\s+(?:to|ke)\s+(\w+)$/i);
        if (unitMatch) {
            return {
                type: 'unit',
                params: {
                    value: parseFloat(unitMatch[1]),
                    from: unitMatch[2],
                    to: unitMatch[3],
                },
            };
        }

        // Default: math expression
        return { type: 'math', params: { expression: expr } };
    }

    return null;
};

/**
 * Format hasil kalkulasi buat output
 */
const formatCalcResult = (result) => {
    if (!result.success) return `❌ ${result.error}`;
    return `🧮 *Hasil:* ${result.result}`;
};

module.exports = {
    calculateExpression,
    convertUnit,
    convertCurrency,
    parseCalcCommand,
    formatCalcResult,
};
