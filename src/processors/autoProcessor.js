/**
 * 自動化處理器 - 整合連結提取、評分、映射和資料庫寫入
 * Auto Processor - Integrates link extraction, scoring, mapping, and database writing
 */

const LinkExtractor = require('../extractors/linkExtractor');
const IntelligentScorer = require('./intelligentScorer');
const IntelligentMapper = require('../mappers/intelligentMapper');
const NotionService = require('../services/notionService');
const winston = require('winston');

class AutoProcessor {
  constructor() {
    this.linkExtractor = new LinkExtractor();
    this.scorer = new IntelligentScorer();
    this.mapper = new IntelligentMapper();
    this.notionService = new NotionService();
    
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
        new winston.transports.File({ filename: 'logs/auto-processor.log' })
      ]
    });

    // 處理統計
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * 自動處理單一連結
   */
  async processLink(url, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🚀 開始自動處理連結: ${url}`);
      
      // 1. 提取房源資訊
      this.logger.info('1️⃣ 提取房源資訊...');
      const rentalData = await this.linkExtractor.extractFrom591Link(url);
      
      if (!rentalData || rentalData.extractionError) {
        throw new Error(`資訊提取失敗: ${rentalData?.extractionError || '未知錯誤'}`);
      }

      // 2. 智能評分
      this.logger.info('2️⃣ 進行智能評分...');
      const scoreResult = await this.scorer.calculateScore(rentalData);
      
      this.logger.info(`📊 評分結果: ${scoreResult.totalScore}/100 (${scoreResult.適合度})`);

      // 檢查分數門檻
      const minScore = options.minScore || 60;
      if (scoreResult.totalScore < minScore) {
        this.stats.skipped++;
        this.logger.warn(`⏭️ 分數低於門檻 (${minScore})，跳過處理`);
        
        return {
          success: false,
          reason: 'Score below threshold',
          score: scoreResult.totalScore,
          minScore: minScore,
          url: url,
          processingTime: Date.now() - startTime
        };
      }

      // 3. 資料映射
      this.logger.info('3️⃣ 進行資料映射...');
      const mappedData = await this.mapper.mapToNotion(rentalData);

      // 4. 增強映射資料
      this.enhanceMappedData(mappedData, scoreResult, rentalData, options);

      // 5. 寫入 Notion 資料庫
      this.logger.info('4️⃣ 寫入 Notion 資料庫...');
      
      if (options.dryRun) {
        this.logger.info('🧪 乾跑模式，跳過實際寫入');
        this.stats.processed++;
        
        return {
          success: true,
          dryRun: true,
          score: scoreResult.totalScore,
          suitability: scoreResult.適合度,
          advantages: scoreResult.重要優勢,
          url: url,
          processingTime: Date.now() - startTime
        };
      }

      const notionResult = await this.notionService.createRentalPage(mappedData);
      
      if (notionResult) {
        this.stats.successful++;
        this.logger.info(`✅ 成功處理連結: ${url} -> 頁面 ID: ${notionResult.id}`);
        
        return {
          success: true,
          score: scoreResult.totalScore,
          suitability: scoreResult.適合度,
          advantages: scoreResult.重要優勢,
          notionPageId: notionResult.id,
          notionPageUrl: `https://www.notion.so/${notionResult.id}`,
          url: url,
          processingTime: Date.now() - startTime
        };
      } else {
        this.stats.skipped++;
        this.logger.info(`ℹ️ 房源已存在，跳過: ${url}`);
        
        return {
          success: false,
          reason: 'Already exists',
          url: url,
          processingTime: Date.now() - startTime
        };
      }

    } catch (error) {
      this.stats.failed++;
      this.logger.error(`❌ 處理連結失敗: ${url}`, { error: error.message });
      
      return {
        success: false,
        error: error.message,
        url: url,
        processingTime: Date.now() - startTime
      };
    } finally {
      this.stats.processed++;
    }
  }

  /**
   * 增強映射資料
   */
  enhanceMappedData(mappedData, scoreResult, rentalData, options) {
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

    // 添加處理資訊和簽名
    const timestamp = new Date().toLocaleString('zh-TW');
    const signature = options.signature || 'Augment Agent 🤖';
    const source = options.source || '自動監控系統';
    
    const processingInfo = [
      `來源: ${source}`,
      `處理時間: ${timestamp}`,
      `處理者: ${signature}`,
      `評分: ${scoreResult.totalScore}/100`,
      `提取狀態: ${rentalData.extractionError ? '部分失敗' : '成功'}`
    ].join(' | ');

    // 更新備註欄位
    const existingNotes = mappedData.properties['備註']?.rich_text?.[0]?.text?.content || '';
    const newNotes = existingNotes ? `${existingNotes}\n\n${processingInfo}` : processingInfo;
    
    mappedData.properties['備註'] = {
      rich_text: [{ text: { content: newNotes } }]
    };

    // 添加監控來源資訊
    if (options.sourcePageId) {
      const sourceInfo = `監控來源: https://www.notion.so/${options.sourcePageId}`;
      
      mappedData.properties['簽約注意事項'] = {
        rich_text: [{ text: { content: sourceInfo } }]
      };
    }

    // 設定看房狀態
    mappedData.properties['看房狀態'] = {
      select: { name: '未聯繫' }
    };
  }

  /**
   * 批量處理連結
   */
  async processMultipleLinks(urls, options = {}) {
    this.logger.info(`📦 開始批量處理 ${urls.length} 個連結`);
    
    const results = [];
    const batchOptions = {
      ...options,
      batchMode: true
    };

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        this.logger.info(`🔄 處理第 ${i + 1}/${urls.length} 個連結: ${url}`);
        
        const result = await this.processLink(url, batchOptions);
        results.push({
          index: i + 1,
          url: url,
          ...result
        });

        // 成功處理後的延遲
        if (result.success && !options.dryRun && i < urls.length - 1) {
          this.logger.info('⏳ 等待 2 秒避免 API 限制...');
          await this.delay(2000);
        }

      } catch (error) {
        this.logger.error(`❌ 批量處理第 ${i + 1} 個連結失敗: ${url}`, { error: error.message });
        
        results.push({
          index: i + 1,
          url: url,
          success: false,
          error: error.message
        });
      }
    }

    // 生成批量處理報告
    const report = this.generateBatchReport(results);
    this.logger.info('📊 批量處理完成', report);

    return {
      results: results,
      summary: report
    };
  }

  /**
   * 生成批量處理報告
   */
  generateBatchReport(results) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && r.error).length;
    const skipped = results.filter(r => !r.success && !r.error).length;

    const highScoreResults = results.filter(r => r.success && r.score >= 80);
    const avgProcessingTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / total;

    return {
      total: total,
      successful: successful,
      failed: failed,
      skipped: skipped,
      successRate: Math.round((successful / total) * 100),
      highScoreCount: highScoreResults.length,
      avgProcessingTime: Math.round(avgProcessingTime),
      avgScore: successful > 0 ? 
        Math.round(results.filter(r => r.score).reduce((sum, r) => sum + r.score, 0) / successful) : 0
    };
  }

  /**
   * 獲取處理統計
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.processed > 0 ? 
        Math.round((this.stats.successful / this.stats.processed) * 100) : 0
    };
  }

  /**
   * 重置統計
   */
  resetStats() {
    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * 延遲函數
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 測試自動處理
   */
  async testAutoProcessing(url) {
    try {
      this.logger.info(`🧪 測試自動處理: ${url}`);
      
      const result = await this.processLink(url, { 
        dryRun: true,
        signature: 'Augment Agent (測試模式) 🧪',
        source: '測試系統'
      });
      
      console.log('\n📊 自動處理測試結果:');
      console.log(`成功: ${result.success}`);
      console.log(`分數: ${result.score}/100`);
      console.log(`適合度: ${result.suitability}`);
      console.log(`優勢: ${result.advantages}`);
      console.log(`處理時間: ${result.processingTime}ms`);
      
      if (!result.success) {
        console.log(`原因: ${result.reason || result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ 測試失敗:', error.message);
      throw error;
    }
  }
}

module.exports = AutoProcessor;
