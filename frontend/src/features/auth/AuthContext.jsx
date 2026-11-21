import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, setSessionExpiredHandler, tokenStore } from '../../api/client.js';
import { queryClient } from '../../app/queryClient.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'anonymous'));

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    const controller = new AbortController();

    api('/auth/me', { signal: controller.signal })
      .then((data) => {
        setUser(data.user);
        setStatus('authenticated');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setUser(null);
        setStatus('anonymous');
      });

    return () => controller.abort();
  }, []);

  const login = useCallback(async (schoolCode, email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { schoolCode, email, password } });
    tokenStore.set(data.token);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const platformLogin = useCallback(async (email, password) => {
    const data = await api('/auth/platform/login', {
      method: 'POST',
      body: { email, password },
      expireSession: false,
    });
    tokenStore.set(data.token);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const markPasswordChanged = useCallback(() => {
    setUser((current) => (current ? { ...current, mustChangePassword: false } : current));
  }, []);

  const value = useMemo(
    () => ({ user, status, login, platformLogin, logout, markPasswordChanged }),
    [user, status, login, platformLogin, logout, markPasswordChanged],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}