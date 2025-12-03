"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [currentRound, setCurrentRound] = useState(1); // 현재 라운드 추적

  // 1. 새 시즌 시작 (DB 함수 호출)
  const startSeason = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("start_new_season");
      if (error) throw error;
      
      alert(data); // "시즌 X 시작됨..." 메시지 출력
      setLog("시즌 생성 완료. 라운드를 1로 초기화합니다.");
      setCurrentRound(1);
    } catch (e: any) {
      alert("에러: " + e.message);
      setLog(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. 라운드 진행 (API 호출)
  const playRound = async () => {
    setLoading(true);
    try {
      // API 호출 (우리가 만든 play-round)
      const res = await fetch("/api/league/play-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: currentRound }),
      });
      
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || "API 에러");

      setLog(`[Round ${currentRound}] 결과:\n` + JSON.stringify(json, null, 2));
      
      // 성공하면 다음 라운드로 숫자 올림
      if (json.success) {
        setCurrentRound((prev) => prev + 1);
      }
      
    } catch (e: any) {
      alert("진행 실패: " + e.message);
      setLog(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🛠️ 관리자 패널</h1>
      
      <div className="space-y-6">
        {/* 섹션 1: 시즌 관리 */}
        <div className="bg-white p-6 rounded-xl shadow border">
          <h2 className="font-bold text-lg mb-4">1. 시즌 초기화</h2>
          <p className="text-sm text-gray-500 mb-4">
            모든 유저를 8명씩 묶어 리그를 만들고, 133라운드 스케줄을 생성합니다.
            (최소 8명의 유저가 필요합니다)
          </p>
          <button 
            onClick={startSeason} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold w-full disabled:opacity-50"
          >
            새 시즌 시작하기
          </button>
        </div>

        {/* 섹션 2: 리그 진행 */}
        <div className="bg-white p-6 rounded-xl shadow border">
          <h2 className="font-bold text-lg mb-4">2. 리그 시뮬레이션</h2>
          <div className="flex items-center gap-4 mb-4">
            <span className="font-bold text-gray-700">진행할 라운드:</span>
            <input 
              type="number" 
              value={currentRound}
              onChange={(e) => setCurrentRound(Number(e.target.value))}
              className="border p-2 rounded w-20 text-center font-bold"
            />
            <span className="text-gray-400 text-sm">/ 133</span>
          </div>
          
          <button 
            onClick={playRound} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold w-full disabled:opacity-50"
          >
            {loading ? "경기 진행 중..." : `Round ${currentRound} 경기 시작`}
          </button>
        </div>

        {/* 로그 창 */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-xl overflow-auto h-64 font-mono text-xs">
          {log || "대기 중..."}
        </div>
      </div>
    </div>
  );
}