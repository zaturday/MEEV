/**
 * index.js — MEEV News Server
 * Express API + node-cron scheduler สำหรับดึงข่าว EV อัตโนมัติ
 *
 * Endpoints:
 *   GET /api/news           → ข่าวทั้งหมดจาก cache
 *   GET /api/news/fetch-now → trigger ดึงข่าวทันที
 *   GET /api/status         → สถานะการดึงข่าวล่าสุด
 */

import express from 'express';
import cors from 'cors';
import { loadCache, loadStatus } from './processor.js';
import { runNewsFetch, startScheduler } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────

/**
 * GET /api/news
 * คืนค่าข่าวทั้งหมดจาก cache
 */
app.get('/api/news', (req, res) => {
  try {
    const items = loadCache();
    const status = loadStatus();
    res.json({
      success: true,
      count: items.length,
      last_updated: status?.last_fetch || null,
      last_updated_th: status?.last_fetch_th || 'ยังไม่เคยดึงข่าว',
      news: items
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/news/fetch-now
 * Trigger ดึงข่าวทันที (สำหรับทดสอบหรือ manual refresh)
 */
app.get('/api/news/fetch-now', async (req, res) => {
  console.log('[API] /api/news/fetch-now — trigger โดย user');
  
  // ตอบก่อนทันทีเพื่อไม่ให้ request timeout
  res.json({ success: true, message: 'กำลังดึงข่าว... โหลดหน้าใหม่หลังจาก 15-30 วินาที' });
  
  // รันในพื้นหลัง
  runNewsFetch().catch(err => console.error('[API] fetch-now error:', err));
});

/**
 * GET /api/news/fetch-sync
 * Trigger ดึงข่าวและรอจนเสร็จ (สำหรับ UI ที่ต้องการผลลัพธ์ทันที)
 */
app.get('/api/news/fetch-sync', async (req, res) => {
  console.log('[API] /api/news/fetch-sync — รอผลลัพธ์');
  try {
    const status = await runNewsFetch();
    const items = loadCache();
    res.json({
      success: true,
      fetch_status: status,
      count: items.length,
      news: items
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/status
 * สถานะการดึงข่าวล่าสุด
 */
app.get('/api/status', (req, res) => {
  const status = loadStatus();
  res.json({
    server: 'MEEV News Server',
    scheduler: 'ทุกวัน 6:00 AM (Asia/Bangkok)',
    last_fetch: status || { message: 'ยังไม่เคยดึงข่าว' }
  });
});

// ─── Start Server ──────────────────────────────────────────

app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(50));
  console.log('  MEEV News Server 🚗⚡');
  console.log('═'.repeat(50));
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Endpoints:`);
  console.log(`    GET /api/news           → ดึงข่าวจาก cache`);
  console.log(`    GET /api/news/fetch-now → trigger ดึงข่าวทันที`);
  console.log(`    GET /api/status         → สถานะ scheduler`);
  console.log('═'.repeat(50) + '\n');

  // เริ่ม scheduler (6:00 AM ทุกวัน)
  startScheduler();

  // ดึงข่าวครั้งแรกทันทีเมื่อ server เริ่ม (ถ้า cache ว่างเปล่า)
  const existing = loadCache();
  if (existing.length === 0) {
    console.log('[Server] Cache ว่างเปล่า — กำลังดึงข่าวครั้งแรก...');
    runNewsFetch().catch(err => console.error('[Server] Initial fetch error:', err));
  } else {
    console.log(`[Server] โหลด cache สำเร็จ: ${existing.length} ข่าว`);
  }
});
