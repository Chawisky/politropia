import { useEffect } from 'react';
import { supabase } from './core/supabase';
import { useAppStore } from './store/useAppStore';

import Profile from './features/social/Profile';
import GameMenu from './features/menu/GameMenu';
import TreeViewer from './features/tree/TreeViewer';
import CreatorDashboard from './features/creator/CreatorDashboard';

export default function App() {
  const { currentScreen, setCurrentScreen, session, setSession } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession && useAppStore.getState().currentScreen === 'auth') {
        setCurrentScreen('menu');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_IN') setCurrentScreen('menu');
      if (event === 'SIGNED_OUT') setCurrentScreen('auth');
    });

    return () => subscription.unsubscribe();
  }, [setSession, setCurrentScreen]);

  const renderScreen = () => {
    if (!session) return <Profile />;

    switch (currentScreen) {
      case 'auth':
        return <Profile />;
      case 'menu':
      case 'levels':
        return <GameMenu />;
      case 'creator':
        return <CreatorDashboard />;
      case 'game':
        return <TreeViewer />;
      case 'profile':
        return (
          <div className="h-full flex flex-col bg-slate-900">
            <button 
              onClick={() => setCurrentScreen('menu')} 
              className="p-6 text-slate-400 hover:text-white text-left font-bold transition-colors"
            >
              ← Retour au menu
            </button>
            <Profile />
          </div>
        );
      default:
        return <GameMenu />;
    }
  };

  return (
    <div className="antialiased text-slate-50 h-screen w-full flex flex-col bg-slate-900 overflow-hidden">
      {renderScreen()}
    </div>
  );
}