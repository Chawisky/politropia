import { useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { Lock, Unlock, Star, Settings, RefreshCw, LogOut, Play, Map, Trophy } from 'lucide-react';
import LevelLeaderboard from '../social/LevelLeaderboard';

interface Node { id: string; title: string; x_pos: number; y_pos: number; parent_id: string | null; }

export default function TreeViewer() {
  const { session, selectedTreeId, setCurrentScreen } = useAppStore();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [unlockedNodes, setUnlockedNodes] = useState<string[]>([]);
  const [animatingNode, setAnimatingNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  // ✨ Notre nouvel état local pour la barre du bas
  const [activeTab, setActiveTab] = useState<'tree' | 'leaderboard'>('tree');

  useEffect(() => {
    if (!selectedTreeId) return;
    const loadLevelData = async () => {
      setLoading(true);
      const { data: nodesData } = await supabase.from('nodes').select('*').eq('tree_id', selectedTreeId);
      if (nodesData) setNodes(nodesData);

      if (session && nodesData) {
        const nodeIds = nodesData.map(n => n.id);
        const { data: progressData } = await supabase.from('user_progress').select('node_id').eq('user_id', session.user.id).in('node_id', nodeIds);
        if (progressData) setUnlockedNodes(progressData.map(p => p.node_id));
      }
      setLoading(false);
    };
    loadLevelData();
  }, [selectedTreeId, session]);

  const handleNodeClick = async (node: Node, status: string) => {
    if (!session || status !== 'available') return;
    const { error } = await supabase.from('user_progress').insert({ user_id: session.user.id, node_id: node.id });
    if (!error) {
      setUnlockedNodes([...unlockedNodes, node.id]);
      setAnimatingNode(node.id);
      setTimeout(() => setAnimatingNode(null), 700);
    }
  };

  const handleReset = async () => {
    if (!session || nodes.length === 0) return;
    if (!window.confirm("Voulez-vous vraiment recommencer ce niveau à zéro ?")) return;
    const nodeIds = nodes.map(n => n.id);
    const { error } = await supabase.from('user_progress').delete().eq('user_id', session.user.id).in('node_id', nodeIds);
    if (!error) {
      setUnlockedNodes([]);
      setShowPauseMenu(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col overflow-hidden">
      
      {/* ZONE DE CONTENU PRINCIPALE */}
      <div className="flex-1 relative overflow-hidden touch-none">
        
        {/* BOUTON PARAMÈTRES (Affiché uniquement si on est sur l'arbre) */}
        {activeTab === 'tree' && (
          <button onClick={() => setShowPauseMenu(true)} className="absolute top-6 right-6 z-40 bg-slate-800/90 backdrop-blur-md p-3 rounded-full border border-slate-700 shadow-xl text-slate-300 hover:text-white transition-all active:scale-95">
            <Settings size={24} />
          </button>
        )}

        {/* MODALE DE PAUSE */}
        {showPauseMenu && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 w-full max-w-sm space-y-4 shadow-2xl text-center">
              <h2 className="text-2xl font-bold text-white mb-6">Pause</h2>
              <button onClick={() => setShowPauseMenu(false)} className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold transition-all active:scale-95">
                <Play size={20} /> Reprendre
              </button>
              <button onClick={handleReset} className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl font-bold transition-all active:scale-95">
                <RefreshCw size={20} /> Recommencer
              </button>
              <button onClick={() => setCurrentScreen('menu')} className="w-full flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 p-4 rounded-xl font-bold transition-all active:scale-95 mt-4">
                <LogOut size={20} /> Retour au menu
              </button>
            </div>
          </div>
        )}

        {/* ONGLET 1 : L'ARBRE */}
        {activeTab === 'tree' && (
          <TransformWrapper initialScale={1} minScale={0.3} maxScale={2.5} centerOnInit={true} limitToBounds={false}>
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '2000px', height: '2000px', position: 'relative' }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {nodes.map(node => {
                  if (!node.parent_id) return null;
                  const parent = nodes.find(n => n.id === node.parent_id);
                  if (!parent) return null;
                  const isUnlocked = unlockedNodes.includes(node.id);
                  return (
                    <line key={`line-${node.id}`} x1={(parent.x_pos || 0) + 1000} y1={(parent.y_pos || 0) + 1000} x2={(node.x_pos || 0) + 1000} y2={(node.y_pos || 0) + 1000} stroke={isUnlocked ? "#22c55e" : "#475569"} strokeWidth="4" strokeLinecap="round" className="transition-all duration-500" />
                  );
                })}
              </svg>
              {nodes.map(node => {
                const isUnlocked = unlockedNodes.includes(node.id);
                const isAvailable = !node.parent_id || unlockedNodes.includes(node.parent_id);
                let status = 'locked';
                if (isUnlocked) status = 'unlocked'; else if (isAvailable) status = 'available';

                const colors = {
                  locked: 'bg-slate-800 border-slate-600 text-slate-500',
                  available: 'bg-yellow-500 border-yellow-400 text-slate-900 animate-pulse cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.4)]',
                  unlocked: 'bg-green-600 border-green-400 text-white cursor-default shadow-[0_0_15px_rgba(34,197,94,0.4)]',
                };
                const isAnimating = animatingNode === node.id;

                return (
                  <div key={node.id} onClick={() => handleNodeClick(node, status)} className={`absolute w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center text-center transition-all duration-500 z-20 ${colors[status as keyof typeof colors]} ${isAnimating ? 'scale-125 rotate-6 ring-4 ring-green-400 ring-offset-4 ring-offset-slate-900' : 'hover:scale-105 active:scale-95'}`} style={{ left: (node.x_pos || 0) + 1000 - 56, top: (node.y_pos || 0) + 1000 - 56 }}>
                    {status === 'unlocked' && <Unlock size={20} className="mb-1" />}
                    {status === 'available' && <Star size={20} className="mb-1" />}
                    {status === 'locked' && <Lock size={20} className="mb-1" />}
                    <span className="text-xs font-bold px-2 leading-tight">{node.title}</span>
                  </div>
                );
              })}
            </TransformComponent>
          </TransformWrapper>
        )}

        {/* ONGLET 2 : LE CLASSEMENT DU NIVEAU */}
        {activeTab === 'leaderboard' && selectedTreeId && (
          <LevelLeaderboard treeId={selectedTreeId} />
        )}
      </div>

      {/* ✨ LA BOTTOM BAR (Visible uniquement en jeu) */}
      <div className="bg-slate-900 border-t border-slate-800 pb-safe z-30">
        <div className="flex justify-around items-center p-2">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex flex-col items-center w-20 p-2 transition-colors ${activeTab === 'tree' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <Map size={24} className={activeTab === 'tree' ? 'animate-bounce' : ''} />
            <span className="text-[10px] mt-1 font-medium">Niveau</span>
          </button>
          
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center w-20 p-2 transition-colors ${activeTab === 'leaderboard' ? 'text-yellow-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <Trophy size={24} className={activeTab === 'leaderboard' ? 'animate-bounce' : ''} />
            <span className="text-[10px] mt-1 font-medium">Classement</span>
          </button>
        </div>
      </div>

    </div>
  );
}