/**
 * rss-fetcher.js
 * ดึงข่าวรถยนต์ไฟฟ้าจาก RSS feeds ต่างๆ ในไทย
 * ไม่ต้องการ API key ทั้งหมด
 */

import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'MEEV-NewsBot/1.0 (EV News Aggregator Thailand)',
    'Accept': 'application/rss+xml, application/xml, text/xml'
  }
});

// คีย์เวิร์ดที่ใช้กรองข่าว EV
const EV_KEYWORDS = [
  'รถยนต์ไฟฟ้า', 'อีวี', 'EV', 'electric vehicle', 'BYD', 'Tesla', 'MG',
  'NETA', 'ORA', 'GWM', 'Aion', 'Deepal', 'Chery', 'OMODA',
  'ชาร์จ', 'แบตเตอรี่', 'สถานีชาร์จ', 'ยานยนต์ไฟฟ้า',
  'รถไฟฟ้า', 'Volvo', 'BMW iX', 'Mercedes EQ',
  'แรงดันไฟ', 'Wallbox', 'DC Charger', 'ราคา EV'
];

// RSS feeds แหล่งข่าวไทย
const RSS_SOURCES = [
  {
    name: 'Google News - รถยนต์ไฟฟ้าไทย',
    url: 'https://news.google.com/rss/search?q=%E0%B8%A3%E0%B8%96%E0%B8%A2%E0%B8%99%E0%B8%95%E0%B9%8C%E0%B9%84%E0%B8%9F%E0%B8%9F%E0%B9%89%E0%B8%B2+%E0%B9%84%E0%B8%97%E0%B8%A2&hl=th&gl=TH&ceid=TH:th',
    category: 'ข่าวยานยนต์',
    lang: 'th'
  },
  {
    name: 'Google News - EV Thailand',
    url: 'https://news.google.com/rss/search?q=EV+Thailand+electric+vehicle&hl=th&gl=TH&ceid=TH:th',
    category: 'ข่าวยานยนต์',
    lang: 'en'
  },
  {
    name: 'Google News - BYD Thailand',
    url: 'https://news.google.com/rss/search?q=BYD+%E0%B9%84%E0%B8%97%E0%B8%A2&hl=th&gl=TH&ceid=TH:th',
    category: 'เปิดตัวรุ่นใหม่',
    lang: 'th'
  },
  {
    name: 'Google News - สงครามราคา EV',
    url: 'https://news.google.com/rss/search?q=%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2+%E0%B8%A3%E0%B8%96%E0%B8%A2%E0%B8%99%E0%B8%95%E0%B9%8C%E0%B9%84%E0%B8%9F%E0%B8%9F%E0%B9%89%E0%B8%B2&hl=th&gl=TH&ceid=TH:th',
    category: 'สงครามราคา',
    lang: 'th'
  },
  {
    name: 'Google News - สถานีชาร์จ',
    url: 'https://news.google.com/rss/search?q=%E0%B8%AA%E0%B8%96%E0%B8%B2%E0%B8%99%E0%B8%B5%E0%B8%8A%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B8%88+%E0%B8%AD%E0%B8%B5%E0%B8%A7%E0%B8%B5&hl=th&gl=TH&ceid=TH:th',
    category: 'สถานีชาร์จและบริการ',
    lang: 'th'
  },
  {
    name: 'Google News - ประกันภัยรถ EV',
    url: 'https://news.google.com/rss/search?q=%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%81%E0%B8%B1%E0%B8%99%E0%B8%A0%E0%B8%B1%E0%B8%A2+%E0%B8%A3%E0%B8%96%E0%B8%A2%E0%B8%99%E0%B8%95%E0%B9%8C%E0%B9%84%E0%B8%9F%E0%B8%9F%E0%B9%89%E0%B8%B2&hl=th&gl=TH&ceid=TH:th',
    category: 'ประกันภัย',
    lang: 'th'
  }
];

// แมปรุ่นรถที่เกี่ยวข้องจากเนื้อหาข่าว
const MODEL_KEYWORDS_MAP = {
  'byd_seal': ['BYD Seal', 'ซีล'],
  'byd_dolphin': ['BYD Dolphin', 'ดอลฟิน', 'Dolphin'],
  'byd_atto3': ['BYD Atto 3', 'Atto 3', 'Atto3'],
  'byd_han': ['BYD Han', 'แฮน'],
  'mg_zs_ev': ['MG ZS EV', 'MG ZS', 'MGZS'],
  'mg_4_ev': ['MG4', 'MG 4 EV'],
  'neta_v': ['NETA V', 'เนต้า วี'],
  'neta_u': ['NETA U', 'เนต้า ยู'],
  'ora_goodcat': ['ORA Good Cat', 'โอร่า', 'ORA'],
  'aion_y_plus': ['AION Y Plus', 'ไอออน', 'Aion'],
  'deepal_s07': ['Deepal S07', 'ดีพัล'],
};

/**
 * กรองว่าข่าวชิ้นนี้เกี่ยวกับ EV หรือไม่
 */
function isEVRelated(title = '', content = '') {
  const text = `${title} ${content}`.toLowerCase();
  return EV_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

/**
 * หารุ่นรถที่เกี่ยวข้องจากเนื้อหา
 */
function detectRelatedModels(title = '', content = '') {
  const text = `${title} ${content}`;
  const found = [];
  for (const [modelId, keywords] of Object.entries(MODEL_KEYWORDS_MAP)) {
    if (keywords.some(kw => text.includes(kw))) {
      found.push(modelId);
    }
  }
  return found;
}

/**
 * แปลงรายการ RSS item เป็น format ของ MEEV news
 */
function transformItem(item, source) {
  const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
  const dateStr = pubDate.toISOString().split('T')[0];

  // ตัดแท็ก HTML ออกจาก content
  const rawContent = item.contentSnippet || item.content || item.summary || '';
  const cleanContent = rawContent.replace(/<[^>]*>/g, '').trim();

  const title = (item.title || '').replace(/<[^>]*>/g, '').trim();
  const relatedModels = detectRelatedModels(title, cleanContent);

  return {
    id: `rss_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title,
    summary: cleanContent.slice(0, 200) || title,
    content: cleanContent || title,
    category: source.category,
    published_date: dateStr,
    source: source.name,
    url: item.link || item.guid || '',
    related_models: relatedModels,
    fetched_at: new Date().toISOString(),
    auto_fetched: true
  };
}

/**
 * ดึงข่าวจาก RSS source เดียว
 */
async function fetchFromSource(source) {
  try {
    console.log(`[RSS] กำลังดึงจาก: ${source.name}`);
    const feed = await parser.parseURL(source.url);
    
    const items = (feed.items || [])
      .filter(item => isEVRelated(item.title, item.contentSnippet))
      .map(item => transformItem(item, source));
    
    console.log(`[RSS] ✓ ${source.name}: พบ ${items.length} ข่าว`);
    return items;
  } catch (err) {
    console.error(`[RSS] ✗ ${source.name}: ${err.message}`);
    return [];
  }
}

/**
 * ดึงข่าวจากทุก RSS sources พร้อมกัน
 * @returns {Promise<Array>} รายการข่าวทั้งหมดที่ดึงได้
 */
export async function fetchAllRSS() {
  console.log(`[RSS] เริ่มดึงข่าว EV จาก ${RSS_SOURCES.length} แหล่ง...`);
  const startTime = Date.now();

  const results = await Promise.allSettled(
    RSS_SOURCES.map(src => fetchFromSource(src))
  );

  const allItems = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[RSS] ✓ รวมได้ ${allItems.length} ข่าว ใช้เวลา ${elapsed}s`);

  return allItems;
}
