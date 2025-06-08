import { ref, get, update } from 'firebase/database';
import { db } from './firebase';
import { Character } from '@/types/character';

// เวลารีเซ็ตตาม timezone ไทย (+07:00)
const DAILY_RESET_HOUR = 8; // 08:00 น.
const WEEKLY_RESET_HOUR = 8; // 08:00 น.
const WEEKLY_RESET_DAY = 6; // วันเสาร์ (0 = อาทิตย์, 6 = เสาร์)

// ฟังก์ชันแปลงเวลาเป็นเวลาไทย
function getThaiTime(date: Date): Date {
  // ใช้ Intl.DateTimeFormat เพื่อแปลงเวลาเป็น timezone ไทย
  const thaiTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  return thaiTime;
}

// ฟังก์ชันตรวจสอบว่าถึงเวลา reset หรือยัง
export async function shouldResetDaily(userId: string): Promise<boolean> {
  try {
    const metaRef = ref(db, `users/${userId}/meta/lastResetDaily`);
    const snapshot = await get(metaRef);
    const lastReset = snapshot.val();

    if (!lastReset) return true;
    
    const now = new Date();
    const lastResetDate = new Date(lastReset);
    
    // แปลงเป็นเวลาไทย
    const thaiNow = getThaiTime(now);
    const thaiLastReset = getThaiTime(lastResetDate);

    // ตรวจสอบว่าเป็นวันเดียวกันหรือไม่
    const isSameDay = thaiNow.getDate() === thaiLastReset.getDate() && 
                     thaiNow.getMonth() === thaiLastReset.getMonth() && 
                     thaiNow.getFullYear() === thaiLastReset.getFullYear();

    // ถ้าเป็นวันเดียวกันแล้ว ไม่ต้องรีเซ็ตซ้ำ
    if (isSameDay) {
      return false;
    }
    // ถ้าเป็นวันใหม่ แต่ยังไม่ถึงเวลา reset (09:00) ไม่ต้องรีเซ็ต
    if (thaiNow.getHours() < DAILY_RESET_HOUR) {
      return false;
    }
    // ถ้าเป็นวันใหม่และถึงเวลา reset แล้ว ให้รีเซ็ต
    return true;
  } catch (error) {
    console.error('Error checking daily reset:', error);
    return false;
  }
}

export async function shouldResetWeekly(userId: string): Promise<boolean> {
  try {
    const metaRef = ref(db, `users/${userId}/meta/lastResetWeekly`);
    const snapshot = await get(metaRef);
    const lastReset = snapshot.val();

    if (!lastReset) return true;
    
    const now = new Date();
    const lastResetDate = new Date(lastReset);
    
    // แปลงเป็นเวลาไทย
    const thaiNow = getThaiTime(now);
    const thaiLastReset = getThaiTime(lastResetDate);

    // ตรวจสอบว่าเป็นวันเสาร์หรือไม่
    const isSaturday = thaiNow.getDay() === WEEKLY_RESET_DAY;
    const isSameDay = thaiNow.getDate() === thaiLastReset.getDate() && 
                     thaiNow.getMonth() === thaiLastReset.getMonth() && 
                     thaiNow.getFullYear() === thaiLastReset.getFullYear();

    // ถ้าเป็นวันเสาร์และยังไม่เคยรีเซ็ตวันนี้
    if (isSaturday && !isSameDay && thaiNow.getHours() >= WEEKLY_RESET_HOUR) {
      return true;
    }
    // ถ้าเป็นวันเสาร์และรีเซ็ตวันนี้แล้ว ไม่ต้องรีเซ็ตซ้ำ
    if (isSaturday && isSameDay) {
      return false;
    }
    // ถ้าไม่ใช่วันเสาร์ ไม่ต้องรีเซ็ต
    return false;
  } catch (error) {
    console.error('Error checking weekly reset:', error);
    return false;
  }
}

// ฟังก์ชันรีเซ็ต checklist
export async function resetChecklist(userId: string, type: 'daily' | 'weekly'): Promise<void> {
  try {
    // ดึงข้อมูลตัวละครของผู้ใช้
    const charactersRef = ref(db, `users/${userId}/characters`);
    const snapshot = await get(charactersRef);
    const characters = snapshot.val();

    if (!characters) {
      console.log('No characters found for user:', userId);
      return;
    }

    // เตรียมข้อมูลสำหรับอัปเดต
    const updates: { [key: string]: any } = {};
    const now = new Date().toISOString();

    // รีเซ็ต checklist ตามประเภท
    Object.entries(characters).forEach(([charId, char]: [string, any]) => {
      if (type === 'daily') {
        updates[`/characters/${charId}/checklist/daily`] = {
          dailyQuest: false,
          ftg: false
        };
      } else {
        updates[`/characters/${charId}/checklist/weekly`] = {
          minotaur: 0,
          cerberus: 0,
          cerberusHell: 0,
          cerberusChallenge: 0,
          manticore: 0,
          manticoreHell: 0,
          apocalypse: 0,
          apocalypseHell: 0,
          seaDragon: 0,
          themePark: 0,
          themeHell: 0,
          chaosRiftKamala: 0,
          chaosRiftBairra: 0,
          banquetHall: 0,
          jealousAlbeuteur: 0
        };
      }
    });

    // อัปเดตเวลารีเซ็ตล่าสุด
    updates[`/meta/lastReset${type === 'daily' ? 'Daily' : 'Weekly'}`] = now;

    // บันทึกการเปลี่ยนแปลงเฉพาะข้อมูลของผู้ใช้
    await update(ref(db, `users/${userId}`), updates);
  } catch (error) {
    console.error('Error resetting checklist:', error);
    throw error;
  }
}

// ฟังก์ชันตรวจสอบและรีเซ็ต checklist อัตโนมัติ
export async function checkAndResetChecklist(userId: string): Promise<void> {
  try {
    const shouldResetDailyResult = await shouldResetDaily(userId);
    const shouldResetWeeklyResult = await shouldResetWeekly(userId);

    // ตรวจสอบและรีเซ็ตตามความเหมาะสม
    if (shouldResetDailyResult) {
      await resetChecklist(userId, 'daily');
    }

    if (shouldResetWeeklyResult) {
      await resetChecklist(userId, 'weekly');
    }
  } catch (error) {
    console.error('Error checking and resetting checklist:', error);
    throw error;
  }
} 