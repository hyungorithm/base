"use client";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./providers/AuthProvider";
import { useState } from "react";
import PlayerCardModal from "@/app/components/PlayerCardModal";
import { PlayerCardData } from "@/app/components/PlayerCard"; 

export default function Home() {
  const { session, refreshProfile } = useAuth();
  const [scoutedPlayer, setScoutedPlayer] = useState<PlayerCardData | null>(null);
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

  // [추가] 포지션에 따른 스탯 라벨 결정 헬퍼
  const getStatLabels = (pos: string) => {
    const isPitcher = ["SP", "RP", "CP", "P"].includes(pos);
    if (isPitcher) {
      return ["구위", "제구", "변화"];
    }
    return ["파워", "컨택", "주루"];
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

          <PlayerCardModal 
            isOpen={!!scoutedPlayer} 
            onClose={() => setScoutedPlayer(null)} 
            player={scoutedPlayer}
            title="Scout Report"
          />
          
          {/* 스카우트 완료 메시지 (모달이 닫히면 보임) */}
          {scoutedPlayer && (
            <div className="text-gray-500 mt-4">
              방금 영입한 선수를 확인하려면 <br/> 
              <button onClick={() => setScoutedPlayer(scoutedPlayer)} className="text-blue-500 underline">
                다시 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}