import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeft, Plus, Trash2, Edit2, Eye, EyeOff, Lock, MoreVertical, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

interface Tree { id: string; title: string; description: string; is_published: boolean; }
interface TreeNode { id: number | string; title: string; x: number; y: number; parentId: number | string | null; }

export default function CreatorDashboard() {
  const { session, setCurrentScreen } = useAppStore();
  const [myTrees, setMyTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<number | string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showTreeSettings, setShowTreeSettings] = useState(false);

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.from('trees').select('*').eq('creator_id', session.user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMyTrees(data); });
  }, [session, selectedTree]);

  useEffect(() => {
    if (!selectedTree) return;
    supabase.from('nodes').select('*').eq('tree_id', selectedTree.id)
      .then(({ data }) => { 
        if (data && data.length > 0) {
          const formattedNodes: TreeNode[] = data.map((n: any) => ({
            id: String(n.id),
            title: n.title,
            parentId: n.parent_id ? String(n.parent_id) : null,
            x: n.x_pos || 2000,
            y: n.y_pos || 2000
          }));
          const positioned = calculateNodePositions(formattedNodes);
          setNodes(positioned);
        }
        setTimeout(() => {
          if (transformRef.current) {
            transformRef.current.centerView(0.9, 0);
          }
        }, 100);
      });
  }, [selectedTree]);

  const calculateNodePositions = (currentNodes: TreeNode[]): TreeNode[] => {
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

    const calculateSubtreeWidth = (nodeId: number | string): number => {
      const children = currentNodes.filter(n => n.parentId === nodeId);
      if (children.length === 0) return 0.3;
      let totalWidth = 0;
      children.forEach(child => totalWidth += calculateSubtreeWidth(child.id));
      return Math.max(totalWidth, children.length * 0.4);
    };

    const positionNode = (nodeId: number | string, parentX: number, parentY: number, startAngle: number, endAngle: number, level = 0) => {
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
  };

  const saveNodePositionsToSupabase = async (updatedNodes: TreeNode[]) => {
    if (!selectedTree) return;
    for (const node of updatedNodes) {
      await supabase.from('nodes').update({ x_pos: node.x, y_pos: node.y }).eq('id', node.id);
    }
  };

  const handleCreateTree = async () => {
    const title = prompt("Titre du niveau ?");
    if (!title || !session) return;

    const { data: treeData, error } = await supabase.from('trees').insert({
      title,
      description: "Niveau personnalisé",
      creator_id: session.user.id,
      is_published: false
    }).select().single();

    if (error || !treeData) {
      alert("Erreur lors de la création");
      return;
    }

    setMyTrees([treeData, ...myTrees]);
    setSelectedTree(treeData);
  };

  const handleTogglePublish = async () => {
    if (!selectedTree) return;
    const newState = !selectedTree.is_published;
    const { error } = await supabase.from('trees').update({ is_published: newState }).eq('id', selectedTree.id);
    if (!error) {
      setSelectedTree({ ...selectedTree, is_published: newState });
      setMyTrees(myTrees.map(t => t.id === selectedTree.id ? { ...t, is_published: newState } : t));
    }
    setShowTreeSettings(false);
  };

  const handleRenameTree = async () => {
    if (!selectedTree) return;
    const newTitle = prompt("Nouveau nom du niveau :", selectedTree.title);
    if (!newTitle) return;

    const { error } = await supabase.from('trees').update({ title: newTitle }).eq('id', selectedTree.id);
    if (!error) {
      setSelectedTree({ ...selectedTree, title: newTitle });
      setMyTrees(myTrees.map(t => t.id === selectedTree.id ? { ...t, title: newTitle } : t));
    }
    setShowTreeSettings(false);
  };

  // ✨ Nouvelle fonction pour réinitialiser la progression de tous les joueurs sur ce niveau
  const handleResetLevelProgress = async () => {
    if (!selectedTree) return;
    if (!window.confirm("Voulez-vous vraiment réinitialiser ce niveau ? Tous les scores et progressions des joueurs seront effacés.")) return;

    try {
      // 1. Récupérer tous les IDs des nœuds de cet arbre
      const nodeIds = nodes.map(n => n.id);
      if (nodeIds.length > 0) {
        // 2. Supprimer toutes les lignes de progression associées à ces nœuds
        const { error } = await supabase.from('user_progress').delete().in('node_id', nodeIds);
        if (error) throw error;
        alert("Le niveau a été réinitialisé avec succès (progression effacée pour tout le monde).");
      }
    } catch (err: any) {
      alert("Erreur lors de la réinitialisation : " + err.message);
    }
    setShowTreeSettings(false);
  };

  const handleDeleteTree = async () => {
    if (!selectedTree) return;
    if (!window.confirm(`Supprimer définitivement le niveau "${selectedTree.title}" et toutes ses cases ?`)) return;

    const { error } = await supabase.from('trees').delete().eq('id', selectedTree.id);
    if (!error) {
      setMyTrees(myTrees.filter(t => t.id !== selectedTree.id));
      setSelectedTree(null);
    }
    setShowTreeSettings(false);
  };

  const addChildNode = async (parentId: number | string) => {
    if (!selectedTree) return;
    const children = nodes.filter(n => n.parentId === parentId);
    if (children.length >= 5) {
      alert('Maximum 5 enfants par nœud');
      return;
    }

    const titleNom = prompt("Nom du nouvel exercice :");
    if (!titleNom) return;

    const { data: newNodeData, error } = await supabase.from('nodes').insert({
      tree_id: selectedTree.id,
      title: titleNom,
      parent_id: parentId,
      x_pos: 2000,
      y_pos: 2000
    }).select().single();

    if (newNodeData && !error) {
      const newNode: TreeNode = {
        id: String(newNodeData.id),
        title: newNodeData.title,
        parentId: newNodeData.parent_id ? String(newNodeData.parent_id) : null,
        x: 2000,
        y: 2000
      };
      const updatedNodes = calculateNodePositions([...nodes, newNode]);
      await saveNodePositionsToSupabase(updatedNodes);
      setNodes(updatedNodes);
      setSelectedNode(null);
    }
  };

  const deleteNode = async (nodeId: number | string) => {
    if (!selectedTree) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) {
      alert('Impossible de supprimer le nœud central');
      return;
    }

    if (!window.confirm("Supprimer cette case et ses enfants ?")) return;

    const getNodesToDelete = (id: number | string): (number | string)[] => {
      const childs = nodes.filter(n => n.parentId === id);
      return [id, ...childs.flatMap(child => getNodesToDelete(child.id))];
    };

    const idsToDelete = getNodesToDelete(nodeId);

    for (const id of idsToDelete) {
      await supabase.from('nodes').delete().eq('id', id);
    }

    const remaining = nodes.filter(n => !idsToDelete.includes(n.id));
    const positioned = calculateNodePositions(remaining);
    await saveNodePositionsToSupabase(positioned);
    setNodes(positioned);
    setSelectedNode(null);
  };

  const handleUpdateNodeTitle = async (nodeId: number | string, newTitle: string) => {
    const { error } = await supabase.from('nodes').update({ title: newTitle }).eq('id', nodeId);
    if (!error) {
      setNodes(nodes.map(n => n.id === nodeId ? { ...n, title: newTitle } : n));
    }
    setEditingNodeId(null);
  };

  const renderConnections = () => nodes.map(node => {
    if (!node.parentId) return null;
    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return null;
    return <line key={`line-${node.id}`} x1={parent.x} y1={parent.y} x2={node.x} y2={node.y} stroke="#64748b" strokeWidth={3} strokeOpacity={0.7} strokeLinecap="round" />;
  });

  // --- VUE ÉDITEUR GRAPHIQUE ---
  if (selectedTree) {
    return (
      <div className="w-full h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
        {/* Header de l'éditeur */}
        <div className="p-4 bg-slate-800/90 backdrop-blur border-b border-slate-700 flex justify-between items-center z-30">
          <button onClick={() => { setSelectedTree(null); setSelectedNode(null); }} className="text-slate-400 hover:text-white flex items-center gap-2 font-bold transition-colors">
            <ArrowLeft size={20} /> Retour aux niveaux
          </button>
          
          <div className="text-center">
            <h2 className="text-white font-bold text-lg">{selectedTree.title}</h2>
            <p className="text-[10px] text-slate-400">Clique sur une case pour afficher les actions</p>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowTreeSettings(!showTreeSettings)}
              className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl transition-all"
              title="Options du niveau"
            >
              <MoreVertical size={20} />
            </button>

            {showTreeSettings && (
              <div className="absolute right-0 top-12 bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl py-2 w-52 z-50">
                <button onClick={handleTogglePublish} className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-slate-700 flex items-center gap-2">
                  {selectedTree.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                  {selectedTree.is_published ? 'Dépublier' : 'Publier'}
                </button>
                <button onClick={handleRenameTree} className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-slate-700 flex items-center gap-2">
                  <Edit2 size={16} /> Renommer le niveau
                </button>
                {/* ✨ Bouton Réinitialiser le niveau */}
                <button onClick={handleResetLevelProgress} className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/20 flex items-center gap-2">
                  <RotateCcw size={16} /> Réinitialiser le niveau
                </button>
                <div className="border-t border-slate-700 my-1"></div>
                <button onClick={handleDeleteTree} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2">
                  <Trash2 size={16} /> Supprimer le niveau
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal d'édition de titre de nœud */}
        {editingNodeId !== null && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-96 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Modifier le nœud</h3>
              <input 
                type="text" 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)} 
                className="w-full bg-slate-700 px-4 py-3 rounded-xl border border-slate-600 focus:outline-none focus:border-blue-500 mb-4 text-white" 
                autoFocus 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editValue.trim()) {
                    handleUpdateNodeTitle(editingNodeId, editValue);
                  }
                }}
              />
              <div className="flex gap-3">
                <button onClick={() => editValue.trim() && handleUpdateNodeTitle(editingNodeId, editValue)} className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl font-bold transition-all">Valider</button>
                <button onClick={() => setEditingNodeId(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-xl font-bold transition-all">Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas de l'arbre */}
        <div className="flex-1 bg-slate-950 relative touch-none" onClick={() => setSelectedNode(null)}>
          <TransformWrapper ref={transformRef} initialScale={0.9} minScale={0.3} maxScale={2.5} centerOnInit={true} limitToBounds={false}>
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '4000px', height: '4000px', position: 'relative' }}>
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ width: '4000px', height: '4000px', overflow: 'visible' }}>
                <g>{renderConnections()}</g>
              </svg>

              {nodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const childCount = nodes.filter(n => n.parentId === node.id).length;
                const isRoot = !node.parentId;
                const size = 110;

                return (
                  <div 
                    key={node.id} 
                    data-node 
                    className="absolute transition-all duration-300 z-20" 
                    style={{ 
                      left: node.x - size / 2, 
                      top: node.y - size / 2, 
                      width: size, 
                      height: size 
                    }}
                  >
                    {/* Boutons d'action radiaux autour de la bulle sélectionnée */}
                    {isSelected && (
                      <div className="absolute inset-0 pointer-events-none z-30">
                        {!isRoot && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} 
                            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-red-600 hover:bg-red-500 rounded-full shadow-lg flex items-center justify-center pointer-events-auto transition-transform hover:scale-110 text-white"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); setEditValue(node.title); }} 
                          className="absolute -top-4 -right-4 w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-full shadow-lg flex items-center justify-center pointer-events-auto transition-transform hover:scale-110 text-white"
                          title="Renommer"
                        >
                          <Edit2 size={16} />
                        </button>
                        {childCount < 5 ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); addChildNode(node.id); }} 
                            className="absolute -top-4 -left-4 w-10 h-10 bg-green-600 hover:bg-green-500 rounded-full shadow-lg flex items-center justify-center pointer-events-auto transition-transform hover:scale-110 text-white"
                            title={`Ajouter un enfant (${childCount}/5)`}
                          >
                            <Plus size={18} />
                          </button>
                        ) : (
                          <div className="absolute -top-4 -left-4 w-10 h-10 bg-slate-600 text-slate-300 rounded-full shadow-lg flex items-center justify-center text-[10px] font-bold" title="Maximum 5 enfants atteint">
                            5/5
                          </div>
                        )}
                      </div>
                    )}

                    <div 
                      className={`w-full h-full rounded-full flex flex-col items-center justify-center text-center shadow-xl cursor-pointer transition-all duration-300 border-4 ${
                        isSelected 
                          ? 'bg-blue-600 border-white shadow-blue-500/50 scale-110 ring-4 ring-blue-400' 
                          : isRoot 
                            ? 'bg-amber-600 border-amber-400 ring-4 ring-amber-500/30' 
                            : 'bg-slate-800 border-slate-600 hover:border-slate-400'
                      }`} 
                      onClick={(e) => { e.stopPropagation(); setSelectedNode(node); setShowTreeSettings(false); }} 
                    >
                      {isRoot && <Lock size={14} className="text-amber-200 mb-0.5" />}
                      <div className="font-semibold text-xs px-2 leading-tight text-white">
                        {node.title.length > 20 ? node.title.substring(0, 18) + '...' : node.title}
                      </div>
                      {childCount > 0 && (
                        <div className="text-[10px] text-slate-300 mt-1 bg-slate-900/70 rounded-full px-2 py-0.5 font-bold">
                          {childCount}/5
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>
    );
  }

  // --- VUE LISTE DES NIVEAUX ---
  return (
    <div className="flex flex-col h-full bg-slate-900 p-8 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Mode Créateur</h1>
            <p className="text-slate-400">Gérez vos arbres de progression</p>
          </div>
          <button
            onClick={() => setCurrentScreen('menu')}
            className="bg-slate-800/80 backdrop-blur-md hover:bg-slate-700 p-3 rounded-full transition-all hover:scale-110 shadow-xl border border-slate-700/50 text-white"
            title="Retour au menu principal"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            onClick={handleCreateTree}
            className="bg-slate-800/50 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-2xl p-6 cursor-pointer transition-all hover:scale-105 flex flex-col items-center justify-center min-h-[220px] group"
          >
            <div className="bg-blue-600 group-hover:bg-blue-500 p-4 rounded-full mb-3 transition-colors text-white">
              <Plus size={32} />
            </div>
            <p className="text-lg font-semibold text-white">Nouvel arbre</p>
            <p className="text-sm text-slate-400 mt-1">Créer un arbre intelligent</p>
          </div>

          {myTrees.map(tree => (
            <div
              key={tree.id}
              onClick={() => setSelectedTree(tree)}
              className="bg-slate-800/50 border border-slate-700 hover:border-blue-500 rounded-2xl p-6 cursor-pointer transition-all hover:scale-105 group min-h-[220px] flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    {tree.title}
                  </h3>
                  {tree.is_published && (
                    <span className="bg-green-500 text-black px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ml-2">
                      PUBLIÉ
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                <span>Cliquez pour éditer</span>
                <span className="text-blue-400 font-bold group-hover:translate-x-1 transition-transform">Ouvrir →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}