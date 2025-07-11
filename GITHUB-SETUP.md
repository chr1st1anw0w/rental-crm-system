# 🚀 GitHub 部署指南

## 📋 手動創建 GitHub 倉庫

### 1. 在 GitHub 網站創建新倉庫

1. 前往 [GitHub](https://github.com) 並登入
2. 點擊右上角的 **"+"** → **"New repository"**
3. 填寫倉庫資訊：
   ```
   Repository name: rental-crm-system
   Description: 🏠 智能房源管理平台 - 整合591與Notion的AI評分CRM系統
   Visibility: Public (或 Private)
   ❌ 不要勾選 "Add a README file"
   ❌ 不要勾選 "Add .gitignore"  
   ❌ 不要勾選 "Choose a license"
   ```
4. 點擊 **"Create repository"**

### 2. 連接本地倉庫到 GitHub

複製以下命令在終端執行：

```bash
# 進入專案目錄
cd /Users/christianwu/Claudia/scripts/591-Notion/591-notion-automation-Augment

# 添加遠程倉庫 (替換 YOUR_USERNAME 為您的 GitHub 用戶名)
git remote add origin https://github.com/YOUR_USERNAME/rental-crm-system.git

# 設定主分支
git branch -M main

# 推送代碼到 GitHub
git push -u origin main
```

### 3. 設定 GitHub Pages (自動部署)

1. 進入您的 GitHub 倉庫頁面
2. 點擊 **"Settings"** 標籤
3. 在左側選單找到 **"Pages"**
4. 在 **"Source"** 下選擇 **"GitHub Actions"**
5. 系統會自動使用我們創建的 `.github/workflows/deploy.yml`

### 4. 啟用 GitHub Actions

1. 進入 **"Actions"** 標籤
2. 如果看到提示，點擊 **"I understand my workflows, go ahead and enable them"**
3. 第一次推送後會自動觸發部署

## 🌐 完整的推送命令

請將 `YOUR_USERNAME` 替換為您的 GitHub 用戶名：

```bash
cd /Users/christianwu/Claudia/scripts/591-Notion/591-notion-automation-Augment

# 添加遠程倉庫
git remote add origin https://github.com/YOUR_USERNAME/rental-crm-system.git

# 推送到 GitHub
git push -u origin main
```

## 📱 訪問您的應用

部署成功後，您的應用將可以通過以下地址訪問：

```
🌐 GitHub Pages: https://YOUR_USERNAME.github.io/rental-crm-system
📱 手機版: 同上述地址，自動適配手機
```

## 🔧 進階部署選項

### 使用自定義域名

1. 在 GitHub Pages 設定中添加自定義域名
2. 在域名提供商設定 CNAME 記錄指向 `YOUR_USERNAME.github.io`

### Vercel 部署 (推薦)

1. 前往 [Vercel](https://vercel.com)
2. 使用 GitHub 帳號登入
3. 點擊 "Import Project"
4. 選擇您的 GitHub 倉庫
5. 設定建置命令：
   ```
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

### Netlify 部署

1. 前往 [Netlify](https://netlify.com)
2. 拖拽 `public` 資料夾到部署區域
3. 或連接 GitHub 倉庫進行自動部署

## 🐳 Docker 部署

### 本地 Docker 運行

```bash
# 建置映像
docker build -t rental-crm .

# 運行容器
docker run -p 3000:3000 rental-crm
```

### Docker Compose 運行

```bash
# 基本啟動
docker-compose up

# 背景運行
docker-compose up -d

# 停止服務
docker-compose down
```

## 🔑 環境變數設定

### GitHub Secrets (用於 GitHub Actions)

在 GitHub 倉庫設定中添加以下 Secrets：

1. 進入 **Settings** → **Secrets and variables** → **Actions**
2. 點擊 **"New repository secret"**
3. 添加以下 secrets：

```
NOTION_API_KEY: your_notion_integration_token
NOTION_DATABASE_ID: your_database_id
DOCKER_USERNAME: your_docker_hub_username (可選)
DOCKER_PASSWORD: your_docker_hub_token (可選)
```

### Vercel 環境變數

在 Vercel 專案設定中添加：
```
NOTION_API_KEY=your_token
NOTION_DATABASE_ID=your_db_id
```

## 📊 監控和分析

### GitHub Insights

- 查看 **"Insights"** 標籤了解專案統計
- 監控 **"Actions"** 標籤查看部署狀態

### Vercel Analytics

- 在 Vercel 儀表板查看訪問統計
- 設定 Web Analytics 追蹤使用情況

## 🔄 持續部署流程

1. **本地開發** → 修改代碼
2. **提交變更** → `git add . && git commit -m "描述"`
3. **推送到 GitHub** → `git push`
4. **自動部署** → GitHub Actions 自動建置並部署
5. **訪問更新** → 幾分鐘後即可看到更新

## 🆘 常見問題

### 部署失敗

1. 檢查 GitHub Actions 日誌
2. 確認環境變數設定正確
3. 檢查 package.json 中的腳本

### 無法訪問

1. 確認 GitHub Pages 已啟用
2. 檢查域名設定
3. 等待 DNS 傳播（可能需要幾分鐘）

### 權限問題

1. 確認倉庫可見性設定
2. 檢查 GitHub Actions 權限
3. 確認 Secrets 設定正確

---

**🎉 恭喜！您的房源 CRM 系統即將在線上運行！**

有任何問題請查看 GitHub Actions 日誌或創建 Issue。