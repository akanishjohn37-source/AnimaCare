import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API = 'http://127.0.0.1:8000/api/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('ac_token'));
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
        // Token invalid / expired — clear storage
        localStorage.removeItem('ac_token');
        setToken(null);
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
      setToken(data.token);
      setUser(data.user);
    }
    return data; // caller handles "requires_approval" messaging
  };

  const logout = () => {
    localStorage.removeItem('ac_token');
    setToken(null);
    setUser(null);
  };

  const authFetch = useCallback((url, opts = {}) => {
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
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
