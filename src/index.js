/**
 * 主程式 - 591 到 Notion 智能自動化系統
 * Main Application - 591 to Notion Intelligent Automation System
 */

require('dotenv').config();
const winston = require('winston');
const MCPServer = require('./mcp/mcpServer');
const NotionService = require('./services/notionService');
const IntelligentMapper = require('./mappers/intelligentMapper');
const IntelligentScorer = require('./processors/intelligentScorer');

// 設定全域日誌
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/app.log',
      format: winston.format.json()
    })
  ]
});

class RentalAutomationApp {
  constructor() {
    this.logger = logger;
    this.mcpServer = new MCPServer();
    this.notionService = new NotionService();
    this.mapper = new IntelligentMapper();
    this.scorer = new IntelligentScorer();
  }

  /**
   * 啟動應用程式
   */
  async start() {
    try {
      this.logger.info('🚀 啟動 591-Notion 智能自動化系統');

      // 檢查環境變數
      this._validateEnvironment();

      // 測試 Notion 連接
      await this.notionService.testConnection();
      this.logger.info('✅ Notion 連接測試成功');

      // 啟動 MCP 服務器
      await this.mcpServer.start();
      this.logger.info('✅ MCP 服務器啟動成功');

      // 顯示系統資訊
      await this._displaySystemInfo();

      this.logger.info('🎉 系統啟動完成！');
      this.logger.info(`📡 MCP API 端點: http://localhost:${process.env.MCP_PORT || 3000}`);
      this.logger.info('📖 使用說明請參考 README.md');

    } catch (error) {
      this.logger.error('❌ 系統啟動失敗', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * 停止應用程式
   */
  async stop() {
    try {
      this.logger.info('🛑 正在停止系統...');
      
      if (this.mcpServer) {
        await this.mcpServer.stop();
      }
      
      this.logger.info('✅ 系統已安全停止');
    } catch (error) {
      this.logger.error('❌ 停止系統時發生錯誤', { error: error.message });
    }
  }

  /**
   * 處理單一房源 (CLI 模式)
   */
  async processSingleRental(rentalData, options = {}) {
    try {
      this.logger.info('🏠 開始處理單一房源', { title: rentalData.title });

      // 1. 智能評分
      const scoreResult = await this.scorer.calculateScore(rentalData);
      this.logger.info(`📊 評分結果: ${scoreResult.totalScore}/100 (${scoreResult.適合度})`);

      // 檢查分數門檻
      const minScore = options.minScore || 60;
      if (scoreResult.totalScore < minScore) {
        this.logger.warn(`⚠️  分數低於門檻 (${minScore})，跳過處理`);
        return {
          processed: false,
          reason: 'Score below threshold',
          score: scoreResult.totalScore,
          scoreResult
        };
      }

      // 2. 資料映射
      const mappedData = await this.mapper.mapToNotion(rentalData);
      
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

      // 3. 寫入 Notion
      let notionResult = null;
      if (!options.dryRun) {
        notionResult = await this.notionService.createRentalPage(mappedData);
        if (notionResult) {
          this.logger.info('✅ 成功寫入 Notion', { pageId: notionResult.id });
        } else {
          this.logger.info('ℹ️  房源已存在，跳過寫入');
        }
      } else {
        this.logger.info('🧪 乾跑模式，未實際寫入 Notion');
      }

      return {
        processed: true,
        score: scoreResult.totalScore,
        suitability: scoreResult.適合度,
        advantages: scoreResult.重要優勢,
        recommendations: scoreResult.recommendations,
        notionPageId: notionResult?.id || null,
        dryRun: options.dryRun || false
      };

    } catch (error) {
      this.logger.error('❌ 處理房源失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 批量處理房源 (CLI 模式)
   */
  async processBatchRentals(rentals, options = {}) {
    try {
      this.logger.info('📦 開始批量處理房源', { count: rentals.length });

      const results = {
        total: rentals.length,
        processed: 0,
        skipped: 0,
        failed: 0,
        details: []
      };

      for (let i = 0; i < rentals.length; i++) {
        const rental = rentals[i];
        
        try {
          this.logger.info(`🔄 處理第 ${i + 1}/${rentals.length} 個房源: ${rental.title}`);
          
          const result = await this.processSingleRental(rental, options);
          
          if (result.processed) {
            results.processed++;
            this.logger.info(`✅ 第 ${i + 1} 個房源處理完成 (分數: ${result.score})`);
          } else {
            results.skipped++;
            this.logger.info(`⏭️  第 ${i + 1} 個房源已跳過 (${result.reason})`);
          }

          results.details.push({
            index: i + 1,
            title: rental.title,
            ...result
          });

          // 避免 API 限制
          if (!options.dryRun && i < rentals.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          results.failed++;
          results.details.push({
            index: i + 1,
            title: rental.title || 'Unknown',
            processed: false,
            error: error.message
          });
          
          this.logger.error(`❌ 第 ${i + 1} 個房源處理失敗`, { error: error.message });
        }
      }

      this.logger.info('📊 批量處理完成', {
        總計: results.total,
        已處理: results.processed,
        已跳過: results.skipped,
        失敗: results.failed
      });

      return results;

    } catch (error) {
      this.logger.error('❌ 批量處理失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 生成系統報告
   */
  async generateReport() {
    try {
      this.logger.info('📈 生成系統報告...');

      const stats = await this.notionService.generateStatistics();
      
      console.log('\n' + '='.repeat(50));
      console.log('📊 591-Notion 自動化系統報告');
      console.log('='.repeat(50));
      console.log(`📋 總房源數量: ${stats.total}`);
      console.log(`💰 價格範圍: $${stats.priceRange.min} - $${stats.priceRange.max} (平均: $${stats.priceRange.average})`);
      console.log(`⭐ 評分範圍: ${stats.ratingRange.min} - ${stats.ratingRange.max} (平均: ${stats.ratingRange.average})`);
      
      console.log('\n📊 看房狀態分布:');
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 筆`);
      });
      
      console.log('\n🏠 房型分布:');
      Object.entries(stats.byRoomType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} 筆`);
      });
      
      console.log('\n📍 區域分布:');
      Object.entries(stats.byDistrict).slice(0, 10).forEach(([district, count]) => {
        console.log(`  ${district}: ${count} 筆`);
      });
      
      console.log('='.repeat(50) + '\n');

      return stats;
    } catch (error) {
      this.logger.error('❌ 生成報告失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 驗證環境變數
   */
  _validateEnvironment() {
    const required = [
      'NOTION_API_KEY',
      'NOTION_DATABASE_ID'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * 顯示系統資訊
   */
  async _displaySystemInfo() {
    const stats = await this.notionService.generateStatistics();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏠 591-Notion 智能自動化系統');
    console.log('='.repeat(60));
    console.log(`📊 當前資料庫房源數量: ${stats.total}`);
    console.log(`🎯 評分門檻: ${process.env.MIN_SCORE_THRESHOLD || 60} 分`);
    console.log(`💰 預算設定: 雅房 $${process.env.MAX_BUDGET_ROOM || 10000} / 套房 $${process.env.MAX_BUDGET_SUITE || 15000}`);
    console.log(`🚇 捷運距離限制: ${process.env.MAX_MRT_DISTANCE || 15} 分鐘`);
    console.log(`🐱 寵物友善: 必要條件`);
    console.log('='.repeat(60) + '\n');
  }
}

// CLI 模式支援
async function main() {
  const app = new RentalAutomationApp();
  
  // 處理程序退出
  process.on('SIGINT', async () => {
    logger.info('收到 SIGINT 信號，正在安全停止...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('收到 SIGTERM 信號，正在安全停止...');
    await app.stop();
    process.exit(0);
  });

  // 處理未捕獲的錯誤
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未處理的 Promise 拒絕', { reason, promise });
  });

  process.on('uncaughtException', (error) => {
    logger.error('未捕獲的例外', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  // 啟動應用程式
  await app.start();
}

// 如果直接執行此檔案，啟動應用程式
if (require.main === module) {
  main().catch(error => {
    logger.error('應用程式啟動失敗', { error: error.message });
    process.exit(1);
  });
}

module.exports = { RentalAutomationApp, main };
