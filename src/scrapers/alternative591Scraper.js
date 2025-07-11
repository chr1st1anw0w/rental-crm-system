/**
 * 替代版 591 爬蟲 - 使用 Axios + Cheerio 避免 Puppeteer 問題
 * Alternative 591 Scraper - Using Axios + Cheerio to avoid Puppeteer issues
 */

const axios = require('axios');
const cheerio = require('cheerio');
const winston = require('winston');

class Alternative591Scraper {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/alternative-scraper.log' })
      ]
    });

    // 配置 axios 實例
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    this.baseUrl = 'https://rent.591.com.tw';
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  /**
   * 提取房源詳細資訊
   */
  async extractRentalDetails(url) {
    try {
      this.logger.info(`🔍 開始提取房源資訊: ${url}`);

      // 先訪問首頁獲取 Cookie
      await this.getHomepageCookies();

      const response = await this.fetchWithRetry(url);
      const $ = cheerio.load(response.data);

      // 檢查是否被重定向或顯示錯誤頁面
      if (this.isErrorPage($)) {
        throw new Error('頁面不存在或已被移除');
      }

      const rentalData = this.parseRentalData($, url);
      
      this.logger.info(`✅ 成功提取房源: ${rentalData.title || '未知標題'}`);
      return rentalData;

    } catch (error) {
      this.logger.error(`❌ 提取房源失敗: ${url}`, { error: error.message });
      throw error;
    }
  }

  /**
   * 獲取首頁 Cookie
   */
  async getHomepageCookies() {
    try {
      this.logger.info('🍪 獲取首頁 Cookie...');
      const response = await this.client.get(this.baseUrl);
      
      // 保存 cookies
      if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
        this.client.defaults.headers.Cookie = cookies;
        this.logger.info('✅ Cookie 獲取成功');
      }
    } catch (error) {
      this.logger.warn('⚠️ 首頁 Cookie 獲取失敗，繼續嘗試', { error: error.message });
    }
  }

  /**
   * 帶重試的請求
   */
  async fetchWithRetry(url, attempt = 1) {
    try {
      this.logger.info(`🔄 嘗試請求 (${attempt}/${this.maxRetries}): ${url}`);
      
      const response = await this.client.get(url);
      
      if (response.status === 200) {
        this.logger.info(`✅ 請求成功: ${url}`);
        return response;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      this.logger.warn(`⚠️ 第 ${attempt} 次請求失敗: ${error.message}`);
      
      if (attempt < this.maxRetries) {
        this.logger.info(`⏳ 等待 ${this.retryDelay/1000} 秒後重試...`);
        await this.delay(this.retryDelay);
        return this.fetchWithRetry(url, attempt + 1);
      } else {
        throw new Error(`請求失敗，已重試 ${this.maxRetries} 次: ${error.message}`);
      }
    }
  }

  /**
   * 檢查是否為錯誤頁面
   */
  isErrorPage($) {
    // 檢查常見的錯誤指示
    const errorIndicators = [
      '404',
      '頁面不存在',
      '找不到頁面',
      '物件不存在',
      '已下架',
      '錯誤'
    ];

    const pageText = $('body').text();
    return errorIndicators.some(indicator => pageText.includes(indicator));
  }

  /**
   * 解析房源資料
   */
  parseRentalData($, url) {
    try {
      // 基本資訊
      const title = this.extractTitle($);
      const price = this.extractPrice($);
      const address = this.extractAddress($);
      const roomType = this.extractRoomType($);
      
      // 詳細資訊
      const details = this.extractDetails($);
      const facilities = this.extractFacilities($);
      const images = this.extractImages($);
      const contact = this.extractContact($);

      return {
        title: title || '未知標題',
        price: price || 0,
        address: address || '未知地址',
        roomType: roomType || '套房',
        area: details.area || '',
        floor: details.floor || '',
        facilities: facilities || [],
        contact: contact || '',
        images: images || [],
        details: details || {},
        url: url,
        extractedAt: new Date().toISOString(),
        extractMethod: 'axios-cheerio'
      };

    } catch (error) {
      this.logger.error('❌ 解析房源資料失敗', { error: error.message });
      return {
        title: '解析失敗',
        price: 0,
        address: '未知',
        roomType: '套房',
        url: url,
        extractedAt: new Date().toISOString(),
        extractMethod: 'axios-cheerio',
        error: error.message
      };
    }
  }

  /**
   * 提取標題
   */
  extractTitle($) {
    const selectors = [
      '.info-title h1',
      '.house-title',
      'h1',
      '.title',
      '.rental-title'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return null;
  }

  /**
   * 提取價格
   */
  extractPrice($) {
    const selectors = [
      '.price-num',
      '.house-price .num',
      '.price',
      '.rental-price'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        const priceText = element.text().replace(/[^\d]/g, '');
        const price = parseInt(priceText);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }

    return 0;
  }

  /**
   * 提取地址
   */
  extractAddress($) {
    const selectors = [
      '.info-addr-value',
      '.house-addr',
      '.address',
      '.rental-address'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return null;
  }

  /**
   * 提取房型
   */
  extractRoomType($) {
    const selectors = [
      '.house-type',
      '.room-type',
      '.rental-type'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return '套房';
  }

  /**
   * 提取詳細資訊
   */
  extractDetails($) {
    const details = {};

    // 嘗試從不同的結構提取資訊
    $('.house-info li, .detail-info li, .info-list li').each((i, element) => {
      const $element = $(element);
      const label = $element.find('.info-label, .label').text().trim();
      const value = $element.find('.info-value, .value').text().trim();
      
      if (label && value) {
        details[label] = value;
      }
    });

    return details;
  }

  /**
   * 提取設備
   */
  extractFacilities($) {
    const facilities = [];

    $('.facility-item, .equipment-item, .amenity-item').each((i, element) => {
      const facility = $(element).text().trim();
      if (facility) {
        facilities.push(facility);
      }
    });

    return facilities;
  }

  /**
   * 提取圖片
   */
  extractImages($) {
    const images = [];

    $('.image-list img, .photo-list img, .gallery img').each((i, element) => {
      const src = $(element).attr('src');
      if (src && !src.includes('no-image') && !src.includes('placeholder')) {
        images.push(src);
      }
    });

    return images.slice(0, 5); // 限制最多 5 張圖片
  }

  /**
   * 提取聯絡資訊
   */
  extractContact($) {
    const selectors = [
      '.contact-name',
      '.landlord-name',
      '.owner-name'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return null;
  }

  /**
   * 延遲函數
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 測試連接
   */
  async testConnection() {
    try {
      this.logger.info('🧪 測試替代爬蟲連接...');
      
      const response = await this.client.get(this.baseUrl);
      
      if (response.status === 200) {
        this.logger.info('✅ 替代爬蟲連接測試成功');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      this.logger.error('❌ 替代爬蟲連接測試失敗', { error: error.message });
      return false;
    }
  }
}

module.exports = Alternative591Scraper;
