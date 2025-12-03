"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import MatchDetailModal from "@/app/components/MatchDetailModal";

export default function SchedulePage() {
  const { session } = useAuth();
  
  const [currentRound, setCurrentRound] = useState(1);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 모달 상태
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  // 1. 내 리그 ID 찾기 & 해당 라운드 경기 불러오기
  const fetchMatches = async (round: number) => {
    if (!session) return;
    setLoading(true);

    try {
      // 내 리그 ID 찾기
      const { data: myStanding } = await supabase
        .from("league_standings")
        .select("league_id")
        .eq("user_id", session.user.id)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (!myStanding) {
        setLoading(false);
        return;
      }

      // 해당 리그, 해당 라운드의 경기들 가져오기 (View 사용)
      const { data: matchData } = await supabase
        .from("matches_view")
        .select("*")
        .eq("league_id", myStanding.league_id)
        .eq("round_no", round)
        .order("id", { ascending: true });

      if (matchData) {
        setMatches(matchData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(currentRound);
  }, [session, currentRound]);

  const handlePrev = () => {
    if (currentRound > 1) setCurrentRound(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentRound < 133) setCurrentRound(prev => prev + 1);
  };

  if (!session) return <div className="p-10">로그인이 필요합니다.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 pb-20">
      <h1 className="text-2xl font-bold mb-6">📅 리그 일정</h1>

      {/* 라운드 네비게이션 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border mb-6">
        <button 
          onClick={handlePrev} 
          disabled={currentRound <= 1}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 font-bold"
        >
          ◀ 이전
        </button>
        <div className="text-center">
          <div className="text-xs text-gray-400 font-bold uppercase">Round</div>
          <div className="text-2xl font-black text-blue-600">{currentRound}</div>
        </div>
        <button 
          onClick={handleNext} 
          disabled={currentRound >= 133}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 font-bold"
        >
          다음 ▶
        </button>
      </div>

      {/* 경기 리스트 */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-400">일정을 불러오는 중...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-10 text-gray-400">예정된 경기가 없습니다.</div>
        ) : (
          matches.map((match) => {
            const isMyMatch = match.home_user_id === session.user.id || match.away_user_id === session.user.id;
            
            return (
              <div 
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className={`
                  relative p-4 rounded-xl border shadow-sm cursor-pointer transition hover:shadow-md
                  ${isMyMatch ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}
                `}
              >
                {isMyMatch && (
                  <div className="absolute top-2 right-2 text-[10px] font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">
                    MY
                  </div>
                )}

                <div className="flex justify-between items-center">
                  {/* 홈팀 */}
                  <div className="flex-1 text-center">
                    <div className="font-bold text-gray-800 truncate px-2">
                      {match.home_team_name.split('@')[0]}
                    </div>
                    {match.is_played && (
                      <div className={`text-2xl font-black mt-1 ${match.home_score > match.away_score ? 'text-blue-600' : 'text-gray-400'}`}>
                        {match.home_score}
                      </div>
                    )}
                  </div>

                  {/* VS / 상태 */}
                  <div className="w-16 text-center shrink-0">
                    {match.is_played ? (
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">종료</span>
                    ) : (
                      <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">예정</span>
                    )}
                  </div>

                  {/* 원정팀 */}
                  <div className="flex-1 text-center">
                    <div className="font-bold text-gray-800 truncate px-2">
                      {match.away_team_name.split('@')[0]}
                    </div>
                    {match.is_played && (
                      <div className={`text-2xl font-black mt-1 ${match.away_score > match.home_score ? 'text-blue-600' : 'text-gray-400'}`}>
                        {match.away_score}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 상세 모달 */}
      <MatchDetailModal 
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        matchData={selectedMatch}
      />
    </div>
  );
}