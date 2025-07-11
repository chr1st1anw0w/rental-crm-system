# 房源 CRM 系統 Docker 檔案
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 安裝系統依賴
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 設定 Puppeteer 使用已安裝的 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 複製 package 檔案
COPY package*.json ./

# 安裝 Node.js 依賴
RUN npm ci --only=production && npm cache clean --force

# 複製專案檔案
COPY . .

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 創建必要目錄並設定權限
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# 切換到非 root 用戶
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/api/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# 啟動應用
CMD ["npm", "run", "web"]

# 元資料標籤
LABEL maintainer="Augment Agent"
LABEL version="2.0.0"
LABEL description="房源 CRM 系統 - 智能租屋管理平台"
LABEL org.opencontainers.image.source="https://github.com/your-username/rental-crm-system"