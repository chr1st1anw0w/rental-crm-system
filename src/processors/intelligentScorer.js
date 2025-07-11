/**
 * 智能評分系統 - 基於租屋需求的自動評分和篩選
 * Intelligent Scoring System - Automated scoring and filtering based on rental requirements
 */

const winston = require('winston');

class IntelligentScorer {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/scorer.log' })
      ]
    });

    // 租屋需求配置 - 基於租屋需求及介紹.MD
    this.requirements = {
      budget: {
        雅房: 10000,
        套房: 15000,
        獨立套房: 15000,
        分租套房: 15000
      },
      
      // 必要設備 (40分)
      mustHave: [
        { name: '變頻冷氣', keywords: ['變頻冷氣', '冷氣', '空調'], weight: 10 },
        { name: '冰箱', keywords: ['冰箱', '電冰箱'], weight: 10 },
        { name: '對外窗', keywords: ['對外窗', '採光', '通風', '窗戶'], weight: 10 },
        { name: '洗衣機', keywords: ['洗衣機', '洗脫烘'], weight: 10 }
      ],
      
      // 加分項目 (最多20分)
      preferred: [
        { name: '露台', keywords: ['露台', '陽台', '曬衣間'], weight: 8 },
        { name: '乾淨整潔', keywords: ['乾淨', '整潔', '新裝潢', '翻新'], weight: 7 },
        { name: '友善環境', keywords: ['友善', '室友', '共生', '溫馨'], weight: 5 }
      ],
      
      // 排除條件 (直接0分)
      dealBreakers: [
        { name: '無對外窗', keywords: ['無對外窗', '無窗', '密閉'] },
        { name: '老舊壁癌', keywords: ['壁癌', '漏水', '老舊', '破損'] },
        { name: '糟糕浴室', keywords: ['共用浴室髒亂', '浴室破舊'] },
        { name: '壁紙', keywords: ['壁紙剝落', '舊壁紙'] },
        { name: '隔音差', keywords: ['隔音差', '吵雜', '噪音'] }
      ],
      
      // 地理位置要求
      location: {
        preferredCities: ['台北市', '新北市'],
        maxMRTDistance: 15, // 分鐘
        preferredDistricts: [
          '大安區', '信義區', '松山區', '中山區', '內湖區', '南港區',
          '板橋區', '新店區', '中和區', '永和區'
        ]
      },
      
      // 寵物友善
      petFriendly: {
        required: true,
        keywords: ['可養寵物', '寵物友善', '可養貓', '允許寵物']
      }
    };

    // 評分權重配置
    this.scoreWeights = {
      price: 25,        // 價格 25分
      mustHave: 40,     // 必要設備 40分
      location: 20,     // 地理位置 20分
      preferred: 15,    // 加分項目 15分
      petFriendly: 10   // 寵物友善 10分 (額外加分)
    };
  }

  /**
   * 計算房源綜合評分
   * @param {Object} rental - 房源資料
   * @returns {Object} - 包含評分和詳細分析的結果
   */
  async calculateScore(rental) {
    try {
      this.logger.info('開始計算房源評分', { title: rental.title });

      const scoreResult = {
        totalScore: 0,
        maxScore: 100,
        breakdown: {},
        recommendations: [],
        warnings: [],
        適合度: '',
        重要優勢: []
      };

      // 1. 檢查排除條件
      const dealBreakerResult = this._checkDealBreakers(rental);
      if (dealBreakerResult.hasDealBreaker) {
        scoreResult.totalScore = 0;
        scoreResult.適合度 = '不適合';
        scoreResult.warnings = dealBreakerResult.issues;
        return scoreResult;
      }

      // 2. 價格評分 (25分)
      const priceScore = this._scorePricing(rental);
      scoreResult.breakdown.price = priceScore;
      scoreResult.totalScore += priceScore.score;

      // 3. 必要設備評分 (40分)
      const facilityScore = this._scoreFacilities(rental);
      scoreResult.breakdown.facilities = facilityScore;
      scoreResult.totalScore += facilityScore.score;

      // 4. 地理位置評分 (20分)
      const locationScore = this._scoreLocation(rental);
      scoreResult.breakdown.location = locationScore;
      scoreResult.totalScore += locationScore.score;

      // 5. 加分項目評分 (15分)
      const preferredScore = this._scorePreferred(rental);
      scoreResult.breakdown.preferred = preferredScore;
      scoreResult.totalScore += preferredScore.score;

      // 6. 寵物友善加分 (10分額外)
      const petScore = this._scorePetFriendly(rental);
      scoreResult.breakdown.petFriendly = petScore;
      scoreResult.totalScore += petScore.score;

      // 確保分數在合理範圍內
      scoreResult.totalScore = Math.max(0, Math.min(110, scoreResult.totalScore));

      // 生成適合度評語
      scoreResult.適合度 = this._generateSuitability(scoreResult.totalScore);

      // 生成重要優勢
      scoreResult.重要優勢 = this._generateAdvantages(scoreResult.breakdown);

      // 生成建議
      scoreResult.recommendations = this._generateRecommendations(scoreResult.breakdown);

      this.logger.info('房源評分完成', { 
        title: rental.title, 
        score: scoreResult.totalScore,
        suitability: scoreResult.適合度
      });

      return scoreResult;
    } catch (error) {
      this.logger.error('評分計算失敗', { error: error.message, rental });
      throw error;
    }
  }

  /**
   * 檢查排除條件 - 整合 Claude Code 版本的詳細檢查
   */
  _checkDealBreakers(rental) {
    const issues = [];
    const text = this._getRentalText(rental).toLowerCase();

    // 基本排除條件檢查
    for (const dealBreaker of this.requirements.dealBreakers) {
      const hasIssue = dealBreaker.keywords.some(keyword =>
        text.includes(keyword.toLowerCase())
      );

      if (hasIssue) {
        issues.push(`包含排除條件：${dealBreaker.name}`);
      }
    }

    // 從 Claude Code 版本借鑑的額外檢查
    const additionalChecks = [
      {
        condition: () => rental.price > this.requirements.budget.套房 * 1.5,
        message: '價格過高，超出合理範圍'
      },
      {
        condition: () => text.includes('頂樓加蓋') || text.includes('地下室'),
        message: '房屋類型不符合需求'
      },
      {
        condition: () => text.includes('禁止寵物') || text.includes('不可養寵物'),
        message: '不允許寵物'
      }
    ];

    additionalChecks.forEach(check => {
      if (check.condition()) {
        issues.push(check.message);
      }
    });

    return {
      hasDealBreaker: issues.length > 0,
      issues
    };
  }

  /**
   * 價格評分
   */
  _scorePricing(rental) {
    const price = this._extractPrice(rental);
    const roomType = this._identifyRoomType(rental);
    const budget = this.requirements.budget[roomType] || this.requirements.budget.套房;

    let score = 0;
    let analysis = '';

    if (price === 0) {
      score = 0;
      analysis = '價格資訊不明確';
    } else if (price > budget * 1.2) {
      score = 0;
      analysis = `價格 $${price} 超出預算太多 (預算: $${budget})`;
    } else if (price > budget) {
      score = 10;
      analysis = `價格 $${price} 略超預算 (預算: $${budget})`;
    } else if (price <= budget * 0.8) {
      score = 25;
      analysis = `價格 $${price} 非常優惠 (預算: $${budget})`;
    } else {
      score = 20;
      analysis = `價格 $${price} 在預算範圍內 (預算: $${budget})`;
    }

    return { score, maxScore: 25, analysis, price, budget };
  }

  /**
   * 必要設備評分
   */
  _scoreFacilities(rental) {
    const text = this._getRentalText(rental).toLowerCase();
    let score = 0;
    const found = [];
    const missing = [];

    for (const facility of this.requirements.mustHave) {
      const hasFeature = facility.keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      if (hasFeature) {
        score += facility.weight;
        found.push(facility.name);
      } else {
        missing.push(facility.name);
      }
    }

    const analysis = `具備設備：${found.join('、') || '無'}；缺少：${missing.join('、') || '無'}`;

    return { score, maxScore: 40, analysis, found, missing };
  }

  /**
   * 地理位置評分
   */
  _scoreLocation(rental) {
    let score = 0;
    const analysis = [];

    // 城市評分 (10分)
    const address = rental.address || '';
    const cityMatch = this.requirements.location.preferredCities.find(city => 
      address.includes(city)
    );
    
    if (cityMatch) {
      score += 10;
      analysis.push(`位於偏好城市：${cityMatch}`);
    }

    // 區域評分 (10分)
    const districtMatch = this.requirements.location.preferredDistricts.find(district => 
      address.includes(district)
    );
    
    if (districtMatch) {
      score += 10;
      analysis.push(`位於優質區域：${districtMatch}`);
    } else if (cityMatch) {
      score += 5;
      analysis.push('位於偏好城市但非優先區域');
    }

    return { 
      score, 
      maxScore: 20, 
      analysis: analysis.join('；') || '地理位置待評估',
      city: cityMatch,
      district: districtMatch
    };
  }

  /**
   * 加分項目評分
   */
  _scorePreferred(rental) {
    const text = this._getRentalText(rental).toLowerCase();
    let score = 0;
    const found = [];

    for (const preferred of this.requirements.preferred) {
      const hasFeature = preferred.keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      if (hasFeature) {
        score += preferred.weight;
        found.push(preferred.name);
      }
    }

    score = Math.min(score, 15); // 最多15分

    const analysis = found.length > 0 ? 
      `加分項目：${found.join('、')}` : 
      '無特別加分項目';

    return { score, maxScore: 15, analysis, found };
  }

  /**
   * 寵物友善評分
   */
  _scorePetFriendly(rental) {
    const text = this._getRentalText(rental).toLowerCase();
    
    const isPetFriendly = this.requirements.petFriendly.keywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );

    const isPetProhibited = ['禁止寵物', '不可養寵物', '不允許寵物'].some(keyword => 
      text.includes(keyword)
    );

    let score = 0;
    let analysis = '';

    if (isPetProhibited) {
      score = -20; // 扣分
      analysis = '明確禁止寵物';
    } else if (isPetFriendly) {
      score = 10;
      analysis = '寵物友善';
    } else {
      score = 0;
      analysis = '寵物政策不明確，需確認';
    }

    return { score, maxScore: 10, analysis, isPetFriendly, isPetProhibited };
  }

  /**
   * 生成適合度評語
   */
  _generateSuitability(score) {
    if (score >= 90) return '非常適合';
    if (score >= 80) return '很適合';
    if (score >= 70) return '適合';
    if (score >= 60) return '尚可考慮';
    if (score >= 40) return '需要評估';
    return '不適合';
  }

  /**
   * 生成重要優勢
   */
  _generateAdvantages(breakdown) {
    const advantages = [];

    if (breakdown.price?.score >= 20) {
      advantages.push(`價格優勢：${breakdown.price.analysis}`);
    }

    if (breakdown.facilities?.found?.length > 0) {
      advantages.push(`設備完善：${breakdown.facilities.found.join('、')}`);
    }

    if (breakdown.location?.city) {
      advantages.push(`地理位置佳：${breakdown.location.analysis}`);
    }

    if (breakdown.preferred?.found?.length > 0) {
      advantages.push(`額外優點：${breakdown.preferred.found.join('、')}`);
    }

    if (breakdown.petFriendly?.isPetFriendly) {
      advantages.push('寵物友善');
    }

    return advantages.join('；') || '基本條件符合';
  }

  /**
   * 生成建議
   */
  _generateRecommendations(breakdown) {
    const recommendations = [];

    if (breakdown.facilities?.missing?.length > 0) {
      recommendations.push(`需確認設備：${breakdown.facilities.missing.join('、')}`);
    }

    if (breakdown.petFriendly?.analysis.includes('不明確')) {
      recommendations.push('需確認寵物政策');
    }

    if (breakdown.price?.price > breakdown.price?.budget) {
      recommendations.push('可嘗試議價');
    }

    return recommendations;
  }

  // 輔助方法
  _getRentalText(rental) {
    return [
      rental.title || '',
      rental.description || '',
      rental.address || '',
      JSON.stringify(rental.facilities || []),
      JSON.stringify(rental.details || {})
    ].join(' ');
  }

  _extractPrice(rental) {
    if (rental.price && typeof rental.price === 'number') {
      return rental.price;
    }
    
    const priceText = rental.price?.toString() || rental.title || '';
    const match = priceText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  _identifyRoomType(rental) {
    const text = this._getRentalText(rental).toLowerCase();
    
    if (text.includes('雅房')) return '雅房';
    if (text.includes('獨立套房') || text.includes('獨套')) return '獨立套房';
    if (text.includes('分租套房') || text.includes('分租')) return '分租套房';
    if (text.includes('套房')) return '套房';
    
    return '套房'; // 預設
  }

  /**
   * 批量評分和篩選
   */
  async scoreAndFilter(rentals, minScore = 60) {
    const results = [];
    
    for (const rental of rentals) {
      try {
        const scoreResult = await this.calculateScore(rental);
        
        if (scoreResult.totalScore >= minScore) {
          results.push({
            ...rental,
            scoreResult,
            matchScore: scoreResult.totalScore,
            適合度: scoreResult.適合度,
            重要優勢: scoreResult.重要優勢,
            recommendations: scoreResult.recommendations
          });
        }
      } catch (error) {
        this.logger.error('單一房源評分失敗', { error: error.message, rental });
      }
    }

    // 按分數排序
    results.sort((a, b) => b.matchScore - a.matchScore);

    this.logger.info('批量評分完成', { 
      total: rentals.length, 
      qualified: results.length,
      minScore 
    });

    return results;
  }
}

module.exports = IntelligentScorer;
