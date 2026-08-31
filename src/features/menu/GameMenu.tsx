import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { Play, Settings, LogOut, ArrowLeft, Map, Hammer, Shield, Check, X, Star } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  can_create: boolean;
}

interface TreeItem {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  is_featured: boolean;
  creator_id: string;
}

export default function GameMenu() {
  const { currentScreen, setCurrentScreen, setSelectedTreeId, session } = useAppStore();
  const [trees, setTrees] = useState<TreeItem[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [allTrees, setAllTrees] = useState<TreeItem[]>([]);
  const [adminTab, setAdminTab] = useState<'users' | 'featured'>('users');
  const [adminLoading, setAdminLoading] = useState(false);

  const checkUserPermissions = useCallback(async () => {
    if (!session) return;
    
    if (session.user.email === 'pierreduquet@yahoo.com') {
      setIsAdmin(true);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('can_create')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setCanCreate(!!data.can_create);
    } else if (session.user.email === 'pierreduquet@yahoo.com') {
      setCanCreate(true);
    }
    if (error) {
      console.error("Erreur lors de la vérification des droits :", error);
    }
  }, [session]);

  useEffect(() => {
    if (currentScreen === 'menu') {
      checkUserPermissions();
    }
  }, [currentScreen, checkUserPermissions]);

  useEffect(() => {
    if (currentScreen === ('admin' as any) && isAdmin) {
      loadAdminData();
    }
    if (currentScreen === 'levels') {
      supabase.from('trees').select('*').eq('is_published', true).order('is_featured', { ascending: false })
        .then(({ data }) => { if (data) setTrees(data); });
    }
  }, [currentScreen, isAdmin]);

  const loadAdminData = async () => {
    setAdminLoading(true);
    const profilesRes = await supabase.from('profiles').select('*');
    if (profilesRes.data) setAllProfiles(profilesRes.data);

    const treesRes = await supabase.from('trees').select('*').eq('is_published', true);
    if (treesRes.data) setAllTrees(treesRes.data);

    setAdminLoading(false);
  };

  const toggleUserCreationRights = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    const { error } = await supabase
      .from('profiles')
      .update({ can_create: newStatus })
      .eq('id', userId);

    if (error) {
      alert("Erreur Supabase lors de la modification des droits.");
      return;
    }

    if (!newStatus) {
      await supabase
        .from('trees')
        .update({ is_published: false, is_featured: false })
        .eq('creator_id', userId);
    }

    setAllProfiles(allProfiles.map(p => p.id === userId ? { ...p, can_create: newStatus } : p));
    loadAdminData();
  };

  const toggleFeatureTree = async (treeId: string, currentFeatured: boolean) => {
    const { error } = await supabase
      .from('trees')
      .update({ is_featured: !currentFeatured })
      .eq('id', treeId);

    if (!error) {
      setAllTrees(allTrees.map(t => t.id === treeId ? { ...t, is_featured: !currentFeatured } : t));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (currentScreen === ('admin' as any) && isAdmin) {
    return (
      <div className="flex flex-col h-full bg-slate-900 p-6">
        <button onClick={() => setCurrentScreen('menu')} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 font-bold w-fit">
          <ArrowLeft size={20} /> Retour au menu
        </button>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-amber-500" size={32} />
          <h2 className="text-3xl font-bold text-white">Panneau Administrateur</h2>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setAdminTab('users')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${adminTab === 'users' ? 'bg-amber-600 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Gestion des Utilisateurs
          </button>
          <button
            onClick={() => setAdminTab('featured')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${adminTab === 'featured' ? 'bg-amber-600 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Gestion des niveaux publiés
          </button>
        </div>

        {adminLoading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Chargement...</div>
        ) : adminTab === 'users' ? (
          <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden flex-1 shadow-xl flex flex-col">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 font-bold text-slate-300 grid grid-cols-2 text-sm">
              <span>Utilisateur / Pseudo</span>
              <span className="text-right">Accès Mode Création (Dépublie si bloqué)</span>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-700/50 flex-1">
              {allProfiles.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="font-bold text-white text-base">{profile.username || 'Sans pseudo'}</div>
                  <button
                    onClick={() => toggleUserCreationRights(profile.id, profile.can_create)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                      profile.can_create 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    }`}
                  >
                    {profile.can_create ? <Check size={16} /> : <X size={16} />}
                    {profile.can_create ? 'Autorisé' : 'Bloqué'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden flex-1 shadow-xl flex flex-col">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 font-bold text-slate-300 grid grid-cols-2 text-sm">
              <span>Niveaux publiés</span>
              <span className="text-right">Actions Admin</span>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-700/50 flex-1">
              {allTrees.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Aucun niveau publié disponible.</div>
              ) : (
                allTrees.map(tree => (
                  <div key={tree.id} className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors">
                    <div className="font-bold text-white text-base">{tree.title}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFeatureTree(tree.id, tree.is_featured)}
                        className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition-all ${
                          tree.is_featured 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30' 
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        <Star size={16} className={tree.is_featured ? 'fill-yellow-400' : ''} />
                        {tree.is_featured ? 'En avant' : 'Standard'}
                      </button>

                      <button
                        onClick={async () => {
                          if (!window.confirm(`Voulez-vous vraiment dépublier le niveau "${tree.title}" ?`)) return;
                          const { error } = await supabase
                            .from('trees')
                            .update({ is_published: false, is_featured: false })
                            .eq('id', tree.id);
                          
                          if (!error) {
                            setAllTrees(allTrees.filter(t => t.id !== tree.id));
                          } else {
                            alert("Erreur lors de la dépublication.");
                          }
                        }}
                        className="px-3 py-2 rounded-xl font-bold text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                      >
                        Dépublier
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

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
                className={`w-full border p-6 rounded-2xl text-left transition-all active:scale-95 flex items-center justify-between ${
                  tree.is_featured 
                    ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-500/10' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-blue-500'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${tree.is_featured ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-600/20 text-blue-500'}`}>
                    <Map size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{tree.title}</h3>
                      {tree.is_featured && (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star size={10} className="fill-amber-400" /> C'est l'heure de partir au boulot
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{tree.description}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-6 relative">
      <div className="text-7xl mb-6">🌳</div>
      <h1 className="text-4xl font-bold text-white mb-12">Politropia</h1>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => setCurrentScreen('levels')}
          className="w-full flex items-center gap-4 bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg"
        >
          <Play size={24} /> Jouer
        </button>

        {canCreate && (
          <button
            onClick={() => setCurrentScreen('creator')}
            className="w-full flex items-center gap-4 bg-purple-600 hover:bg-purple-500 text-white p-5 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg"
          >
            <Hammer size={24} /> Mode Création
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setCurrentScreen('admin' as any)}
            className="w-full flex items-center gap-4 bg-amber-600 hover:bg-amber-500 text-slate-950 p-5 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg"
          >
            <Shield size={24} /> Panneau Admin
          </button>
        )}

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