import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const API = `${API_BASE_URL}/api/auth`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('ac_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('ac_refresh_token'));
  const [loading, setLoading] = useState(true);

  // Fetch /me on mount if token exists
  const fetchMe = useCallback(async (tkn) => {
    if (!tkn) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/me/`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Token invalid / expired
        const refreshRes = await fetch(`${API}/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: localStorage.getItem('ac_refresh_token') }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          localStorage.setItem('ac_token', refreshData.token);
          localStorage.setItem('ac_refresh_token', refreshData.refresh);
          setToken(refreshData.token);
          setRefreshToken(refreshData.refresh);
          const retryRes = await fetch(`${API}/me/`, {
            headers: { Authorization: `Bearer ${refreshData.token}` },
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            setUser(retryData);
            return;
          }
        }
        localStorage.removeItem('ac_token');
        localStorage.removeItem('ac_refresh_token');
        setToken(null);
        setRefreshToken(null);
        setUser(null);
      }
    } catch {
      // Network error — keep token, try later
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(token); }, [token, fetchMe]);

  const login = async (username, password) => {
    const res = await fetch(`${API}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      // data may be { non_field_errors: [...] } or plain object
      const msg =
        data?.non_field_errors?.[0] ||
        data?.detail ||
        Object.values(data)[0] ||
        'Login failed.';
      throw new Error(msg);
    }
    localStorage.setItem('ac_token', data.token);
    if (data.refresh) {
      localStorage.setItem('ac_refresh_token', data.refresh);
      setRefreshToken(data.refresh);
    }
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const res = await fetch(`${API}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const firstError =
        Object.entries(data)
          .map(([k, v]) => (Array.isArray(v) ? `${k}: ${v[0]}` : `${k}: ${v}`))
          .join(' | ');
      throw new Error(firstError || 'Registration failed.');
    }
    // If token included (citizen auto-approved), log them in
    if (data.token) {
      localStorage.setItem('ac_token', data.token);
      if (data.refresh) {
        localStorage.setItem('ac_refresh_token', data.refresh);
        setRefreshToken(data.refresh);
      }
      setToken(data.token);
      setUser(data.user);
    }
    return data; // caller handles "requires_approval" messaging
  };

  const logout = () => {
    localStorage.removeItem('ac_token');
    localStorage.removeItem('ac_refresh_token');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const authFetch = useCallback(async (url, opts = {}) => {
    const targetUrl = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, API_BASE_URL);
    const makeRequest = (currentAuthToken) => fetch(targetUrl, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {}),
        ...(opts.headers || {}),
      },
    });

    let res = await makeRequest(token);
    if (res.status === 401) {
      const storedRefreshToken = localStorage.getItem('ac_refresh_token');
      if (storedRefreshToken) {
        const refreshRes = await fetch(`${API}/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: storedRefreshToken }),
        });
        
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          localStorage.setItem('ac_token', refreshData.token);
          localStorage.setItem('ac_refresh_token', refreshData.refresh);
          setToken(refreshData.token);
          setRefreshToken(refreshData.refresh);
          
          res = await makeRequest(refreshData.token);
        } else {
          logout();
        }
      } else {
        logout();
      }
    }
    return res;
  }, [token]);

  const hasRole = (...roles) => roles.includes(user?.role);

  const isApproved = () => user?.account_status === 'active';

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout,
      authFetch, hasRole, isApproved,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
