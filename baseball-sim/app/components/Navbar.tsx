"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

export default function Navbar() {
  const { session, profile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    // 1. Supabase 로그아웃 요청
    await supabase.auth.signOut();
    
    // 2. 메인 페이지로 이동
    router.push("/");
    
    // (참고: AuthProvider의 onAuthStateChange가 감지하여 세션 상태를 null로 바꿈)
  };

  return (
    <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
      <div className="flex gap-6 items-center">
        <Link href="/" className="text-xl font-bold text-yellow-400 hover:text-yellow-300 transition">
          ⚾ Baseball Sim
        </Link>
        {session && (
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/roster" className="hover:text-yellow-200 transition">선수단 관리</Link>
            <Link href="/lineup" className="hover:text-yellow-200 transition">라인업 설정</Link>
          </div>
        )}
      </div>

      <div>
        {session && profile ? (
          <div className="flex gap-4 items-center">
            {/* 코인 표시 */}
            <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-600 text-sm font-mono text-yellow-400">
              💰 {profile.coins.toLocaleString()} G
            </span>
            
            {/* 유저 이메일 */}
            <span className="text-sm text-gray-300 hidden md:inline-block">
              {session.user.email}
            </span>

            {/* 로그아웃 버튼 */}
            <button 
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded transition font-bold"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-400">로그인 필요</span>
        )}
      </div>
    </nav>
  );
}