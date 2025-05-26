import { Participant } from './BracketTree';

export type Match = {
  id: string;
  round: number;
  matchNumber: number;
  player1: Participant | null;
  player2: Participant | null;
  winner: Participant | null;
  status: 'pending' | 'in_progress' | 'completed';
  bracket: 'A' | 'B' | 'final';
  fromMatchA?: string; // สำหรับโยงสายล่าง
  fromMatchB?: string; // สำหรับโยงสายล่าง
};

/**
 * สร้างสาย double elimination (main bracket + loser bracket + final)
 * รองรับผู้เข้าแข่งขันกี่คนก็ได้ (power of 2 + bye)
 * @param participants รายชื่อผู้เข้าแข่งขัน
 * @returns Match[]
 */
export function generateDoubleEliminationBracket(participants: Participant[]): Match[] {
  // 1. เตรียมสายบน (Winner/Main Bracket)
  const n = participants.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const numByes = bracketSize - n;
  let playersWithByes: (Participant | null)[];
  if (n % 2 === 1) {
    // เลขคี่: เว้นคู่แรกไว้ 1 คน (เติม null ที่ index 0)
    playersWithByes = [null, ...participants, ...Array(numByes - 1).fill(null)];
  } else {
    playersWithByes = [...participants, ...Array(numByes).fill(null)];
  }

  // Winner Bracket (A)
  let matches: Match[] = [];
  let round = 1;
  let matchId = 1;
  let currentPlayers = playersWithByes;
  let roundMatches: Match[] = [];
  while (currentPlayers.length > 1) {
    roundMatches = [];
    for (let i = 0; i < currentPlayers.length; i += 2) {
      roundMatches.push({
        id: `A-${round}-${i/2+1}`,
        round,
        matchNumber: i/2+1,
        player1: currentPlayers[i],
        player2: currentPlayers[i+1],
        winner: null,
        status: (currentPlayers[i] || currentPlayers[i+1]) ? (round === 1 && i === 0 ? 'in_progress' : 'pending') : 'pending',
        bracket: 'A',
      });
    }
    matches.push(...roundMatches);
    // เตรียมผู้ชนะสำหรับรอบถัดไป
    currentPlayers = new Array(roundMatches.length).fill(null);
    round++;
  }

  // 2. เตรียมสายล่าง (Loser Bracket, B)
  // สร้างสายล่างแบบเต็ม (bracket เต็มทุก match ทุก round)
  const winnerRounds = Math.log2(bracketSize);
  let loserMatches: Match[] = [];
  let loserRound = 1;
  let loserMatchId = 1;
  // จำนวนรอบในสายล่าง = winnerRounds - 1 + (winnerRounds - 2)
  // จำนวน match ในแต่ละรอบของสายล่าง: รอบที่ 1 มี bracketSize/4, รอบถัดไปลดลงครึ่งหนึ่งทุก 2 รอบ
  let loserRoundCount = 2 * winnerRounds - 2;
  let matchesPerRound = [];
  for (let r = 1; r <= loserRoundCount; r++) {
    // อ้างอิงโครงสร้างมาตรฐาน double elimination
    let count = Math.floor(bracketSize / Math.pow(2, Math.floor((r+1)/2) + 1));
    if (count < 1) count = 1;
    matchesPerRound.push(count);
    for (let i = 0; i < count; i++) {
      loserMatches.push({
        id: `B-${r}-${i+1}`,
        round: r,
        matchNumber: i+1,
        player1: null,
        player2: null,
        winner: null,
        status: (r === 1 && i === 0) ? 'in_progress' : 'pending',
        bracket: 'B',
        fromMatchA: '',
        fromMatchB: '',
      });
    }
  }

  // 3. รอบชิง (Final)
  matches.push(...loserMatches);
  matches.push({
    id: 'final-1',
    round: 1,
    matchNumber: 1,
    player1: null,
    player2: null,
    winner: null,
    status: 'pending',
    bracket: 'final',
  });
  return matches;
} 