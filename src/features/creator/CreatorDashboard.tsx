import { useEffect, useState } from 'react';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface Tree { id: string; title: string; description: string; is_published: boolean; }
interface Node { id: string; title: string; x_pos: number; y_pos: number; parent_id: string | null; }

export default function CreatorDashboard() {
  const { session, setCurrentScreen } = useAppStore();
  const [myTrees, setMyTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  
  // États pour le formulaire d'ajout de nœud
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeParentId, setNewNodeParentId] = useState<string>('');
  const [newNodeX, setNewNodeX] = useState(0);
  const [newNodeY, setNewNodeY] = useState(150);

  // Charger les arbres de l'utilisateur
  useEffect(() => {
    if (!session) return;
    const fetchMyTrees = async () => {
      const { data } = await supabase.from('trees').select('*').eq('creator_id', session.user.id).order('created_at', { ascending: false });
      if (data) setMyTrees(data);
    };
    fetchMyTrees();
  }, [session, selectedTree]);

  // Charger les nœuds de l'arbre sélectionné
  useEffect(() => {
    if (!selectedTree) return;
    const fetchNodes = async () => {
      const { data } = await supabase.from('nodes').select('*').eq('tree_id', selectedTree.id);
      if (data) setNodes(data);
    };
    fetchNodes();
  }, [selectedTree]);

  const handleCreateTree = async () => {
    const title = prompt("Titre du niveau ?");
    if (!title || !session) return;
    const { data, error } = await supabase.from('trees').insert({ title, description: "Nouveau niveau", creator_id: session.user.id, is_published: false }).select().single();
    if (data) setMyTrees([data, ...myTrees]);
    if (error) alert("Erreur de création");
  };

  const handleTogglePublish = async (tree: Tree) => {
    const { error } = await supabase.from('trees').update({ is_published: !tree.is_published }).eq('id', tree.id);
    if (!error) setMyTrees(myTrees.map(t => t.id === tree.id ? { ...t, is_published: !tree.is_published } : t));
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTree) return;
    
    const { data, error } = await supabase.from('nodes').insert({
      tree_id: selectedTree.id,
      title: newNodeTitle,
      parent_id: newNodeParentId || null,
      x_pos: newNodeX,
      y_pos: newNodeY
    }).select().single();

    if (data) {
      setNodes([...nodes, data]);
      setNewNodeTitle(''); // Reset du titre
    } else if (error) alert("Erreur d'ajout de la case");
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!window.confirm("Supprimer cette case ? (Ses enfants seront déconnectés)")) return;
    const { error } = await supabase.from('nodes').delete().eq('id', nodeId);
    if (!error) setNodes(nodes.filter(n => n.id !== nodeId));
  };

  // --- VUE 1 : ÉDITEUR D'UN NIVEAU (Ajout de cases) ---
  if (selectedTree) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        {/* Header Editeur */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center z-50">
          <button onClick={() => setSelectedTree(null)} className="text-slate-400 hover:text-white flex items-center gap-2 font-bold">
            <ArrowLeft size={20} /> Retour
          </button>
          <h2 className="text-white font-bold">{selectedTree.title} (Éditeur)</h2>
          <button onClick={() => handleTogglePublish(selectedTree)} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${selectedTree.is_published ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
            {selectedTree.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
            {selectedTree.is_published ? 'Publié' : 'Brouillon'}
          </button>
        </div>

        {/* Zone de création / Visualisation */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Panneau de contrôle (Formulaire) */}
          <div className="bg-slate-900 border-r border-slate-700 p-6 w-full md:w-80 overflow-y-auto z-40 shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Plus size={18} /> Ajouter une case</h3>
            <form onSubmit={handleAddNode} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Titre de l'exercice</label>
                <input type="text" required value={newNodeTitle} onChange={e => setNewNodeTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white mt-1" placeholder="Ex: 10 Pompes" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Case Parente (Pré-requis)</label>
                <select value={newNodeParentId} onChange={e => setNewNodeParentId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white mt-1">
                  <option value="">-- Aucune (Case de départ) --</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400">Position X</label>
                  <input type="number" value={newNodeX} onChange={e => setNewNodeX(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400">Position Y</label>
                  <input type="number" value={newNodeY} onChange={e => setNewNodeY(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white mt-1" />
                </div>
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2">
                <Save size={18} /> Ajouter au niveau
              </button>
            </form>
          </div>

          {/* Aperçu visuel interactif */}
          <div className="flex-1 bg-slate-950 relative touch-none">
            <TransformWrapper initialScale={0.8} minScale={0.3} maxScale={2} centerOnInit={true} limitToBounds={false}>
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '2000px', height: '2000px', position: 'relative' }}>
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {nodes.map(node => {
                    if (!node.parent_id) return null;
                    const parent = nodes.find(n => n.id === node.parent_id);
                    if (!parent) return null;
                    return <line key={`line-${node.id}`} x1={(parent.x_pos || 0) + 1000} y1={(parent.y_pos || 0) + 1000} x2={(node.x_pos || 0) + 1000} y2={(node.y_pos || 0) + 1000} stroke="#475569" strokeWidth="4" />
                  })}
                </svg>
                {nodes.map(node => (
                  <div key={node.id} className="absolute w-28 h-28 bg-slate-800 rounded-full border-4 border-slate-600 flex flex-col items-center justify-center text-center shadow-lg group hover:border-red-500 transition-colors" style={{ left: (node.x_pos || 0) + 1000 - 56, top: (node.y_pos || 0) + 1000 - 56 }}>
                    <span className="text-xs font-bold text-white px-2 mb-2 leading-tight">{node.title}</span>
                    {/* Bouton de suppression rapide au survol/clic */}
                    <button onClick={() => handleDeleteNode(node.id)} className="bg-red-500 p-2 rounded-full text-white opacity-80 hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      </div>
    );
  }

  // --- VUE 2 : LISTE DE MES NIVEAUX ---
  return (
    <div className="flex flex-col h-full bg-slate-900 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setCurrentScreen('menu')} className="text-slate-400 hover:text-white flex items-center gap-2 font-bold">
          <ArrowLeft size={20} /> Menu
        </button>
        <button onClick={handleCreateTree} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95">
          <Plus size={20} /> Nouveau Niveau
        </button>
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-6">Mes Créations</h2>
      
      <div className="space-y-4 overflow-y-auto flex-1 pb-6">
        {myTrees.length === 0 ? (
          <div className="text-center text-slate-400 p-8">Vous n'avez pas encore créé de niveau.</div>
        ) : (
          myTrees.map(tree => (
            <div key={tree.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  {tree.title}
                  <span className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold ${tree.is_published ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {tree.is_published ? 'Publié' : 'Brouillon'}
                  </span>
                </h3>
              </div>
              <button onClick={() => setSelectedTree(tree)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold transition-all">
                Éditer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}