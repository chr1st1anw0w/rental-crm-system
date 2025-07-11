#!/bin/bash

# 房源 CRM 系統啟動腳本
# 版本: 2.0.0 - Augment Edition

echo "🏠 房源 CRM 系統啟動中..."
echo "================================"

# 檢查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: Node.js 未安裝"
    echo "請先安裝 Node.js v16 或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ 錯誤: Node.js 版本過低 (當前: $(node -v))"
    echo "請升級到 Node.js v16 或更高版本"
    exit 1
fi

echo "✅ Node.js 版本檢查通過: $(node -v)"

# 檢查依賴是否安裝
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴套件..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依賴安裝失敗"
        exit 1
    fi
fi

# 檢查環境變數檔案
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 檔案不存在"
    echo "請參考 README.md 設定環境變數"
fi

# 建立必要的資料夾
mkdir -p logs public/icons assets/icons

echo "🔧 環境檢查完成"
echo ""

# 提供啟動選項
echo "請選擇啟動模式:"
echo "1) 完整 CRM 系統 (MCP + Web 前端)"
echo "2) 僅 MCP 後端服務"
echo "3) 僅 Web 前端"
echo "4) 開發模式 (自動重啟)"

read -p "請輸入選項 (1-4): " choice

case $choice in
    1)
        echo "🚀 啟動完整 CRM 系統..."
        npm run crm
        ;;
    2)
        echo "🔧 啟動 MCP 服務..."
        npm run mcp
        ;;
    3)
        echo "🌐 啟動 Web 前端..."
        npm run web
        ;;
    4)
        echo "🔄 啟動開發模式..."
        npm run crm:dev
        ;;
    *)
        echo "❌ 無效選項，啟動預設模式..."
        npm run crm
        ;;
esac

echo ""
echo "================================"
echo "📍 系統位址:"
echo "   Web 介面: http://localhost:3000"
echo "   MCP 服務: 已在背景運行"
echo ""
echo "📱 手機訪問: 在手機瀏覽器輸入電腦 IP:3000"
echo "   (例如: http://192.168.1.100:3000)"
echo ""
echo "⚡ 快捷鍵:"
echo "   Ctrl+C: 停止服務"
echo "   Ctrl+Z: 暫停服務"
echo ""
echo "📚 更多資訊請查看 README.md"
echo "================================"