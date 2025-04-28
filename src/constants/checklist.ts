export const WEEKLY_MAX_VALUES = {
  minotaur: 7,           // มิโนทอร์ - ทำได้ 7 ครั้งต่อสัปดาห์
  cerberus: 5,           // เซอร์เบอรัส - ทำได้ 5 ครั้งต่อสัปดาห์
  cerberusHell: 2,       // เซอร์เบอรัส (นรก) - ทำได้ 2 ครั้งต่อสัปดาห์
  cerberusChallenge: 1,  // เซอร์เบอรัส (ท้าทาย) - ทำได้ 1 ครั้งต่อสัปดาห์
  manticore: 3,          // แมนทิคอร์ - ทำได้ 3 ครั้งต่อสัปดาห์
  manticoreHell: 1,      // แมนทิคอร์ (นรก) - ทำได้ 1 ครั้งต่อสัปดาห์
  apocalypse: 3,         // อะพอคคาลิปส์ - ทำได้ 3 ครั้งต่อสัปดาห์
  apocalypseHell: 1,     // อะพอคคาลิปส์ (นรก) - ทำได้ 1 ครั้งต่อสัปดาห์
  seaDragon: 2,          // มังกรทะเล - ทำได้ 2 ครั้งต่อสัปดาห์
  chaosRiftKamala: 3,    // คาออสริฟท์: คามาลา - ทำได้ 3 ครั้งต่อสัปดาห์
  chaosRiftBairra: 3,    // คาออสริฟท์: ไบร์รา - ทำได้ 3 ครั้งต่อสัปดาห์
  banquetHall: 1,        // งานเลี้ยง - ทำได้ 1 ครั้งต่อสัปดาห์
  jealousAlbeuteur: 1,   // อัลบูเทอร์ผู้อิจฉา - ทำได้ 1 ครั้งต่อสัปดาห์
  themePark: 1           // สวนสนุก - ทำได้ 1 ครั้งต่อสัปดาห์
} as const;

// ค่าเริ่มต้นสำหรับเช็คลิสต์รายสัปดาห์
export const DEFAULT_WEEKLY_CHECKLIST: { [K in keyof typeof WEEKLY_MAX_VALUES]: number } = {
  minotaur: 0,
  cerberus: 0,
  cerberusHell: 0,
  cerberusChallenge: 0,
  manticore: 0,
  manticoreHell: 0,
  apocalypse: 0,
  apocalypseHell: 0,
  seaDragon: 0,
  chaosRiftKamala: 0,
  chaosRiftBairra: 0,
  banquetHall: 0,
  jealousAlbeuteur: 0,
  themePark: 0
};

// ประเภทสำหรับค่าสูงสุดของเช็คลิสต์รายสัปดาห์
export type WeeklyMaxValues = typeof WEEKLY_MAX_VALUES; 