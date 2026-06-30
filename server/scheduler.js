/**
 * scheduler.js
 * ตั้งเวลาดึงข่าว EV อัตโนมัติทุกวัน เวลา 6:00 AM (ตาม timezone Asia/Bangkok)
 */

import cron from 'node-cron';
import { fetchAllRSS } from './fetchers/rss-fetcher.js';
import { mergeAndSave, saveStatus } from './processor.js';

/**
 * ฟังก์ชันหลักสำหรับดึงและบันทึกข่าว
 * เรียกได้ทั้งจาก scheduler และจาก API endpoint
 */
export async function runNewsFetch() {
  const startTime = new Date();
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Scheduler] 🚀 เริ่มดึงข่าว EV: ${startTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
  console.log('='.repeat(50));

  try {
    // ดึงข่าวจาก RSS
    const rawItems = await fetchAllRSS();

    // Merge + บันทึก
    const result = mergeAndSave(rawItems);

    const endTime = new Date();
    const durationSec = ((endTime - startTime) / 1000).toFixed(1);

    const status = {
      last_fetch: endTime.toISOString(),
      last_fetch_th: endTime.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      duration_sec: parseFloat(durationSec),
      new_articles: result.added,
      total_articles: result.total,
      status: 'success',
      error: null
    };

    saveStatus(status);

    console.log(`[Scheduler] ✅ สำเร็จ: ข่าวใหม่ ${result.added} ชิ้น (รวม ${result.total}) ใช้เวลา ${durationSec}s`);
    return status;

  } catch (err) {
    const status = {
      last_fetch: new Date().toISOString(),
      last_fetch_th: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      duration_sec: 0,
      new_articles: 0,
      total_articles: 0,
      status: 'error',
      error: err.message
    };

    saveStatus(status);
    console.error(`[Scheduler] ❌ ผิดพลาด: ${err.message}`);
    return status;
  }
}

/**
 * เริ่มต้น cron scheduler
 * รันทุกวัน เวลา 06:00 AM (Asia/Bangkok)
 */
export function startScheduler() {
  // cron expression: '0 6 * * *' = ทุกวัน 6:00 AM
  const job = cron.schedule('0 6 * * *', async () => {
    await runNewsFetch();
  }, {
    timezone: 'Asia/Bangkok'
  });

  console.log('[Scheduler] ⏰ ตั้งเวลาดึงข่าวอัตโนมัติ 6:00 AM (Asia/Bangkok) ทุกวัน');
  console.log('[Scheduler] 💡 เรียก GET /api/news/fetch-now เพื่อดึงข่าวทันที');

  return job;
}
