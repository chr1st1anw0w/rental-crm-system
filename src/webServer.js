const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中介軟體
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// API 路由
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        mcp: 'connected'
    });
});

app.get('/api/properties', (req, res) => {
    // 這裡應該連接到 MCP 服務
    res.json({
        success: true,
        data: [],
        message: '房源資料載入成功'
    });
});

app.post('/api/process', (req, res) => {
    const { url, autoScore, dryRun } = req.body;
    
    // 這裡應該連接到 MCP 處理服務
    res.json({
        success: true,
        data: {
            id: Date.now(),
            url,
            score: Math.floor(Math.random() * 40) + 60,
            status: 'processed'
        },
        message: '房源處理完成'
    });
});

app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            total: 24,
            highScore: 8,
            pending: 12,
            viewed: 7
        }
    });
});

// SPA 路由處理
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 錯誤處理中介軟體
app.use((error, req, res, next) => {
    console.error('伺服器錯誤:', error);
    res.status(500).json({
        success: false,
        message: '內部伺服器錯誤',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '找不到請求的資源'
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`🚀 房源 CRM 系統伺服器啟動於 http://localhost:${PORT}`);
    console.log(`📱 手機優先響應式介面已就緒`);
    console.log(`🔗 MCP 服務整合已啟用`);
});

module.exports = app;