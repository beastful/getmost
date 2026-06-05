// stores/auth-store.ts
import { create } from 'zustand';
import { account } from '@/lib/appwrite';
import type { Models } from 'appwrite';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  isInitialized: boolean; // сессия проверена (не путать с loading)
  isLoading: boolean;     // идёт API-запрос
  error: string | null;
  
  // Действия
  init: () => Promise<void>;
  setUser: (user: Models.User<Models.Preferences> | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  
  init: async () => {
    try {
      const user = await account.get();
      set({ user, isInitialized: true });
    } catch {
      set({ user: null, isInitialized: true });
    }
  },
  
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
