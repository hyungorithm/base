"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import PlayerCard, { PlayerCardData } from "@/app/components/PlayerCard"; // PlayerCard import
import { getPlayerImageUrl } from "@/lib/utils";

export default function ScoutPage() {
  const { session, profile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [scoutResults, setScoutResults] = useState<PlayerCardData[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // 유저 스카우트 상태
  const [welcomeUsed, setWelcomeUsed] = useState(true);
  const [dailyUsed, setDailyUsed] = useState(true);

  // 상태 확인
  useEffect(() => {
    const checkStatus = async () => {
      if (!session) return;
      const { data } = await supabase
        .from("user_profile")
        .select("welcome_scout_used, last_daily_scout_at")
        .eq("user_id", session.user.id)
        .single();
      
      if (data) {
        setWelcomeUsed(data.welcome_scout_used);
        
        // 데일리 사용 여부 체크 (UTC 기준 오늘 날짜와 비교)
        const lastDate = data.last_daily_scout_at ? new Date(data.last_daily_scout_at).toDateString() : "";
        const today = new Date().toDateString();
        setDailyUsed(lastDate === today);
      }
    };
    checkStatus();
  }, [session, loading]); // loading이 끝나면 상태 다시 체크

  const handleScout = async (type: string) => {
    if (!session) return;
    if (!confirm(`${type} 스카우트를 진행하시겠습니까?`)) return;

    setLoading(true);
    try {
      // 1. RPC 호출
      const { data: playerIds, error } = await supabase.rpc("perform_scout", {
        p_user_id: session.user.id,
        p_scout_type: type
      });

      if (error) throw error;

      // 2. 생성된 선수 정보 조회
      const { data: players, error: fetchError } = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);

      if (fetchError) throw fetchError;

      // 3. 결과 표시
      setScoutResults(players);
      setShowResultModal(true);
      refreshProfile(); // 코인 갱신

    } catch (e: any) {
      alert("스카우트 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <div className="p-10">로그인이 필요합니다.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 pb-20">
      <h1 className="text-3xl font-bold mb-2">스카우트 센터</h1>
      <p className="text-gray-500 mb-8">최고의 선수를 영입하여 구단을 강화하세요!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. 환영 스카우트 */}
        {!welcomeUsed && (
          <div className="bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-orange-300 rounded-xl p-6 shadow-lg relative overflow-hidden group hover:scale-105 transition">
            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-bl">1회 한정</div>
            <h3 className="text-xl font-black text-orange-800 mb-2">환영 스카우트</h3>
            <p className="text-sm text-orange-700 mb-4 h-10">
              투수 1명 + 타자 1명 확정 지급! <br/>
              <span className="font-bold">RARE 등급 보장!</span>
            </p>
            <div className="text-2xl font-bold text-gray-800 mb-4">무료</div>
            <button 
              onClick={() => handleScout('WELCOME')}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow"
            >
              영입하기
            </button>
          </div>
        )}

        {/* 2. 데일리 스카우트 */}
        <div className={`border-2 rounded-xl p-6 shadow-md relative overflow-hidden transition
          ${dailyUsed ? 'bg-gray-100 border-gray-200' : 'bg-green-50 border-green-300 hover:scale-105'}
        `}>
          <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-bl">매일 1회</div>
          <h3 className="text-xl font-black text-green-800 mb-2">데일리 스카우트</h3>
          <p className="text-sm text-green-700 mb-4 h-10">
            매일 찾아오는 행운의 기회!<br/>
            STAR 등급 획득 가능
          </p>
          <div className="text-2xl font-bold text-gray-800 mb-4">무료</div>
          <button 
            onClick={() => handleScout('DAILY')}
            disabled={loading || dailyUsed}
            className={`w-full font-bold py-3 rounded-lg shadow
              ${dailyUsed ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
            `}
          >
            {dailyUsed ? "내일 다시" : "영입하기"}
          </button>
        </div>

        {/* 3. 일반 스카우트 */}
        <div className="bg-white border rounded-xl p-6 shadow-md hover:shadow-lg transition hover:-translate-y-1">
          <h3 className="text-xl font-bold text-gray-800 mb-2">일반 스카우트</h3>
          <p className="text-sm text-gray-500 mb-4 h-10">
            저렴한 비용으로 전력을 보강하세요.<br/>
            (NORMAL ~ RARE)
          </p>
          <div className="text-2xl font-bold text-gray-800 mb-4">100 G</div>
          <button 
            onClick={() => handleScout('NORMAL')}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow"
          >
            영입하기
          </button>
        </div>

        {/* 4. 고급 스카우트 */}
        <div className="bg-gradient-to-b from-purple-50 to-white border border-purple-200 rounded-xl p-6 shadow-md hover:shadow-xl transition hover:-translate-y-1">
          <h3 className="text-xl font-bold text-purple-900 mb-2">고급 스카우트</h3>
          <p className="text-sm text-purple-700 mb-4 h-10">
            최고의 스타 플레이어를 노려보세요!<br/>
            <span className="font-bold">STAR 등급 등장!</span>
          </p>
          <div className="text-2xl font-bold text-gray-800 mb-4">1,000 G</div>
          <button 
            onClick={() => handleScout('PREMIUM')}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow"
          >
            영입하기
          </button>
        </div>

      </div>

      {/* 결과 모달 */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4" onClick={() => setShowResultModal(false)}>
          <div className="flex flex-col items-center max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            
            <h2 className="text-4xl font-black text-white mb-8 animate-bounce drop-shadow-lg">
              🎉 영입 성공! 🎉
            </h2>
            
            {/* 카드 리스트 (가로 스크롤 가능하게 하거나 랩핑) */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {scoutResults.map((player) => (
                <div key={player.id} className="animate-fade-in-up">
                  {/* 공통 컴포넌트 사용! */}
                  <PlayerCard player={player} showStats={true} />
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowResultModal(false)}
              className="bg-white text-gray-900 hover:bg-gray-100 px-10 py-3 rounded-full font-bold text-lg shadow-xl transition transform hover:scale-105"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}