// 房源 CRM 系統 - 主要 JavaScript 檔案
// 版本: 2.0.0 - Augment Edition

// 全域應用程式資料
function appData() {
    return {
        // UI 狀態
        ui: {
            showSidebar: false,
            showAddForm: false,
            loading: true,
            currentView: 'properties'
        },
        
        // 資料狀態
        data: {
            properties: [],
            filteredProperties: [],
            stats: {
                total: 0,
                highScore: 0,
                pending: 0,
                viewed: 0
            }
        },
        
        // 篩選狀態
        filters: {
            search: '',
            status: 'all',
            minScore: 0,
            maxScore: 100,
            sortBy: 'score',
            sortOrder: 'desc'
        },
        
        // 處理狀態
        processing: {
            active: false,
            progress: 0,
            total: 0,
            current: '',
            results: []
        },
        
        // 新增表單
        addForm: {
            url: '',
            autoScore: true,
            dryRun: false
        },
        
        // 通知系統
        notification: {
            show: false,
            type: 'info', // success, error, warning, info
            message: ''
        },

        // 初始化函數
        init() {
            console.log('🚀 房源 CRM 系統初始化中...');
            this.loadProperties();
            this.setupEventListeners();
            this.checkMCPConnection();
            
            // 模擬載入完成
            setTimeout(() => {
                this.ui.loading = false;
                this.showNotification('success', '系統初始化完成');
            }, 1500);
        },

        // 設定事件監聽器
        setupEventListeners() {
            // 鍵盤快捷鍵
            document.addEventListener('keydown', (e) => {
                // ESC 關閉側邊選單
                if (e.key === 'Escape' && this.ui.showSidebar) {
                    this.toggleSidebar();
                }
                
                // Ctrl/Cmd + K 開啟搜尋
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    document.querySelector('input[type="text"]')?.focus();
                }
                
                // Ctrl/Cmd + N 新增房源
                if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                    e.preventDefault();
                    this.setCurrentView('add-property');
                }
            });

            // 視窗大小變化
            window.addEventListener('resize', () => {
                if (window.innerWidth >= 1024) {
                    this.ui.showSidebar = false;
                }
            });

            // 離線/在線狀態
            window.addEventListener('online', () => {
                this.showNotification('success', '網路連線已恢復');
            });

            window.addEventListener('offline', () => {
                this.showNotification('warning', '網路連線中斷');
            });
        },

        // 檢查 MCP 連線
        async checkMCPConnection() {
            try {
                const response = await fetch('/api/health');
                if (response.ok) {
                    console.log('✅ MCP 服務連線正常');
                } else {
                    throw new Error('MCP 服務無法連線');
                }
            } catch (error) {
                console.error('❌ MCP 連線失敗:', error);
                this.showNotification('error', 'MCP 服務連線失敗，部分功能可能無法使用');
            }
        },

        // 切換側邊選單
        toggleSidebar() {
            this.ui.showSidebar = !this.ui.showSidebar;
        },

        // 設定當前視圖
        setCurrentView(view) {
            this.ui.currentView = view;
            this.ui.showSidebar = false; // 手機版關閉選單
            
            // 更新頁面標題
            const titles = {
                'properties': '房源列表',
                'add-property': '新增房源',
                'statistics': '統計分析',
                'settings': '系統設定',
                'help': '幫助指南',
                'about': '關於系統'
            };
            
            if (titles[view]) {
                document.title = `${titles[view]} - 房源 CRM 系統`;
            }
        },

        // 取得視圖標題
        getViewTitle() {
            const titles = {
                'properties': '房源列表',
                'add-property': '新增房源',
                'statistics': '統計分析',
                'settings': '系統設定',
                'help': '幫助指南',
                'about': '關於系統'
            };
            return titles[this.ui.currentView] || '房源 CRM 系統';
        },

        // 載入房源資料
        async loadProperties() {
            try {
                // 模擬 API 呼叫 - 實際應該連接到 MCP 服務
                const mockData = this.generateMockData();
                
                this.data.properties = mockData;
                this.updateStats();
                this.applyFilters();
                
                console.log(`📊 載入了 ${mockData.length} 筆房源資料`);
            } catch (error) {
                console.error('載入房源資料失敗:', error);
                this.showNotification('error', '載入房源資料失敗');
            }
        },

        // 生成模擬資料
        generateMockData() {
            const areas = ['大安區', '信義區', '中山區', '松山區', '內湖區', '南港區', '士林區'];
            const roomTypes = ['套房', '1房1廳', '2房1廳', '2房2廳', '3房2廳'];
            const statuses = ['pending', 'viewed', 'contacted', 'interested'];
            
            return Array.from({ length: 24 }, (_, i) => ({
                id: i + 1,
                title: `溫馨${roomTypes[Math.floor(Math.random() * roomTypes.length)]} 近捷運站 寵物友善`,
                address: `台北市${areas[Math.floor(Math.random() * areas.length)]}XX路${Math.floor(Math.random() * 200) + 1}號`,
                price: Math.floor(Math.random() * 10000) + 8000,
                score: Math.floor(Math.random() * 40) + 60,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                roomType: roomTypes[Math.floor(Math.random() * roomTypes.length)],
                area: Math.floor(Math.random() * 20) + 8,
                image: `https://picsum.photos/400/300?random=${i + 1}`,
                tags: this.generateTags(),
                isFavorite: Math.random() > 0.8,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                viewedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null
            }));
        },

        // 生成標籤
        generateTags() {
            const allTags = ['寵物友善', '近捷運', '變頻冷氣', '洗衣機', '冰箱', '對外窗', '陽台', '電梯'];
            const numTags = Math.floor(Math.random() * 4) + 2;
            const shuffled = [...allTags].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, numTags);
        },

        // 更新統計資料
        updateStats() {
            this.data.stats = {
                total: this.data.properties.length,
                highScore: this.data.properties.filter(p => p.score >= 85).length,
                pending: this.data.properties.filter(p => p.status === 'pending').length,
                viewed: this.data.properties.filter(p => p.status === 'viewed' || p.viewedAt).length
            };
        },

        // 應用篩選
        applyFilters() {
            let filtered = [...this.data.properties];
            
            // 搜尋篩選
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                filtered = filtered.filter(p => 
                    p.title.toLowerCase().includes(searchTerm) ||
                    p.address.toLowerCase().includes(searchTerm) ||
                    p.roomType.toLowerCase().includes(searchTerm)
                );
            }
            
            // 狀態篩選
            if (this.filters.status !== 'all') {
                filtered = filtered.filter(p => p.status === this.filters.status);
            }
            
            // 評分範圍篩選
            filtered = filtered.filter(p => 
                p.score >= this.filters.minScore && p.score <= this.filters.maxScore
            );
            
            // 排序
            filtered.sort((a, b) => {
                const order = this.filters.sortOrder === 'desc' ? -1 : 1;
                
                switch (this.filters.sortBy) {
                    case 'score':
                        return order * (a.score - b.score);
                    case 'price':
                        return order * (a.price - b.price);
                    case 'created_at':
                        return order * (new Date(a.createdAt) - new Date(b.createdAt));
                    default:
                        return 0;
                }
            });
            
            this.data.filteredProperties = filtered;
        },

        // 快速篩選
        applyQuickFilter(type) {
            switch (type) {
                case 'high-score':
                    this.filters.minScore = 85;
                    this.filters.maxScore = 100;
                    break;
                case 'pet-friendly':
                    this.filters.search = '寵物友善';
                    break;
                case 'near-mrt':
                    this.filters.search = '近捷運';
                    break;
            }
            this.applyFilters();
            this.setCurrentView('properties');
        },

        // 清除篩選
        clearFilters() {
            this.filters = {
                search: '',
                status: 'all',
                minScore: 0,
                maxScore: 100,
                sortBy: 'score',
                sortOrder: 'desc'
            };
            this.applyFilters();
        },

        // 切換排序順序
        toggleSortOrder() {
            this.filters.sortOrder = this.filters.sortOrder === 'desc' ? 'asc' : 'desc';
            this.applyFilters();
        },

        // 提交房源
        async submitProperty() {
            if (!this.addForm.url) {
                this.showNotification('error', '請輸入房源網址');
                return;
            }

            this.processing.active = true;
            this.processing.progress = 0;
            this.processing.current = '開始處理房源...';
            this.processing.results = [];

            try {
                // 模擬處理步驟
                const steps = [
                    { message: '驗證網址格式...', delay: 500 },
                    { message: '爬取房源資料...', delay: 2000 },
                    { message: '解析房源內容...', delay: 1000 },
                    { message: '計算智能評分...', delay: 1500 },
                    { message: '同步到 Notion...', delay: 1000 },
                    { message: '處理完成！', delay: 500 }
                ];

                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    this.processing.current = step.message;
                    this.processing.progress = Math.round(((i + 1) / steps.length) * 100);
                    
                    await new Promise(resolve => setTimeout(resolve, step.delay));
                    
                    // 模擬結果
                    if (i === steps.length - 1) {
                        this.processing.results.push({
                            id: Date.now(),
                            success: true,
                            message: '房源新增成功！評分: 87分'
                        });
                        
                        // 重新載入資料
                        await this.loadProperties();
                        this.showNotification('success', '房源新增成功！');
                        this.clearForm();
                    }
                }
                
            } catch (error) {
                console.error('處理房源失敗:', error);
                this.processing.results.push({
                    id: Date.now(),
                    success: false,
                    message: '處理失敗: ' + error.message
                });
                this.showNotification('error', '房源處理失敗');
            } finally {
                setTimeout(() => {
                    this.processing.active = false;
                }, 2000);
            }
        },

        // 清除表單
        clearForm() {
            this.addForm = {
                url: '',
                autoScore: true,
                dryRun: false
            };
        },

        // 查看房源詳情
        viewProperty(property) {
            // 更新查看狀態
            if (property.status === 'pending') {
                property.status = 'viewed';
                property.viewedAt = new Date().toISOString();
                this.updateStats();
            }
            
            // 實際應該開啟詳情頁面或模態框
            this.showNotification('info', `查看房源: ${property.title}`);
            
            // 模擬跳轉到 591 原始頁面
            // window.open(`https://rent.591.com.tw/rent-detail-${property.id}.html`, '_blank');
        },

        // 聯繫房東
        contactOwner(property) {
            // 更新聯繫狀態
            if (property.status === 'pending' || property.status === 'viewed') {
                property.status = 'contacted';
                this.updateStats();
            }
            
            this.showNotification('success', `已開啟聯繫方式: ${property.title}`);
        },

        // 切換收藏
        toggleFavorite(property) {
            property.isFavorite = !property.isFavorite;
            const action = property.isFavorite ? '加入' : '移除';
            this.showNotification('info', `已${action}收藏: ${property.title}`);
        },

        // 取得評分徽章樣式
        getScoreBadgeClass(score) {
            if (score >= 85) return 'bg-green-500 text-white';
            if (score >= 75) return 'bg-yellow-500 text-white';
            if (score >= 65) return 'bg-orange-500 text-white';
            return 'bg-red-500 text-white';
        },

        // 取得狀態徽章樣式
        getStatusBadgeClass(status) {
            const classes = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'viewed': 'bg-blue-100 text-blue-800',
                'contacted': 'bg-green-100 text-green-800',
                'interested': 'bg-purple-100 text-purple-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },

        // 取得狀態文字
        getStatusText(status) {
            const texts = {
                'pending': '待處理',
                'viewed': '已查看',
                'contacted': '已聯繫',
                'interested': '有興趣'
            };
            return texts[status] || '未知';
        },

        // 顯示通知
        showNotification(type, message) {
            this.notification = {
                show: true,
                type,
                message
            };

            // 自動隱藏
            setTimeout(() => {
                this.hideNotification();
            }, 5000);
        },

        // 隱藏通知
        hideNotification() {
            this.notification.show = false;
        },

        // 取得通知樣式
        getNotificationClass() {
            const classes = {
                'success': 'bg-green-500 text-white',
                'error': 'bg-red-500 text-white',
                'warning': 'bg-yellow-500 text-white',
                'info': 'bg-blue-500 text-white'
            };
            return classes[this.notification.type] || 'bg-gray-500 text-white';
        },

        // 取得通知圖示
        getNotificationIcon() {
            const icons = {
                'success': 'check-circle',
                'error': 'x-circle',
                'warning': 'alert-triangle',
                'info': 'info'
            };
            return icons[this.notification.type] || 'info';
        }
    }
}

// API 服務類別
class APIService {
    constructor() {
        this.baseURL = window.location.origin;
        this.endpoints = {
            properties: '/api/properties',
            process: '/api/process',
            stats: '/api/stats',
            health: '/api/health'
        };
    }

    // 通用請求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 請求失敗:', error);
            throw error;
        }
    }

    // 取得房源列表
    async getProperties(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`${this.endpoints.properties}?${params}`);
    }

    // 處理房源
    async processProperty(data) {
        return this.request(this.endpoints.process, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // 取得統計資料
    async getStats() {
        return this.request(this.endpoints.stats);
    }

    // 健康檢查
    async healthCheck() {
        return this.request(this.endpoints.health);
    }
}

// 工具函數
const utils = {
    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // 格式化價格
    formatPrice(price) {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0
        }).format(price);
    },

    // 截斷文字
    truncateText(text, maxLength = 50) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // 防抖函數
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 節流函數
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 生成唯一 ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 驗證 URL
    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    // 驗證 591 URL
    isValid591URL(url) {
        return this.isValidURL(url) && 
               (url.includes('rent.591.com.tw') || url.includes('sale.591.com.tw'));
    }
};

// 效能監控
const performance = {
    // 記錄效能指標
    recordMetric(name, value) {
        if (window.performance && window.performance.mark) {
            window.performance.mark(`${name}-${value}`);
        }
        console.log(`📊 效能指標 ${name}: ${value}ms`);
    },

    // 測量函數執行時間
    measureFunction(func, name) {
        const start = Date.now();
        const result = func();
        const end = Date.now();
        this.recordMetric(name || func.name, end - start);
        return result;
    },

    // 監控載入時間
    monitorPageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                this.recordMetric('page-load', loadTime);
            }, 0);
        });
    }
};

// 錯誤處理
const errorHandler = {
    // 全域錯誤處理
    init() {
        window.addEventListener('error', this.handleError);
        window.addEventListener('unhandledrejection', this.handlePromiseError);
    },

    // 處理一般錯誤
    handleError(event) {
        console.error('全域錯誤:', event.error);
        this.reportError(event.error);
    },

    // 處理 Promise 錯誤
    handlePromiseError(event) {
        console.error('未處理的 Promise 錯誤:', event.reason);
        this.reportError(event.reason);
    },

    // 上報錯誤
    reportError(error) {
        // 實際應該發送到錯誤監控服務
        console.log('錯誤上報:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }
};

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎉 房源 CRM 系統載入完成');
    
    // 初始化錯誤處理
    errorHandler.init();
    
    // 初始化效能監控
    performance.monitorPageLoad();
    
    // 初始化服務工作者（PWA）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker 註冊成功:', registration.scope);
            })
            .catch(error => {
                console.error('❌ Service Worker 註冊失敗:', error);
            });
    }
});

// 匯出全域函數（供 HTML 使用）
window.appData = appData;
window.APIService = APIService;
window.utils = utils;