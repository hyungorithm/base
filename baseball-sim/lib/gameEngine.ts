// =================================================================
// 타입 정의
// =================================================================
export type SimPlayer = {
  id: number;
  name: string;
  // 타자 스탯
  contact: number;
  power: number;
  speed: number;
  // 투수 스탯
  stuff: number;
  control: number;
  breaking: number;
  
  isPitcher: boolean;
  position: string; // SP, RP, CP, BATTER
};

// 박스스코어용 스탯
export type PlayerStats = {
  // 타자
  ab: number; // 타수
  h: number;  // 안타
  hr: number; // 홈런
  rbi: number;// 타점
  r: number;  // 득점
  bb: number; // 볼넷
  so: number; // 삼진
  
  // 투수
  ip: number; // 이닝 (아웃카운트 단위로 저장 후 /3 변환)
  er: number; // 자책점
  k: number;  // 탈삼진
};

export type GameLog = {
  inning: number;
  isTop: boolean;
  batterName: string;
  pitcherName: string;
  result: string;
  description: string;
};

export type GameResult = {
  homeScore: number;
  awayScore: number;
  logs: GameLog[];
  winner: 'HOME' | 'AWAY' | 'DRAW';
  // 선수 ID를 키로 하는 스탯 맵
  stats: Record<number, PlayerStats>;
};

// =================================================================
// 1. 타석 결과 계산기 (The Duel)
// =================================================================
function calculateAtBatResult(batter: SimPlayer, pitcher: SimPlayer) {
  const contactRatio = batter.contact / (pitcher.control || 1); 
  const powerRatio = batter.power / (pitcher.stuff || 1);

  const roll = Math.floor(Math.random() * 1000);

  // 안타/볼넷 확률 임계값
  let hitThreshold = 250 * Math.sqrt(contactRatio); 
  let walkThreshold = 80 / Math.sqrt(pitcher.control / 50); 

  if (roll < hitThreshold) {
    const typeRoll = Math.random();
    const hrChance = 0.10 * powerRatio; 
    
    if (typeRoll < hrChance) return "HOMERUN";
    if (typeRoll < hrChance + 0.05) return "TRIPLE";
    if (typeRoll < hrChance + 0.20 * powerRatio) return "DOUBLE";
    return "SINGLE";
  } 
  
  if (roll < hitThreshold + walkThreshold) return "WALK";

  const strikeoutChance = 0.20 * (pitcher.stuff / (batter.contact || 1));
  if (Math.random() < strikeoutChance) return "STRIKEOUT";
  
  return "OUT";
}

// =================================================================
// 2. 게임 진행 루프 (The Loop)
// =================================================================
export function simulateGame(
  homeBatters: SimPlayer[], homePitchers: SimPlayer[],
  awayBatters: SimPlayer[], awayPitchers: SimPlayer[]
): GameResult {
  
  let homeScore = 0;
  let awayScore = 0;
  let logs: GameLog[] = [];
  
  // 스탯 초기화
  const stats: Record<number, PlayerStats> = {};
  const allPlayers = [...homeBatters, ...homePitchers, ...awayBatters, ...awayPitchers];
  
  allPlayers.forEach(p => {
    stats[p.id] = { ab: 0, h: 0, hr: 0, rbi: 0, r: 0, bb: 0, so: 0, ip: 0, er: 0, k: 0 };
  });

  let homeIdx = 0;
  let awayIdx = 0;

  // 투수 선택 함수 (단순 로직: 1~6회 선발, 7~8회 계투, 9회 마무리)
  const getPitcher = (pitchers: SimPlayer[], inning: number) => {
    if (inning <= 6) return pitchers.find(p => p.position === 'SP') || pitchers[0];
    if (inning <= 8) return pitchers.find(p => p.position === 'RP') || pitchers[0];
    return pitchers.find(p => p.position === 'CP') || pitchers[0];
  };

  for (let inning = 1; inning <= 9; inning++) {
    
    // --- [초] 원정팀 공격 (홈 투수 등판) ---
    const homePitcher = getPitcher(homePitchers, inning);
    let outs = 0;
    // 베이스: 이제 boolean이 아니라 선수 객체(또는 null)를 담음
    let bases: (SimPlayer | null)[] = [null, null, null]; 

    while (outs < 3) {
      const batter = awayBatters[awayIdx];
      const result = calculateAtBatResult(batter, homePitcher);
      
      // 스탯 기록: 타석(AB) 증가 (볼넷은 타수 제외)
      if (result !== "WALK") stats[batter.id].ab++;

      // 플레이 처리
      const playRes = processPlay(result, bases, batter);
      
      // 점수 및 스탯 반영
      awayScore += playRes.runs;
      stats[homePitcher.id].er += playRes.runs; // 투수 자책점
      stats[batter.id].rbi += playRes.runs;     // 타자 타점
      
      // 득점자(주자) 득점 기록
      playRes.scorers.forEach(scorer => {
        stats[scorer.id].r++;
      });

      // 안타/홈런/볼넷/삼진 기록
      if (["SINGLE", "DOUBLE", "TRIPLE", "HOMERUN"].includes(result)) stats[batter.id].h++;
      if (result === "HOMERUN") stats[batter.id].hr++;
      if (result === "WALK") stats[batter.id].bb++;
      if (result === "STRIKEOUT") {
        stats[batter.id].so++;
        stats[homePitcher.id].k++;
      }

      // 아웃 카운트 처리
      if (playRes.isOut) {
        outs++;
        stats[homePitcher.id].ip++; // 아웃 하나당 1/3 이닝
      }

      bases = playRes.newBases;
      
      logs.push({
        inning, isTop: true, batterName: batter.name, pitcherName: homePitcher.name,
        result, description: playRes.desc
      });

      if (!playRes.isOut || result === "WALK") {
         // 출루했거나 안타면 다음 타자로 넘어감 (아웃이어도 넘어가지만 로직상 구분)
      }
      awayIdx = (awayIdx + 1) % 9;
    }

    if (inning === 9 && homeScore > awayScore) break;

    // --- [말] 홈팀 공격 (원정 투수 등판) ---
    const awayPitcher = getPitcher(awayPitchers, inning);
    outs = 0;
    bases = [null, null, null];

    while (outs < 3) {
      const batter = homeBatters[homeIdx];
      const result = calculateAtBatResult(batter, awayPitcher);

      if (result !== "WALK") stats[batter.id].ab++;

      const playRes = processPlay(result, bases, batter);
      
      homeScore += playRes.runs;
      stats[awayPitcher.id].er += playRes.runs;
      stats[batter.id].rbi += playRes.runs;
      
      playRes.scorers.forEach(scorer => stats[scorer.id].r++);

      if (["SINGLE", "DOUBLE", "TRIPLE", "HOMERUN"].includes(result)) stats[batter.id].h++;
      if (result === "HOMERUN") stats[batter.id].hr++;
      if (result === "WALK") stats[batter.id].bb++;
      if (result === "STRIKEOUT") {
        stats[batter.id].so++;
        stats[awayPitcher.id].k++;
      }

      if (playRes.isOut) {
        outs++;
        stats[awayPitcher.id].ip++;
      }

      bases = playRes.newBases;

      logs.push({
        inning, isTop: false, batterName: batter.name, pitcherName: awayPitcher.name,
        result, description: playRes.desc
      });

      if (inning === 9 && homeScore > awayScore) break; // 끝내기

      homeIdx = (homeIdx + 1) % 9;
    }
  }

  return {
    homeScore, awayScore, logs, stats,
    winner: homeScore > awayScore ? 'HOME' : homeScore < awayScore ? 'AWAY' : 'DRAW'
  };
}

// =================================================================
// 3. 베이스러닝 로직 (누가 들어왔는지 추적)
// =================================================================
function processPlay(result: string, bases: (SimPlayer | null)[], batter: SimPlayer) {
  let runs = 0;
  let newBases = [...bases];
  let isOut = false;
  let desc = "";
  let scorers: SimPlayer[] = []; // 득점한 선수들 목록

  switch (result) {
    case "HOMERUN":
      scorers = [...newBases.filter((p): p is SimPlayer => p !== null), batter];
      runs = scorers.length;
      newBases = [null, null, null];
      desc = `${batter.name}: 홈런! (${runs}점)`;
      break;

    case "TRIPLE":
      scorers = newBases.filter((p): p is SimPlayer => p !== null);
      runs = scorers.length;
      newBases = [null, null, batter];
      desc = `${batter.name}: 3루타!`;
      break;

    case "DOUBLE":
      if (newBases[2]) scorers.push(newBases[2]!);
      if (newBases[1]) scorers.push(newBases[1]!);
      if (newBases[0]) { newBases[2] = newBases[0]; newBases[0] = null; } // 1루주자 3루로
      newBases[1] = batter;
      runs = scorers.length;
      desc = `${batter.name}: 2루타!`;
      break;

    case "SINGLE":
      if (newBases[2]) { scorers.push(newBases[2]!); newBases[2] = null; }
      if (newBases[1]) {
        // 50% 확률로 득점
        if (Math.random() > 0.5) { scorers.push(newBases[1]!); newBases[1] = null; }
        else { newBases[2] = newBases[1]; newBases[1] = null; }
      }
      if (newBases[0]) { newBases[1] = newBases[0]; }
      newBases[0] = batter;
      runs = scorers.length;
      desc = `${batter.name}: 안타`;
      break;

    case "WALK":
      if (newBases[0]) {
        if (newBases[1]) {
          if (newBases[2]) { scorers.push(newBases[2]!); runs++; }
          newBases[2] = newBases[1];
        }
        newBases[1] = newBases[0];
      }
      newBases[0] = batter;
      desc = `${batter.name}: 볼넷 출루`;
      break;

    case "STRIKEOUT":
      isOut = true;
      desc = `${batter.name}: 삼진 아웃`;
      break;

    default: // OUT
      isOut = true;
      desc = `${batter.name}: 아웃`;
      break;
  }

  return { runs, newBases, isOut, desc, scorers };
}