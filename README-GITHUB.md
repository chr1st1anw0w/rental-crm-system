# 🏠 房源 CRM 系統 - GitHub 版本

[![GitHub Stars](https://img.shields.io/github/stars/your-username/rental-crm-system)](https://github.com/your-username/rental-crm-system)
[![GitHub Forks](https://img.shields.io/github/forks/your-username/rental-crm-system)](https://github.com/your-username/rental-crm-system)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **智能房源管理平台 v2.0.0 - Augment Edition**  
> 整合 591 租屋網與 Notion，提供 AI 評分與自動化管理

## 🚀 在線演示

- 🌐 **線上展示**: [https://your-username.github.io/rental-crm-system](https://your-username.github.io/rental-crm-system)
- 📱 **手機版**: 掃描 QR Code 或直接訪問

## ✨ 主要特色

- 📱 **手機優先設計** - 完美適配各種螢幕尺寸
- 🇹🇼 **繁體中文介面** - 針對台灣用戶最佳化  
- 🎨 **開源 SVG 圖示** - 使用 Lucide 圖示庫
- 🤖 **AI 智能評分** - 自動評估房源品質
- ⚡ **即時同步** - 與 Notion 資料庫整合
- 🔗 **MCP 標準** - Model Context Protocol 整合

## 📸 界面預覽

### 📱 手機版
<div align="center">
  <img src="screenshots/mobile-home.png" alt="手機版主頁" width="300">
  <img src="screenshots/mobile-properties.png" alt="房源列表" width="300">
</div>

### 🖥️ 桌面版
<div align="center">
  <img src="screenshots/desktop-home.png" alt="桌面版主頁" width="800">
</div>

## 🚀 快速開始

### 1. 克隆專案
```bash
git clone https://github.com/your-username/rental-crm-system.git
cd rental-crm-system
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 設定環境變數
```bash
cp .env.example .env
# 編輯 .env 檔案，填入您的 Notion API 設定
```

### 4. 啟動系統
```bash
# 開發模式
npm run crm:dev

# 生產模式
npm run crm

# 僅前端
npm run web

# 僅後端 MCP 服務
npm run mcp
```

### 5. 訪問系統
```
🌐 本地: http://localhost:3000
📱 手機: http://[您的IP]:3000
```

## 📁 專案結構

```
rental-crm-system/
├── 📁 public/              # 前端靜態檔案
│   ├── index.html          # 主頁面
│   └── manifest.json       # PWA 設定
├── 📁 assets/              # 資源檔案
│   ├── css/styles.css      # 樣式
│   └── js/app.js           # 前端邏輯
├── 📁 src/                 # 後端代碼
│   ├── webServer.js        # Express 伺服器
│   ├── mcp/                # MCP 服務
│   └── services/           # 業務邏輯
├── start-crm.sh           # 啟動腳本
├── package.json           # 專案設定
└── README.md              # 說明文件
```

## 🛠️ 技術棧

### 前端
- **HTML5** + **CSS3** - 現代 Web 標準
- **Tailwind CSS** - 工具優先的 CSS 框架
- **Alpine.js** - 輕量級響應式框架
- **Lucide Icons** - 開源 SVG 圖示

### 後端
- **Node.js** - JavaScript 運行環境
- **Express.js** - Web 應用框架
- **MCP** - Model Context Protocol
- **Notion API** - 資料庫整合

## 🔧 部署選項

### GitHub Pages (靜態部署)
```bash
npm run build
npm run deploy
```

### Vercel (推薦)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# 將 dist/ 資料夾拖拽到 Netlify
```

### Railway
```bash
railway login
railway init
railway up
```

### Render
```bash
# 連接 GitHub 倉庫到 Render
# 設定建置命令: npm install && npm run build
# 設定啟動命令: npm start
```

## 📱 PWA 支援

本系統支援 Progressive Web App，可以：
- 📲 安裝到手機桌面
- 🔄 離線基本功能
- 📳 推送通知
- ⚡ 快速載入

### 安裝為 App
1. 在手機瀏覽器打開系統
2. 點擊「加到主畫面」
3. 享受原生 App 體驗

## 🔐 環境變數說明

```env
# 必需設定
NOTION_API_KEY=your_notion_token    # Notion 整合 Token
NOTION_DATABASE_ID=your_db_id       # Notion 資料庫 ID

# 可選設定
PORT=3000                           # 伺服器端口
NODE_ENV=production                 # 運行環境
REQUEST_DELAY=2000                  # 爬蟲延遲 (毫秒)
```

## 🤝 貢獻指南

歡迎貢獻！請遵循以下步驟：

1. **Fork** 此專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 開啟 **Pull Request**

### 開發規範
- 使用 ESLint 進行代碼檢查
- 遵循 Conventional Commits 規範
- 新增功能需要包含測試
- 更新相關文檔

## 🐛 問題回報

遇到問題？請：
1. 查看 [常見問題](FAQ.md)
2. 搜索 [現有 Issues](https://github.com/your-username/rental-crm-system/issues)
3. [創建新 Issue](https://github.com/your-username/rental-crm-system/issues/new)

## 📄 授權條款

此專案採用 [MIT License](LICENSE) 授權 - 詳見 LICENSE 檔案

## 🙏 致謝

- [Notion API](https://developers.notion.com/) - 資料庫服務
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Alpine.js](https://alpinejs.dev/) - JavaScript 框架
- [Lucide](https://lucide.dev/) - 圖示庫
- [591 租屋網](https://rent.591.com.tw/) - 房源資料來源

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/rental-crm-system&type=Date)](https://star-history.com/#your-username/rental-crm-system&Date)

---

<div align="center">
  <p><strong>🏠 房源 CRM 系統</strong></p>
  <p><em>讓租屋管理變得更智能</em></p>
  
  <p>
    <a href="https://github.com/your-username/rental-crm-system">⭐ 給個 Star</a> •
    <a href="https://github.com/your-username/rental-crm-system/fork">🍴 Fork 專案</a> •
    <a href="https://github.com/your-username/rental-crm-system/issues">🐛 回報問題</a>
  </p>
  
  <p>由 ❤️ 與 ☕ 驅動開發</p>
</div>