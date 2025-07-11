# 591-Notion 自動化系統 - Claude Code 版本

## 專案設定檔

這是一個專為寵物友善租屋需求設計的智慧自動化系統，整合了完整的SuperClaude v2.0.1設定檔。

### SuperClaude 整合設定

```yaml
@include .superclaude.yml#core
@include .superclaude.yml#project
@include .superclaude.yml#task_management
@include .superclaude.yml#development
```

## 專案架構說明

### 核心模組
- **NotionService** (`src/services/notionService.js`): Notion API整合與資料庫操作
- **Rental591Scraper** (`src/scrapers/rental591Scraper.js`): 591網站爬蟲引擎
- **RentalFilter** (`src/processors/rentalFilter.js`): 智慧篩選與評分系統
- **RentalAutomationSystem** (`src/index.js`): 主要執行系統
- **RentalScheduler** (`src/scheduler.js`): 自動排程管理

### 技術棧
- **Runtime**: Node.js v18+
- **Scraping**: Puppeteer v24+
- **Database**: Notion API v4+
- **Scheduling**: node-cron v4+
- **Environment**: dotenv v17+

## 執行指令

### 基本執行
```bash
npm run quick    # 快速測試 (3筆房源)
npm run test     # 完整測試 (5筆房源) 
npm start        # 正式執行 (20筆房源)
```

### 排程執行
```bash
npm run scheduler           # 預設排程 (09:00, 18:00)
npm run scheduler:frequent  # 高頻排程 (每2小時)
npm run scheduler:now       # 立即執行一次
```

### 開發模式
```bash
npm run dev     # 開發模式 (自動重啟)
node test.js    # 模組測試
```

## 設定檔說明

### 環境變數 (.env)
```env
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id
```

### 搜尋參數預設值
```javascript
{
  region: '1',        // 台北市
  kind: '2',          // 獨立套房  
  minPrice: 8000,     // 最低租金
  maxPrice: 15000,    // 最高租金
  petFriendly: true,  // 寵物友善
  mrtDistance: 15,    // 捷運距離
  limit: 20          // 數量限制
}
```

## 評分系統

### 評分標準 (總分100分)
- **價格評分** (30分): 預算符合度
- **必要設備** (40分): 變頻冷氣、冰箱、對外窗、洗衣機
- **寵物友善** (20分): 允許養寵物
- **地點評分** (10分): 捷運距離、偏好地區
- **排除條件** (-50分): 無對外窗、壁癌等

### 推薦等級
- 85-100分: 極力推薦 🌟
- 75-84分: 推薦 👍  
- 65-74分: 可考慮 👌
- 55-64分: 普通 🤔
- <55分: 不推薦 ❌

## 租屋需求規格

基於租屋需求文件的核心條件：

### 必要條件
- 預算: 雅房≤$10,000, 套房≤$15,000
- 寵物: 必須允許2隻12歲貓咪
- 設備: 變頻冷氣、冰箱、對外窗、洗衣機
- 地點: 台北市/新北市，捷運15分鐘內
- 時間: 8月前入住

### 排除條件
- 無對外窗
- 老舊壁癌
- 糟糕浴室
- 壁紙裝潢
- 隔音差

### 加分項目
- 私人露台/陽台
- 乾淨整潔
- 管理員
- 電梯
- 可立即入住

## 技術細節

### 反爬蟲策略
- 隨機User-Agent輪換
- 隨機延遲 (2-5秒)
- 請求間隔控制
- 錯誤重試機制

### API限制處理
- Notion API速率限制
- 批次寫入延遲
- 錯誤恢復機制
- 重複資料檢查

### 效能最佳化
- 並行處理限制
- 記憶體使用控制
- 資源自動清理
- 執行時間監控

## 錯誤處理

### 常見錯誤
1. **網路連線問題**: 自動重試3次
2. **Notion API錯誤**: 延遲後重試
3. **爬蟲被阻擋**: 更換User-Agent
4. **資料解析失敗**: 記錄並跳過

### 日誌系統
- 執行進度追蹤
- 錯誤詳細記錄
- 效能統計報告
- 成功率監控

## 部署建議

### 本地開發
```bash
git clone <repository>
cd 591-notion-automation-Claude Code
npm install
cp .env.example .env
# 設定環境變數
npm run test
```

### 生產環境
```bash
# 使用PM2管理程序
pm2 start src/scheduler.js --name "591-notion-scheduler"
pm2 save
pm2 startup
```

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "run", "scheduler"]
```

## 監控與維護

### 日常檢查
- 執行日誌查看
- Notion資料庫檢查
- 錯誤率監控
- 效能指標追蹤

### 定期維護
- 爬蟲選擇器更新
- 依賴套件更新
- 效能最佳化調整
- 安全性檢查

---

**🚀 由 Claude Code 開發**  
**📅 建立日期**: 2025-07-10  
**🔄 最後更新**: 2025-07-10  
**📋 版本**: v1.0.0