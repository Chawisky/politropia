import { useEffect, useState, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { Lock, Unlock, Star, Settings, RefreshCw, LogOut, Play, Map as MapIcon, Trophy, ArrowLeft } from 'lucide-react';
import LevelLeaderboard from '../social/LevelLeaderboard';

interface TreeNode { id: string; title: string; x: number; y: number; parentId: string | null; }

export default function TreeViewer() {
  const { session, selectedTreeId, setCurrentScreen } = useAppStore();
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [unlockedNodes, setUnlockedNodes] = useState<string[]>([]);
  const [animatingNode, setAnimatingNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'leaderboard'>('tree');
  
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  const calculateNodePositions = useCallback((currentNodes: TreeNode[]): TreeNode[] => {
    const MIN_DISTANCE = 110;
    const RADIAL_DISTANCE = 150;
    const root = currentNodes.find(n => !n.parentId);
    if (!root) return currentNodes;

    const positionedNodes = new Map();
    
    const checkCollision = (x1: number, y1: number, x2: number, y2: number) => {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) < MIN_DISTANCE;
    };

    const findValidPosition = (parentX: number, parentY: number, angle: number, distance: number, allPositions: Map<any, any>) => {
      let currentDistance = distance;
      let attempts = 0;

      while (attempts < 50) {
        const x = parentX + Math.cos(angle) * currentDistance;
        const y = parentY + Math.sin(angle) * currentDistance;
        let hasCollision = false;
        
        for (const [, pos] of allPositions) {
          if (checkCollision(x, y, pos.x, pos.y)) {
            hasCollision = true;
            break;
          }
        }

        if (!hasCollision) return { x, y };
        currentDistance += 30;
        attempts++;
      }

      return { x: parentX + Math.cos(angle) * currentDistance, y: parentY + Math.sin(angle) * currentDistance };
    };

    const calculateSubtreeWidth = (nodeId: string): number => {
      const children = currentNodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) return 0.3;
      let totalWidth = 0;
      children.forEach(child => totalWidth += calculateSubtreeWidth(child.id));
      return Math.max(totalWidth, children.length * 0.4);
    };

    const positionNode = (nodeId: string, parentX: number, parentY: number, startAngle: number, endAngle: number, level = 0) => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (!node) return;

      let x, y;
      if (level === 0) {
        x = 2000;
        y = 2000;
      } else {
        const centerAngle = startAngle + (endAngle - startAngle) / 2;
        const distance = RADIAL_DISTANCE * (1 + level * 0.15);
        const position = findValidPosition(parentX, parentY, centerAngle, distance, positionedNodes);
        x = position.x;
        y = position.y;
      }

      positionedNodes.set(nodeId, { x, y });

      const children = currentNodes.filter(n => n.parentId === nodeId);
      if (children.length > 0) {
        let totalAngle = endAngle - startAngle;
        if (level === 0) {
          totalAngle = Math.PI * 2;
          startAngle = 0;
        }

        const subtreeWidths = children.map(child => calculateSubtreeWidth(child.id));
        const totalWidth = subtreeWidths.reduce((sum, w) => sum + w, 0);

        let currentAngle = startAngle;
        children.forEach((child, index) => {
          const childAngleWidth = (subtreeWidths[index] / totalWidth) * totalAngle;
          positionNode(child.id, x, y, currentAngle, currentAngle + childAngleWidth, level + 1);
          currentAngle += childAngleWidth;
        });
      }
    };

    positionNode(root.id, 2000, 2000, 0, Math.PI * 2, 0);
    return currentNodes.map(node => ({ 
      ...node, 
      x: positionedNodes.get(node.id)?.x || 2000, 
      y: positionedNodes.get(node.id)?.y || 2000 
    }));
  }, []);

  useEffect(() => {
    if (!selectedTreeId) {
      setLoading(false);
      setErrorMsg("Aucun niveau sélectionné.");
      return;
    }

    const loadLevelData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: nodesData, error: nodeError } = await supabase
          .from('nodes')
          .select('*')
          .eq('tree_id', selectedTreeId);
        
        if (nodeError) throw new Error(nodeError.message);

        if (nodesData && nodesData.length > 0) {
          const formattedNodes: TreeNode[] = nodesData.map((n: any) => ({
            id: String(n.id),
            title: n.title,
            parentId: n.parent_id ? String(n.parent_id) : null,
            x: n.x_pos || 2000,
            y: n.y_pos || 2000
          }));
          const positioned = calculateNodePositions(formattedNodes);
          setNodes(positioned);

          if (session) {
            const nodeIds = nodesData.map(n => String(n.id));
            const { data: progressData } = await supabase
              .from('user_progress')
              .select('node_id')
              .eq('user_id', session.user.id)
              .in('node_id', nodeIds);
              
            if (progressData) {
              setUnlockedNodes(progressData.map(p => String(p.node_id)));
            }
          }
        } else {
          setNodes([]);
        }
      } catch (err: any) {
        console.error("Erreur complète :", err);
        setErrorMsg(err.message || "Erreur inconnue lors du chargement.");
      } finally {
        setLoading(false);
        setTimeout(() => {
          if (transformRef.current) {
            transformRef.current.centerView(0.9, 0);
          }
        }, 100);
      }
    };

    loadLevelData();
  }, [selectedTreeId, session, calculateNodePositions]);

  const handleNodeClick = async (node: TreeNode, status: string) => {
    if (!session || status !== 'available') return;
    const { error } = await supabase.from('user_progress').insert({ user_id: session.user.id, node_id: node.id });
    if (!error) {
      setUnlockedNodes([...unlockedNodes, String(node.id)]);
      setAnimatingNode(String(node.id));
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

  const renderConnections = () => nodes.map(node => {
    if (!node.parentId) return null;
    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return null;
    const isUnlocked = unlockedNodes.includes(String(node.id));
    return (
      <line 
        key={`line-${node.id}`} 
        x1={parent.x} 
        y1={parent.y} 
        x2={node.x} 
        y2={node.y} 
        stroke={isUnlocked ? "#22c55e" : "#475569"} 
        strokeWidth="4" 
        strokeLinecap="round" 
        className="transition-all duration-500" 
      />
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-900 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Chargement du niveau...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-900 gap-4 p-6 text-center">
        <p className="text-red-400 font-bold text-lg">⚠️ Erreur de chargement</p>
        <p className="text-slate-300 bg-slate-800 p-3 rounded-xl border border-slate-700 max-w-md text-sm">{errorMsg}</p>
        <button onClick={() => setCurrentScreen('menu')} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 mt-2">
          <ArrowLeft size={18} /> Retour au menu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col overflow-hidden relative">
      <div className="flex-1 relative overflow-hidden touch-none bg-slate-950">
        
        {activeTab === 'tree' && (
          <button onClick={() => setShowPauseMenu(true)} className="absolute top-6 right-6 z-40 bg-slate-800/90 backdrop-blur-md p-3 rounded-full border border-slate-700 shadow-xl text-slate-300 hover:text-white transition-all active:scale-95">
            <Settings size={24} />
          </button>
        )}

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

        {activeTab === 'tree' && (
          <TransformWrapper ref={transformRef} initialScale={0.9} minScale={0.3} maxScale={2.5} centerOnInit={true} limitToBounds={false}>
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '4000px', height: '4000px', position: 'relative' }}>
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ width: '4000px', height: '4000px', overflow: 'visible' }}>
                <g>{renderConnections()}</g>
              </svg>

              {nodes.map(node => {
                const strId = String(node.id);
                const isUnlocked = unlockedNodes.includes(strId);
                const isAvailable = !node.parentId || unlockedNodes.includes(String(node.parentId));
                let status = 'locked';
                if (isUnlocked) status = 'unlocked'; else if (isAvailable) status = 'available';

                const colors = {
                  locked: 'bg-slate-800 border-slate-600 text-slate-500 opacity-90',
                  available: 'bg-yellow-500 border-yellow-300 text-slate-950 font-bold shadow-[0_0_20px_rgba(234,179,8,0.7)] cursor-pointer',
                  unlocked: 'bg-green-600 border-green-400 text-white font-bold shadow-[0_0_20px_rgba(34,197,94,0.7)] cursor-default',
                };
                const isAnimating = animatingNode === strId;
                const size = 110;

                return (
                  <div 
                    key={node.id} 
                    onClick={() => handleNodeClick(node, status)} 
                    className={`absolute rounded-full border-4 flex flex-col items-center justify-center text-center transition-all duration-500 z-20 ${colors[status as keyof typeof colors]} ${isAnimating ? 'scale-125 rotate-6 ring-4 ring-green-400 ring-offset-4 ring-offset-slate-900' : 'hover:scale-105 active:scale-95'}`} 
                    style={{ left: node.x - size / 2, top: node.y - size / 2, width: size, height: size }}
                  >
                    {status === 'unlocked' && <Unlock size={20} className="mb-1" />}
                    {status === 'available' && <Star size={20} className="mb-1 text-slate-950" />}
                    {status === 'locked' && <Lock size={20} className="mb-1" />}
                    <span className="text-xs font-bold px-2 leading-tight">{node.title}</span>
                  </div>
                );
              })}
            </TransformComponent>
          </TransformWrapper>
        )}

        {activeTab === 'leaderboard' && selectedTreeId && (
          <LevelLeaderboard treeId={selectedTreeId} />
        )}
      </div>

      <div className="bg-slate-900 border-t border-slate-800 pb-safe z-30">
        <div className="flex justify-around items-center p-2">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex flex-col items-center w-20 p-2 transition-colors ${activeTab === 'tree' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <MapIcon size={24} className={activeTab === 'tree' ? 'animate-bounce' : ''} />
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