"use client";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./providers/AuthProvider";
import { useEffect, useState } from "react";

type Player = {
  id: number;
  name: string;
  birth_year: number;
  overall: number;
  primary_position: string;
  secondary_position: string | null;
};

export default function Home() {
  const { session } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [coins, setCoins] = useState<number>(0); 


  // 유저 코인 조회
  const fetchUserInfo = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("user_profile") 
      .select("coins")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.error("코인 조회 실패:", error);
    } else {
      setCoins(data.coins);
    }
  };


  // 유저 로스터 조회
  const fetchPlayers = async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("user_roster")
      .select(`players(*)`)
      .eq("user_id", session.user.id);

    if (error) {
      console.error(error);
      return;
    }

    setPlayers(data.map((row: any) => row.players));
  };


  // 데이터를 한 번에 갱신하는 헬퍼 함수 (새로고침 효과)
  const refreshData = () => {
    fetchUserInfo();
    fetchPlayers();
  };

  const handleLogin = async () => {
    const email = prompt("이메일 입력");
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("로그인 이메일이 전송되었습니다!");
  };

  const handleScout = async () => {
    if (!session) return alert("로그인이 필요합니다.");

    const { data: result, error } = await supabase.rpc("scout_player", { user_id: session.user.id });
    if (error) {
      console.error(error);
      alert("스카우트 실패: " + error.message);
    } else {
      alert("스카우트 성공! player id: " + result);
      // 스카우트가 성공했으니, DB의 변경된 코인과 선수 명단을 다시 가져옴
      refreshData(); 
    }
  };

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session]);

  return (
    <div className="p-10">
      {session ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">구단주: {session.user.email}</h2>
            {/* 5. 코인 표시 UI */}
            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold border border-yellow-400">
              💰 보유 코인: {coins.toLocaleString()} G
            </div>
          </div>

          <button
            onClick={handleScout}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            선수 스카우트 (100 G)
          </button>

          <h3 className="mt-8 text-xl font-semibold border-b pb-2">내 선수 목록 ({players.length}명)</h3>
          <ul className="mt-4 space-y-2">
            {players.map((p) => (
              <li key={p.id} className="bg-gray-50 p-3 rounded shadow-sm border flex justify-between">
                <span>{p.name} ({p.birth_year})</span>
                <span className="font-mono text-blue-600">OVR: {p.overall} | {p.primary_position}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">
          로그인
        </button>
      )}
    </div>
  );
}