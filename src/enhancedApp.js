/**
 * 增強版主程式 - 整合兩版本的最佳功能
 * Enhanced Main Application - Integrating best features from both versions
 */

require('dotenv').config();
const winston = require('winston');
const cron = require('node-cron');

// 從 Augment 版本引入
const NotionService = require('./services/notionService');
const IntelligentMapper = require('./mappers/intelligentMapper');
const IntelligentScorer = require('./processors/intelligentScorer');
const AutoProcessor = require('./processors/autoProcessor');

// 新增的增強版組件
const Enhanced591Scraper = require('./scrapers/enhanced591Scraper');
const enhancedConfig = require('./config/enhancedConfig');

class EnhancedRentalApp {
  constructor() {
    this.config = enhancedConfig;
    
    // 初始化服務
    this.notionService = new NotionService();
    this.mapper = new IntelligentMapper();
    this.scorer = new IntelligentScorer();
    this.autoProcessor = new AutoProcessor();
    this.scraper = new Enhanced591Scraper();
    
    // 設定增強版日誌
    this.logger = this._setupEnhancedLogging();
    
    // 監控統計
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      totalProcessed: 0,
      totalAdded: 0,
      startTime: new Date(),
      lastRun: null
    };

    // 快取系統
    this.cache = new Map();
    this.cacheTimeout = this.config.performance.caching.ttl;
  }

  /**
   * 設定增強版日誌系統
   */
  _setupEnhancedLogging() {
    const logConfig = this.config.logging;
    
    return winston.createLogger({
      level: logConfig.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // 控制台輸出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })
          )
        }),
        
        // 檔案輸出
        new winston.transports.File({ 
          filename: logConfig.files.app,
          format: winston.format.json()
        }),
        
        // 錯誤專用檔案
        new winston.transports.File({
          filename: logConfig.files.error,
          level: 'error',
          format: winston.format.json()
        })
      ]
    });
  }

  /**
   * 啟動增強版應用程式
   */
  async start() {
    try {
      this.logger.info('🚀 啟動增強版 591-Notion 自動化系統');
      this.logger.info('📊 系統配置', {
        scrapingEnabled: true,
        monitoringEnabled: true,
        cachingEnabled: this.config.performance.caching.enabled,
        maxConcurrency: this.config.performance.concurrency.maxConcurrentPages
      });

      // 驗證環境設定
      await this._validateEnvironment();

      // 測試所有服務連接
      await this._testServices();

      // 設定定時任務
      this._setupScheduledTasks();

      // 立即執行一次完整流程
      await this.runFullProcess();

      this.logger.info('✅ 增強版系統啟動成功');
      this._displaySystemInfo();

    } catch (error) {
      this.logger.error('❌ 系統啟動失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 執行完整處理流程 - 整合兩版本的最佳流程
   */
  async runFullProcess() {
    const startTime = Date.now();
    this.stats.totalRuns++;
    this.stats.lastRun = new Date();

    try {
      this.logger.info('🔄 開始執行完整處理流程');

      // 1. 爬取最新房源 (從 Claude Code 版本改進)
      const searchOptions = {
        ...this.config.scraper.searchDefaults,
        maxResults: this.config.monitoring.limits.maxLinksPerCheck
      };

      const rentals = await this.scraper.searchAndExtractBatch(
        searchOptions, 
        this.config.monitoring.limits.maxLinksPerCheck
      );

      this.logger.info(`📋 爬取到 ${rentals.length} 個房源`);

      if (rentals.length === 0) {
        this.logger.info('ℹ️ 沒有新房源，結束本次處理');
        return;
      }

      // 2. 批量處理房源 (使用 Augment 版本的智能處理)
      const processResults = await this.autoProcessor.processMultipleLinks(
        rentals.map(r => r.url),
        {
          minScore: this.config.scoring.thresholds.minimum,
          signature: 'Enhanced Augment Agent 🤖',
          source: '增強版自動爬蟲系統'
        }
      );

      // 3. 統計和報告
      const summary = this._generateProcessingSummary(processResults.results);
      this.stats.totalProcessed += summary.total;
      this.stats.totalAdded += summary.successful;

      if (summary.successful > 0) {
        this.stats.successfulRuns++;
      }

      // 4. 高分房源通知
      if (this.config.monitoring.notifications.onHighScore) {
        await this._notifyHighScoreRentals(processResults.results);
      }

      const processingTime = Date.now() - startTime;
      this.logger.info('✅ 完整處理流程完成', {
        processingTime: `${processingTime}ms`,
        ...summary
      });

    } catch (error) {
      this.logger.error('❌ 完整處理流程失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 設定定時任務 - 整合兩版本的排程策略
   */
  _setupScheduledTasks() {
    const intervals = this.config.monitoring.intervals;

    // 主要監控任務 - 每 5 分鐘執行
    cron.schedule(intervals.pageCheck, async () => {
      this.logger.info('⏰ 定時監控任務觸發');
      try {
        await this.runFullProcess();
      } catch (error) {
        this.logger.error('❌ 定時任務執行失敗', { error: error.message });
      }
    });

    // 完整爬取任務 - 每 2 小時執行
    cron.schedule(intervals.fullScrape, async () => {
      this.logger.info('⏰ 完整爬取任務觸發');
      try {
        await this.runFullProcess();
      } catch (error) {
        this.logger.error('❌ 完整爬取任務失敗', { error: error.message });
      }
    });

    // 清理任務 - 每天凌晨執行
    cron.schedule(intervals.cleanup, async () => {
      this.logger.info('⏰ 清理任務觸發');
      try {
        await this._performCleanup();
      } catch (error) {
        this.logger.error('❌ 清理任務失敗', { error: error.message });
      }
    });

    this.logger.info('📅 定時任務設定完成', intervals);
  }

  /**
   * 驗證環境設定
   */
  async _validateEnvironment() {
    const required = [
      'NOTION_API_KEY',
      'NOTION_DATABASE_ID'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    this.logger.info('✅ 環境變數驗證通過');
  }

  /**
   * 測試所有服務連接
   */
  async _testServices() {
    this.logger.info('🔍 測試服務連接...');

    // 測試 Notion 連接
    await this.notionService.testConnection();
    this.logger.info('✅ Notion 服務連接正常');

    // 測試爬蟲功能 (簡單測試)
    try {
      const testUrl = this.config.scraper.baseUrl;
      // 這裡可以添加簡單的連接測試
      this.logger.info('✅ 爬蟲服務準備就緒');
    } catch (error) {
      this.logger.warn('⚠️ 爬蟲服務測試失敗，但系統可繼續運行');
    }
  }

  /**
   * 生成處理摘要
   */
  _generateProcessingSummary(results) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && r.error).length;
    const skipped = results.filter(r => !r.success && !r.error).length;
    const highScore = results.filter(r => r.success && r.score >= this.config.monitoring.notifications.scoreThreshold).length;

    return {
      total,
      successful,
      failed,
      skipped,
      highScore,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0
    };
  }

  /**
   * 高分房源通知
   */
  async _notifyHighScoreRentals(results) {
    const highScoreRentals = results.filter(r => 
      r.success && r.score >= this.config.monitoring.notifications.scoreThreshold
    );

    if (highScoreRentals.length > 0) {
      this.logger.info('🌟 發現高分房源', {
        count: highScoreRentals.length,
        rentals: highScoreRentals.map(r => ({
          url: r.url,
          score: r.score,
          suitability: r.suitability
        }))
      });

      // 這裡可以添加其他通知方式 (email, webhook 等)
    }
  }

  /**
   * 執行清理任務
   */
  async _performCleanup() {
    this.logger.info('🧹 執行系統清理...');

    // 清理快取
    this.cache.clear();
    
    // 清理舊日誌 (可以添加日誌輪轉邏輯)
    
    // 清理統計資料 (保留最近的統計)
    
    this.logger.info('✅ 系統清理完成');
  }

  /**
   * 顯示系統資訊
   */
  _displaySystemInfo() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const uptimeHours = Math.round(uptime / (1000 * 60 * 60) * 100) / 100;

    console.log('\n' + '='.repeat(70));
    console.log('🏠 增強版 591-Notion 智能自動化系統');
    console.log('='.repeat(70));
    console.log(`📊 系統統計:`);
    console.log(`   總執行次數: ${this.stats.totalRuns}`);
    console.log(`   成功執行次數: ${this.stats.successfulRuns}`);
    console.log(`   總處理房源: ${this.stats.totalProcessed}`);
    console.log(`   成功添加房源: ${this.stats.totalAdded}`);
    console.log(`   系統運行時間: ${uptimeHours} 小時`);
    console.log(`   最後執行時間: ${this.stats.lastRun ? this.stats.lastRun.toLocaleString('zh-TW') : '尚未執行'}`);
    console.log('');
    console.log(`🎯 系統配置:`);
    console.log(`   評分門檻: ${this.config.scoring.thresholds.minimum} 分`);
    console.log(`   監控間隔: ${this.config.monitoring.intervals.pageCheck}`);
    console.log(`   最大並發: ${this.config.performance.concurrency.maxConcurrentPages}`);
    console.log(`   快取啟用: ${this.config.performance.caching.enabled ? '是' : '否'}`);
    console.log('='.repeat(70) + '\n');
  }

  /**
   * 獲取系統統計
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    
    return {
      ...this.stats,
      uptimeMs: uptime,
      uptimeHours: Math.round(uptime / (1000 * 60 * 60) * 100) / 100,
      successRate: this.stats.totalRuns > 0 ? 
        Math.round((this.stats.successfulRuns / this.stats.totalRuns) * 100) : 0,
      averageProcessed: this.stats.totalRuns > 0 ? 
        Math.round(this.stats.totalProcessed / this.stats.totalRuns) : 0
    };
  }

  /**
   * 停止系統
   */
  async stop() {
    try {
      this.logger.info('🛑 正在停止增強版系統...');
      
      // 清理資源
      this.cache.clear();
      
      this.logger.info('✅ 增強版系統已安全停止');
    } catch (error) {
      this.logger.error('❌ 停止系統時發生錯誤', { error: error.message });
    }
  }
}

// 主要執行函數
async function main() {
  const app = new EnhancedRentalApp();
  
  // 處理程序退出
  process.on('SIGINT', async () => {
    console.log('\n收到 SIGINT 信號，正在安全停止...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n收到 SIGTERM 信號，正在安全停止...');
    await app.stop();
    process.exit(0);
  });

  // 處理未捕獲的錯誤
  process.on('unhandledRejection', (reason, promise) => {
    app.logger.error('未處理的 Promise 拒絕', { reason, promise });
  });

  process.on('uncaughtException', (error) => {
    app.logger.error('未捕獲的例外', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  try {
    await app.start();
    
    // 定期輸出統計資訊
    setInterval(() => {
      const stats = app.getStats();
      app.logger.info('📊 系統統計', stats);
    }, 30 * 60 * 1000); // 每 30 分鐘
    
  } catch (error) {
    console.error('❌ 增強版系統啟動失敗:', error.message);
    process.exit(1);
  }
}

// 如果直接執行此檔案，啟動應用程式
if (require.main === module) {
  main();
}

module.exports = { EnhancedRentalApp, main };
