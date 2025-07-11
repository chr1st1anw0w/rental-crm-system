/**
 * Notion 頁面監控系統 - 自動監控指定頁面的新增連結
 * Notion Page Monitor - Automatically monitors specified pages for new links
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const winston = require('winston');
const cron = require('node-cron');
const NotionService = require('../services/notionService');
const IntelligentMapper = require('../mappers/intelligentMapper');
const IntelligentScorer = require('../processors/intelligentScorer');

class NotionPageMonitor {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    this.notionService = new NotionService();
    this.mapper = new IntelligentMapper();
    this.scorer = new IntelligentScorer();
    
    // 監控目標頁面 ID
    this.targetPageId = '22cb86cbe9ad80a18fbcca277054512a';
    this.databaseId = process.env.NOTION_DATABASE_ID;
    
    // 已處理的連結記錄
    this.processedLinks = new Set();
    
    // 設定日誌
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ filename: 'logs/page-monitor.log' })
      ]
    });

    // 簽名資訊
    this.signature = 'Augment Agent 🤖';
  }

  /**
   * 開始監控
   */
  async startMonitoring() {
    try {
      this.logger.info('🚀 啟動 Notion 頁面監控系統');
      this.logger.info(`📄 監控目標頁面: ${this.targetPageId}`);
      this.logger.info(`🗄️ 目標資料庫: ${this.databaseId}`);

      // 初始化 - 載入已存在的連結
      await this.initializeProcessedLinks();

      // 立即執行一次檢查
      await this.checkForNewLinks();

      // 設定定時監控 - 每 5 分鐘檢查一次
      cron.schedule('*/5 * * * *', async () => {
        this.logger.info('⏰ 定時檢查開始...');
        await this.checkForNewLinks();
      });

      this.logger.info('✅ 監控系統啟動成功，每 5 分鐘檢查一次');

    } catch (error) {
      this.logger.error('❌ 監控系統啟動失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 初始化已處理的連結
   */
  async initializeProcessedLinks() {
    try {
      this.logger.info('🔄 初始化已處理連結清單...');
      
      // 從資料庫中獲取所有已存在的連結
      const existingRentals = await this.notionService.queryRentals();
      
      for (const rental of existingRentals) {
        const url = rental.properties['網頁連結']?.url || rental.properties['網址']?.url;
        if (url) {
          this.processedLinks.add(url);
        }
      }

      this.logger.info(`📋 已載入 ${this.processedLinks.size} 個已處理的連結`);
    } catch (error) {
      this.logger.error('❌ 初始化已處理連結失敗', { error: error.message });
    }
  }

  /**
   * 檢查新增連結
   */
  async checkForNewLinks() {
    try {
      this.logger.info('🔍 檢查頁面新增連結...');

      // 獲取頁面內容
      const page = await this.notion.pages.retrieve({
        page_id: this.targetPageId
      });

      // 獲取頁面區塊內容
      const blocks = await this.getPageBlocks(this.targetPageId);
      
      // 提取所有連結
      const links = this.extractLinksFromBlocks(blocks);
      
      this.logger.info(`🔗 發現 ${links.length} 個連結`);

      // 篩選新連結
      const newLinks = links.filter(link => !this.processedLinks.has(link.url));
      
      if (newLinks.length > 0) {
        this.logger.info(`🆕 發現 ${newLinks.length} 個新連結`);
        
        for (const link of newLinks) {
          await this.processNewLink(link);
        }
      } else {
        this.logger.info('ℹ️ 沒有發現新連結');
      }

    } catch (error) {
      this.logger.error('❌ 檢查新連結失敗', { error: error.message });
    }
  }

  /**
   * 獲取頁面區塊
   */
  async getPageBlocks(pageId) {
    try {
      const response = await this.notion.blocks.children.list({
        block_id: pageId
      });
      
      return response.results;
    } catch (error) {
      this.logger.error('❌ 獲取頁面區塊失敗', { error: error.message });
      return [];
    }
  }

  /**
   * 從區塊中提取連結
   */
  extractLinksFromBlocks(blocks) {
    const links = [];
    
    for (const block of blocks) {
      // 處理段落區塊
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        for (const text of block.paragraph.rich_text) {
          if (text.href) {
            links.push({
              url: text.href,
              text: text.plain_text,
              type: 'paragraph'
            });
          }
        }
      }
      
      // 處理連結區塊
      if (block.type === 'bookmark' && block.bookmark?.url) {
        links.push({
          url: block.bookmark.url,
          text: block.bookmark.caption?.[0]?.plain_text || '',
          type: 'bookmark'
        });
      }
      
      // 處理嵌入區塊
      if (block.type === 'embed' && block.embed?.url) {
        links.push({
          url: block.embed.url,
          text: block.embed.caption?.[0]?.plain_text || '',
          type: 'embed'
        });
      }
    }
    
    return links;
  }

  /**
   * 處理新連結
   */
  async processNewLink(link) {
    try {
      this.logger.info(`🔄 處理新連結: ${link.url}`);

      // 檢查是否為 591 租屋連結
      if (!this.is591Link(link.url)) {
        this.logger.info(`⏭️ 跳過非 591 連結: ${link.url}`);
        return;
      }

      // 提取 591 房源資訊
      const rentalData = await this.extract591Data(link);
      
      if (!rentalData) {
        this.logger.warn(`⚠️ 無法提取房源資訊: ${link.url}`);
        return;
      }

      // 智能評分
      const scoreResult = await this.scorer.calculateScore(rentalData);
      this.logger.info(`📊 房源評分: ${scoreResult.totalScore}/100 (${scoreResult.適合度})`);

      // 資料映射
      const mappedData = await this.mapper.mapToNotion(rentalData);
      
      // 添加評分結果和監控資訊
      this.enhanceMappedData(mappedData, scoreResult, link);

      // 寫入資料庫
      const result = await this.notionService.createRentalPage(mappedData);
      
      if (result) {
        // 記錄已處理的連結
        this.processedLinks.add(link.url);
        
        // 更新監控頁面
        await this.updateMonitorPage(link, result.id, '成功');
        
        this.logger.info(`✅ 成功處理連結: ${link.url} -> 頁面 ID: ${result.id}`);
      } else {
        this.logger.info(`ℹ️ 連結已存在，跳過: ${link.url}`);
      }

    } catch (error) {
      this.logger.error(`❌ 處理連結失敗: ${link.url}`, { error: error.message });
      
      // 更新監控頁面顯示錯誤
      await this.updateMonitorPage(link, null, `失敗: ${error.message}`);
    }
  }

  /**
   * 檢查是否為 591 連結
   */
  is591Link(url) {
    return url.includes('591.com.tw') && 
           (url.includes('/rent/') || url.includes('/list/') || url.includes('rent.591.com.tw'));
  }

  /**
   * 提取 591 房源資料
   */
  async extract591Data(link) {
    try {
      // 這裡可以整合現有的爬蟲系統
      // 暫時返回基本資料結構
      return {
        title: link.text || '從監控頁面提取的房源',
        url: link.url,
        price: 0, // 需要爬蟲提取
        address: '', // 需要爬蟲提取
        description: `從監控頁面自動提取: ${link.url}`,
        facilities: [],
        contact: '',
        area: '',
        floor: '',
        details: {}
      };
    } catch (error) {
      this.logger.error('❌ 提取 591 資料失敗', { error: error.message });
      return null;
    }
  }

  /**
   * 增強映射資料
   */
  enhanceMappedData(mappedData, scoreResult, link) {
    // 添加評分結果
    mappedData.properties['適合度'] = {
      rich_text: [{ text: { content: scoreResult.適合度 } }]
    };

    mappedData.properties['重要優勢'] = {
      rich_text: [{ text: { content: scoreResult.重要優勢 } }]
    };

    mappedData.properties['平均評分'] = {
      number: Math.round(scoreResult.totalScore / 20 * 100) / 100
    };

    // 添加監控資訊和簽名
    const monitorInfo = `自動監控提取 | 來源: 監控頁面 | 處理時間: ${new Date().toLocaleString('zh-TW')} | 處理者: ${this.signature}`;
    
    mappedData.properties['備註'] = {
      rich_text: [{ text: { content: monitorInfo } }]
    };

    // 添加監控頁面連結
    mappedData.properties['簽約注意事項'] = {
      rich_text: [{ 
        text: { 
          content: `監控來源頁面: https://www.notion.so/${this.targetPageId}` 
        } 
      }]
    };
  }

  /**
   * 更新監控頁面
   */
  async updateMonitorPage(link, pageId, status) {
    try {
      const timestamp = new Date().toLocaleString('zh-TW');
      const statusEmoji = status === '成功' ? '✅' : '❌';
      
      let updateText = `${statusEmoji} ${status} | ${link.url} | ${timestamp} | ${this.signature}`;
      
      if (pageId) {
        updateText += ` | 資料庫頁面: https://www.notion.so/${pageId}`;
      }

      // 這裡可以添加更新監控頁面的邏輯
      // 例如在頁面底部添加處理記錄
      
      this.logger.info(`📝 監控記錄: ${updateText}`);
      
    } catch (error) {
      this.logger.error('❌ 更新監控頁面失敗', { error: error.message });
    }
  }

  /**
   * 停止監控
   */
  stopMonitoring() {
    this.logger.info('🛑 停止 Notion 頁面監控');
    // 這裡可以添加清理邏輯
  }

  /**
   * 獲取監控統計
   */
  getMonitoringStats() {
    return {
      processedLinksCount: this.processedLinks.size,
      targetPageId: this.targetPageId,
      databaseId: this.databaseId,
      signature: this.signature,
      startTime: this.startTime || new Date()
    };
  }
}

module.exports = NotionPageMonitor;
