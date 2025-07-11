/**
 * 監控系統調試工具
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');

async function debugMonitor() {
  console.log('🔍 開始調試監控系統...\n');

  const notion = new Client({
    auth: process.env.NOTION_API_KEY,
  });

  const targetPageId = '22cb86cbe9ad80a18fbcca277054512a';

  try {
    // 1. 獲取頁面區塊
    console.log('1️⃣ 獲取頁面區塊...');
    const response = await notion.blocks.children.list({
      block_id: targetPageId
    });

    console.log(`📋 找到 ${response.results.length} 個區塊`);

    // 2. 分析每個區塊
    console.log('\n2️⃣ 分析區塊內容:');
    response.results.forEach((block, index) => {
      console.log(`\n區塊 ${index + 1}:`);
      console.log(`  類型: ${block.type}`);
      console.log(`  ID: ${block.id}`);

      // 檢查段落區塊
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        console.log(`  段落內容:`);
        block.paragraph.rich_text.forEach((text, textIndex) => {
          console.log(`    文字 ${textIndex + 1}: "${text.plain_text}"`);
          if (text.href) {
            console.log(`    連結: ${text.href}`);
            console.log(`    是否為 591 連結: ${is591Link(text.href)}`);
          }
        });
      }

      // 檢查書籤區塊
      if (block.type === 'bookmark') {
        console.log(`  書籤 URL: ${block.bookmark?.url}`);
        if (block.bookmark?.url) {
          console.log(`  是否為 591 連結: ${is591Link(block.bookmark.url)}`);
        }
      }

      // 檢查嵌入區塊
      if (block.type === 'embed') {
        console.log(`  嵌入 URL: ${block.embed?.url}`);
        if (block.embed?.url) {
          console.log(`  是否為 591 連結: ${is591Link(block.embed.url)}`);
        }
      }

      // 檢查其他可能包含連結的區塊類型
      if (block.type === 'link_preview') {
        console.log(`  連結預覽 URL: ${block.link_preview?.url}`);
        if (block.link_preview?.url) {
          console.log(`  是否為 591 連結: ${is591Link(block.link_preview.url)}`);
        }
      }
    });

    // 3. 提取所有連結
    console.log('\n3️⃣ 提取連結結果:');
    const links = extractLinksFromBlocks(response.results);
    console.log(`🔗 總共找到 ${links.length} 個 591 連結:`);
    
    links.forEach((link, index) => {
      console.log(`  ${index + 1}. ${link.url} (${link.type})`);
    });

    if (links.length === 0) {
      console.log('\n💡 沒有找到 591 連結的可能原因:');
      console.log('   1. 連結格式不符合檢測條件');
      console.log('   2. 連結不在支援的區塊類型中');
      console.log('   3. 連結不包含必要的路徑 (/rent/, /list/, rent.591.com.tw)');
    }

    // 4. 測試不同的 591 連結格式
    console.log('\n4️⃣ 測試 591 連結檢測:');
    const testUrls = [
      'https://rent.591.com.tw/list',
      'https://rent.591.com.tw/rent-detail-12345.html',
      'https://www.591.com.tw/rent/detail/12345',
      'https://591.com.tw/house/12345',
      'https://rent.591.com.tw/home/house/roomdetail/12345'
    ];

    testUrls.forEach(url => {
      console.log(`  ${url}: ${is591Link(url) ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
  }
}

/**
 * 檢查是否為 591 連結 - 當前的檢測邏輯
 */
function is591Link(url) {
  return url.includes('591.com.tw') && 
         (url.includes('/rent/') || url.includes('/list/') || url.includes('rent.591.com.tw'));
}

/**
 * 改進的 591 連結檢測 - 更寬鬆的條件
 */
function is591LinkImproved(url) {
  return url.includes('591.com.tw');
}

/**
 * 從區塊中提取連結 - 當前的邏輯
 */
function extractLinksFromBlocks(blocks) {
  const links = [];
  
  for (const block of blocks) {
    // 處理段落區塊中的連結
    if (block.type === 'paragraph' && block.paragraph?.rich_text) {
      for (const text of block.paragraph.rich_text) {
        if (text.href && is591Link(text.href)) {
          links.push({
            url: text.href,
            text: text.plain_text,
            type: 'paragraph',
            blockId: block.id
          });
        }
      }
    }
    
    // 處理書籤區塊
    if (block.type === 'bookmark' && block.bookmark?.url && is591Link(block.bookmark.url)) {
      links.push({
        url: block.bookmark.url,
        text: block.bookmark.caption?.[0]?.plain_text || '',
        type: 'bookmark',
        blockId: block.id
      });
    }
    
    // 處理嵌入區塊
    if (block.type === 'embed' && block.embed?.url && is591Link(block.embed.url)) {
      links.push({
        url: block.embed.url,
        text: block.embed.caption?.[0]?.plain_text || '',
        type: 'embed',
        blockId: block.id
      });
    }

    // 處理連結預覽區塊
    if (block.type === 'link_preview' && block.link_preview?.url && is591Link(block.link_preview.url)) {
      links.push({
        url: block.link_preview.url,
        text: '',
        type: 'link_preview',
        blockId: block.id
      });
    }
  }
  
  return links;
}

// 執行調試
if (require.main === module) {
  debugMonitor();
}

module.exports = { debugMonitor };
