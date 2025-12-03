"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import { simulateGame, SimPlayer, GameResult, PlayerStats } from "@/lib/gameEngine";

export default function SimulationPage() {
  const { session } = useAuth();
  
  // 라인업 상태
  const [batters, setBatters] = useState<SimPlayer[]>([]);
  const [pitchers, setPitchers] = useState<SimPlayer[]>([]);
  
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [loading, setLoading] = useState(false);

  // 데이터 불러오기
  const fetchRoster = async () => {
    if (!session) return;
    
    const { data } = await supabase
      .from("user_lineup")
      .select(`
        lineup_type, order_no,
        players (id, name, stat_1, stat_2, stat_3)
      `)
      .eq("user_id", session.user.id)
      .order("order_no", { ascending: true });

    if (data) {
      const b: SimPlayer[] = [];
      const p: SimPlayer[] = [];

      data.forEach((item: any) => {
        const player: SimPlayer = {
          id: item.players.id,
          name: item.players.name,
          contact: item.players.stat_2,
          power: item.players.stat_1,
          speed: item.players.stat_3,
          stuff: item.players.stat_1,
          control: item.players.stat_2,
          breaking: item.players.stat_3,
          isPitcher: ["SP", "RP", "CP"].includes(item.lineup_type),
          position: item.lineup_type
        };

        if (item.lineup_type === "BATTER") b.push(player);
        else if (["SP", "RP", "CP"].includes(item.lineup_type)) p.push(player);
      });

      setBatters(b);
      setPitchers(p);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [session]);

  const handleSimulate = () => {
    if (batters.length < 9 || pitchers.length < 1) {
      alert("라인업이 불완전합니다.");
      return;
    }
    setLoading(true);
    
    // 청백전: 내 라인업 vs 내 라인업 (ID가 겹치면 키 충돌 나므로 원정팀 ID는 임시 변경)
    const awayBatters = batters.map(p => ({ ...p, id: p.id + 10000, name: p.name + "(B)" }));
    const awayPitchers = pitchers.map(p => ({ ...p, id: p.id + 10000, name: p.name + "(B)" }));

    const result = simulateGame(batters, pitchers, awayBatters, awayPitchers);
    setGameResult(result);
    setLoading(false);
  };

  // 박스스코어 렌더링 헬퍼
  const renderBoxScore = (players: SimPlayer[], stats: Record<number, PlayerStats>, isPitcherTable = false) => {
    return (
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2">이름</th>
            {isPitcherTable ? (
              <>
                <th className="p-2">이닝</th>
                <th className="p-2">실점</th>
                <th className="p-2">삼진</th>
              </>
            ) : (
              <>
                <th className="p-2">타수</th>
                <th className="p-2">안타</th>
                <th className="p-2">홈런</th>
                <th className="p-2">타점</th>
                <th className="p-2">득점</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {players.map(p => {
            const s = stats[p.id];
            if (!s) return null;
            // 투수 테이블인데 투구 기록 없으면(등판 안함) 숨김
            if (isPitcherTable && s.ip === 0 && s.er === 0 && s.k === 0) return null;

            return (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-2 font-medium">{p.name}</td>
                {isPitcherTable ? (
                  <>
                    <td className="p-2">{Math.floor(s.ip / 3)}.{s.ip % 3}</td>
                    <td className="p-2">{s.er}</td>
                    <td className="p-2">{s.k}</td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{s.ab}</td>
                    <td className="p-2 font-bold text-blue-600">{s.h}</td>
                    <td className="p-2">{s.hr > 0 ? <span className="text-red-500 font-bold">{s.hr}</span> : 0}</td>
                    <td className="p-2">{s.rbi}</td>
                    <td className="p-2">{s.r}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  if (!session) return <div className="p-10">로그인이 필요합니다.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20">
      <h1 className="text-3xl font-bold mb-6">⚾ 매치 시뮬레이터</h1>

      <div className="bg-white p-6 rounded-xl shadow-md border mb-8 text-center">
        <p className="mb-4 text-gray-600">내 라인업으로 청백전을 진행합니다.</p>
        <button
          onClick={handleSimulate}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition"
        >
          {loading ? "경기 진행 중..." : "경기 시작 (Simulate)"}
        </button>
      </div>

      {gameResult && (
        <div className="animate-fade-in-up space-y-8">
          {/* 1. 스코어보드 */}
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
            <div className="text-center w-1/3">
              <div className="text-gray-400 text-sm">HOME</div>
              <div className="text-5xl font-bold text-yellow-400">{gameResult.homeScore}</div>
            </div>
            <div className="text-2xl font-bold text-gray-500">VS</div>
            <div className="text-center w-1/3">
              <div className="text-gray-400 text-sm">AWAY</div>
              <div className="text-5xl font-bold text-yellow-400">{gameResult.awayScore}</div>
            </div>
          </div>

          {/* 2. 박스스코어 (홈/원정 탭 없이 한눈에) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 홈팀 기록 */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-blue-50 p-3 font-bold border-b text-blue-800">HOME 타자 기록</div>
              {renderBoxScore(batters, gameResult.stats)}
              <div className="bg-blue-50 p-3 font-bold border-b border-t text-blue-800">HOME 투수 기록</div>
              {renderBoxScore(pitchers, gameResult.stats, true)}
            </div>

            {/* 원정팀 기록 */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-red-50 p-3 font-bold border-b text-red-800">AWAY 타자 기록</div>
              {/* 원정팀은 ID가 변경되었으므로 매핑된 배열 사용 */}
              {renderBoxScore(
                batters.map(p => ({ ...p, id: p.id + 10000, name: p.name + "(B)" })), 
                gameResult.stats
              )}
              <div className="bg-red-50 p-3 font-bold border-b border-t text-red-800">AWAY 투수 기록</div>
              {renderBoxScore(
                pitchers.map(p => ({ ...p, id: p.id + 10000, name: p.name + "(B)" })), 
                gameResult.stats, true
              )}
            </div>
          </div>

          {/* 3. 경기 로그 */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-100 p-3 font-bold border-b">경기 중계 로그</div>
            <div className="h-64 overflow-y-auto p-4 space-y-2 bg-gray-50 text-sm">
              {gameResult.logs.map((log, idx) => (
                <div key={idx} className="flex gap-3 border-b pb-1 last:border-0">
                  <span className="w-12 font-mono text-gray-500 font-bold flex-shrink-0">
                    {log.inning}{log.isTop ? "초" : "말"}
                  </span>
                  <span className={`font-bold ${log.result === 'HOMERUN' ? 'text-red-600' : 'text-gray-800'}`}>
                    {log.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}