"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ... (Player 타입 등 기존과 동일) ...
type Player = {
  id: number;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  overall: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  targetSlot: { type: string; order: number } | null;
  userId: string;
  // [변경] DB 저장이 아니라, 선택된 정보를 부모에게 전달만 함
  onSelect: (player: Player, defensivePos: string | null) => void; 
};

export default function PlayerSelectModal({ isOpen, onClose, targetSlot, userId, onSelect }: Props) {
  // ... (기존 state, fetchAvailablePlayers 로직 등은 완벽히 동일하므로 생략) ...
  // ... (fetchAvailablePlayers 내부 로직도 그대로 유지) ...
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedDefPos, setSelectedDefPos] = useState<string>("DH");

  // ... (useEffect 등 동일) ...

  const handleConfirm = () => {
    if (!selectedPlayer) return alert("선수를 선택해주세요.");
    const finalPos = targetSlot?.type === "BATTER" ? selectedDefPos : null;
    
    // [변경] 여기서 DB 호출 안 함! 부모에게 객체 통째로 전달
    onSelect(selectedPlayer, finalPos);
    onClose(); // 모달 닫기
  };

  // ... (나머지 렌더링 로직 동일) ...
  // (코드 생략 없이 기존 코드 그대로 쓰시되 handleConfirm만 위처럼 바꾸시면 됩니다)
  
  // 편의를 위해 전체 코드 흐름 유지:
  useEffect(() => {
     if (isOpen && userId) {
       fetchAvailablePlayers(); // 기존 함수 사용
       setSelectedPlayer(null);
     }
  }, [isOpen, userId]);

  const fetchAvailablePlayers = async () => {
     // ... 기존과 동일 ...
     const { data } = await supabase
      .from("user_roster")
      .select("player_id, players(id, name, primary_position, secondary_position, overall)")
      .eq("user_id", userId);
     
     if(data) {
        // ... 필터링 로직 기존과 동일 ...
        // ... setPlayers(...) ...
        let list = data.map((item: any) => ({
            id: item.players.id,
            name: item.players.name,
            primary_position: item.players.primary_position,
            secondary_position: item.players.secondary_position,
            overall: item.players.overall,
        }));
        
        // 필터링
        if (["SP", "RP", "CP"].includes(targetSlot?.type || "")) {
            list = list.filter((p) => ["SP", "RP", "CP", "P"].includes(p.primary_position));
        } else if (targetSlot?.type === "BATTER" || targetSlot?.type === "BENCH") {
            list = list.filter((p) => !["SP", "RP", "CP", "P"].includes(p.primary_position));
        }
        list.sort((a, b) => b.overall - a.overall);
        setPlayers(list);
     }
  };
  
  // ... handlePlayerClick, getAvailablePositions 등 기존과 동일 ...
  const handlePlayerClick = (p: Player) => {
    setSelectedPlayer(p);
    if (targetSlot?.type === "BATTER") {
      setSelectedDefPos(p.primary_position);
    }
  };

  const getAvailablePositions = (p: Player) => {
    const positions = new Set<string>();
    positions.add("DH");
    positions.add(p.primary_position);
    if (p.secondary_position) positions.add(p.secondary_position);
    return Array.from(positions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md h-[80vh] flex flex-col">
         {/* ... 기존 UI 동일 ... */}
         <h3 className="text-xl font-bold mb-4">
          선수 교체 ({targetSlot?.type === 'BATTER' ? `${targetSlot.order}번 타자` : targetSlot?.type})
        </h3>
        
        <div className="flex-1 overflow-y-auto border rounded p-2 space-y-2 mb-4">
            {players.map((p) => (
              <div key={p.id} onClick={() => handlePlayerClick(p)} 
                   className={`p-3 border rounded cursor-pointer flex justify-between items-center hover:bg-gray-50 ${selectedPlayer?.id === p.id ? "border-blue-500 bg-blue-50" : ""}`}>
                 <div><span className="font-bold mr-2">{p.name}</span><span className="text-xs text-gray-500">{p.primary_position}</span></div>
                 <span className="font-mono text-blue-600 font-bold">{p.overall}</span>
              </div>
            ))}
        </div>

        {targetSlot?.type === "BATTER" && selectedPlayer && (
           <div className="mb-4 bg-gray-50 p-3 rounded border">
             <label className="block text-sm font-bold mb-2">수비 위치</label>
             <select value={selectedDefPos} onChange={(e) => setSelectedDefPos(e.target.value)} className="w-full border p-2 rounded">
                {getAvailablePositions(selectedPlayer).map(pos => <option key={pos} value={pos}>{pos}</option>)}
             </select>
           </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">취소</button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">선택 완료</button>
        </div>
      </div>
    </div>
  );
}