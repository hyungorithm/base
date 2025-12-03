"use client";

import { getPlayerImageUrl } from "@/lib/utils";

type Props = {
  player: {
    id: number;
    name: string;
    tier: string;
    overall: number;
    primary_position: string;
  } | null;
  positionLabel?: string; // 예: "SS", "4번"
  onClick?: () => void;
  emptyLabel?: string;
};

export default function MiniPlayerCard({ player, positionLabel, onClick, emptyLabel = "비어있음" }: Props) {
  // 등급별 테두리 색상
  const getBorderColor = (tier: string) => {
    switch (tier) {
      case 'STAR': return 'border-purple-500 bg-purple-50';
      case 'RARE': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  // 1. 선수가 없을 때 (빈 슬롯)
  if (!player) {
    return (
      <div 
        onClick={onClick}
        className="w-20 h-24 bg-black/40 border-2 border-dashed border-white/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-black/60 transition backdrop-blur-sm"
      >
        <span className="text-white font-bold text-lg">{positionLabel}</span>
        <span className="text-white/70 text-xs">{emptyLabel}</span>
      </div>
    );
  }

  // 2. 선수가 있을 때
  const style = getBorderColor(player.tier);

  return (
    <div 
      onClick={onClick}
      className={`relative w-20 h-28 rounded-lg border-2 ${style} shadow-md flex flex-col items-center overflow-hidden cursor-pointer hover:scale-105 transition-transform bg-white`}
    >
      {/* 상단 포지션/오버롤 라벨 */}
      <div className="w-full flex justify-between px-1 pt-0.5 bg-black/10 text-[10px] font-bold">
        <span className="text-gray-700">{positionLabel || player.primary_position}</span>
        <span className="text-red-600">{player.overall}</span>
      </div>

      {/* 이미지 */}
      <div className="w-14 h-14 rounded-full border border-gray-200 overflow-hidden mt-1 bg-white">
        <img 
          src={getPlayerImageUrl(player.id)} 
          alt={player.name} 
          className="w-full h-full object-cover"
        />
      </div>

      {/* 이름 */}
      <div className="mt-1 w-full text-center px-1">
        <div className="text-xs font-bold text-gray-800 truncate">{player.name}</div>
        <div className={`text-[9px] font-bold ${player.tier === 'STAR' ? 'text-purple-600' : player.tier === 'RARE' ? 'text-blue-600' : 'text-gray-500'}`}>
          {player.tier}
        </div>
      </div>
    </div>
  );
}