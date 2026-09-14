import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [coupleProfile, setCoupleProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ac_token');
    if (token) {
      authApi.getMe()
        .then((res) => {
          const data = res.data.data;
          // getMe returns { user, coupleProfile } or the user object directly
          if (data?.user) {
            setUser(data.user);
            setCoupleProfile(data.user?.coupleProfile || data.coupleProfile || null);
          } else {
            setUser(data);
            setCoupleProfile(data?.coupleProfile || null);
          }
        })
        .catch(() => {
          localStorage.removeItem('ac_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const data = res.data.data;
    // Backend returns accessToken (not token)
    const token = data.accessToken || data.token;
    localStorage.setItem('ac_token', token);
    const userObj = data.user || data;
    setUser(userObj);
    setCoupleProfile(userObj?.coupleProfile || data.coupleProfile || null);
    return res.data;
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    const data = res.data.data;
    // Backend returns accessToken (not token)
    const token = data.accessToken || data.token;
    localStorage.setItem('ac_token', token);
    const userObj = data.user || data;
    setUser(userObj);
    // coupleProfile is nested inside user object from backend
    setCoupleProfile(userObj?.coupleProfile || data.coupleProfile || null);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('ac_token');
    setUser(null);
    setCoupleProfile(null);
  };

  const updateProfile = (profile) => setCoupleProfile(profile);

  return (
    <AuthContext.Provider value={{ user, coupleProfile, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
