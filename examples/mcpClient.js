/**
 * MCP 客戶端範例 - 展示如何使用 MCP API
 * MCP Client Example - Demonstrates how to use MCP API
 */

const axios = require('axios');

class MCPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 檢查服務狀態
   */
  async checkStatus() {
    try {
      const response = await this.client.get('/mcp/status');
      return response.data;
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /**
   * 處理單一房源
   */
  async processRental(rentalData, options = {}) {
    try {
      const response = await this.client.post('/mcp/process-rental', {
        rentalData,
        options
      });
      return response.data;
    } catch (error) {
      throw new Error(`Process rental failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * 批量處理房源
   */
  async batchProcess(rentals, options = {}) {
    try {
      const response = await this.client.post('/mcp/batch-process', {
        rentals,
        options
      });
      return response.data;
    } catch (error) {
      throw new Error(`Batch process failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * 僅評分房源
   */
  async scoreRental(rentalData) {
    try {
      const response = await this.client.post('/mcp/score-rental', {
        rentalData
      });
      return response.data;
    } catch (error) {
      throw new Error(`Score rental failed: ${error.response?.data?.error || error.message}`);
    }
  }
}

// 範例使用方式
async function example() {
  const client = new MCPClient();

  try {
    console.log('🔍 檢查 MCP 服務狀態...');
    const status = await client.checkStatus();
    console.log('✅ 服務狀態:', status);

    // 範例房源資料
    const sampleRental = {
      title: '大安區精緻套房 近捷運站 電梯大樓',
      price: 18000,
      address: '台北市大安區敦化南路二段',
      description: '全新裝潢，變頻冷氣，冰箱，洗衣機，對外窗，採光佳，可養寵物',
      facilities: ['變頻冷氣', '冰箱', '洗衣機', '對外窗', '電梯'],
      contact: '王先生 0912-345-678',
      url: 'https://rent.591.com.tw/example-12345',
      area: '12坪',
      floor: '5樓',
      details: {
        '房型': '獨立套房',
        '坪數': '12坪',
        '樓層': '5/10樓'
      }
    };

    console.log('\n📊 測試房源評分...');
    const scoreResult = await client.scoreRental(sampleRental);
    console.log('評分結果:', {
      分數: scoreResult.score,
      適合度: scoreResult.suitability,
      優勢: scoreResult.advantages,
      建議: scoreResult.recommendations
    });

    console.log('\n🏠 測試單一房源處理 (乾跑模式)...');
    const processResult = await client.processRental(sampleRental, { 
      dryRun: true,
      minScore: 60 
    });
    console.log('處理結果:', processResult);

    console.log('\n📦 測試批量處理 (乾跑模式)...');
    const batchResult = await client.batchProcess([sampleRental], { 
      dryRun: true,
      minScore: 60 
    });
    console.log('批量處理結果:', batchResult);

  } catch (error) {
    console.error('❌ 範例執行失敗:', error.message);
  }
}

// 如果直接執行此檔案，運行範例
if (require.main === module) {
  example();
}

module.exports = MCPClient;
