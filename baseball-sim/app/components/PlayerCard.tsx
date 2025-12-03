"use client";

import { getPlayerImageUrl } from "@/lib/utils";

export type PlayerCardData = {
  id: number;
  name: string;
  primary_position: string;
  secondary_position: string | null;
  overall: number;
  birth_year: number;
  stat_1: number;
  stat_2: number;
  stat_3: number;
  tier: string;
};

type Props = {
  player: PlayerCardData;
  showStats?: boolean; // 스탯을 보여줄지 여부 (리스트에서는 끌 수도 있음)
};

export default function PlayerCard({ player, showStats = true }: Props) {
  // 1. 등급별 테두리 및 배경 색상
  const getTierStyle = (tier: string) => {
    switch (tier) {
      case 'STAR': 
        return { border: 'border-purple-500', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-800' };
      case 'RARE': 
        return { border: 'border-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800' };
      default: // NORMAL
        return { border: 'border-gray-300', bg: 'bg-gray-50', badge: 'bg-gray-200 text-gray-700' };
    }
  };

  // 2. 스탯 수치별 색상 (100~500 구간 대응)
  const getStatColor = (val: number) => {
    if (val >= 400) return "text-red-600 font-black";   // S급 (400~)
    if (val >= 300) return "text-orange-500 font-bold"; // A급 (300~399)
    if (val >= 200) return "text-blue-600 font-bold";   // B급 (200~299)
    if (val >= 100) return "text-green-600 font-medium";// C급 (100~199)
    return "text-gray-500";                             // D급 (~99)
  };

  const style = getTierStyle(player.tier);
  const age = new Date().getFullYear() - player.birth_year;

  // 포지션별 스탯 라벨
  const isPitcher = ["SP", "RP", "CP", "P"].includes(player.primary_position);
  const labels = isPitcher ? ["구위", "제구", "변화"] : ["파워", "컨택", "주루"];
  const stats = [player.stat_1, player.stat_2, player.stat_3];

  return (
    <div className={`relative bg-white border-4 ${style.border} rounded-xl p-4 shadow-lg w-64 overflow-hidden transition hover:scale-105`}>
      
      {/* 상단 등급 뱃지 */}
      <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: tierColorToHex(player.tier) }}></div>
      <div className="flex justify-between items-start mt-2">
        <span className={`text-xs font-bold px-2 py-1 rounded ${style.badge}`}>
          {player.tier}
        </span>
        <span className="text-xs text-gray-400 font-mono">NO.{player.id}</span>
      </div>

      {/* 이미지 영역 */}
      <div className="flex justify-center my-3">
        <div className={`w-24 h-24 rounded-full border-4 ${style.border} overflow-hidden bg-white shadow-inner`}>
          <img 
            src={getPlayerImageUrl(player.id)} 
            alt={player.name} 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 이름 및 정보 */}
      <div className="text-center mb-3">
        <div className="text-xl font-extrabold text-gray-800 truncate">{player.name}</div>
        <div className="flex justify-center gap-2 text-sm mt-1">
          <span className="font-bold text-blue-600">{player.primary_position}</span>
          <span className="text-gray-400">|</span>
          <span className="font-black text-red-600">OVR {player.overall}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">{age}세</span>
        </div>
      </div>

      {/* 스탯 표시 (게이지 바 대신 숫자 강조) */}
      {showStats && (
        <div className={`rounded-lg p-3 ${style.bg} space-y-1`}>
          {stats.map((val, idx) => (
            <div key={idx} className="flex justify-between items-center border-b border-gray-200 last:border-0 pb-1 last:pb-0">
              <span className="text-xs font-bold text-gray-500">{labels[idx]}</span>
              <span className={`text-sm ${getStatColor(val)}`}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 헬퍼: 테두리 색상을 Hex로 변환 (상단 장식용)
function tierColorToHex(tier: string) {
  switch (tier) {
    case 'STAR': return '#a855f7'; // Purple
    case 'RARE': return '#3b82f6'; // Blue
    default: return '#d1d5db';     // Gray
  }
}