"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "../providers/AuthProvider";
import PlayerSelectModal from "@/app/components/PlayerSelectModal";

// 프론트엔드에서 관리할 라인업 아이템 타입
type LineupItem = {
  player_id: number;
  lineup_type: string;
  order_no: number;
  defensive_position: string | null;
  // UI 표시용 (저장할 땐 필요 없지만 화면엔 필요)
  players: {
    name: string;
    primary_position: string;
    overall: number;
  };
};

export default function LineupPage() {
  const { session } = useAuth();
  
  // [핵심] 로컬 상태 (화면에 보이는 라인업)
  const [localLineup, setLocalLineup] = useState<LineupItem[]>([]);
  const [isDirty, setIsDirty] = useState(false); // 변경사항 있는지 여부
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<{ type: string; order: number } | null>(null);

  // 1. 초기 데이터 로드
  const fetchLineup = async () => {
    if (!session) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("user_lineup")
      .select(`
        player_id, lineup_type, order_no, defensive_position,
        players (name, primary_position, overall)
      `)
      .eq("user_id", session.user.id);

    if (data) {
      setLocalLineup(data as any);
      setIsDirty(false); // 불러온 직후엔 변경사항 없음
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLineup();
  }, [session]);

  // 2. 모달에서 선수를 선택했을 때 (로컬 상태 업데이트)
  const handleLocalUpdate = (player: any, defensivePos: string | null) => {
    if (!targetSlot) return;

    // 불변성 유지를 위해 배열 복사
    let newLineup = [...localLineup];

    // (1) 중복 방지: 이 선수가 이미 다른 자리에 있다면 제거
    newLineup = newLineup.filter((item) => item.player_id !== player.id);

    // (2) 교체: 현재 타겟 슬롯에 있는 선수 제거
    newLineup = newLineup.filter(
      (item) => !(item.lineup_type === targetSlot.type && item.order_no === targetSlot.order)
    );

    // (3) 추가: 새 선수 등록
    newLineup.push({
      player_id: player.id,
      lineup_type: targetSlot.type,
      order_no: targetSlot.order,
      defensive_position: defensivePos,
      players: {
        name: player.name,
        primary_position: player.primary_position,
        overall: player.overall,
      },
    });

    setLocalLineup(newLineup);
    setIsDirty(true); // "저장되지 않음" 상태 표시
  };

  // [추가] 라인업 유효성 검사 함수
  const validateLineup = () => {
    // 1. 전체 인원 수 체크 (25명)
    if (localLineup.length < 25) {
      alert(`라인업이 비어있습니다! 모든 슬롯을 채워주세요.\n(현재 ${localLineup.length}/25명)`);
      return false;
    }

    // 2. 필수 슬롯이 다 있는지 체크 (혹시 모를 버그 방지)
    const requiredSlots = [
      ...Array.from({ length: 9 }, (_, i) => ({ type: 'BATTER', order: i + 1 })),
      ...Array.from({ length: 5 }, (_, i) => ({ type: 'SP', order: i + 1 })),
      ...Array.from({ length: 5 }, (_, i) => ({ type: 'RP', order: i + 1 })),
      { type: 'CP', order: 1 },
      ...Array.from({ length: 5 }, (_, i) => ({ type: 'BENCH', order: i + 1 })),
    ];

    for (const slot of requiredSlots) {
      const exists = localLineup.find(
        (item) => item.lineup_type === slot.type && item.order_no === slot.order
      );
      if (!exists) {
        alert(`${slot.type === 'BATTER' ? '타자' : slot.type} ${slot.order}번 슬롯이 비어있습니다.`);
        return false;
      }
    }

    return true;
  };

  // 3. 서버에 일괄 저장
  const handleSave = async () => {
    if (!session) return;

    // [추가] 저장 전 유효성 검사 실행
    if (!validateLineup()) return;
    
    if (!confirm("현재 라인업을 저장하시겠습니까?")) return;

    try {
      // 서버로 보낼 데이터 정제 (UI용 players 객체 제거)
      const payload = localLineup.map((item) => ({
        player_id: item.player_id,
        lineup_type: item.lineup_type,
        order_no: item.order_no,
        defensive_position: item.defensive_position,
      }));

      const { error } = await supabase.rpc("save_user_lineup", {
        p_user_id: session.user.id,
        p_lineup_data: payload,
      });

      if (error) throw error;

      alert("저장되었습니다!");
      setIsDirty(false); // 저장 완료
      fetchLineup(); // 확실하게 하기 위해 다시 불러오기

    } catch (err: any) {
      alert("저장 실패: " + err.message);
    }
  };

  // 4. 초기화 (저장 안 하고 되돌리기)
  const handleReset = () => {
    if (confirm("변경사항을 취소하고 마지막 저장 상태로 되돌립니까?")) {
      fetchLineup();
    }
  };

  // 헬퍼 함수
  const findPlayer = (type: string, order: number) => {
    return localLineup.find((item) => item.lineup_type === type && item.order_no === order);
  };
  
  const handleOpenModal = (type: string, order: number) => {
    setTargetSlot({ type, order });
    setIsModalOpen(true);
  };

  if (!session) return <div className="p-4">로그인이 필요합니다.</div>;
  if (loading) return <div className="p-4">라인업 불러오는 중...</div>;

  // RenderSlot (기존과 거의 동일, 버튼 동작만 다름)
  const RenderSlot = ({ type, order, label, showDefensivePos = false }: any) => {
    const item = findPlayer(type, order);
    return (
      <div className="flex items-center gap-2 p-2 bg-white border rounded mb-2 shadow-sm h-14">
        <div className="w-14 font-bold text-gray-500 text-sm flex-shrink-0">{label}</div>
        {item ? (
          <div className="flex-1 flex justify-between items-center min-w-0">
            <div className="truncate">
              <span className="font-bold text-blue-900 mr-2">{item.players.name}</span>
              <span className="text-xs text-gray-500">
                {showDefensivePos ? (item.defensive_position || "DH") : item.players.primary_position} 
                {" "}/ {item.players.overall}
              </span>
            </div>
            <button onClick={() => handleOpenModal(type, order)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded ml-2 flex-shrink-0">교체</button>
          </div>
        ) : (
          <div className="flex-1 flex justify-between items-center">
            <span className="text-gray-300 text-sm">(비어있음)</span>
            <button onClick={() => handleOpenModal(type, order)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded flex-shrink-0">등록</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-24"> {/* 하단 저장 버튼 공간 확보 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">라인업 관리</h2>
        {isDirty && <span className="text-red-500 text-sm font-bold animate-pulse">● 변경사항 있음 (저장 필요)</span>}
      </div>

      {/* ... (기존 그리드 UI 코드: 타자, 투수, 벤치) ... */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-4 rounded-xl border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">⚾ 타자 라인업</h3>
          {[...Array(9)].map((_, i) => (
            <RenderSlot key={`BATTER_${i + 1}`} type="BATTER" order={i + 1} label={`${i + 1}번`} showDefensivePos={true} />
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">🧢 투수진</h3>
          <h4 className="text-sm font-bold text-gray-600 mt-2 mb-2">선발 투수</h4>
          {[...Array(5)].map((_, i) => (
            <RenderSlot key={`SP_${i + 1}`} type="SP" order={i + 1} label={`선발 ${i + 1}`} />
          ))}
          <h4 className="text-sm font-bold text-gray-600 mt-4 mb-2">불펜 / 마무리</h4>
          <RenderSlot type="CP" order={1} label="마무리" />
          {[...Array(5)].map((_, i) => (
            <RenderSlot key={`RP_${i + 1}`} type="RP" order={i + 1} label={`계투 ${i + 1}`} />
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border lg:col-span-2">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">🪑 벤치 멤버</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {[...Array(5)].map((_, i) => (
              <RenderSlot key={`BENCH_${i + 1}`} type="BENCH" order={i + 1} label={`벤치 ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>

      {/* 하단 고정 저장 바 */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-lg flex justify-center gap-4 z-40">
        <button 
          onClick={handleReset}
          disabled={!isDirty}
          className="px-6 py-3 rounded-lg font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          초기화
        </button>
        <button 
          onClick={handleSave}
          disabled={!isDirty}
          className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
        >
          라인업 저장하기
        </button>
      </div>

      <PlayerSelectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetSlot={targetSlot}
        userId={session.user.id}
        onSelect={handleLocalUpdate} // DB 호출 대신 로컬 업데이트 함수 전달
      />
    </div>
  );
}