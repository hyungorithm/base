"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import MatchDetailModal from "@/app/components/MatchDetailModal";

const ITEMS_PER_PAGE = 20;

export default function SchedulePage() {
  const { session } = useAuth();
  
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); // 0부터 시작 (0 = 1~20라운드)
  const [hasMore, setHasMore] = useState(true);
  
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  useEffect(() => {
    const fetchMySchedule = async () => {
      if (!session) return;
      setLoading(true);

      try {
        // 내 팀이 홈이거나 원정인 경기만 조회
        // range를 사용하여 페이징 처리
        const { data, count } = await supabase
          .from("matches_view")
          .select("*", { count: "exact" })
          .or(`home_user_id.eq.${session.user.id},away_user_id.eq.${session.user.id}`)
          .order("round_no", { ascending: true })
          .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

        if (data) {
          setMatches(data);
          // 더 불러올 데이터가 있는지 확인
          if (count && (page + 1) * ITEMS_PER_PAGE >= count) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchMySchedule();
  }, [session, page]);

  if (!session) return <div className="p-10">로그인이 필요합니다.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 pb-20">
      <h1 className="text-2xl font-bold mb-6">📅 내 구단 일정</h1>

      {/* 경기 리스트 */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-400">일정을 불러오는 중...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-10 text-gray-400">예정된 경기가 없습니다.</div>
        ) : (
          matches.map((match) => {
            const isHome = match.home_user_id === session.user.id;
            const myScore = isHome ? match.home_score : match.away_score;
            const oppScore = isHome ? match.away_score : match.home_score;
            const oppName = isHome ? match.away_team_name : match.home_team_name;
            
            // 승패 표시
            let resultBadge = <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">예정</span>;
            if (match.is_played) {
              if (myScore > oppScore) resultBadge = <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">승</span>;
              else if (myScore < oppScore) resultBadge = <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">패</span>;
              else resultBadge = <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">무</span>;
            }

            return (
              <div 
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:bg-gray-50 transition"
              >
                {/* 라운드 */}
                <div className="w-16 text-xs text-gray-400 font-bold">
                  R.{match.round_no}
                </div>

                {/* 대진 정보 */}
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {resultBadge}
                    <span className="font-bold text-gray-800">
                      vs {oppName.split('#')[0]} {/* #뒤에 숫자 제거하고 보여주기 */}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({isHome ? 'HOME' : 'AWAY'})
                    </span>
                  </div>
                </div>

                {/* 점수 */}
                <div className="font-mono font-bold text-lg">
                  {match.is_played ? (
                    <span className={myScore > oppScore ? 'text-blue-600' : myScore < oppScore ? 'text-red-600' : 'text-gray-600'}>
                      {myScore} : {oppScore}
                    </span>
                  ) : (
                    <span className="text-gray-300">- : -</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 페이지네이션 */}
      <div className="flex justify-center gap-4 mt-8">
        <button 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
        >
          이전
        </button>
        <span className="py-2 text-gray-500 text-sm">Page {page + 1}</span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
        >
          다음
        </button>
      </div>

      <MatchDetailModal 
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        matchData={selectedMatch}
      />
    </div>
  );
}