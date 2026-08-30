import { useEffect, useState } from 'react';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { Play, Settings, LogOut, ArrowLeft, Map, Hammer } from 'lucide-react';

export default function GameMenu() {
  const { currentScreen, setCurrentScreen, setSelectedTreeId } = useAppStore();
  const [trees, setTrees] = useState<{ id: string; title: string; description: string }[]>([]);

  useEffect(() => {
    // On ne charge QUE les niveaux publiés (is_published: true)
    if (currentScreen === 'levels') {
      supabase.from('trees').select('*').eq('is_published', true).order('created_at', { ascending: true })
        .then(({ data }) => { if (data) setTrees(data); });
    }
  }, [currentScreen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- ÉCRAN 2 : SÉLECTION DES NIVEAUX ---
  if (currentScreen === 'levels') {
    return (
      <div className="flex flex-col h-full bg-slate-900 p-6">
        <button onClick={() => setCurrentScreen('menu')} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 font-bold w-fit">
          <ArrowLeft size={20} /> Retour au menu
        </button>
        <h2 className="text-3xl font-bold text-white mb-6">Choix du Niveau</h2>
        <div className="space-y-4 overflow-y-auto pb-6">
          {trees.length === 0 ? (
            <div className="text-center text-slate-400 p-8">Aucun niveau publié pour le moment.</div>
          ) : (
            trees.map(tree => (
              <button
                key={tree.id}
                onClick={() => {
                  setSelectedTreeId(tree.id);
                  setCurrentScreen('game');
                }}
                className="w-full bg-slate-800 border border-slate-700 p-6 rounded-2xl text-left hover:bg-slate-700 hover:border-blue-500 transition-all active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600/20 p-3 rounded-xl text-blue-500"><Map size={24} /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{tree.title}</h3>
                    <p className="text-slate-400 text-sm">{tree.description}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- ÉCRAN 1 : MENU PRINCIPAL ---
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-6 relative">
      <div className="text-7xl mb-6">🌳</div>
      <h1 className="text-4xl font-bold text-white mb-12">Politropia</h1>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => setCurrentScreen('levels')}
          className="w-full flex items-center gap-4 bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-bold text-lg transition-all active:scale-95"
        >
          <Play size={24} /> Jouer
        </button>

        {/* ✨ LE BOUTON CRÉATEUR EST LÀ ! */}
        <button
          onClick={() => setCurrentScreen('creator')}
          className="w-full flex items-center gap-4 bg-purple-600 hover:bg-purple-500 text-white p-5 rounded-2xl font-bold text-lg transition-all active:scale-95"
        >
          <Hammer size={24} /> Mode Création
        </button>

        <button
          onClick={() => setCurrentScreen('profile')}
          className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-2xl font-bold text-lg transition-all active:scale-95 border border-slate-700"
        >
          <Settings size={24} /> Paramètres du compte
        </button>
      </div>

      <div className="absolute bottom-6 w-full max-w-sm px-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 p-4 rounded-xl font-bold transition-all active:scale-95"
        >
          <LogOut size={20} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}