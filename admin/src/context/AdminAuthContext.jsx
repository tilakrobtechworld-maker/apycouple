import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';

// ─── Context ───────────────────────────────────────────────────────────────────
const AdminAuthContext = createContext(null);

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until session check completes

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: body } = await adminApi.getMe();
        const data = body.data;
        setAdminUser(data.admin || data.user || data);
      } catch {
        // Token invalid or expired — clear it
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setAdminUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data: body } = await adminApi.login(email, password);
    const data = body.data;

    const token = data.token || data.accessToken;
    const user = data.admin || data.user;

    if (!token) throw new Error('No token received from server');

    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    setAdminUser(user);

    return user;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
    window.location.href = '/admin/login';
  }, []);

  const value = {
    adminUser,
    isLoading,
    isAuthenticated: !!adminUser,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}

export default AdminAuthContext;
