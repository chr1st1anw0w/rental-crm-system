/**
 * 智能連結提取器 - 從 591 連結提取房源資訊
 * Intelligent Link Extractor - Extract rental information from 591 links
 */

const puppeteer = require('puppeteer');
const winston = require('winston');

class LinkExtractor {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/link-extractor.log' })
      ]
    });

    this.maxRetries = 3;
    this.retryDelay = 5000;
  }

  /**
   * 從 591 連結提取房源資訊
   */
  async extractFrom591Link(url) {
    let browser;
    try {
      this.logger.info(`🔍 開始提取連結資訊: ${url}`);

      // 驗證連結
      if (!this.is591Link(url)) {
        throw new Error('不是有效的 591 連結');
      }

      // 啟動瀏覽器
      browser = await this.createBrowser();
      const page = await this.createPage(browser);

      // 導航到頁面
      await this.navigateWithRetry(page, url);

      // 提取房源資訊
      const rentalData = await this.extractRentalData(page, url);

      this.logger.info(`✅ 成功提取房源資訊: ${rentalData.title}`);
      return rentalData;

    } catch (error) {
      this.logger.error(`❌ 提取連結資訊失敗: ${url}`, { error: error.message });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 檢查是否為 591 連結
   */
  is591Link(url) {
    const patterns = [
      /591\.com\.tw/,
      /rent\.591\.com\.tw/,
      /sale\.591\.com\.tw/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  /**
   * 建立瀏覽器實例
   */
  async createBrowser() {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  /**
   * 建立頁面實例
   */
  async createPage(browser) {
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 設定超時
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    return page;
  }

  /**
   * 帶重試機制的導航
   */
  async navigateWithRetry(page, url) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.info(`🔄 嘗試導航 (${attempt}/${this.maxRetries}): ${url}`);
        
        const response = await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        if (response && response.ok()) {
          this.logger.info(`✅ 成功導航到: ${url}`);
          return response;
        } else {
          throw new Error(`HTTP ${response?.status()} - ${response?.statusText()}`);
        }

      } catch (error) {
        this.logger.warn(`⚠️ 第 ${attempt} 次導航失敗: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          this.logger.info(`⏳ 等待 ${this.retryDelay/1000} 秒後重試...`);
          await this.delay(this.retryDelay);
        } else {
          throw new Error(`導航失敗，已重試 ${this.maxRetries} 次: ${error.message}`);
        }
      }
    }
  }

  /**
   * 提取房源資料
   */
  async extractRentalData(page, url) {
    try {
      // 等待頁面載入
      await page.waitForSelector('.info-title, .house-title, h1', { timeout: 10000 });

      const data = await page.evaluate((sourceUrl) => {
        // 提取標題
        const titleSelectors = [
          '.info-title h1',
          '.house-title',
          '.detail-title h1',
          'h1'
        ];
        
        let title = '';
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            title = element.textContent.trim();
            break;
          }
        }

        // 提取價格
        const priceSelectors = [
          '.price-num',
          '.house-price .num',
          '.price .num',
          '[class*="price"] .num'
        ];
        
        let price = 0;
        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const priceText = element.textContent.replace(/[^\d]/g, '');
            if (priceText) {
              price = parseInt(priceText);
              break;
            }
          }
        }

        // 提取地址
        const addressSelectors = [
          '.info-addr-value',
          '.house-addr',
          '.detail-addr',
          '[class*="addr"]'
        ];
        
        let address = '';
        for (const selector of addressSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            address = element.textContent.trim();
            break;
          }
        }

        // 提取房屋詳情
        const details = {};
        const detailItems = document.querySelectorAll('.house-info li, .detail-info li, .info-list li');
        
        detailItems.forEach(item => {
          const label = item.querySelector('.info-label, .label, .title');
          const value = item.querySelector('.info-value, .value, .content');
          
          if (label && value) {
            const labelText = label.textContent.trim();
            const valueText = value.textContent.trim();
            if (labelText && valueText) {
              details[labelText] = valueText;
            }
          }
        });

        // 提取設備
        const facilities = [];
        const facilitySelectors = [
          '.facility-item',
          '.equipment-item',
          '.feature-item',
          '[class*="facility"] span',
          '[class*="equipment"] span'
        ];
        
        for (const selector of facilitySelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const text = element.textContent.trim();
            if (text && !facilities.includes(text)) {
              facilities.push(text);
            }
          });
        }

        // 提取聯絡人
        const contactSelectors = [
          '.contact-name',
          '.landlord-name',
          '.owner-name',
          '[class*="contact"] .name'
        ];
        
        let contact = '';
        for (const selector of contactSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            contact = element.textContent.trim();
            break;
          }
        }

        // 提取圖片
        const images = [];
        const imageSelectors = [
          '.image-list img',
          '.photo-list img',
          '.gallery img',
          '[class*="image"] img'
        ];
        
        for (const selector of imageSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(img => {
            if (img.src && !img.src.includes('no-image') && !images.includes(img.src)) {
              images.push(img.src);
            }
          });
        }

        return {
          title: title || '未提供標題',
          price: price,
          address: address || '',
          roomType: details['型態'] || details['房型'] || '套房',
          area: details['坪數'] || details['面積'] || '',
          floor: details['樓層'] || '',
          facilities: facilities,
          contact: contact || '',
          images: images.slice(0, 5), // 限制圖片數量
          details: details,
          url: sourceUrl,
          extractedAt: new Date().toISOString()
        };
      }, url);

      // 後處理資料
      return this.postProcessData(data);

    } catch (error) {
      this.logger.error('❌ 提取房源資料失敗', { error: error.message });
      
      // 返回基本資料結構
      return {
        title: '提取失敗 - 請手動檢查',
        price: 0,
        address: '',
        roomType: '未知',
        area: '',
        floor: '',
        facilities: [],
        contact: '',
        images: [],
        details: {},
        url: url,
        extractedAt: new Date().toISOString(),
        extractionError: error.message
      };
    }
  }

  /**
   * 後處理資料
   */
  postProcessData(data) {
    // 清理標題
    if (data.title) {
      data.title = data.title.replace(/\s+/g, ' ').trim();
    }

    // 清理地址
    if (data.address) {
      data.address = data.address.replace(/\s+/g, ' ').trim();
    }

    // 處理面積
    if (data.area) {
      data.area = data.area.replace(/[^\d.坪]/g, '').trim();
    }

    // 處理樓層
    if (data.floor) {
      data.floor = data.floor.replace(/\s+/g, ' ').trim();
    }

    // 去重設備
    data.facilities = [...new Set(data.facilities.filter(f => f && f.trim()))];

    return data;
  }

  /**
   * 批量提取連結
   */
  async extractMultipleLinks(urls) {
    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        this.logger.info(`📦 批量提取 (${i + 1}/${urls.length}): ${url}`);
        
        const data = await this.extractFrom591Link(url);
        results.push({
          success: true,
          url: url,
          data: data
        });
        
        // 避免請求過於頻繁
        if (i < urls.length - 1) {
          await this.delay(3000);
        }
        
      } catch (error) {
        this.logger.error(`❌ 批量提取失敗: ${url}`, { error: error.message });
        results.push({
          success: false,
          url: url,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 延遲函數
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 測試連結提取
   */
  async testExtraction(url) {
    try {
      this.logger.info(`🧪 測試連結提取: ${url}`);
      
      const data = await this.extractFrom591Link(url);
      
      console.log('\n📊 提取結果:');
      console.log(`標題: ${data.title}`);
      console.log(`價格: $${data.price}`);
      console.log(`地址: ${data.address}`);
      console.log(`房型: ${data.roomType}`);
      console.log(`面積: ${data.area}`);
      console.log(`樓層: ${data.floor}`);
      console.log(`設備: ${data.facilities.join(', ')}`);
      console.log(`聯絡人: ${data.contact}`);
      console.log(`圖片數量: ${data.images.length}`);
      
      return data;
      
    } catch (error) {
      console.error('❌ 測試失敗:', error.message);
      throw error;
    }
  }
}

module.exports = LinkExtractor;
