import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { simulateGame, SimPlayer } from "@/lib/gameEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. 요청에서 round가 있는지 확인 (Admin 수동 실행용)
    let { round } = await req.json().catch(() => ({}));

    // 2. round가 없으면(자동 실행), DB에서 '진행 안 된 첫 번째 라운드' 찾기
    if (!round) {
      const { data: nextMatch } = await supabase
        .from("matches")
        .select("round_no")
        .eq("is_played", false)
        .order("round_no", { ascending: true })
        .limit(1)
        .single();

      if (nextMatch) {
        round = nextMatch.round_no;
      } else {
        return NextResponse.json({ message: "모든 경기가 종료되었습니다." });
      }
    }
    
    // 1. 현재 라운드의 '진행되지 않은' 경기들 가져오기
    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("round_no", round)
      .eq("is_played", false);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: "진행할 경기가 없습니다 (이미 완료되었거나 일정 없음)." });
    }

    const resultsToUpdate = [];
    const standingsUpdates: Record<string, { w: number; l: number; d: number }> = {};

    // 2. 경기 시뮬레이션
    for (const match of matches) {
      // 라인업 가져오기 (헬퍼 함수 사용)
      const homeLineup = await getTeamLineup(match.home_user_id);
      const awayLineup = await getTeamLineup(match.away_user_id);

      // 시뮬레이션
      const result = simulateGame(
        homeLineup.batters, homeLineup.pitchers,
        awayLineup.batters, awayLineup.pitchers
      );

      // 업데이트할 데이터 준비
      resultsToUpdate.push({
        id: match.id,

        league_id: match.league_id,
        round_no: match.round_no, 
        home_user_id: match.home_user_id,
        away_user_id: match.away_user_id,
        
        home_score: result.homeScore,
        away_score: result.awayScore,
        result_data: result,
        is_played: true
      });

      // 순위 집계 데이터 준비
      const homeId = match.home_user_id;
      const awayId = match.away_user_id;
      
      if (!standingsUpdates[homeId]) standingsUpdates[homeId] = { w: 0, l: 0, d: 0 };
      if (!standingsUpdates[awayId]) standingsUpdates[awayId] = { w: 0, l: 0, d: 0 };

      if (result.winner === 'HOME') {
        standingsUpdates[homeId].w++;
        standingsUpdates[awayId].l++;
      } else if (result.winner === 'AWAY') {
        standingsUpdates[awayId].w++;
        standingsUpdates[homeId].l++;
      } else {
        standingsUpdates[homeId].d++;
        standingsUpdates[awayId].d++;
      }
    }

    // 3. 경기 결과 DB 저장 (Upsert)
    if (resultsToUpdate.length > 0) {
      const { error } = await supabase.from("matches").upsert(resultsToUpdate);
      if (error) throw error;
    }

    // 4. 순위표 업데이트
    for (const userId in standingsUpdates) {
      const stat = standingsUpdates[userId];
      await supabase.rpc("update_standings_simple", {
        p_user_id: userId,
        p_win: stat.w,
        p_loss: stat.l,
        p_draw: stat.d
      });
    }

    // 5. 선수 성장 로직 실행 (Process Growth)
    
    const growthPromises = matches.map((match) => 
      supabase.rpc("process_match_growth", { match_id_input: match.id })
    );

    await Promise.all(growthPromises);

    return NextResponse.json({ success: true, played: resultsToUpdate.length });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// [Helper] 라인업 가져오기 (이전과 동일하지만 SimPlayer 변환 로직 포함)
async function getTeamLineup(userId: string) {
  const { data } = await supabase
    .from("user_lineup")
    .select(`lineup_type, players (id, name, stat_1, stat_2, stat_3)`)
    .eq("user_id", userId);

  const batters: SimPlayer[] = [];
  const pitchers: SimPlayer[] = [];

  if (data) {
    data.forEach((item: any) => {
      const p: SimPlayer = {
        id: item.players.id,
        name: item.players.name,
        contact: item.players.stat_2, power: item.players.stat_1, speed: item.players.stat_3,
        stuff: item.players.stat_1, control: item.players.stat_2, breaking: item.players.stat_3,
        isPitcher: ["SP", "RP", "CP"].includes(item.lineup_type),
        position: item.lineup_type
      };
      if (item.lineup_type === "BATTER") batters.push(p);
      else if (["SP", "RP", "CP"].includes(item.lineup_type)) pitchers.push(p);
    });
  }
  
  // 라인업이 비어있으면 더미 데이터라도 채워야 에러 안 남 (생략)
  return { batters, pitchers };
}