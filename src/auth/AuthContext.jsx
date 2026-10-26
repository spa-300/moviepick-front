import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthExpired, setAccessToken } from '../api/client';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const bootedRef = useRef(false);

  const loadMe = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  // 새로고침 시 로그인 상태 복구: CSRF 발급 → refresh → 내 정보
  // /oauth2/success 화면은 같은 과정을 직접 단계별로 보여 주므로 여기서는 CSRF만 받는다
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try {
        await authApi.csrf();
        if (!window.location.pathname.startsWith('/oauth2/success') && (await authApi.refresh())) {
          await loadMe();
        }
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, [loadMe]);

  // refresh 실패 시 로그아웃 상태로 전환
  useEffect(() => onAuthExpired(() => setUser(null)), []);

  const login = useCallback(
    async (email, password) => {
      await authApi.login({ email, password });
      return loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = { user, booting, isAdmin: user?.role === 'ADMIN', login, logout, loadMe };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
