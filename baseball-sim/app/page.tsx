"use client";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./providers/AuthProvider";
import { useState } from "react";
import { getPlayerImageUrl } from "@/lib/utils";

// 스카우트 결과 표시용 타입
type ScoutResult = {
  id: number;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  overall: number;
  birth_year: number;
};

export default function Home() {
  const { session, refreshProfile } = useAuth();
  const [scoutedPlayer, setScoutedPlayer] = useState<ScoutResult | null>(null);
  const [isScouting, setIsScouting] = useState(false);

  const handleLogin = async () => {
    const email = prompt("이메일 입력");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("로그인 이메일이 전송되었습니다!");
  };

  const handleScout = async () => {
    if (!session) return alert("로그인이 필요합니다.");
    
    setIsScouting(true);
    setScoutedPlayer(null); // 이전 결과 초기화

    try {
      // 1. 스카우트 실행 (ID 반환)
      const { data: newPlayerId, error } = await supabase.rpc("scout_player", { user_id: session.user.id });
      
      if (error) throw error;

      // 2. 반환된 ID로 선수 상세 정보 조회
      const { data: playerData, error: fetchError } = await supabase
        .from("players")
        .select("*")
        .eq("id", newPlayerId)
        .single();

      if (fetchError) throw fetchError;

      // 3. 결과 표시 및 코인 갱신
      setScoutedPlayer(playerData);
      refreshProfile();

    } catch (err: any) {
      alert("스카우트 실패: " + err.message);
    } finally {
      setIsScouting(false);
    }
  };

  return (
    <div className="text-center py-10">
      <h1 className="text-4xl font-bold mb-6">⚾ Baseball Sim</h1>
      
      {!session ? (
        <button onClick={handleLogin} className="bg-blue-600 text-white px-6 py-3 rounded-lg">
          게임 시작하기 (로그인)
        </button>
      ) : (
        <div className="space-y-8">
          
          {/* 스카우트 버튼 영역 */}
          <div>
            <p className="text-xl mb-4">새로운 유망주를 영입하세요!</p>
            <button 
              onClick={handleScout} 
              disabled={isScouting}
              className={`px-8 py-4 rounded-xl text-lg font-bold shadow-lg transition text-white
                ${isScouting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
              `}
            >
              {isScouting ? "계약 진행 중..." : "선수 영입하기 (100 G)"}
            </button>
          </div>

          {scoutedPlayer && (
  <div className="mt-8 animate-fade-in-up flex justify-center">
    <div className="bg-white border-4 border-yellow-400 rounded-xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden">
      {/* 카드 상단 장식 */}
      <div className="absolute top-0 left-0 w-full h-3 bg-yellow-400"></div>
      
      <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-4 text-center">
        Scout Report
      </h3>

      {/* [추가됨] 선수 이미지 영역 */}
      <div className="flex justify-center mb-4">
        <div className="w-32 h-32 rounded-full border-4 border-blue-100 overflow-hidden bg-gray-50 shadow-inner">
          {/* newPlayerId는 handleScout 함수 내부에 있어서 접근이 어려울 수 있으니, 
              scoutedPlayer 객체에 id를 포함시키거나, 
              방금 생성된 선수라면 DB조회 결과인 scoutedPlayer.id를 사용해야 합니다.
              
              *주의: page.tsx의 handleScout 함수에서 
              setScoutedPlayer(playerData) 할 때 playerData에 id가 포함되어 있어야 합니다.
          */}
          <img 
            src={getPlayerImageUrl(scoutedPlayer.id)} 
            alt="선수 이미지"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="text-3xl font-extrabold text-gray-800 mb-2 text-center">
        {scoutedPlayer.name}
      </div>
      
      <div className="flex justify-center items-center gap-4 my-4 bg-gray-50 p-4 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-400 font-bold">POS</div>
          <div className="text-xl font-bold text-blue-600">
            {scoutedPlayer.primary_position}
            {scoutedPlayer.secondary_position && <span className="text-sm text-gray-400">/{scoutedPlayer.secondary_position}</span>}
          </div>
        </div>
        <div className="w-px h-8 bg-gray-300"></div>
        <div className="text-center">
          <div className="text-xs text-gray-400 font-bold">OVR</div>
          <div className="text-2xl font-black text-red-600">{scoutedPlayer.overall}</div>
        </div>
        <div className="w-px h-8 bg-gray-300"></div>
        <div className="text-center">
          <div className="text-xs text-gray-400 font-bold">AGE</div>
          <div className="text-lg font-bold text-gray-600">{new Date().getFullYear() - scoutedPlayer.birth_year}</div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 font-medium">
        "구단의 미래를 책임질 유망주입니다!"
      </div>
    </div>
  </div>
)}

        </div>
      )}
    </div>
  );
}