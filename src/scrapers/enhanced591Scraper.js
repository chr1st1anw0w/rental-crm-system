/**
 * 增強版 591 爬蟲 - 整合 Claude Code 版本的爬蟲邏輯與 Augment 版本的錯誤處理
 * Enhanced 591 Scraper - Integrating Claude Code scraping logic with Augment error handling
 */

const puppeteer = require('puppeteer');
const winston = require('winston');

class Enhanced591Scraper {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/scraper.log' })
      ]
    });

    // 從 Claude Code 版本借鑑的爬蟲配置
    this.config = {
      baseUrl: 'https://rent.591.com.tw',
      searchParams: {
        region: 1,        // 台北市
        kind: 2,          // 租屋
        rentprice: '10000,15000'  // 價格範圍
      },
      delays: {
        pageLoad: 3000,
        betweenRequests: 2000,
        retry: 5000
      },
      maxRetries: 3,
      timeout: 30000
    };

    // 從 Augment 版本借鑑的錯誤處理
    this.networkErrorPatterns = [
      'ERR_NETWORK_CHANGED',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_CONNECTION_RESET',
      'Navigation timeout',
      'net::ERR_'
    ];
  }

  /**
   * 搜尋租屋列表 - 整合 Claude Code 的搜尋邏輯
   */
  async searchRentals(searchOptions = {}) {
    let browser;
    try {
      this.logger.info('🔍 開始搜尋 591 租屋列表');

      browser = await this.createBrowser();
      const page = await this.createPage(browser);

      // 建構搜尋 URL
      const searchUrl = this.buildSearchUrl(searchOptions);
      await this.navigateWithRetry(page, searchUrl);

      // 等待列表載入
      await this.waitForListLoad(page);

      // 提取房源連結
      const listings = await this.extractListings(page);
      
      this.logger.info(`✅ 成功提取 ${listings.length} 個房源連結`);
      return listings;

    } catch (error) {
      this.logger.error('❌ 搜尋租屋列表失敗', { error: error.message });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 提取單一房源詳細資訊 - 整合兩版本的提取邏輯
   */
  async extractRentalDetails(url) {
    let browser;
    try {
      this.logger.info(`🏠 提取房源詳細資訊: ${url}`);

      browser = await this.createBrowser();
      const page = await this.createPage(browser);

      await this.navigateWithRetry(page, url);
      await this.waitForDetailLoad(page);

      const rentalData = await this.extractDetailedInfo(page, url);
      
      this.logger.info(`✅ 成功提取房源: ${rentalData.title}`);
      return rentalData;

    } catch (error) {
      this.logger.error(`❌ 提取房源詳細資訊失敗: ${url}`, { error: error.message });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 建構搜尋 URL - 從 Claude Code 版本改進
   */
  buildSearchUrl(options = {}) {
    const params = {
      ...this.config.searchParams,
      ...options
    };

    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    return `${this.config.baseUrl}/list?${queryString}`;
  }

  /**
   * 提取房源列表 - 從 Claude Code 版本改進
   */
  async extractListings(page) {
    return await page.evaluate(() => {
      const listings = [];
      const items = document.querySelectorAll('.list-container .item, .house-list .item');

      items.forEach(item => {
        const linkElement = item.querySelector('a[href*="/rent-detail"]');
        const titleElement = item.querySelector('.item-title, .house-title');
        const priceElement = item.querySelector('.price, .house-price');

        if (linkElement && titleElement) {
          listings.push({
            url: linkElement.href,
            title: titleElement.textContent.trim(),
            price: priceElement ? priceElement.textContent.trim() : '',
            preview: {
              address: item.querySelector('.item-addr, .house-addr')?.textContent?.trim() || '',
              roomType: item.querySelector('.item-type, .house-type')?.textContent?.trim() || ''
            }
          });
        }
      });

      return listings;
    });
  }

  /**
   * 提取詳細資訊 - 整合兩版本的提取邏輯
   */
  async extractDetailedInfo(page, url) {
    return await page.evaluate((sourceUrl) => {
      // 基本資訊提取
      const title = document.querySelector('.info-title h1, .house-title')?.textContent?.trim() || '';
      const price = document.querySelector('.price-num, .house-price .num')?.textContent?.replace(/[^\d]/g, '') || '0';
      const address = document.querySelector('.info-addr-value, .house-addr')?.textContent?.trim() || '';

      // 房屋詳情提取
      const details = {};
      document.querySelectorAll('.house-info li, .detail-info li').forEach(item => {
        const label = item.querySelector('.info-label, .label')?.textContent?.trim();
        const value = item.querySelector('.info-value, .value')?.textContent?.trim();
        if (label && value) {
          details[label] = value;
        }
      });

      // 設備提取
      const facilities = [];
      document.querySelectorAll('.facility-item, .equipment-item').forEach(item => {
        const facility = item.textContent.trim();
        if (facility) facilities.push(facility);
      });

      // 圖片提取
      const images = [];
      document.querySelectorAll('.image-list img, .photo-list img').forEach(img => {
        if (img.src && !img.src.includes('no-image')) {
          images.push(img.src);
        }
      });

      // 聯絡資訊
      const contact = document.querySelector('.contact-name, .landlord-name')?.textContent?.trim() || '';

      return {
        title,
        price: parseInt(price) || 0,
        address,
        roomType: details['型態'] || details['房型'] || '套房',
        area: details['坪數'] || details['面積'] || '',
        floor: details['樓層'] || '',
        facilities,
        contact,
        images: images.slice(0, 5),
        details,
        url: sourceUrl,
        extractedAt: new Date().toISOString()
      };
    }, url);
  }

  /**
   * 建立瀏覽器 - 增強版反檢測配置
   */
  async createBrowser() {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
  }

  /**
   * 建立頁面 - 增強版反檢測配置
   */
  async createPage(browser) {
    const page = await browser.newPage();

    // 設定真實的瀏覽器環境
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 設定額外的 headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    });

    page.setDefaultTimeout(this.config.timeout);
    page.setDefaultNavigationTimeout(this.config.timeout);

    // 移除 webdriver 標識
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // 模擬真實的瀏覽器屬性
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-TW', 'zh', 'en'],
      });
    });

    // 錯誤監聽
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure && this.isNetworkError(failure.errorText)) {
        this.logger.warn('🔄 檢測到網路錯誤，準備重試...', { error: failure.errorText });
      }
    });

    return page;
  }

  /**
   * 帶重試的導航 - 從 Augment 版本的重試機制
   */
  async navigateWithRetry(page, url) {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.logger.info(`🔄 嘗試導航 (${attempt}/${this.config.maxRetries}): ${url}`);

        // 核心修復：在導航到目標 URL 前，先訪問首頁以獲取 Cookie
        if (!url.includes(this.config.baseUrl) && !url.includes('/list')) {
          // 避免重複訪問首頁，且列表頁不需要預載入
          try {
            await page.goto(this.config.baseUrl, {
              waitUntil: 'networkidle2',
              timeout: 15000
            });
            this.logger.info('🍪 已訪問首頁以獲取 Cookie 和 Session');
            await this.delay(1000); // 增加延遲確保 Cookie 完全設定
          } catch (homeError) {
            this.logger.warn('⚠️ 首頁訪問失敗，繼續嘗試目標頁面', { error: homeError.message });
          }
        }

        const response = await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout
        });

        if (response && response.ok()) {
          this.logger.info(`✅ 成功導航到: ${url}`);

          // 檢查是否被重定向到驗證頁面
          const currentUrl = page.url();
          if (currentUrl.includes('captcha') || currentUrl.includes('verify')) {
            throw new Error('頁面被重定向到驗證頁面，可能需要處理 CAPTCHA');
          }

          return response;
        } else {
          throw new Error(`HTTP ${response?.status()} - ${response?.statusText()}`);
        }

      } catch (error) {
        this.logger.warn(`⚠️ 第 ${attempt} 次導航失敗: ${error.message}`);

        if (this.isNetworkError(error.message) && attempt < this.config.maxRetries) {
          this.logger.info(`⏳ 等待 ${this.config.delays.retry/1000} 秒後重試...`);
          await this.delay(this.config.delays.retry);
        } else if (attempt === this.config.maxRetries) {
          throw new Error(`導航失敗，已重試 ${this.config.maxRetries} 次: ${error.message}`);
        }
      }
    }
  }

  /**
   * 等待列表載入
   */
  async waitForListLoad(page) {
    try {
      await page.waitForSelector('.list-container, .house-list', { timeout: 10000 });
      await this.delay(this.config.delays.pageLoad);
    } catch (error) {
      this.logger.warn('⚠️ 等待列表載入超時');
    }
  }

  /**
   * 等待詳細頁面載入
   */
  async waitForDetailLoad(page) {
    try {
      await page.waitForSelector('.info-title, .house-title', { timeout: 10000 });
      await this.delay(this.config.delays.pageLoad);
    } catch (error) {
      this.logger.warn('⚠️ 等待詳細頁面載入超時');
    }
  }

  /**
   * 檢查是否為網路錯誤 - 從 Augment 版本
   */
  isNetworkError(errorMessage) {
    return this.networkErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );
  }

  /**
   * 延遲函數
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量搜尋和提取 - 整合功能
   */
  async searchAndExtractBatch(searchOptions = {}, maxResults = 10) {
    try {
      this.logger.info('🚀 開始批量搜尋和提取');

      // 1. 搜尋列表
      const listings = await this.searchRentals(searchOptions);
      const targetListings = listings.slice(0, maxResults);

      // 2. 提取詳細資訊
      const results = [];
      for (let i = 0; i < targetListings.length; i++) {
        const listing = targetListings[i];
        
        try {
          this.logger.info(`📋 處理第 ${i + 1}/${targetListings.length} 個房源`);
          
          const detailData = await this.extractRentalDetails(listing.url);
          results.push(detailData);

          // 避免請求過於頻繁
          if (i < targetListings.length - 1) {
            await this.delay(this.config.delays.betweenRequests);
          }

        } catch (error) {
          this.logger.error(`❌ 提取第 ${i + 1} 個房源失敗`, { error: error.message });
        }
      }

      this.logger.info(`🎉 批量提取完成，成功 ${results.length}/${targetListings.length} 個房源`);
      return results;

    } catch (error) {
      this.logger.error('❌ 批量搜尋和提取失敗', { error: error.message });
      throw error;
    }
  }
}

module.exports = Enhanced591Scraper;
