import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = [
  { role: 'Admin', username: 'admin', password: 'admin123', label: 'Superintendent of Police (Admin)' },
  { role: 'Control Room Officer', username: 'control_room', password: 'control123', label: 'Control Room Officer (Dial 112)' },
  { role: 'Beat Officer', username: 'beat_officer', password: 'beat123', label: 'Beat Officer (Field / Mobile)' },
  { role: 'Analyst', username: 'analyst', password: 'analyst123', label: 'Crime Intelligence Analyst' }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('garuda_token');
    const savedUser = localStorage.getItem('garuda_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('garuda_token');
        localStorage.removeItem('garuda_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem('garuda_token', data.access_token);
    localStorage.setItem('garuda_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('garuda_token');
    localStorage.removeItem('garuda_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
