import React, { useRef, useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';

export interface Participant {
  uid: string;
  characterId: string;
  characterName: string;
  class: string;
}

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  player1: Participant | null;
  player2: Participant | null;
  winner: Participant | null;
  status: 'pending' | 'in_progress' | 'completed';
  bracket?: 'A' | 'B' | 'final';
}

interface BracketTreeProps {
  matches: Match[];
  isGuildLeader: boolean;
  onSelectWinner: (matchId: string, winner: Participant) => void;
}

// Helper: group matches by round
function groupByRound(matches: Match[]) {
  const rounds: Record<number, Match[]> = {};
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });
  return rounds;
}

// เพิ่ม helper สำหรับสร้าง bracket tree ล่วงหน้าตามจำนวนผู้เข้าร่วม
function buildBracketStructure(totalPlayers: number) {
  const totalRounds = Math.ceil(Math.log2(totalPlayers));
  const bracketSize = Math.pow(2, totalRounds);
  const rounds: { index: number; player1: number | null; player2: number | null }[][] = [];
  // รอบแรก: index = match index, player1/2 = participant index (หรือ null)
  const firstRound: { index: number; player1: number | null; player2: number | null }[] = [];
  for (let i = 0; i < bracketSize; i += 2) {
    firstRound.push({
      index: i / 2,
      player1: i < totalPlayers ? i : null,
      player2: i + 1 < totalPlayers ? i + 1 : null,
    });
  }
  rounds.push(firstRound);
  // รอบถัดไป: index = match index, player1/2 = index ของ match ต้นทางในรอบก่อนหน้า
  let prevRound = firstRound;
  for (let r = 1; r < totalRounds; r++) {
    const thisRound: { index: number; player1: number | null; player2: number | null }[] = [];
    for (let i = 0; i < prevRound.length / 2; i++) {
      thisRound.push({
        index: i,
        player1: i * 2,
        player2: i * 2 + 1 < prevRound.length ? i * 2 + 1 : null,
      });
    }
    rounds.push(thisRound);
    prevRound = thisRound;
  }
  return rounds;
}

// ฟังก์ชันย่อยสำหรับ render bracket tree (UI เดิม) จาก matches[]
function RenderBracketTree({ matches, isGuildLeader, onSelectWinner, title }: { matches: Match[], isGuildLeader: boolean, onSelectWinner: (matchId: string, winner: Participant) => void, title?: string }) {
  if (!matches || matches.length === 0) return null;
  // ใช้ matches เฉพาะที่รับเข้ามา ไม่ต้องเช็ค isDouble หรือ bracket
  const rounds = groupByRound(matches);
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const matchBoxHeight = 100;
  const matchBoxGap = 70;
  const roundWidth = 400;
  const boxWidth = 300;
  // Calculate top positions for each box in each round so that each box in round N is centered between its two source boxes in round N-1
  const boxTops: number[][] = [];
  for (let rIdx = 0; rIdx < roundNumbers.length; rIdx++) {
    const round = roundNumbers[rIdx];
    const count = rounds[round].length;
    boxTops[rIdx] = [];
    for (let i = 0; i < count; i++) {
      if (rIdx === 0) {
        boxTops[rIdx][i] = i * (matchBoxHeight + matchBoxGap);
      } else {
        const prev1 = boxTops[rIdx - 1][i * 2];
        const prev2 = boxTops[rIdx - 1][i * 2 + 1];
        boxTops[rIdx][i] = (prev1 + prev2) / 2;
      }
    }
  }
  const svgWidth = roundNumbers.length * roundWidth;
  const svgHeight = Math.max(...boxTops[0]) + matchBoxHeight;

  // --- Drag & Wheel Scroll ---
  const bracketRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bracketRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.classList.add('cursor-grabbing');
    };
    const onMouseLeave = () => { isDown = false; el.classList.remove('cursor-grabbing'); };
    const onMouseUp = () => { isDown = false; el.classList.remove('cursor-grabbing'); };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  // Helper to determine if a box should be rendered
  function shouldRenderBox(match: Match, rIdx: number) {
    if (rIdx === 0) {
      return !!(match.player1 || match.player2);
    }
    const prevRound = rounds[roundNumbers[rIdx - 1]];
    const fromIdx1 = match.matchNumber * 2 - 2;
    const fromIdx2 = match.matchNumber * 2 - 1;
    const prev1 = prevRound?.[fromIdx1];
    const prev2 = prevRound?.[fromIdx2];
    // ต้องมีผู้ชนะจากรอบก่อนหน้าอย่างน้อย 1 คน ถึงจะแสดงกล่องนี้
    return !!((prev1 && prev1.winner) || (prev2 && prev2.winner));
  }

  // Helper to get player or winner from previous round (robust: search by uid)
  function getPlayerOrWinner(match: Match, playerKey: 'player1' | 'player2', rIdx: number): Participant | null {
    if (match[playerKey]) return match[playerKey]!;
    if (rIdx === 0) return null;
    // หา match ต้นทางในรอบก่อนหน้าที่ winner ถูกส่งมาเป็น player1/player2 ใน match นี้
    const prevRound = rounds[roundNumbers[rIdx - 1]];
    // หา match ที่ winner.uid === match[playerKey]?.uid หรือ match นี้รับ winner จาก match ไหน
    // ถ้า playerKey เป็น null ให้หา match ที่ winner ถูก assign มาที่ playerKey นี้
    // วิธี robust: หา match ใน prevRound ที่ winner ถูก assign มาที่ playerKey ของ match นี้
    for (const prevMatch of prevRound) {
      if (
        isParticipant(prevMatch.winner) &&
        match[playerKey] &&
        typeof match[playerKey] === 'object' &&
        'uid' in match[playerKey] &&
        prevMatch.winner.uid === (match[playerKey] as Participant).uid
      ) {
        return prevMatch.winner;
      }
      // ถ้า playerKey เป็น null ให้หา match ที่ winner ถูก assign มาที่ playerKey นี้
      if (!match[playerKey] && prevMatch.winner) {
        // ถ้า match นี้รับ winner จาก prevMatch (โดยเทียบกับ matches array)
        if (
          (match.player1 === null && prevMatch.winner && matchBoxTakesWinner(match, prevMatch, 'player1', rIdx, prevRound)) ||
          (match.player2 === null && prevMatch.winner && matchBoxTakesWinner(match, prevMatch, 'player2', rIdx, prevRound))
        ) {
          return prevMatch.winner;
        }
      }
    }
    return null;
  }

  // Helper: check if this match should take winner from prevMatch for playerKey
  function matchBoxTakesWinner(match: Match, prevMatch: Match, playerKey: 'player1' | 'player2', rIdx: number, prevRound: Match[]): boolean {
    // ใช้ index mapping เดิม: matchNumber ของ match นี้สัมพันธ์กับ index ของ prevMatch
    // player1: prevMatch ที่ (match.matchNumber * 2 - 2)
    // player2: prevMatch ที่ (match.matchNumber * 2 - 1)
    const idx = prevRound.indexOf(prevMatch);
    if (playerKey === 'player1') {
      return idx === match.matchNumber * 2 - 2;
    } else {
      return idx === match.matchNumber * 2 - 1;
    }
  }

  function isParticipant(obj: any): obj is Participant {
    return obj && typeof obj === 'object' && typeof obj.uid === 'string';
  }

  // เช็คว่า match นี้อยู่ในสาย bracket จริง (มีผู้เล่น หรือมีสาย bracket จริงจากรอบก่อนหน้า)
  function isRealBracketPath(match: Match, rIdx: number): boolean {
    if (rIdx === 0) {
      return !!(match.player1 || match.player2);
    }
    const prevRound = rounds[roundNumbers[rIdx - 1]];
    const fromIdx1 = match.matchNumber * 2 - 2;
    const fromIdx2 = match.matchNumber * 2 - 1;
    const prev1 = prevRound?.[fromIdx1];
    const prev2 = prevRound?.[fromIdx2];
    // ถ้ามีสาย bracket จริงจากรอบก่อนหน้าอย่างน้อย 1 สาย
    return !!((prev1 && isRealBracketPath(prev1, rIdx - 1)) || (prev2 && isRealBracketPath(prev2, rIdx - 1)));
  }

  // ปรับตรงนี้: วาดกล่อง bracket และเส้นทุก match ในทุก round สำหรับสายล่าง (bracket: 'B')
  const isLoserBracket = matches.length > 0 && matches[0].bracket === 'B';

  // สร้าง bracket structure ล่วงหน้าตามจำนวนผู้เข้าร่วมจริง
  let totalPlayers: number;
  if (isLoserBracket) {
    // สายล่าง: ใช้จำนวน match ในรอบแรก * 2
    const firstRound = matches.filter(m => m.round === 1);
    totalPlayers = firstRound.length * 2;
  } else {
    // เดิม: นับผู้เล่นจริงในสายบน/โหมดอื่น
    totalPlayers = matches.filter(m => m.round === 1).reduce((acc, m) => acc + (m.player1 ? 1 : 0) + (m.player2 ? 1 : 0), 0);
  }
  const bracketStructure = buildBracketStructure(totalPlayers);

  // ฟังก์ชันเช็คว่าสาย bracket นี้เป็นสายจริงหรือไม่ (recursive)
  function isRealBracketPathInStructure(roundIdx: number, matchIdx: number): boolean {
    if (roundIdx === 0) {
      // รอบแรก: มีผู้เล่นอย่างน้อย 1 คน
      const match = bracketStructure[0][matchIdx];
      return match.player1 !== null || match.player2 !== null;
    }
    // รอบถัดไป: มีสายจริงจากรอบก่อนหน้าอย่างน้อย 1 สาย
    const match = bracketStructure[roundIdx][matchIdx];
    const prev1 = match.player1 !== null ? isRealBracketPathInStructure(roundIdx - 1, match.player1) : false;
    const prev2 = match.player2 !== null ? isRealBracketPathInStructure(roundIdx - 1, match.player2) : false;
    return prev1 || prev2;
  }

  // หา round ล่าสุดที่ยังไม่จบ (มี match ที่ status เป็น 'in_progress')
  const latestInProgressRound = Math.max(
    ...matches.filter(m => m.status === 'in_progress').map(m => m.round),
    0
  );

  const [confirmModal, setConfirmModal] = useState<{ open: boolean, matchId?: string, winner?: Participant } | null>(null);

  return (
    <div>
      {title && <h4 className="font-bold mb-2">{title}</h4>}
      <div
        ref={bracketRef}
        className="relative overflow-x-auto px-2 select-none cursor-grab"
      >
        <div style={{ position: 'relative', width: svgWidth, height: svgHeight }}>
          {/* SVG lines */}
          <svg width={svgWidth} height={svgHeight} className="absolute left-0 top-0 z-0 pointer-events-none">
            {bracketStructure.slice(0, -1).map((round, rIdx) => {
              return round.map((match, mIdx) => {
                // วาดเส้นทุก match ถ้าเป็นสายล่าง (B)
                if (!isLoserBracket && !isRealBracketPathInStructure(rIdx, mIdx)) return null;
                if (!boxTops[rIdx] || boxTops[rIdx][mIdx] === undefined) return null;
                const fromX = rIdx * roundWidth + boxWidth;
                const fromY = boxTops[rIdx][mIdx] + matchBoxHeight / 2;
                const toX = (rIdx + 1) * roundWidth;
                // เพิ่ม guard
                const nextBoxTops = boxTops[rIdx + 1];
                const nextBoxY = nextBoxTops ? nextBoxTops[Math.floor(mIdx / 2)] : undefined;
                if (nextBoxY === undefined) return null;
                const toY = nextBoxY + matchBoxHeight / 2;
                const midX = fromX + 40;
                // หาว่า match นี้มี winner หรือไม่ เพื่อเปลี่ยนสีเส้น
                const matchData = matches.find(m => m.round === rIdx + 1 && m.matchNumber === match.index + 1);
                const winnerExists = !!matchData?.winner;
                return (
                  <path
                    key={`line-${rIdx}-${mIdx}`}
                    d={`M${fromX},${fromY} H${midX} V${toY} H${toX}`}
                    stroke={winnerExists ? 'url(#bracketLineWinnerGradient)' : 'url(#bracketLineGradient)'}
                    strokeWidth={winnerExists ? 6 : 4}
                    opacity={1}
                    fill="none"
                    style={{filter: winnerExists ? 'drop-shadow(0 0 8px #22c55e)' : 'drop-shadow(0 2px 6px #818cf8)'}}
                  />
                );
              });
            })}
            {/* SVG Gradient สำหรับเส้นโยง */}
            <defs>
              <linearGradient id="bracketLineGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="bracketLineWinnerGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#bbf7d0" />
              </linearGradient>
            </defs>
          </svg>
          {/* Bracket boxes */}
          {bracketStructure.map((round, rIdx) =>
            round.map((match, mIdx) => {
              // วาดกล่องทุก match ถ้าเป็นสายล่าง (B)
              if (!isLoserBracket && !isRealBracketPathInStructure(rIdx, mIdx)) return null;
              // เฉพาะสายบน/เดิม: ซ่อนกล่องบนสุดที่ไม่มีผู้เล่นและไม่มีสายจริง
              if (!isLoserBracket) {
                if (mIdx === 0 && rIdx === 0 && match.player1 === null && match.player2 === null) return null;
                if (mIdx === 0 && rIdx > 0) {
                  // ถ้า match ต้นทางทั้งสองไม่มีสายจริง ให้ซ่อน
                  const prev1 = match.player1 !== null ? isRealBracketPathInStructure(rIdx - 1, match.player1) : false;
                  const prev2 = match.player2 !== null ? isRealBracketPathInStructure(rIdx - 1, match.player2) : false;
                  if (!prev1 && !prev2) return null;
                }
              }
              // หา match จริงจาก matches (ถ้ามี)
              const matchData = matches.find(m => m.round === rIdx + 1 && m.matchNumber === match.index + 1);
              // หา player1/2 จริง (ถ้ามี)
              let p1 = null, p2 = null;
              if (rIdx === 0) {
                // รอบแรก: ใช้ matches
                p1 = matchData?.player1;
                p2 = matchData?.player2;
              } else {
                // รอบถัดไป: ใช้ winner จาก match ต้นทางรอบก่อนหน้า
                const prevRound = bracketStructure[rIdx - 1];
                const prevMatch1 = matches.find(m => m.round === rIdx && m.matchNumber === (match.player1! + 1));
                const prevMatch2 = match.player2 !== null ? matches.find(m => m.round === rIdx && m.matchNumber === (match.player2! + 1)) : null;
                p1 = prevMatch1?.winner || null;
                p2 = prevMatch2?.winner || null;
              }
              if (!boxTops[rIdx] || boxTops[rIdx][mIdx] === undefined) return null;
              // กำหนดชื่อรอบบนกล่องแต่ละคู่
              let roundLabel = `รอบที่ ${rIdx + 1}`;
              if (rIdx === bracketStructure.length - 2) roundLabel = 'รอบรองชนะเลิศ';
              if (rIdx === bracketStructure.length - 1) roundLabel = 'รอบชิงชนะเลิศ';
              // เอฟเฟคกล่องที่กำลังต่อสู้
              const isActive = matchData && matchData.status === 'in_progress';
              return (
                <div
                  key={`box-${rIdx}-${mIdx}`}
                  style={{
                    position: 'absolute',
                    left: rIdx * roundWidth,
                    top: boxTops[rIdx][mIdx],
                    width: boxWidth,
                    height: matchBoxHeight + 12,
                    boxShadow: isActive
                      ? '0 0 12px 2px rgba(236,72,153,0.18), 0 1.5px 6px 0 rgba(99,102,241,0.10)'
                      : '0 2px 8px 0 rgba(236,72,153,0.08), 0 1.5px 6px 0 rgba(99,102,241,0.06)',
                    borderRadius: 24,
                    background: matchData?.winner ? 'linear-gradient(135deg, #bbf7d0 0%, #f0fdfa 100%)' : 'linear-gradient(135deg, #fdf2f8 0%, #f3e8ff 100%)',
                    border: isActive
                      ? '2px solid #f9a8d4'
                      : matchData?.winner
                      ? '2px solid #6ee7b7'
                      : '1.5px solid #e0e7ef',
                    transition: 'box-shadow 0.2s, border 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: 0,
                    overflow: 'hidden',
                    fontFamily: 'Sarabun, Kanit, Arial, sans-serif',
                    animation: isActive ? 'pulse-glow 1.2s infinite alternate' : undefined,
                  }}
                >
                  {/* ชื่อรอบและหมายเลขคู่ */}
                  <div style={{
                    width: '100%',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: 15,
                    color: '#be185d',
                    background: 'linear-gradient(90deg, #fce7f3 0%, #ede9fe 100%)',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    padding: '4px 0 1px 0',
                    letterSpacing: 1,
                    boxShadow: '0 1px 4px 0 rgba(236,72,153,0.04)',
                    fontFamily: 'Kanit, Sarabun, Arial, sans-serif',
                    userSelect: 'none',
                  }}>
                    {roundLabel} <span style={{fontWeight: 400, fontSize: 13, color: '#a21caf'}}>{`| Match ${matchData?.matchNumber}`}</span>
                  </div>
                  {/* กล่องคู่ */}
                  <div style={{display: 'flex', flexDirection: 'column', width: '100%', height: '100%'}}>
                    {/* ฝั่งบน */}
                    <div style={{
                      display: 'flex',
                      width: '100%',
                      height: '50%',
                      background: matchData?.winner?.uid === p1?.uid ? 'linear-gradient(90deg, #d1fae5 0%, #f0fdfa 100%)' : 'linear-gradient(90deg, #fdf6fb 0%, #f3e8ff 100%)',
                      alignItems: 'center',
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                      borderBottom: '1px solid #f3e8ff',
                      padding: '6px 0 4px 0',
                    }}>
                      <span style={{
                        display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, maxWidth: '100%', paddingLeft: 14
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: '#22223b',
                          fontSize: 15,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          wordBreak: 'break-all',
                          whiteSpace: 'normal',
                          lineHeight: 1.25,
                          fontFamily: 'Kanit, Sarabun, Arial, sans-serif',
                          maxHeight: 24,
                          textAlign: 'left',
                          width: 'auto',
                          display: 'inline',
                        }}>{p1 ? p1.characterName : <span className="text-gray-400">-</span>}</span>
                        {p1?.class && (
                          <span style={{ fontSize: 12, color: '#a3a3a3', fontWeight: 400, marginLeft: 6, lineHeight: 1.1 }}>
                            ({p1.class})
                          </span>
                        )}
                      </span>
                      {isGuildLeader && matchData && !matchData.winner && p1 && (
                        <button
                          className="ml-2 px-2 py-1 rounded-lg text-xs font-bold shadow-sm transition-all"
                          style={{background: 'linear-gradient(90deg, #bae6fd 0%, #ddd6fe 100%)', color: '#2563eb', border: 'none'}}
                          onClick={() => setConfirmModal({ open: true, matchId: matchData.id, winner: p1 })}
                          title="เลือกเป็นผู้ชนะ"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                    {/* เส้นแบ่งกลาง */}
                    <div style={{height: 1, width: '100%', background: 'linear-gradient(90deg, #f3e8ff 0%, #ddd6fe 100%)'}} />
                    {/* ฝั่งล่าง */}
                    <div style={{
                      display: 'flex',
                      width: '100%',
                      height: '50%',
                      background: matchData?.winner?.uid === p2?.uid ? 'linear-gradient(90deg, #d1fae5 0%, #f0fdfa 100%)' : 'linear-gradient(90deg, #f3e8ff 0%, #fdf6fb 100%)',
                      alignItems: 'center',
                      borderBottomLeftRadius: 24,
                      borderBottomRightRadius: 24,
                      padding: '6px 0 4px 0',
                    }}>
                      <span style={{
                        display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, maxWidth: '100%', paddingLeft: 14
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: '#22223b',
                          fontSize: 15,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          wordBreak: 'break-all',
                          whiteSpace: 'normal',
                          lineHeight: 1.25,
                          fontFamily: 'Kanit, Sarabun, Arial, sans-serif',
                          maxHeight: 24,
                          textAlign: 'left',
                          width: 'auto',
                          display: 'inline',
                        }}>{p2 ? p2.characterName : <span className="text-gray-400">-</span>}</span>
                        {p2?.class && (
                          <span style={{ fontSize: 12, color: '#a3a3a3', fontWeight: 400, marginLeft: 6, lineHeight: 1.1 }}>
                            ({p2.class})
                          </span>
                        )}
                      </span>
                      {isGuildLeader && matchData && !matchData.winner && p2 && (
                        <button
                          className="ml-2 px-2 py-1 rounded-lg text-xs font-bold shadow-sm transition-all"
                          style={{background: 'linear-gradient(90deg, #ddd6fe 0%, #bae6fd 100%)', color: '#a21caf', border: 'none'}}
                          onClick={() => setConfirmModal({ open: true, matchId: matchData.id, winner: p2 })}
                          title="เลือกเป็นผู้ชนะ"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                  {/* ผู้ชนะ */}
                  {matchData?.winner && (
                    <div style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #bbf7d0 0%, #f0fdfa 100%)',
                      color: '#059669',
                      fontWeight: 700,
                      fontSize: 13,
                      textAlign: 'left',
                      padding: '2px 0 2px 14px',
                      borderBottomLeftRadius: 18,
                      borderBottomRightRadius: 18,
                      fontFamily: 'Kanit, Sarabun, Arial, sans-serif',
                      marginTop: 0,
                    }}>ผู้ชนะ: {matchData.winner.characterName}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* Modal ยืนยันเลือกผู้ชนะ */}
      <Dialog open={!!confirmModal?.open} onClose={() => setConfirmModal(null)} className="fixed z-50 inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <Dialog.Panel>
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-xs mx-auto z-50 border border-pink-200 flex flex-col items-center">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-200 to-pink-200 flex items-center justify-center mb-2 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#a21caf" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3v2.25M7.5 3v2.25M3.75 7.5h16.5M4.5 21h15a.75.75 0 0 0 .75-.75V7.5a.75.75 0 0 0-.75-.75h-15a.75.75 0 0 0-.75.75v12.75c0 .414.336.75.75.75ZM8.25 10.5h7.5M8.25 13.5h7.5M8.25 16.5h4.5" />
                </svg>
              </div>
              <Dialog.Title className="font-extrabold text-lg mb-1 text-pink-700 tracking-wide">ยืนยันผู้ชนะ</Dialog.Title>
              <Dialog.Description className="text-gray-700 text-base text-center">
                คุณต้องการเลือก <span className="font-bold text-green-700">{confirmModal?.winner?.characterName}</span> เป็นผู้ชนะหรือไม่?
              </Dialog.Description>
            </div>
            <div className="flex gap-2 justify-end w-full mt-2">
              <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition font-semibold shadow flex items-center gap-1" onClick={() => setConfirmModal(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#a1a1aa" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ยกเลิก
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-400 to-pink-400 text-white font-bold shadow flex items-center gap-1 hover:from-green-500 hover:to-pink-500 transition"
                onClick={() => {
                  if (confirmModal?.matchId && confirmModal?.winner) {
                    onSelectWinner(confirmModal.matchId, confirmModal.winner);
                  }
                  setConfirmModal(null);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#fff" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                ยืนยัน
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}

export const BracketTree: React.FC<BracketTreeProps> = ({ matches, isGuildLeader, onSelectWinner }) => {
  if (!matches || matches.length === 0) return null;
  // ตรวจสอบว่าเป็น double elimination หรือ single elimination
  const isDouble = matches.some(m => m.bracket);
  if (!isDouble) {
    // Single elimination: ใช้ฟังก์ชันย่อย render tree เดิม
    return <RenderBracketTree matches={matches} isGuildLeader={isGuildLeader} onSelectWinner={onSelectWinner} />;
  }
  // Double elimination: แยกสายบน/สายล่าง/รอบชิง
  const winnerMatches = matches.filter(m => m.bracket === 'A');
  const loserMatches = matches.filter(m => m.bracket === 'B');
  const finalMatches = matches.filter(m => m.bracket === 'final');

  // ใช้ flex column ต่อกัน ไม่ใช้ absolute
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 32 }}>
      <RenderBracketTree matches={winnerMatches} isGuildLeader={isGuildLeader} onSelectWinner={onSelectWinner} title="สายบน (Winner Bracket)" />
      <RenderBracketTree matches={loserMatches} isGuildLeader={isGuildLeader} onSelectWinner={onSelectWinner} title="สายล่าง (Loser Bracket)" />
      <RenderBracketTree matches={finalMatches} isGuildLeader={isGuildLeader} onSelectWinner={onSelectWinner} title="รอบชิงชนะเลิศ (Grand Final)" />
    </div>
  );
}; 