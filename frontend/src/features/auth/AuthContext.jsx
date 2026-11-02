import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, setSessionExpiredHandler, tokenStore } from '../../api/client.js';
import { queryClient } from '../../app/queryClient.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' only while we check a token found in storage
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'anonymous'));

  // The API client calls this when the server answers 401 (expired session)
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
  }, []);

  // On page load, ask the server who the stored token belongs to
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

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(data.token);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    queryClient.clear(); // never show the previous user's data to the next one
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Called once the server accepted the new password
  const markPasswordChanged = useCallback(() => {
    setUser((current) => (current ? { ...current, mustChangePassword: false } : current));
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, markPasswordChanged }),
    [user, status, login, logout, markPasswordChanged],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}