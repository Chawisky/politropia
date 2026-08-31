import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type Screen = 'auth' | 'menu' | 'levels' | 'game' | 'profile' | 'leaderboard' | 'creator' | 'admin';

interface AppState {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  session: Session | null;
  setSession: (session: Session | null) => void;
  selectedTreeId: string | null;
  setSelectedTreeId: (id: string | null) => void;
  // ✨ Élargissement du type pour accepter 'profile'
  activeTab: 'tree' | 'leaderboard' | 'profile';
  setActiveTab: (tab: 'tree' | 'leaderboard' | 'profile') => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'auth',
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  session: null,
  setSession: (session) => set({ session }),
  selectedTreeId: null,
  setSelectedTreeId: (id) => set({ selectedTreeId: id }),
  activeTab: 'tree',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
