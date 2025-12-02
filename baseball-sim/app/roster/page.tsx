"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import { getPlayerImageUrl } from "@/lib/utils";

type PlayerWithStatus = {
  roster_id: number;
  player_id: number;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  overall: number;
  // 라인업 정보 (없으면 null)
  lineup_info?: {
    type: string;
    order: number;
    defensive_pos: string | null;
  } | null;
};

export default function RosterPage() {
  const { session } = useAuth();
  const [roster, setRoster] = useState<PlayerWithStatus[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session) return;

      // 1. 내 보유 선수 전체 가져오기
      const { data: rosterData } = await supabase
        .from("user_roster")
        .select(`id, player_id, players(*)`)
        .eq("user_id", session.user.id);

      // 2. 내 라인업 정보 가져오기
      const { data: lineupData } = await supabase
        .from("user_lineup")
        .select(`player_id, lineup_type, order_no, defensive_position`)
        .eq("user_id", session.user.id);

      if (rosterData) {
        // 3. 두 데이터를 합치기
        const combined = rosterData.map((r: any) => {
          // 이 선수가 라인업에 있는지 확인
          const usage = lineupData?.find((l: any) => l.player_id === r.player_id);
          
          return {
            roster_id: r.id,
            player_id: r.player_id,
            name: r.players.name,
            primary_position: r.players.primary_position,
            secondary_position: r.players.secondary_position,
            overall: r.players.overall,
            lineup_info: usage ? {
              type: usage.lineup_type,
              order: usage.order_no,
              defensive_pos: usage.defensive_position
            } : null
          };
        });
        
        combined.sort((a: any, b: any) => b.overall - a.overall);
        setRoster(combined);
      }
    };

    fetchData();
  }, [session]);

  if (!session) return <div>로그인이 필요합니다.</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">보유 선수 목록</h2>
      <div className="grid gap-2">
      {roster.map((p) => (
    <div key={p.roster_id} className="border p-3 rounded flex justify-between items-center bg-white shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-3">
        {/* [추가됨] 작은 아바타 이미지 */}
        <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
            <img 
            src={getPlayerImageUrl(p.player_id)} 
            alt={p.name} 
            className="w-full h-full object-cover"
            />
        </div>

        <div>
            <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-gray-800">{p.name}</span>
            <span className="text-xs font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded">
                {p.overall}
            </span>
            </div>
            <span className="text-gray-500 text-sm font-medium">
            {p.primary_position}
            {p.secondary_position && <span className="text-gray-400"> / {p.secondary_position}</span>}
            </span>
        </div>
        </div>
            <div>
              {p.lineup_info ? (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold">
                  {/* 예: BATTER (1번) - CF */}
                  {p.lineup_info.type} 
                  {p.lineup_info.type === 'BATTER' && ` (${p.lineup_info.order}번)`}
                  {p.lineup_info.defensive_pos && ` - ${p.lineup_info.defensive_pos}`}
                  {p.lineup_info.type !== 'BATTER' && ` (${p.lineup_info.order})`}
                </span>
              ) : (
                <span className="text-gray-400 text-xs bg-gray-100 px-2 py-1 rounded">미등록</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}