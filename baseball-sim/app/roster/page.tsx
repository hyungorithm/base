"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import { getPlayerImageUrl } from "@/lib/utils";
import PlayerCardModal, { PlayerCardData } from "@/app/components/PlayerCardModal";

// 타입 정의 업데이트 (스탯 정보 추가)
type PlayerWithStatus = {
  roster_id: number;
  player_id: number;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  overall: number;
  // [추가] 여기서 필요한 정보들을 정의
  birth_year: number;
  stat_1: number;
  stat_2: number;
  stat_3: number;
  tier: string;
  
  lineup_info?: {
    type: string;
    order: number;
    defensive_pos: string | null;
  } | null;
};

export default function RosterPage() {
  const { session } = useAuth();
  const [roster, setRoster] = useState<PlayerWithStatus[]>([]); // any 대신 타입 사용 권장
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!session) return;
      
      const { data: rosterData } = await supabase
        .from("user_roster")
        .select(`id, player_id, players(*)`) 
        .eq("user_id", session.user.id);

      const { data: lineupData } = await supabase
        .from("user_lineup")
        .select(`player_id, lineup_type, order_no, defensive_position`)
        .eq("user_id", session.user.id);

      if (rosterData) {
        const combined = rosterData.map((r: any) => {
          const usage = lineupData?.find((l: any) => l.player_id === r.player_id);
          
          return {
            roster_id: r.id,
            player_id: r.player_id,
            name: r.players.name,
            primary_position: r.players.primary_position,
            secondary_position: r.players.secondary_position,
            overall: r.players.overall,
            
            // [수정 1] 여기서 DB의 players 객체 안에 있는 정보를 꺼내서 저장해야 합니다.
            birth_year: r.players.birth_year,
            stat_1: r.players.stat_1,
            stat_2: r.players.stat_2,
            stat_3: r.players.stat_3,
            tier: r.players.tier || "NORMAL", // 혹시 null이면 기본값

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

  const handlePlayerClick = (p: PlayerWithStatus) => {
    const cardData: PlayerCardData = {
      id: p.player_id,
      name: p.name,
      primary_position: p.primary_position,
      secondary_position: p.secondary_position,
      overall: p.overall,
      birth_year: p.birth_year, // p.players.birth_year (X) -> p.birth_year (O)
      stat_1: p.stat_1,
      stat_2: p.stat_2,
      stat_3: p.stat_3,
      tier: p.tier, 
    };
    setSelectedPlayer(cardData);
  };

  if (!session) return <div>로그인이 필요합니다.</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">보유 선수 목록</h2>
      <div className="grid gap-2">
      {roster.map((p) => (
        <div 
          key={p.roster_id} 
          onClick={() => handlePlayerClick(p)}
          className="border p-3 rounded flex justify-between items-center bg-white shadow-sm hover:shadow-md transition cursor-pointer hover:bg-blue-50"
        >
        <div className="flex items-center gap-3">
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

      <PlayerCardModal 
        isOpen={!!selectedPlayer} 
        onClose={() => setSelectedPlayer(null)} 
        player={selectedPlayer}
        title="Player Info"
      />
    </div>
  );
}