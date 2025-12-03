"use client";

import { getPlayerImageUrl } from "@/lib/utils";

// 이 컴포넌트가 받을 데이터 타입 정의
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
  isOpen: boolean;
  onClose: () => void;
  player: PlayerCardData | null;
  title?: string; // 상단 타이틀 (예: Scout Report, Player Info)
};

export default function PlayerCardModal({ isOpen, onClose, player, title = "Player Info" }: Props) {
  if (!isOpen || !player) return null;

  // 포지션에 따른 스탯 라벨 결정
  const getStatLabels = (pos: string) => {
    const isPitcher = ["SP", "RP", "CP", "P"].includes(pos);
    if (isPitcher) {
      return ["구위", "제구", "변화"];
    }
    return ["파워", "컨택", "주루"];
  };

  const labels = getStatLabels(player.primary_position);
  const stats = [player.stat_1, player.stat_2, player.stat_3];
  const age = new Date().getFullYear() - player.birth_year;

  // 등급별 색상 설정
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'STAR': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'RARE': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" onClick={onClose}>
      {/* 카드 컨테이너 (클릭 시 닫히지 않도록 stopPropagation) */}
      <div 
        className="bg-white border-4 border-yellow-400 rounded-xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 장식바 */}
        <div className="absolute top-0 left-0 w-full h-3 bg-yellow-400"></div>
        
        {/* 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
        >
          ✕
        </button>

        <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-4 text-center">
          {title}
        </h3>

        {/* 이미지 */}
        <div className="flex justify-center mb-4">
          <div className="w-32 h-32 rounded-full border-4 border-blue-100 overflow-hidden bg-gray-50 shadow-inner">
            <img 
              src={getPlayerImageUrl(player.id)} 
              alt="선수 이미지"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 이름 */}
        <div className="text-3xl font-extrabold text-gray-800 mb-1 text-center">
          {player.name}
        </div>
        
        {/* 포지션 및 오버롤 요약 */}
        <div className="flex justify-center items-center gap-2 mb-6 text-sm">
            {/* 등급 뱃지 */}
            <span className={`font-bold px-2 py-1 rounded border ${getTierColor(player.tier)}`}>
              {player.tier}
            </span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {player.primary_position}
              {player.secondary_position && `/${player.secondary_position}`}
            </span>
            <span className="font-black text-red-600 bg-red-50 px-2 py-1 rounded">
              OVR {player.overall}
            </span>
            <span className="text-gray-500">
              {age}세
            </span>
        </div>

        {/* 세부 능력치 게이지 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
          {stats.map((val, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-10 text-xs font-bold text-gray-500 text-right">{labels[idx]}</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${val}%` }}
                ></div>
              </div>
              <span className="w-8 text-sm font-bold text-gray-700 text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}