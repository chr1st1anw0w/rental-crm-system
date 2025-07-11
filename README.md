# 591-Notion 智能自動化系統 (Augment 版本)

## 🎯 系統概述

這是一個基於 **MCP (Model Context Protocol)** 的智能租屋自動化系統，能夠：

- 🤖 **AI 智能處理**: 自動分析和映射 591 租屋資料到 Notion 23 個專業欄位
- 📊 **智能評分系統**: 根據個人租屋需求自動評分和篩選房源
- 🔗 **MCP 標準接口**: 提供標準化的 API 接口，支援各種 AI 工具整合
- 🏠 **完整資料管理**: 支援 Notion 資料庫的完整 CRUD 操作
- 🐱 **寵物友善**: 特別針對寵物友善房源進行優化篩選

## 🏗️ 系統架構

```
591-notion-automation-Augment/
├── src/
│   ├── mcp/                    # MCP 服務接口
│   │   └── mcpServer.js       # MCP 標準服務器
│   ├── services/              # 核心服務
│   │   └── notionService.js   # Notion API 服務
│   ├── mappers/               # 資料映射
│   │   └── intelligentMapper.js # AI 智能映射系統
│   ├── processors/            # 資料處理
│   │   └── intelligentScorer.js # 智能評分系統
│   └── index.js              # 主程式
├── examples/                  # 使用範例
│   └── mcpClient.js          # MCP 客戶端範例
├── logs/                     # 日誌檔案
├── .env                      # 環境設定
└── package.json             # 專案設定
```

## 🚀 快速開始

### 1. 環境準備

```bash
# 確認 Node.js 版本 (需要 >= 16.0.0)
node --version

# 安裝相依套件
npm install
```

### 2. 環境設定

編輯 `.env` 檔案：

```env
# Notion API 設定
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id

# MCP 服務設定
MCP_PORT=3000
MCP_HOST=localhost

# 評分系統設定
MIN_SCORE_THRESHOLD=60
MAX_BUDGET_SUITE=15000
MAX_BUDGET_ROOM=10000
MAX_MRT_DISTANCE=15
```

### 3. 啟動系統

```bash
# 啟動完整系統 (包含 MCP 服務器)
npm start

# 開發模式 (自動重啟)
npm run dev

# 僅啟動 MCP 服務器
npm run mcp
```

## 📡 MCP API 使用方式

### 基本端點

- **健康檢查**: `GET /health`
- **服務狀態**: `GET /mcp/status`
- **處理單一房源**: `POST /mcp/process-rental`
- **批量處理**: `POST /mcp/batch-process`
- **僅評分**: `POST /mcp/score-rental`

### API 範例

#### 1. 處理單一房源

```javascript
const response = await fetch('http://localhost:3000/mcp/process-rental', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rentalData: {
      title: '大安區精緻套房 近捷運站',
      price: 18000,
      address: '台北市大安區敦化南路二段',
      description: '變頻冷氣，冰箱，洗衣機，對外窗，可養寵物',
      facilities: ['變頻冷氣', '冰箱', '洗衣機', '對外窗'],
      contact: '王先生 0912-345-678',
      url: 'https://rent.591.com.tw/example-12345'
    },
    options: {
      minScore: 60,
      dryRun: false
    }
  })
});

const result = await response.json();
console.log(result);
```

#### 2. 批量處理房源

```javascript
const response = await fetch('http://localhost:3000/mcp/batch-process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rentals: [
      { title: '房源1', price: 15000, /* ... */ },
      { title: '房源2', price: 12000, /* ... */ }
    ],
    options: {
      minScore: 60,
      dryRun: true
    }
  })
});
```

## 🧠 智能評分系統

### 評分標準 (總分 110 分)

| 項目 | 分數 | 說明 |
|------|------|------|
| 價格評分 | 25分 | 基於預算範圍評分 |
| 必要設備 | 40分 | 變頻冷氣、冰箱、對外窗、洗衣機 |
| 地理位置 | 20分 | 城市、區域、捷運距離 |
| 加分項目 | 15分 | 露台、乾淨整潔、友善環境 |
| 寵物友善 | 10分 | 額外加分項目 |

### 排除條件 (直接 0 分)

- 無對外窗
- 老舊壁癌
- 糟糕浴室
- 壁紙問題
- 隔音差

### 適合度評語

- **90+ 分**: 非常適合
- **80-89 分**: 很適合
- **70-79 分**: 適合
- **60-69 分**: 尚可考慮
- **40-59 分**: 需要評估
- **< 40 分**: 不適合

## 📊 Notion 資料庫欄位映射

系統支援完整的 23 個欄位自動映射：

### 核心資訊
- 房源名稱 (title)
- 租金 (number)
- 房型 (select)
- 地址 (rich_text)
- 區域名稱 (rich_text)
- 市區名稱 (rich_text)

### 評估資訊
- 適合度 (rich_text)
- 平均評分 (number)
- 重要優勢 (rich_text)
- 看房狀態 (select)

### 詳細資訊
- 設備與特色 (multi_select)
- 交通便利性 (rich_text)
- 生活機能 (rich_text)
- 公共設施及空間 (multi_select)

### 財務資訊
- 水電費 (rich_text)
- 押金（個月）(number)

### 聯繫資訊
- 房東聯繫方式 (rich_text)
- 網頁連結 (url)
- 網址 (url)

### 管理欄位
- 備註 (rich_text)
- 簽約注意事項 (rich_text)
- 照片 (files)
- 更新日期 (date)

## 🛠️ 開發工具

### 可用指令

```bash
# 啟動系統
npm start

# 開發模式
npm run dev

# 執行範例
npm run example

# 生成報告
npm run report

# 查看日誌
npm run logs

# 執行測試
npm test
```

### 日誌系統

系統提供完整的日誌記錄：

- **控制台日誌**: 彩色格式，適合開發
- **檔案日誌**: JSON 格式，適合分析
- **日誌檔案**: `logs/app.log`, `logs/mcp-server.log`, `logs/notion.log`

## 🔧 進階設定

### 自訂評分條件

編輯 `src/processors/intelligentScorer.js` 中的 `requirements` 物件：

```javascript
this.requirements = {
  budget: {
    雅房: 10000,
    套房: 15000,
    // 自訂預算
  },
  mustHave: [
    { name: '變頻冷氣', keywords: ['變頻冷氣', '冷氣'], weight: 10 },
    // 自訂必要設備
  ],
  // 其他設定...
};
```

### 自訂 Notion 欄位映射

編輯 `src/mappers/intelligentMapper.js` 中的 `notionSchema` 物件。

## 📈 系統監控

### 健康檢查

```bash
curl http://localhost:3000/health
```

### 服務狀態

```bash
curl http://localhost:3000/mcp/status
```

### 統計報告

```bash
npm run report
```

## 🐛 故障排除

### 常見問題

1. **Notion 連接失敗**
   - 檢查 `NOTION_API_KEY` 是否正確
   - 確認 Integration 已加入資料庫

2. **評分結果異常**
   - 檢查房源資料格式
   - 確認評分條件設定

3. **MCP 服務無法啟動**
   - 檢查端口是否被占用
   - 確認環境變數設定

### 日誌分析

```bash
# 查看即時日誌
tail -f logs/app.log

# 搜尋錯誤
grep "ERROR" logs/app.log

# 查看特定時間範圍
grep "2024-01-01" logs/app.log
```

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支
3. 提交變更
4. 建立 Pull Request

## 📄 授權

MIT License

## 🆘 支援

如有問題請建立 Issue 或聯繫開發團隊。

---

**由 Augment Agent 開發** 🤖
