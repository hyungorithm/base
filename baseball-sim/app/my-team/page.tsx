"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";

export default function MyTeamPage() {
  const { session, profile, refreshProfile } = useAuth();
  
  const [nickname, setNickname] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || "");
      setTeamName(profile.team_name || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!session) return;
    if (!nickname.trim() || !teamName.trim()) return alert("빈칸을 채워주세요.");

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_profile")
        .update({ nickname, team_name: teamName })
        .eq("user_id", session.user.id);

      if (error) throw error;

      alert("저장되었습니다!");
      refreshProfile(); // 전역 상태 갱신
    } catch (e: any) {
      alert("오류: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <div className="p-10">로그인이 필요합니다.</div>;

  return (
    <div className="max-w-md mx-auto p-10">
      <h1 className="text-3xl font-bold mb-8">구단 정보 관리</h1>
      
      <div className="bg-white p-6 rounded-xl shadow border space-y-6">
        
        {/* 닉네임 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">구단주 닉네임</label>
          <input 
            type="text" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="예: 승리요정"
          />
        </div>

        {/* 팀명 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">구단명 (Team Name)</label>
          <input 
            type="text" 
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="예: 서울 슈퍼소닉스"
          />
          <p className="text-xs text-gray-400 mt-2">
            * 리그 순위표와 경기 일정에 이 이름으로 표시됩니다.
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "저장 중..." : "변경사항 저장"}
        </button>
      </div>
    </div>
  );
}