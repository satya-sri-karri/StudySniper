import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TabType } from '../types';
import { api } from '../services/api';
import { auth, signOut, onAuthStateChanged } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  toast: { message: string; type?: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  deleteAccount: () => Promise<void>;
  touchStreak: () => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'signup' | 'verify_otp' | 'forgot' | 'reset_password';
  setAuthModalMode: (mode: 'login' | 'signup' | 'verify_otp' | 'forgot' | 'reset_password') => void;
  pendingEmail: string;
  setPendingEmail: (email: string) => void;
  demoOtp: string;
  setDemoOtp: (otp: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('studysniper_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('studysniper_theme');
    return saved ? saved === 'dark' : true; // Default dark mode for modern SaaS feel
  });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'verify_otp' | 'forgot' | 'reset_password'>('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [demoOtp, setDemoOtp] = useState('');

  // Automatic logout on inactivity (15 minutes)
  useEffect(() => {
    if (!token || !user) return;

    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 mins

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        api.logoutApi().catch(() => {});
        localStorage.removeItem('studysniper_token');
        setToken(null);
        setUser(null);
        showToast('You have been logged out due to inactivity for session security.', 'info');
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [token, user]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('studysniper_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('studysniper_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        console.warn('Auth validation failed:', err);
        localStorage.removeItem('studysniper_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();

    // Firebase Auth observer to sync active Firebase sessions
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email && !localStorage.getItem('studysniper_token')) {
        try {
          const res = await api.firebaseLogin({
            email: fbUser.email,
            name: fbUser.displayName || undefined,
            firebaseUid: fbUser.uid,
            photoURL: fbUser.photoURL || undefined
          });
          localStorage.setItem('studysniper_token', res.token);
          setToken(res.token);
          setUser(res.user);
        } catch (e) {
          console.error('Auto Firebase sync error:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('studysniper_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setAuthModalOpen(false);
    showToast(`Welcome back, ${newUser.name}! 🔥`, 'success');
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    localStorage.removeItem('studysniper_token');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    showToast('Signed out successfully.', 'info');
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  const deleteAccount = async () => {
    try {
      await api.deleteAccount();
      localStorage.removeItem('studysniper_token');
      setToken(null);
      setUser(null);
      setActiveTab('dashboard');
      showToast('Account deleted successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
    }
  };

  const touchStreak = async () => {
    try {
      const res = await api.incrementStreak();
      if (res.user) {
        setUser(res.user);
      }
    } catch {
      // silent background update
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        darkMode,
        toggleDarkMode,
        activeTab,
        setActiveTab,
        activeChatId,
        setActiveChatId,
        toast,
        showToast,
        login,
        logout,
        updateUser,
        deleteAccount,
        touchStreak,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        pendingEmail,
        setPendingEmail,
        demoOtp,
        setDemoOtp
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
