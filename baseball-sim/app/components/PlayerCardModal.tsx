"use client";

import PlayerCard, { PlayerCardData } from "./PlayerCard";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerCardData | null;
  title?: string;
};

export default function PlayerCardModal({ isOpen, onClose, player, title = "Player Info" }: Props) {
  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        
        {/* 타이틀 */}
        <h3 className="text-white text-xl font-bold mb-4 drop-shadow-md uppercase tracking-widest">
          {title}
        </h3>

        {/* 카드 컴포넌트 재사용 */}
        <div className="animate-fade-in-up">
          <PlayerCard player={player} showStats={true} />
        </div>

        {/* 닫기 버튼 (카드 아래에 배치) */}
        <button 
          onClick={onClose}
          className="mt-6 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-full backdrop-blur-md transition"
        >
          닫기
        </button>
      </div>
    </div>
  );
}