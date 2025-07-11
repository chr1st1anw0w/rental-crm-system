/**
 * 智能資料映射系統 - AI 驅動的 591 到 Notion 資料轉換
 * Intelligent Data Mapper - AI-driven 591 to Notion data transformation
 */

const winston = require('winston');

class IntelligentMapper {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/mapper.log' })
      ]
    });

    // Notion 欄位映射配置
    this.notionSchema = {
      // 核心資訊欄位
      title: { type: 'title', required: true },
      租金: { type: 'number', required: true },
      房型: { type: 'select', options: ['獨立套房', '分租套房', '雅房', '整層住家', '其他'] },
      地址: { type: 'rich_text', required: true },
      區域名稱: { type: 'rich_text' },
      市區名稱: { type: 'rich_text' },
      
      // 評估欄位
      適合度: { type: 'rich_text' },
      平均評分: { type: 'number', min: 0, max: 5 },
      重要優勢: { type: 'rich_text' },
      看房狀態: { type: 'select', options: ['未聯繫', '已聯繫', '已看房', '已簽約', '不適合'] },
      
      // 詳細資訊
      設備與特色: { type: 'multi_select' },
      交通便利性: { type: 'rich_text' },
      生活機能: { type: 'rich_text' },
      公共設施及空間: { type: 'multi_select' },
      
      // 財務資訊
      水電費: { type: 'rich_text' },
      押金個月: { type: 'number', name: '押金（個月）' },
      
      // 聯繫資訊
      房東聯繫方式: { type: 'rich_text' },
      網頁連結: { type: 'url' },
      網址: { type: 'url' },
      
      // 管理欄位
      備註: { type: 'rich_text' },
      簽約注意事項: { type: 'rich_text' },
      照片: { type: 'files' },
      更新日期: { type: 'date' }
    };

    // 設備關鍵字映射
    this.facilityKeywords = {
      '冷氣': ['冷氣', '空調', 'AC', '變頻冷氣', '分離式冷氣'],
      '冰箱': ['冰箱', '電冰箱', '小冰箱'],
      '洗衣機': ['洗衣機', '洗脫烘', '烘衣機'],
      '網路': ['網路', 'WiFi', 'WIFI', '光纖', '寬頻'],
      '電視': ['電視', 'TV', '液晶電視', '第四台'],
      '熱水器': ['熱水器', '瓦斯熱水器', '電熱水器'],
      '陽台': ['陽台', '露台', '曬衣間'],
      '電梯': ['電梯', '升降梯'],
      '停車位': ['停車位', '車位', '機車位'],
      '管理員': ['管理員', '警衛', '保全'],
      '對外窗': ['對外窗', '採光', '通風']
    };

    // 房型關鍵字映射
    this.roomTypeKeywords = {
      '獨立套房': ['獨立套房', '套房', '獨套', '1房1廳', '套房出租'],
      '分租套房': ['分租套房', '分租', '合租套房', '共生空間'],
      '雅房': ['雅房', '單人房', '共用衛浴'],
      '整層住家': ['整層', '整棟', '透天', '公寓', '大樓', '華廈'],
      '其他': ['店面', '辦公室', '工作室', '倉庫']
    };
  }

  /**
   * 智能映射 591 資料到 Notion 格式
   * @param {Object} rawData - 591 原始資料
   * @returns {Object} - Notion 格式資料
   */
  async mapToNotion(rawData) {
    try {
      this.logger.info('開始智能資料映射', { url: rawData.url });

      const mappedData = {
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {},
        children: []
      };

      // 映射基本資訊
      await this._mapBasicInfo(rawData, mappedData);
      
      // 映射設備與特色
      await this._mapFacilities(rawData, mappedData);
      
      // 映射地理資訊
      await this._mapLocationInfo(rawData, mappedData);
      
      // 映射財務資訊
      await this._mapFinancialInfo(rawData, mappedData);
      
      // 映射聯繫資訊
      await this._mapContactInfo(rawData, mappedData);
      
      // 映射圖片
      await this._mapImages(rawData, mappedData);
      
      // 設定管理欄位
      await this._setManagementFields(rawData, mappedData);

      this.logger.info('資料映射完成', { 
        title: rawData.title,
        fieldsCount: Object.keys(mappedData.properties).length 
      });

      return mappedData;
    } catch (error) {
      this.logger.error('資料映射失敗', { error: error.message, rawData });
      throw error;
    }
  }

  /**
   * 映射基本資訊
   */
  async _mapBasicInfo(rawData, mappedData) {
    // 房源名稱
    mappedData.properties['房源名稱'] = {
      title: [{
        text: { content: this._cleanText(rawData.title) || '未提供標題' }
      }]
    };

    // 租金
    const rent = this._extractNumber(rawData.price);
    mappedData.properties['租金'] = {
      number: rent > 0 ? rent : null
    };

    // 房型智能識別
    const roomType = this._identifyRoomType(rawData.title, rawData.details);
    mappedData.properties['房型'] = {
      select: { name: roomType }
    };

    // 地址
    mappedData.properties['地址'] = {
      rich_text: [{
        text: { content: this._cleanText(rawData.address) || '' }
      }]
    };
  }

  /**
   * 映射設備與特色
   */
  async _mapFacilities(rawData, mappedData) {
    const facilities = this._extractFacilities(rawData);
    
    mappedData.properties['設備與特色'] = {
      multi_select: facilities.map(f => ({ name: f }))
    };

    // 公共設施
    const publicFacilities = this._extractPublicFacilities(rawData);
    mappedData.properties['公共設施及空間'] = {
      multi_select: publicFacilities.map(f => ({ name: f }))
    };
  }

  /**
   * 映射地理資訊
   */
  async _mapLocationInfo(rawData, mappedData) {
    const locationInfo = this._parseAddress(rawData.address);
    
    mappedData.properties['市區名稱'] = {
      rich_text: [{
        text: { content: locationInfo.city || '' }
      }]
    };

    mappedData.properties['區域名稱'] = {
      rich_text: [{
        text: { content: locationInfo.district || '' }
      }]
    };

    // 交通便利性分析
    const transportation = this._analyzeTransportation(rawData);
    mappedData.properties['交通便利性'] = {
      rich_text: [{
        text: { content: transportation }
      }]
    };

    // 生活機能分析
    const lifestyle = this._analyzeLifestyle(rawData);
    mappedData.properties['生活機能'] = {
      rich_text: [{
        text: { content: lifestyle }
      }]
    };
  }

  /**
   * 映射財務資訊
   */
  async _mapFinancialInfo(rawData, mappedData) {
    // 水電費
    const utilities = this._extractUtilities(rawData);
    mappedData.properties['水電費'] = {
      rich_text: [{
        text: { content: utilities }
      }]
    };

    // 押金
    const deposit = this._extractDeposit(rawData);
    if (deposit > 0) {
      mappedData.properties['押金（個月）'] = {
        number: deposit
      };
    }
  }

  /**
   * 映射聯繫資訊
   */
  async _mapContactInfo(rawData, mappedData) {
    // 房東聯繫方式
    mappedData.properties['房東聯繫方式'] = {
      rich_text: [{
        text: { content: this._cleanText(rawData.contact) || '' }
      }]
    };

    // 網址連結
    mappedData.properties['網頁連結'] = {
      url: rawData.url || null
    };

    mappedData.properties['網址'] = {
      url: rawData.url || null
    };
  }

  /**
   * 映射圖片
   */
  async _mapImages(rawData, mappedData) {
    if (rawData.images && rawData.images.length > 0) {
      // 添加第一張圖片到頁面內容
      mappedData.children.push({
        object: 'block',
        type: 'image',
        image: {
          type: 'external',
          external: {
            url: rawData.images[0]
          }
        }
      });
    }
  }

  /**
   * 設定管理欄位
   */
  async _setManagementFields(rawData, mappedData) {
    // 看房狀態
    mappedData.properties['看房狀態'] = {
      select: { name: '未聯繫' }
    };

    // 更新日期
    mappedData.properties['更新日期'] = {
      date: {
        start: new Date().toISOString()
      }
    };

    // 備註
    const notes = this._generateNotes(rawData);
    mappedData.properties['備註'] = {
      rich_text: [{
        text: { content: notes }
      }]
    };
  }

  // 輔助方法
  _cleanText(text) {
    if (!text) return '';
    return text.toString().trim().replace(/\s+/g, ' ');
  }

  _extractNumber(value) {
    if (!value) return 0;
    const match = value.toString().match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  _identifyRoomType(title, details) {
    const text = `${title} ${JSON.stringify(details)}`.toLowerCase();
    
    for (const [type, keywords] of Object.entries(this.roomTypeKeywords)) {
      if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        return type;
      }
    }
    return '其他';
  }

  _extractFacilities(rawData) {
    const facilities = new Set();
    const text = `${rawData.title} ${rawData.description || ''} ${JSON.stringify(rawData.facilities || [])}`.toLowerCase();
    
    for (const [facility, keywords] of Object.entries(this.facilityKeywords)) {
      if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        facilities.add(facility);
      }
    }
    
    return Array.from(facilities);
  }

  _extractPublicFacilities(rawData) {
    const publicFacilities = [];
    const text = `${rawData.title} ${rawData.description || ''}`.toLowerCase();
    
    const publicKeywords = {
      '電梯': ['電梯', '升降梯'],
      '停車位': ['停車位', '車位'],
      '管理員': ['管理員', '警衛', '保全'],
      '垃圾處理': ['垃圾', '資源回收'],
      '信箱': ['信箱', '郵件']
    };
    
    for (const [facility, keywords] of Object.entries(publicKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        publicFacilities.push(facility);
      }
    }
    
    return publicFacilities;
  }

  _parseAddress(address) {
    if (!address) return {};
    
    const cityMatch = address.match(/(台北市|新北市|桃園市|台中市|台南市|高雄市)/);
    const districtMatch = address.match(/(中正區|大同區|中山區|松山區|大安區|萬華區|信義區|士林區|北投區|內湖區|南港區|文山區|板橋區|三重區|中和區|永和區|新莊區|新店區|樹林區|鶯歌區|三峽區|淡水區|汐止區|瑞芳區|土城區|蘆洲區|五股區|泰山區|林口區|深坑區|石碇區|坪林區|烏來區|金山區|萬里區|石門區|三芝區|貢寮區|平溪區|雙溪區|八里區)/);
    
    return {
      city: cityMatch ? cityMatch[1] : '',
      district: districtMatch ? districtMatch[1] : ''
    };
  }

  _analyzeTransportation(rawData) {
    // 簡化的交通分析
    const text = `${rawData.title} ${rawData.description || ''}`.toLowerCase();
    const transportKeywords = ['捷運', '公車', '火車', '高鐵', '機場', '交通便利'];
    
    const foundKeywords = transportKeywords.filter(keyword => text.includes(keyword));
    
    if (foundKeywords.length > 0) {
      return `交通便利，鄰近${foundKeywords.join('、')}`;
    }
    
    return '交通資訊待確認';
  }

  _analyzeLifestyle(rawData) {
    // 簡化的生活機能分析
    const text = `${rawData.title} ${rawData.description || ''}`.toLowerCase();
    const lifestyleKeywords = ['便利商店', '超市', '市場', '醫院', '學校', '公園', '銀行'];
    
    const foundKeywords = lifestyleKeywords.filter(keyword => text.includes(keyword));
    
    if (foundKeywords.length > 0) {
      return `生活機能完善，附近有${foundKeywords.join('、')}`;
    }
    
    return '生活機能待確認';
  }

  _extractUtilities(rawData) {
    const text = `${rawData.title} ${rawData.description || ''}`.toLowerCase();
    
    if (text.includes('水電費另計') || text.includes('水電另計')) {
      return '水電費另計';
    } else if (text.includes('水電費包含') || text.includes('含水電')) {
      return '水電費包含在租金內';
    }
    
    return '水電費計算方式待確認';
  }

  _extractDeposit(rawData) {
    const text = `${rawData.title} ${rawData.description || ''}`;
    const depositMatch = text.match(/押金?(\d+)個?月/);
    
    if (depositMatch) {
      return parseInt(depositMatch[1]);
    }
    
    // 預設押金為2個月
    return 2;
  }

  _generateNotes(rawData) {
    const notes = [];
    
    if (rawData.floor) {
      notes.push(`樓層：${rawData.floor}`);
    }
    
    if (rawData.area) {
      notes.push(`坪數：${rawData.area}`);
    }
    
    if (rawData.details && Object.keys(rawData.details).length > 0) {
      notes.push('詳細資訊請參考原始連結');
    }
    
    return notes.join('；') || '無特別備註';
  }
}

module.exports = IntelligentMapper;
