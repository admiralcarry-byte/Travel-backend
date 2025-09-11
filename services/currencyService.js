const axios = require('axios');

class CurrencyService {
  constructor() {
    // You can configure different exchange rate providers here
    this.providers = {
      exchangerate: {
        baseUrl: 'https://api.exchangerate-api.com/v4/latest',
        apiKey: process.env.EXCHANGE_RATE_API_KEY || null
      },
      fixer: {
        baseUrl: 'http://data.fixer.io/api/latest',
        apiKey: process.env.FIXER_API_KEY || null
      }
    };
    
    // Default to exchangerate-api (free tier)
    this.defaultProvider = 'exchangerate';
  }

  /**
   * Get exchange rate between two currencies
   * @param {string} from - Source currency code (e.g., 'USD')
   * @param {string} to - Target currency code (e.g., 'EUR')
   * @returns {Promise<number>} Exchange rate
   */
  async getExchangeRate(from, to) {
    try {
      if (from === to) {
        return 1;
      }

      const provider = this.providers[this.defaultProvider];
      
      if (this.defaultProvider === 'exchangerate') {
        return await this.getExchangeRateFromExchangeRateAPI(from, to, provider);
      } else if (this.defaultProvider === 'fixer') {
        return await this.getExchangeRateFromFixer(from, to, provider);
      }
      
      throw new Error('Unsupported exchange rate provider');
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw new Error(`Failed to get exchange rate: ${error.message}`);
    }
  }

  /**
   * Get exchange rate from exchangerate-api.com
   */
  async getExchangeRateFromExchangeRateAPI(from, to, provider) {
    try {
      const response = await axios.get(`${provider.baseUrl}/${from}`);
      
      if (response.data && response.data.rates && response.data.rates[to]) {
        return response.data.rates[to];
      }
      
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    } catch (error) {
      if (error.response) {
        throw new Error(`Exchange rate API error: ${error.response.status} ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get exchange rate from fixer.io
   */
  async getExchangeRateFromFixer(from, to, provider) {
    try {
      if (!provider.apiKey) {
        throw new Error('Fixer.io API key not configured');
      }

      const response = await axios.get(provider.baseUrl, {
        params: {
          access_key: provider.apiKey,
          base: from,
          symbols: to
        }
      });

      if (response.data && response.data.success && response.data.rates && response.data.rates[to]) {
        return response.data.rates[to];
      }
      
      throw new Error(`Exchange rate not found for ${from} to ${to}`);
    } catch (error) {
      if (error.response) {
        throw new Error(`Fixer API error: ${error.response.status} ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} from - Source currency
   * @param {string} to - Target currency
   * @returns {Promise<{amount: number, rate: number}>}
   */
  async convertCurrency(amount, from, to) {
    try {
      const rate = await this.getExchangeRate(from, to);
      const convertedAmount = amount * rate;
      
      return {
        amount: convertedAmount,
        rate: rate,
        from: from,
        to: to,
        originalAmount: amount
      };
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw error;
    }
  }

  /**
   * Get supported currencies (common travel currencies)
   */
  getSupportedCurrencies() {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
      { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
      { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
      { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿' },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
      { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' }
    ];
  }

  /**
   * Validate currency code
   * @param {string} currency - Currency code to validate
   * @returns {boolean}
   */
  isValidCurrency(currency) {
    const supportedCurrencies = this.getSupportedCurrencies();
    return supportedCurrencies.some(c => c.code === currency.toUpperCase());
  }

  /**
   * Get currency info by code
   * @param {string} code - Currency code
   * @returns {object|null}
   */
  getCurrencyInfo(code) {
    const supportedCurrencies = this.getSupportedCurrencies();
    return supportedCurrencies.find(c => c.code === code.toUpperCase()) || null;
  }
}

// Create singleton instance
const currencyService = new CurrencyService();

module.exports = currencyService;