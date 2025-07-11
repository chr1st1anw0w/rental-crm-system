/**
 * MCP 服務器 - 提供標準化的 Model Context Protocol 接口
 * MCP Server - Standardized Model Context Protocol interface
 */

const express = require('express');
const winston = require('winston');
const NotionService = require('../services/notionService');
const IntelligentMapper = require('../mappers/intelligentMapper');
const IntelligentScorer = require('../processors/intelligentScorer');

class MCPServer {
  constructor() {
    this.app = express();
    this.port = process.env.MCP_PORT || 3000;
    
    // 初始化服務
    this.notionService = new NotionService();
    this.mapper = new IntelligentMapper();
    this.scorer = new IntelligentScorer();
    
    // 設定日誌
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/mcp-server.log' })
      ]
    });

    this._setupMiddleware();
    this._setupRoutes();
  }

  /**
   * 設定中間件
   */
  _setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS 設定
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // 請求日誌
    this.app.use((req, res, next) => {
      this.logger.info('MCP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  /**
   * 設定路由
   */
  _setupRoutes() {
    // 健康檢查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // MCP 標準接口
    this.app.post('/mcp/process-rental', this._handleProcessRental.bind(this));
    this.app.post('/mcp/batch-process', this._handleBatchProcess.bind(this));
    this.app.post('/mcp/score-rental', this._handleScoreRental.bind(this));
    this.app.get('/mcp/status', this._handleStatus.bind(this));

    // 錯誤處理
    this.app.use(this._errorHandler.bind(this));
  }

  /**
   * 處理單一房源
   */
  async _handleProcessRental(req, res) {
    try {
      const { rentalData, options = {} } = req.body;

      if (!rentalData) {
        return res.status(400).json({
          success: false,
          error: 'Missing rental data'
        });
      }

      this.logger.info('處理單一房源請求', { 
        title: rentalData.title,
        url: rentalData.url 
      });

      // 1. 智能評分
      const scoreResult = await this.scorer.calculateScore(rentalData);
      
      // 檢查是否符合最低分數要求
      const minScore = options.minScore || 60;
      if (scoreResult.totalScore < minScore) {
        return res.json({
          success: true,
          processed: false,
          reason: 'Score below threshold',
          score: scoreResult.totalScore,
          minScore,
          scoreResult
        });
      }

      // 2. 資料映射
      const mappedData = await this.mapper.mapToNotion(rentalData);
      
      // 3. 添加評分結果到映射資料
      mappedData.properties['適合度'] = {
        rich_text: [{
          text: { content: scoreResult.適合度 }
        }]
      };

      mappedData.properties['重要優勢'] = {
        rich_text: [{
          text: { content: scoreResult.重要優勢 }
        }]
      };

      mappedData.properties['平均評分'] = {
        number: Math.round(scoreResult.totalScore / 20 * 100) / 100 // 轉換為5分制
      };

      // 4. 寫入 Notion
      let notionResult = null;
      if (!options.dryRun) {
        notionResult = await this.notionService.createRentalPage(mappedData);
      }

      const response = {
        success: true,
        processed: true,
        score: scoreResult.totalScore,
        suitability: scoreResult.適合度,
        advantages: scoreResult.重要優勢,
        recommendations: scoreResult.recommendations,
        notionPageId: notionResult?.id || null,
        dryRun: options.dryRun || false
      };

      this.logger.info('房源處理完成', response);
      res.json(response);

    } catch (error) {
      this.logger.error('處理房源失敗', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 批量處理房源
   */
  async _handleBatchProcess(req, res) {
    try {
      const { rentals, options = {} } = req.body;

      if (!Array.isArray(rentals) || rentals.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing or empty rentals array'
        });
      }

      this.logger.info('批量處理房源請求', { count: rentals.length });

      const results = {
        total: rentals.length,
        processed: 0,
        skipped: 0,
        failed: 0,
        details: []
      };

      const minScore = options.minScore || 60;

      for (let i = 0; i < rentals.length; i++) {
        const rental = rentals[i];
        
        try {
          // 評分
          const scoreResult = await this.scorer.calculateScore(rental);
          
          if (scoreResult.totalScore < minScore) {
            results.skipped++;
            results.details.push({
              index: i,
              title: rental.title,
              status: 'skipped',
              reason: 'Score below threshold',
              score: scoreResult.totalScore
            });
            continue;
          }

          // 映射和處理
          const mappedData = await this.mapper.mapToNotion(rental);
          
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

          // 寫入 Notion
          let notionResult = null;
          if (!options.dryRun) {
            notionResult = await this.notionService.createRentalPage(mappedData);
          }

          results.processed++;
          results.details.push({
            index: i,
            title: rental.title,
            status: 'processed',
            score: scoreResult.totalScore,
            notionPageId: notionResult?.id || null
          });

          // 避免 API 限制
          if (!options.dryRun) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          results.failed++;
          results.details.push({
            index: i,
            title: rental.title || 'Unknown',
            status: 'failed',
            error: error.message
          });
          
          this.logger.error('單一房源處理失敗', { 
            index: i, 
            error: error.message 
          });
        }
      }

      this.logger.info('批量處理完成', results);
      res.json({
        success: true,
        results
      });

    } catch (error) {
      this.logger.error('批量處理失敗', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 僅評分房源（不寫入 Notion）
   */
  async _handleScoreRental(req, res) {
    try {
      const { rentalData } = req.body;

      if (!rentalData) {
        return res.status(400).json({
          success: false,
          error: 'Missing rental data'
        });
      }

      const scoreResult = await this.scorer.calculateScore(rentalData);

      res.json({
        success: true,
        score: scoreResult.totalScore,
        maxScore: scoreResult.maxScore,
        suitability: scoreResult.適合度,
        advantages: scoreResult.重要優勢,
        recommendations: scoreResult.recommendations,
        breakdown: scoreResult.breakdown,
        warnings: scoreResult.warnings
      });

    } catch (error) {
      this.logger.error('評分失敗', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 獲取服務狀態
   */
  async _handleStatus(req, res) {
    try {
      // 檢查 Notion 連接
      const notionStatus = await this._checkNotionConnection();
      
      res.json({
        success: true,
        status: 'running',
        timestamp: new Date().toISOString(),
        services: {
          notion: notionStatus,
          mapper: 'ready',
          scorer: 'ready'
        },
        config: {
          minScoreThreshold: process.env.MIN_SCORE_THRESHOLD || 60,
          maxBudgetSuite: process.env.MAX_BUDGET_SUITE || 15000,
          maxBudgetRoom: process.env.MAX_BUDGET_ROOM || 10000
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 檢查 Notion 連接狀態
   */
  async _checkNotionConnection() {
    try {
      await this.notionService.testConnection();
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }

  /**
   * 錯誤處理中間件
   */
  _errorHandler(error, req, res, next) {
    this.logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }

  /**
   * 啟動服務器
   */
  async start() {
    try {
      // 檢查必要的環境變數
      if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
        throw new Error('Missing required environment variables: NOTION_API_KEY, NOTION_DATABASE_ID');
      }

      // 測試 Notion 連接
      await this.notionService.testConnection();
      this.logger.info('Notion 連接測試成功');

      // 啟動服務器
      this.server = this.app.listen(this.port, () => {
        this.logger.info(`MCP Server 啟動成功`, {
          port: this.port,
          env: process.env.NODE_ENV || 'development'
        });
      });

      return this.server;
    } catch (error) {
      this.logger.error('MCP Server 啟動失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 停止服務器
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.logger.info('MCP Server 已停止');
          resolve();
        });
      });
    }
  }
}

module.exports = MCPServer;
