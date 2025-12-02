"use client";

import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";

type UserProfile = {
  user_id: string;
  coins: number;
};

type AuthContextType = {
  session: Session | null;
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // 유저 프로필(코인) 가져오기
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profile") // 공유해주신 테이블 이름
      .select("user_id, coins")
      .eq("user_id", userId)
      .single();

    if (data) {
      setProfile(data);
    } else if (error) {
      console.error("프로필 로딩 실패:", error);
    }
  }, []);

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // 1. 초기 세션 로드
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id);
      }
    });

    // 2. 세션 변경 감지
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);