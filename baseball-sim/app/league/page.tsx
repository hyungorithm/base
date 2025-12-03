"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";

type RankingItem = {
  league_id: number;
  user_id: string;
  team_name: string;
  wins: number;
  draws: number;
  losses: number;
  games_played: number;
  win_rate: number;
};

export default function LeaguePage() {
  const { session } = useAuth();
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [leagueName, setLeagueName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeagueData = async () => {
      if (!session) return;

      try {
        // 1. 내가 속한 리그 찾기 (현재 활성 시즌 기준)
        // (복잡한 조인 대신, 가장 최근에 생성된 standings 기록을 가져오는 방식으로 단순화)
        const { data: myStanding, error: standingError } = await supabase
          .from("league_standings")
          .select("league_id, leagues(name, tier)")
          .eq("user_id", session.user.id)
          .order("id", { ascending: false }) // 가장 최근 기록
          .limit(1)
          .single();

        if (standingError || !myStanding) {
          console.log("소속된 리그가 없습니다.");
          setLoading(false);
          return;
        }

        // 리그 이름 세팅
        // @ts-ignore (Supabase 조인 타입 추론이 가끔 꼬일 때가 있어 무시 처리)
        setLeagueName(myStanding.leagues?.name || "Unknown League");

        // 2. 해당 리그의 순위표 가져오기 (View 조회)
        const { data: rankData, error: rankError } = await supabase
          .from("league_rankings_view")
          .select("*")
          .eq("league_id", myStanding.league_id)
          .order("win_rate", { ascending: false }) // 승률순
          .order("wins", { ascending: false });    // 다승순

        if (rankData) {
          setRankings(rankData);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueData();
  }, [session]);

  if (!session) return <div className="p-10">로그인이 필요합니다.</div>;
  if (loading) return <div className="p-10">리그 정보를 불러오는 중...</div>;

  if (rankings.length === 0) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold mb-4">소속된 리그가 없습니다.</h2>
        <p className="text-gray-500">새 시즌이 시작되기를 기다려주세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20">
      {/* 리그 헤더 */}
      <div className="bg-slate-900 text-white p-6 rounded-t-xl shadow-lg flex justify-between items-end">
        <div>
          <span className="text-yellow-400 font-bold text-sm tracking-wider">CURRENT SEASON</span>
          <h1 className="text-3xl font-bold mt-1">{leagueName}</h1>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">총 참가팀</div>
          <div className="text-2xl font-bold">{rankings.length}팀</div>
        </div>
      </div>

      {/* 순위표 */}
      <div className="bg-white border-x border-b rounded-b-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider border-b">
              <th className="p-4 text-center w-16">순위</th>
              <th className="p-4">구단명</th>
              <th className="p-4 text-center">경기</th>
              <th className="p-4 text-center text-blue-600">승</th>
              <th className="p-4 text-center text-gray-500">무</th>
              <th className="p-4 text-center text-red-600">패</th>
              <th className="p-4 text-center font-bold">승률</th>
              <th className="p-4 text-center text-gray-400">게임차</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((team, index) => {
              const isMyTeam = team.user_id === session.user.id;
              
              // 게임차 계산 (1위 팀과의 승수 차이 * 0.5 + 패수 차이 * 0.5)
              // 야구 공식: ((1위승 - 내승) + (내패 - 1위패)) / 2
              const firstPlace = rankings[0];
              const gamesBehind = index === 0 ? "-" : 
                ((firstPlace.wins - team.wins) + (team.losses - firstPlace.losses)) / 2.0;

              return (
                <tr 
                  key={team.user_id} 
                  className={`border-b last:border-0 hover:bg-gray-50 transition
                    ${isMyTeam ? "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-400" : ""}
                  `}
                >
                  <td className="p-4 text-center font-bold text-gray-700">
                    {index + 1}
                  </td>
                  <td className="p-4 font-medium flex items-center gap-2">
                    {/* 팀명 (이메일 앞부분만 잘라서 보여주기) */}
                    <span>{team.team_name?.split("@")[0] || "Unknown"}</span>
                    {isMyTeam && <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold">ME</span>}
                  </td>
                  <td className="p-4 text-center text-gray-600">{team.games_played}</td>
                  <td className="p-4 text-center font-bold text-blue-600">{team.wins}</td>
                  <td className="p-4 text-center text-gray-500">{team.draws}</td>
                  <td className="p-4 text-center text-red-600">{team.losses}</td>
                  <td className="p-4 text-center font-mono font-bold text-lg">
                    {team.win_rate.toFixed(3)}
                  </td>
                  <td className="p-4 text-center text-gray-400 text-sm">
                    {gamesBehind}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 하단 설명 */}
      <div className="mt-4 text-xs text-gray-400 text-right">
        * 승률 = 승 / (승 + 패) (무승부 제외) <br/>
        * 순위 산정 기준: 승률 {'>'} 다승 {'>'} 승자승
      </div>
    </div>
  );
}