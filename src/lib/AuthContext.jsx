import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      console.log("1. AuthProvider: 현재 사용자 세션 확인 시작...");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("2. AuthProvider: 현재 세션 정보:", session);

      if (session?.user) {
        console.log("3. AuthProvider: 세션에서 사용자 발견. 프로필 조회 시작...", session.user.id);
        const { data: userProfile, error } = await supabase
          .from('Profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        console.log("4. AuthProvider: 프로필 조회 결과:", { userProfile, error });
        setUser(session.user);
        setProfile(userProfile);
      }
      setLoading(false);
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`--- 이벤트 감지: ${event} ---`, session);
      setUser(session?.user ?? null);
      setProfile(null); // 프로필은 다시 조회해야 하므로 초기화
      if (session?.user) {
          checkUser(); // 로그인/로그아웃 시 사용자 정보 다시 확인
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;