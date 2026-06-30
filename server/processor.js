/**
 * processor.js
 * ประมวลผลข่าวสาร: deduplication, sorting, merge กับ cache เดิม
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, 'db');
const CACHE_FILE = join(DB_DIR, 'news-cache.json');
const STATUS_FILE = join(DB_DIR, 'fetch-status.json');

// จำนวนข่าวสูงสุดที่เก็บใน cache (เก่าสุดจะถูกตัดทิ้ง)
const MAX_NEWS_ITEMS = 200;

// สร้าง fingerprint สำหรับ dedup
function fingerprint(item) {
  // ใช้ URL ถ้ามี มิฉะนั้นใช้ title แรก 60 ตัวอักษร
  if (item.url && item.url.length > 10) return item.url;
  return (item.title || '').slice(0, 60).toLowerCase().trim();
}

/**
 * โหลด cache ปัจจุบันจากไฟล์
 */
export function loadCache() {
  if (!existsSync(CACHE_FILE)) return [];
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * บันทึก cache ลงไฟล์
 */
function saveCache(items) {
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), 'utf8');
}

/**
 * บันทึกสถานะการดึงข่าวล่าสุด
 */
export function saveStatus(status) {
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
}

/**
 * โหลดสถานะการดึงข่าวล่าสุด
 */
export function loadStatus() {
  if (!existsSync(STATUS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * รวมข่าวใหม่กับ cache เดิม โดยตัด duplicate ออก
 * @param {Array} newItems - ข่าวใหม่จาก RSS
 * @returns {{ added: number, total: number, items: Array }}
 */
export function mergeAndSave(newItems) {
  const existing = loadCache();
  const existingFingerprints = new Set(existing.map(fingerprint));

  const fresh = newItems.filter(item => {
    const fp = fingerprint(item);
    if (!fp || existingFingerprints.has(fp)) return false;
    existingFingerprints.add(fp);
    return true;
  });

  // รวมและเรียงตาม date ใหม่สุดก่อน
  const merged = [...fresh, ...existing]
    .sort((a, b) => {
      const da = new Date(a.published_date || a.fetched_at || 0);
      const db = new Date(b.published_date || b.fetched_at || 0);
      return db - da;
    })
    .slice(0, MAX_NEWS_ITEMS);

  saveCache(merged);

  console.log(`[Processor] เพิ่มข่าวใหม่ ${fresh.length} ชิ้น (รวมทั้งหมด ${merged.length} ชิ้น)`);
  return { added: fresh.length, total: merged.length, items: merged };
}
