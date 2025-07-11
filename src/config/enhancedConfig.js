/**
 * 增強版配置 - 整合兩版本的最佳配置
 * Enhanced Configuration - Integrating best configurations from both versions
 */

module.exports = {
  // 從 Claude Code 版本借鑑的爬蟲配置
  scraper: {
    baseUrl: 'https://rent.591.com.tw',
    searchDefaults: {
      region: 1,        // 台北市
      kind: 2,          // 租屋
      rentprice: '8000,18000',  // 擴大價格範圍
      area: '5,25',     // 坪數範圍
      order: 'posttime', // 按發布時間排序
      orderType: 'desc'
    },
    delays: {
      pageLoad: 3000,
      betweenRequests: 2000,
      retry: 5000,
      antiBot: 1000     // 反機器人檢測延遲
    },
    limits: {
      maxRetries: 3,
      maxPages: 5,
      maxResults: 50,
      timeout: 30000
    },
    selectors: {
      // 從 Claude Code 版本改進的選擇器
      listContainer: '.list-container, .house-list',
      listItem: '.item, .house-item',
      itemLink: 'a[href*="/rent-detail"]',
      itemTitle: '.item-title, .house-title',
      itemPrice: '.price, .house-price',
      itemAddr: '.item-addr, .house-addr',
      itemType: '.item-type, .house-type',
      
      // 詳細頁面選擇器
      detailTitle: '.info-title h1, .house-title',
      detailPrice: '.price-num, .house-price .num',
      detailAddr: '.info-addr-value, .house-addr',
      detailInfo: '.house-info li, .detail-info li',
      detailLabel: '.info-label, .label',
      detailValue: '.info-value, .value',
      facilities: '.facility-item, .equipment-item',
      images: '.image-list img, .photo-list img',
      contact: '.contact-name, .landlord-name'
    }
  },

  // 從 Augment 版本保留的智能評分配置
  scoring: {
    weights: {
      price: 25,
      facilities: 40,
      location: 20,
      preferred: 15,
      petFriendly: 10
    },
    thresholds: {
      minimum: 60,
      good: 70,
      excellent: 85
    },
    budget: {
      雅房: 10000,
      套房: 15000,
      獨立套房: 18000,
      分租套房: 15000
    }
  },

  // 從 Claude Code 版本改進的篩選條件
  filtering: {
    // 必要條件 (缺一不可)
    required: [
      {
        name: '價格合理',
        check: (rental) => {
          const maxBudget = this.scoring.budget[rental.roomType] || 15000;
          return rental.price <= maxBudget * 1.2;
        }
      },
      {
        name: '基本設備',
        keywords: ['冷氣', '冰箱'],
        minMatch: 1
      }
    ],

    // 排除條件 (有一個就排除)
    excluded: [
      {
        name: '無對外窗',
        keywords: ['無對外窗', '無窗', '密閉空間']
      },
      {
        name: '房屋狀況差',
        keywords: ['壁癌', '漏水', '破損', '老舊']
      },
      {
        name: '不當房型',
        keywords: ['頂樓加蓋', '地下室', '違建']
      },
      {
        name: '禁止寵物',
        keywords: ['禁止寵物', '不可養寵物', '不允許寵物']
      }
    ],

    // 加分條件
    preferred: [
      {
        name: '變頻冷氣',
        keywords: ['變頻冷氣', '變頻空調'],
        score: 10
      },
      {
        name: '洗衣機',
        keywords: ['洗衣機', '洗脫烘'],
        score: 8
      },
      {
        name: '對外窗',
        keywords: ['對外窗', '採光', '通風良好'],
        score: 10
      },
      {
        name: '露台陽台',
        keywords: ['露台', '陽台', '曬衣間'],
        score: 8
      },
      {
        name: '乾淨整潔',
        keywords: ['乾淨', '整潔', '新裝潢', '翻新'],
        score: 7
      },
      {
        name: '寵物友善',
        keywords: ['可養寵物', '寵物友善', '可養貓', '允許寵物'],
        score: 10
      }
    ]
  },

  // 從兩版本整合的地理位置配置
  location: {
    preferredCities: ['台北市', '新北市'],
    preferredDistricts: [
      // 台北市優質區域
      '大安區', '信義區', '松山區', '中山區', 
      '內湖區', '南港區', '士林區', '北投區',
      // 新北市優質區域
      '板橋區', '新店區', '中和區', '永和區',
      '新莊區', '三重區', '蘆洲區'
    ],
    transportation: {
      maxMRTDistance: 15, // 分鐘
      preferredLines: ['淡水信義線', '板南線', '文湖線', '松山新店線'],
      busAccessible: true
    },
    lifestyle: {
      nearSchool: ['台大', '師大', '政大', '北科大'],
      nearMRT: true,
      nearMarket: true,
      nearPark: false // 非必要但加分
    }
  },

  // 從 Augment 版本保留的 Notion 配置
  notion: {
    fieldMapping: {
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
    },
    defaultValues: {
      '看房狀態': '未聯繫',
      '更新日期': () => new Date().toISOString()
    }
  },

  // 從兩版本整合的監控配置
  monitoring: {
    intervals: {
      pageCheck: '*/5 * * * *',    // 每 5 分鐘檢查頁面
      fullScrape: '0 */2 * * *',   // 每 2 小時完整爬取
      cleanup: '0 3 * * *'         // 每天凌晨 3 點清理
    },
    limits: {
      maxLinksPerCheck: 10,
      maxProcessingTime: 300000,   // 5 分鐘
      maxMemoryUsage: 512          // MB
    },
    notifications: {
      onSuccess: true,
      onError: true,
      onHighScore: true,           // 高分房源通知
      scoreThreshold: 85
    }
  },

  // 從 Claude Code 版本改進的日誌配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    files: {
      app: 'logs/app.log',
      scraper: 'logs/scraper.log',
      scorer: 'logs/scorer.log',
      monitor: 'logs/monitor.log',
      error: 'logs/error.log'
    },
    rotation: {
      maxSize: '10m',
      maxFiles: 5
    },
    format: {
      timestamp: true,
      json: true,
      colorize: true
    }
  },

  // 從兩版本整合的錯誤處理配置
  errorHandling: {
    networkErrors: [
      'ERR_NETWORK_CHANGED',
      'ERR_INTERNET_DISCONNECTED',
      'ERR_CONNECTION_RESET',
      'ERR_CONNECTION_REFUSED',
      'ERR_NAME_NOT_RESOLVED',
      'Navigation timeout',
      'net::ERR_',
      'Protocol error'
    ],
    retryStrategies: {
      exponentialBackoff: true,
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    },
    gracefulDegradation: {
      skipOnError: true,
      continueOnPartialFailure: true,
      savePartialResults: true
    }
  },

  // 從 Claude Code 版本借鑑的效能優化
  performance: {
    concurrency: {
      maxConcurrentPages: 3,
      maxConcurrentRequests: 5,
      requestQueue: true
    },
    caching: {
      enabled: true,
      ttl: 3600000,              // 1 小時
      maxSize: 100               // 最多快取 100 個結果
    },
    optimization: {
      headless: true,
      disableImages: false,       // 需要圖片資訊
      disableCSS: true,
      disableJavaScript: false    // 某些網站需要 JS
    }
  }
};
