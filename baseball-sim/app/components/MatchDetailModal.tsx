"use client";

import { useState } from "react";
import { GameResult, PlayerStats, SimPlayer } from "@/lib/gameEngine";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  matchData: any; // matches_view의 데이터
};

export default function MatchDetailModal({ isOpen, onClose, matchData }: Props) {
  const [activeTab, setActiveTab] = useState<'BOX' | 'LOG'>('BOX');

  if (!isOpen || !matchData) return null;

  const result: GameResult = matchData.result_data;
  
  // 경기 전이라면
  if (!matchData.is_played || !result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white p-8 rounded-xl shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-2">경기 예정</h2>
          <p className="text-gray-500">아직 진행되지 않은 경기입니다.</p>
          <button onClick={onClose} className="mt-4 bg-gray-200 px-4 py-2 rounded">닫기</button>
        </div>
      </div>
    );
  }

  // 팀 이름 파싱 (이메일 앞부분)
  const homeName = matchData.home_team_name.split('@')[0];
  const awayName = matchData.away_team_name.split('@')[0];

  // 박스스코어 렌더링 헬퍼
  const renderStatsTable = (teamIds: number[], isPitcher = false) => {
    return (
      <table className="w-full text-xs text-left border-collapse mb-4">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2">이름</th>
            {isPitcher ? (
              <>
                <th className="p-2">이닝</th>
                <th className="p-2">자책</th>
                <th className="p-2">삼진</th>
              </>
            ) : (
              <>
                <th className="p-2">타수</th>
                <th className="p-2 text-blue-600">안타</th>
                <th className="p-2 text-red-600">홈런</th>
                <th className="p-2">타점</th>
                <th className="p-2">득점</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {teamIds.map(id => {
            const stat = result.stats[id];
            // 기록이 없거나(출전 안함), 투수인데 기록 없는 경우 스킵
            if (!stat) return null;
            if (isPitcher && stat.ip === 0 && stat.er === 0 && stat.k === 0) return null;
            
            // 이름 찾기 (로그나 스탯 객체엔 이름이 없으므로, result_data 구조에 따라 다를 수 있음)
            // *주의: 현재 DB 구조상 result_data.stats에는 이름이 없습니다.
            // 해결책: result_data를 저장할 때 선수 이름도 같이 저장하거나, 
            // 여기서는 편의상 "Player {id}"로 표시하거나, 로그에서 이름을 역추적해야 합니다.
            // **가장 좋은 방법은 gameEngine.ts에서 stats 저장할 때 이름도 같이 저장하는 것입니다.**
            // 지금은 임시로 로그에서 이름을 찾거나 'Unknown'으로 표시합니다.
            
            // (임시 로직: 로그에서 해당 ID의 이름을 찾을 수 없으므로, 
            //  실제로는 gameEngine을 수정해서 stats에 name 필드를 추가하는게 좋습니다.
            //  여기서는 일단 스탯만 보여줍니다.)
            
            return (
              <tr key={id} className="border-b last:border-0">
                <td className="p-2 font-medium text-gray-700">No.{id}</td> 
                {isPitcher ? (
                  <>
                    <td className="p-2">{Math.floor(stat.ip / 3)}.{stat.ip % 3}</td>
                    <td className="p-2">{stat.er}</td>
                    <td className="p-2">{stat.k}</td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{stat.ab}</td>
                    <td className="p-2 font-bold">{stat.h}</td>
                    <td className="p-2">{stat.hr}</td>
                    <td className="p-2">{stat.rbi}</td>
                    <td className="p-2">{stat.r}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // 홈/원정 선수 ID 분류 (stats 키를 순회하며 분류)
  // *참고: 실제로는 gameEngine에서 homePlayerIds, awayPlayerIds를 따로 저장해주는 게 좋습니다.
  // 여기서는 간단히 stats의 키들을 반으로 나눠서 보여주는 건 불가능하므로,
  // 일단 전체 리스트를 보여주거나 해야 합니다.
  // **하지만!** 더 나은 UX를 위해, gameEngine을 수정하지 않고도
  // 로그에 등장하는 이름으로 매핑하는 건 복잡하므로,
  // 이번 단계에서는 "전체 기록"을 보여주되, 
  // **gameEngine.ts 수정 제안**을 아래에 따로 드리겠습니다.
  
  const playerIds = Object.keys(result.stats).map(Number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* 헤더: 스코어보드 */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
          <div className="text-center w-1/3">
            <div className="text-gray-400 text-xs mb-1">AWAY</div>
            <div className="font-bold text-lg truncate">{awayName}</div>
            <div className="text-4xl font-bold text-yellow-400 mt-2">{matchData.away_score}</div>
          </div>
          <div className="text-gray-500 font-bold text-xl">VS</div>
          <div className="text-center w-1/3">
            <div className="text-gray-400 text-xs mb-1">HOME</div>
            <div className="font-bold text-lg truncate">{homeName}</div>
            <div className="text-4xl font-bold text-yellow-400 mt-2">{matchData.home_score}</div>
          </div>
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b shrink-0">
          <button 
            onClick={() => setActiveTab('BOX')}
            className={`flex-1 py-3 font-bold text-sm ${activeTab === 'BOX' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            기록지 (Box Score)
          </button>
          <button 
            onClick={() => setActiveTab('LOG')}
            className={`flex-1 py-3 font-bold text-sm ${activeTab === 'LOG' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            중계 로그 (Log)
          </button>
        </div>

        {/* 컨텐츠 영역 (스크롤) */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeTab === 'BOX' ? (
            <div className="space-y-6">
              {/* 편의상 전체 선수 기록을 한 번에 보여줍니다. (팀 구분 로직 추가 필요) */}
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="font-bold mb-3 text-gray-700">전체 선수 기록</h3>
                {renderStatsTable(playerIds)}
                <div className="mt-4 border-t pt-4">
                  <h3 className="font-bold mb-3 text-gray-700">투수 기록</h3>
                  {renderStatsTable(playerIds, true)}
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">* 현재 버전에서는 홈/원정 선수 구분이 통합되어 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {result.logs.map((log, idx) => (
                <div key={idx} className="flex gap-3 text-sm bg-white p-2 rounded border shadow-sm">
                  <span className="w-12 font-mono text-gray-500 font-bold flex-shrink-0 text-center bg-gray-100 rounded py-1">
                    {log.inning}{log.isTop ? "초" : "말"}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-gray-800 mr-2">{log.batterName}</span>
                    <span className={`${log.result === 'HOMERUN' ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      {log.description.split(':')[1]} {/* 이름 중복 제거 */}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="p-4 border-t bg-white shrink-0">
          <button onClick={onClose} className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-lg font-bold">
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}