import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

// Nos nouveaux écrans
// Modifie juste cette ligne en haut du fichier :
// Modifie juste la ligne "type Screen" en haut du fichier :
type Screen = 'auth' | 'menu' | 'levels' | 'game' | 'profile' | 'leaderboard' | 'creator';

interface AppState {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  session: Session | null;
  setSession: (session: Session | null) => void;
  selectedTreeId: string | null;
  setSelectedTreeId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'auth', // On commence toujours par l'authentification
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  session: null,
  setSession: (session) => set({ session }),
  selectedTreeId: null, // Le niveau choisi par le joueur
  setSelectedTreeId: (id) => set({ selectedTreeId: id }),
}));