"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import MiniPlayerCard from "@/app/components/MiniPlayerCard";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// 타입 정의
type LineupItem = {
  player_id: number;
  lineup_type: string;
  order_no: number;
  defensive_position: string | null;
  players: {
    id: number;
    name: string;
    primary_position: string;
    secondary_position: string | null;
    overall: number;
    tier: string;
  };
};

// 수비 위치 좌표
const FIELD_POSITIONS: Record<string, { top: string; left: string }> = {
  C: { top: '85%', left: '50%' },
  P: { top: '60%', left: '50%' },
  '1B': { top: '60%', left: '78%' },
  '2B': { top: '38%', left: '60%' },
  '3B': { top: '60%', left: '22%' },
  SS: { top: '38%', left: '40%' },
  LF: { top: '20%', left: '20%' },
  CF: { top: '12%', left: '50%' },
  RF: { top: '20%', left: '80%' },
  DH: { top: '85%', left: '10%' },
};

export default function LineupPage() {
  const { session } = useAuth();
  
  const [lineup, setLineup] = useState<LineupItem[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{ type: string; order: number; pos: string } | null>(null);

  const fetchData = async () => {
    if (!session) return;
    
    const { data: lineupData } = await supabase
      .from("user_lineup")
      .select(`*, players(*)`)
      .eq("user_id", session.user.id);

    if (lineupData) setLineup(lineupData);

    const { data: rosterData } = await supabase
      .from("user_roster")
      .select(`*, players(*)`)
      .eq("user_id", session.user.id);
      
    if (rosterData) setRoster(rosterData);
    
    setIsDirty(false);
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(lineup.filter(l => l.lineup_type === 'BATTER'));
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newLineup = [...lineup];
    const others = newLineup.filter(l => l.lineup_type !== 'BATTER');
    
    const updatedBatters = items.map((item, index) => ({
      ...item,
      order_no: index + 1
    }));

    setLineup([...others, ...updatedBatters]);
    setIsDirty(true);
  };

  const handleSwapPlayer = (newPlayer: any) => {
    if (!targetSlot) return;

    let newLineup = [...lineup];
    newLineup = newLineup.filter(l => l.player_id !== newPlayer.player_id);

    const existingIdx = newLineup.findIndex(
      l => l.lineup_type === targetSlot.type && l.order_no === targetSlot.order
    );

    let defPos: string | null = null;
    if (targetSlot.type === 'BATTER') defPos = targetSlot.pos;

    const newItem: LineupItem = {
      player_id: newPlayer.player_id,
      lineup_type: targetSlot.type,
      order_no: targetSlot.order,
      defensive_position: defPos,
      players: newPlayer.players
    };

    if (existingIdx > -1) {
      newLineup[existingIdx] = newItem;
    } else {
      newLineup.push(newItem);
    }

    setLineup(newLineup);
    setIsDirty(true);
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!session) return;
    if (!confirm("저장하시겠습니까?")) return;

    const payload = lineup.map(item => ({
      player_id: item.player_id,
      lineup_type: item.lineup_type,
      order_no: item.order_no,
      defensive_position: item.defensive_position
    }));

    const { error } = await supabase.rpc("save_user_lineup", {
      p_user_id: session.user.id,
      p_lineup_data: payload
    });

    if (error) alert("저장 실패: " + error.message);
    else {
      alert("저장되었습니다!");
      setIsDirty(false);
    }
  };

  // [추가] 초기화 버튼 핸들러
  const handleReset = () => {
    if (confirm("변경사항을 취소하고 마지막 저장 상태로 되돌립니까?")) {
      fetchData(); // DB에서 다시 불러오기
    }
  };

  const getPlayerBySlot = (type: string, order: number) => {
    return lineup.find(l => l.lineup_type === type && l.order_no === order);
  };

  const getPlayerByPos = (pos: string) => {
    if (pos === 'P') return getPlayerBySlot('SP', 1);
    return lineup.find(l => l.lineup_type === 'BATTER' && l.defensive_position === pos);
  };

  const getAvailablePlayers = () => {
    if (!targetSlot) return [];
    
    return roster.filter(r => {
      const p = r.players;
      if (['SP', 'RP', 'CP'].includes(targetSlot.type)) {
        if (targetSlot.type === 'SP') return p.primary_position === 'SP';
        if (targetSlot.type === 'RP' || targetSlot.type === 'CP') return ['RP', 'CP'].includes(p.primary_position);
        return p.primary_position === 'P';
      }
      if (targetSlot.type === 'BENCH') {
        return !['SP', 'RP', 'CP', 'P'].includes(p.primary_position);
      }
      if (targetSlot.type === 'BATTER') {
        if (targetSlot.pos === 'DH') return !['SP', 'RP', 'CP', 'P'].includes(p.primary_position);
        return p.primary_position === targetSlot.pos || p.secondary_position === targetSlot.pos;
      }
      return false;
    }).sort((a, b) => b.players.overall - a.players.overall);
  };

  if (!session) return <div className="p-10">로그인 필요</div>;

  return (
    // [수정] max-w-[1400px]로 넓게 설정
    <div className="max-w-[1400px] mx-auto p-6 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">라인업 관리</h1>
        {isDirty && <span className="text-red-500 font-bold animate-pulse">● 저장되지 않음</span>}
      </div>

      {/* 상단: 그라운드 + 타순 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* 좌측: 야구장 */}
        <div className="lg:col-span-2 relative bg-green-600 rounded-xl shadow-xl overflow-hidden border-4 border-green-800" style={{ height: '600px' }}>
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_100%,_#eab308_0%,_transparent_50%)]"></div>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[350px] h-[350px] border-2 border-white/50 rotate-45"></div>
          
          {Object.keys(FIELD_POSITIONS).map((pos) => {
            const playerItem = getPlayerByPos(pos);
            const coords = FIELD_POSITIONS[pos];
            
            return (
              <div 
                key={pos}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition hover:z-10"
                style={{ top: coords.top, left: coords.left }}
              >
                <MiniPlayerCard 
                  player={playerItem ? playerItem.players : null}
                  positionLabel={pos}
                  onClick={() => {
                    const type = pos === 'P' ? 'SP' : 'BATTER';
                    const order = pos === 'P' ? 1 : (playerItem?.order_no || 0);
                    setTargetSlot({ type, order, pos: pos === 'P' ? 'SP' : pos });
                    setIsModalOpen(true);
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* 우측: 타순 리스트 */}
        <div className="bg-white p-4 rounded-xl shadow border h-[600px] flex flex-col">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">⚾ 선발 타순</h3>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="batting-order">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="flex-1 overflow-y-auto space-y-2 pr-2"
                >
                  {lineup
                    .filter(l => l.lineup_type === 'BATTER')
                    .sort((a, b) => a.order_no - b.order_no)
                    .map((item, index) => (
                      <Draggable key={item.player_id} draggableId={item.player_id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center gap-3 p-1.5 rounded border ${snapshot.isDragging ? 'bg-blue-50 border-blue-300 shadow-lg' : 'bg-white border-gray-200'}`}
                          >
                            <span className="font-bold text-gray-500 w-6 text-center">{index + 1}</span>
                            <div className="flex items-center gap-2 flex-1">
                              <div className={`w-2 h-8 rounded ${item.players.tier === 'STAR' ? 'bg-purple-400' : item.players.tier === 'RARE' ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
                              <div>
                                <div className="font-bold text-sm">{item.players.name}</div>
                                <div className="text-xs text-gray-500">
                                  {item.defensive_position} | OVR {item.players.overall}
                                </div>
                              </div>
                            </div>
                            <div className="text-gray-300">☰</div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* 하단: 투수진 및 벤치 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 투수진 (2칸 차지) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2 flex items-center gap-2">
            🧢 투수진 <span className="text-sm font-normal text-gray-500">(선발 / 불펜)</span>
          </h3>
          
          <div className="space-y-4">
            {/* 선발 투수 */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">선발 투수 (Starting Rotation)</div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map(order => {
                  const player = getPlayerBySlot('SP', order);
                  return (
                    <div key={`SP-${order}`} className="flex-shrink-0">
                      <MiniPlayerCard 
                        player={player ? player.players : null}
                        positionLabel={`SP ${order}`}
                        onClick={() => {
                          setTargetSlot({ type: 'SP', order, pos: 'SP' });
                          setIsModalOpen(true);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 불펜 */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">불펜 & 마무리 (Bullpen)</div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                <div className="border-r pr-3 mr-1 flex-shrink-0">
                  <MiniPlayerCard 
                    player={getPlayerBySlot('CP', 1)?.players || null}
                    positionLabel="CP"
                    onClick={() => {
                      setTargetSlot({ type: 'CP', order: 1, pos: 'CP' });
                      setIsModalOpen(true);
                    }}
                  />
                </div>
                {[1, 2, 3, 4, 5].map(order => {
                  const player = getPlayerBySlot('RP', order);
                  return (
                    <div key={`RP-${order}`} className="flex-shrink-0">
                      <MiniPlayerCard 
                        player={player ? player.players : null}
                        positionLabel={`RP ${order}`}
                        onClick={() => {
                          setTargetSlot({ type: 'RP', order, pos: 'RP' });
                          setIsModalOpen(true);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 벤치 멤버 (1칸 차지) */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2 flex items-center gap-2">
            🪑 벤치 <span className="text-sm font-normal text-gray-500">(대타)</span>
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {[1, 2, 3, 4, 5].map(order => {
              const player = getPlayerBySlot('BENCH', order);
              return (
                <div key={`BENCH-${order}`} className="flex-shrink-0">
                  <MiniPlayerCard 
                    player={player ? player.players : null}
                    positionLabel={`B ${order}`}
                    onClick={() => {
                      setTargetSlot({ type: 'BENCH', order, pos: 'BENCH' });
                      setIsModalOpen(true);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 하단 저장/초기화 버튼 */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 flex justify-center gap-4 z-40 shadow-lg">
        {/* [추가] 초기화 버튼 */}
        <button 
          onClick={handleReset}
          disabled={!isDirty}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold text-lg disabled:opacity-50 transition"
        >
          초기화
        </button>
        
        <button 
          onClick={handleSave}
          disabled={!isDirty}
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-bold text-lg disabled:bg-gray-400 transition shadow-md"
        >
          라인업 저장하기
        </button>
      </div>

      {/* 선수 교체 모달 */}
      {isModalOpen && targetSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">
                선수 교체 ({targetSlot.type === 'BATTER' ? targetSlot.pos : targetSlot.type} {targetSlot.order > 0 ? targetSlot.order : ''})
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-100">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {getAvailablePlayers().length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-10">
                    교체 가능한 선수가 없습니다.
                  </div>
                ) : (
                  getAvailablePlayers().map((rosterItem) => (
                    <div key={rosterItem.id} className="flex justify-center">
                      <MiniPlayerCard 
                        player={rosterItem.players}
                        onClick={() => handleSwapPlayer(rosterItem)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}