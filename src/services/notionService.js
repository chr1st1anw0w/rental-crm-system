/**
 * 增強版 Notion 服務 - 支援完整的 23 欄位資料庫操作
 * Enhanced Notion Service - Full support for 23-field database operations
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const winston = require('winston');

class NotionService {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    this.databaseId = process.env.NOTION_DATABASE_ID;
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/notion.log' })
      ]
    });

    // Notion 欄位名稱映射（處理中英文和特殊字符）
    this.fieldMapping = {
      'title': '房源名稱',
      '租金': '租金',
      '房型': '房型',
      '地址': '地址',
      '區域名稱': '區域名稱',
      '市區名稱': '市區名稱',
      '適合度': '適合度',
      '平均評分': '平均評分',
      '重要優勢': '重要優勢',
      '看房狀態': '看房狀態',
      '設備與特色': '設備與特色',
      '交通便利性': '交通便利性',
      '生活機能': '生活機能',
      '公共設施及空間': '公共設施及空間',
      '水電費': '水電費',
      '押金（個月）': '押金（個月）',
      '房東聯繫方式': '房東聯繫方式',
      '網頁連結': '網頁連結',
      '網址': '網址',
      '備註': '備註',
      '簽約注意事項': '簽約注意事項',
      '照片': '照片',
      '更新日期': '更新日期'
    };
  }

  /**
   * 測試 Notion 連接
   */
  async testConnection() {
    try {
      const response = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      this.logger.info('Notion 連接測試成功', {
        databaseTitle: response.title?.[0]?.plain_text || 'Unknown',
        databaseId: this.databaseId
      });
      
      return response;
    } catch (error) {
      this.logger.error('Notion 連接測試失敗', { error: error.message });
      throw new Error(`Notion connection failed: ${error.message}`);
    }
  }

  /**
   * 建立房源頁面 - 支援完整的 23 欄位
   */
  async createRentalPage(pageData) {
    try {
      // 檢查是否已存在相同房源
      if (pageData.properties?.['網頁連結']?.url) {
        const isDuplicate = await this.checkDuplicate(pageData.properties['網頁連結'].url);
        if (isDuplicate) {
          const title = pageData.properties?.['房源名稱']?.title?.[0]?.text?.content || 'Unknown';
          this.logger.info(`房源已存在，跳過建立: ${title}`);
          return null;
        }
      }

      // 確保必要欄位存在
      this._validateRequiredFields(pageData);

      const response = await this.notion.pages.create(pageData);

      const title = pageData.properties?.['房源名稱']?.title?.[0]?.text?.content || 'Unknown';
      this.logger.info(`成功建立房源頁面: ${title}`, { pageId: response.id });

      return response;
    } catch (error) {
      this.logger.error('建立房源頁面失敗', { 
        error: error.message,
        pageData: JSON.stringify(pageData, null, 2)
      });
      throw error;
    }
  }

  /**
   * 檢查重複房源
   */
  async checkDuplicate(url) {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          or: [
            {
              property: '網頁連結',
              url: { equals: url }
            },
            {
              property: '網址',
              url: { equals: url }
            }
          ]
        }
      });
      
      return response.results.length > 0;
    } catch (error) {
      this.logger.error('檢查重複房源失敗', { error: error.message, url });
      return false;
    }
  }

  /**
   * 更新房源狀態
   */
  async updatePageStatus(pageId, status, additionalProperties = {}) {
    try {
      const updateData = {
        page_id: pageId,
        properties: {
          '看房狀態': {
            select: { name: status }
          },
          '更新日期': {
            date: {
              start: new Date().toISOString()
            }
          },
          ...additionalProperties
        }
      };

      const response = await this.notion.pages.update(updateData);
      
      this.logger.info('房源狀態更新成功', { pageId, status });
      return response;
    } catch (error) {
      this.logger.error('更新房源狀態失敗', { error: error.message, pageId, status });
      throw error;
    }
  }

  /**
   * 批量更新房源
   */
  async batchUpdatePages(updates) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await this.updatePageStatus(
          update.pageId, 
          update.status, 
          update.properties
        );
        results.push({ success: true, pageId: update.pageId, result });
        
        // 避免 API 限制
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        results.push({ 
          success: false, 
          pageId: update.pageId, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  /**
   * 查詢房源
   */
  async queryRentals(filter = {}, sorts = []) {
    try {
      const queryOptions = {
        database_id: this.databaseId
      };

      if (Object.keys(filter).length > 0) {
        queryOptions.filter = filter;
      }

      if (sorts.length > 0) {
        queryOptions.sorts = sorts;
      }

      const response = await this.notion.databases.query(queryOptions);
      
      this.logger.info('房源查詢完成', { 
        resultCount: response.results.length,
        hasMore: response.has_more
      });

      return response.results;
    } catch (error) {
      this.logger.error('查詢房源失敗', { error: error.message, filter, sorts });
      throw error;
    }
  }

  /**
   * 根據條件查詢房源
   */
  async findRentalsByCondition(conditions) {
    const filters = [];

    // 價格範圍
    if (conditions.minPrice || conditions.maxPrice) {
      const priceFilter = { property: '租金', number: {} };
      if (conditions.minPrice) priceFilter.number.greater_than_or_equal_to = conditions.minPrice;
      if (conditions.maxPrice) priceFilter.number.less_than_or_equal_to = conditions.maxPrice;
      filters.push(priceFilter);
    }

    // 房型
    if (conditions.roomType) {
      filters.push({
        property: '房型',
        select: { equals: conditions.roomType }
      });
    }

    // 區域
    if (conditions.district) {
      filters.push({
        property: '區域名稱',
        rich_text: { contains: conditions.district }
      });
    }

    // 看房狀態
    if (conditions.status) {
      filters.push({
        property: '看房狀態',
        select: { equals: conditions.status }
      });
    }

    // 適合度
    if (conditions.suitability) {
      filters.push({
        property: '適合度',
        rich_text: { contains: conditions.suitability }
      });
    }

    const filter = filters.length > 1 ? { and: filters } : filters[0] || {};
    
    // 預設排序：按更新日期降序
    const sorts = conditions.sorts || [
      {
        property: '更新日期',
        direction: 'descending'
      }
    ];

    return await this.queryRentals(filter, sorts);
  }

  /**
   * 獲取高分房源
   */
  async getHighScoreRentals(minScore = 4.0) {
    return await this.findRentalsByCondition({
      sorts: [
        {
          property: '平均評分',
          direction: 'descending'
        }
      ]
    });
  }

  /**
   * 獲取待看房源
   */
  async getPendingViewRentals() {
    return await this.findRentalsByCondition({
      status: '未聯繫',
      sorts: [
        {
          property: '平均評分',
          direction: 'descending'
        }
      ]
    });
  }

  /**
   * 驗證必要欄位
   */
  _validateRequiredFields(pageData) {
    const required = ['房源名稱'];
    
    for (const field of required) {
      if (!pageData.properties?.[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // 驗證標題欄位格式
    const titleField = pageData.properties['房源名稱'];
    if (!titleField.title || !Array.isArray(titleField.title) || titleField.title.length === 0) {
      throw new Error('Invalid title field format');
    }
  }

  /**
   * 格式化房源資料供顯示
   */
  formatRentalForDisplay(page) {
    const properties = page.properties;
    
    return {
      id: page.id,
      title: properties['房源名稱']?.title?.[0]?.text?.content || 'Unknown',
      rent: properties['租金']?.number || 0,
      roomType: properties['房型']?.select?.name || 'Unknown',
      address: properties['地址']?.rich_text?.[0]?.text?.content || '',
      district: properties['區域名稱']?.rich_text?.[0]?.text?.content || '',
      city: properties['市區名稱']?.rich_text?.[0]?.text?.content || '',
      suitability: properties['適合度']?.rich_text?.[0]?.text?.content || '',
      rating: properties['平均評分']?.number || 0,
      advantages: properties['重要優勢']?.rich_text?.[0]?.text?.content || '',
      status: properties['看房狀態']?.select?.name || 'Unknown',
      facilities: properties['設備與特色']?.multi_select?.map(item => item.name) || [],
      transportation: properties['交通便利性']?.rich_text?.[0]?.text?.content || '',
      lifestyle: properties['生活機能']?.rich_text?.[0]?.text?.content || '',
      contact: properties['房東聯繫方式']?.rich_text?.[0]?.text?.content || '',
      url: properties['網頁連結']?.url || properties['網址']?.url || '',
      utilities: properties['水電費']?.rich_text?.[0]?.text?.content || '',
      deposit: properties['押金（個月）']?.number || 0,
      notes: properties['備註']?.rich_text?.[0]?.text?.content || '',
      contractNotes: properties['簽約注意事項']?.rich_text?.[0]?.text?.content || '',
      updatedAt: properties['更新日期']?.date?.start || page.last_edited_time,
      createdAt: page.created_time
    };
  }

  /**
   * 生成統計報告
   */
  async generateStatistics() {
    try {
      const allRentals = await this.queryRentals();
      
      const stats = {
        total: allRentals.length,
        byStatus: {},
        byRoomType: {},
        byDistrict: {},
        priceRange: { min: Infinity, max: 0, average: 0 },
        ratingRange: { min: Infinity, max: 0, average: 0 }
      };

      let totalPrice = 0;
      let totalRating = 0;
      let priceCount = 0;
      let ratingCount = 0;

      for (const rental of allRentals) {
        const formatted = this.formatRentalForDisplay(rental);
        
        // 狀態統計
        stats.byStatus[formatted.status] = (stats.byStatus[formatted.status] || 0) + 1;
        
        // 房型統計
        stats.byRoomType[formatted.roomType] = (stats.byRoomType[formatted.roomType] || 0) + 1;
        
        // 區域統計
        if (formatted.district) {
          stats.byDistrict[formatted.district] = (stats.byDistrict[formatted.district] || 0) + 1;
        }
        
        // 價格統計
        if (formatted.rent > 0) {
          stats.priceRange.min = Math.min(stats.priceRange.min, formatted.rent);
          stats.priceRange.max = Math.max(stats.priceRange.max, formatted.rent);
          totalPrice += formatted.rent;
          priceCount++;
        }
        
        // 評分統計
        if (formatted.rating > 0) {
          stats.ratingRange.min = Math.min(stats.ratingRange.min, formatted.rating);
          stats.ratingRange.max = Math.max(stats.ratingRange.max, formatted.rating);
          totalRating += formatted.rating;
          ratingCount++;
        }
      }

      stats.priceRange.average = priceCount > 0 ? Math.round(totalPrice / priceCount) : 0;
      stats.ratingRange.average = ratingCount > 0 ? Math.round(totalRating / ratingCount * 100) / 100 : 0;

      if (stats.priceRange.min === Infinity) stats.priceRange.min = 0;
      if (stats.ratingRange.min === Infinity) stats.ratingRange.min = 0;

      this.logger.info('統計報告生成完成', stats);
      return stats;
    } catch (error) {
      this.logger.error('生成統計報告失敗', { error: error.message });
      throw error;
    }
  }
}

module.exports = NotionService;
