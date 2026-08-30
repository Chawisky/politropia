import { useEffect, useState } from 'react';
import { supabase } from '../../core/supabase';
import { Trophy, Medal } from 'lucide-react';

interface LeaderboardEntry {
  username: string;
  score: number;
}

export default function LevelLeaderboard({ treeId }: { treeId: string }) {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      // On passe l'ID du niveau actuel à notre nouvelle fonction SQL
      const { data, error } = await supabase.rpc('get_level_leaderboard', { target_tree_id: treeId });
      
      if (data) setLeaders(data);
      else if (error) console.error("Erreur classement:", error);
      
      setLoading(false);
    };
    
    fetchLeaderboard();
  }, [treeId]);

  return (
    <div className="flex flex-col h-full bg-slate-900 p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6 mt-4">
        <Trophy size={32} className="text-yellow-500" />
        <h2 className="text-2xl font-bold text-white">Classement du niveau</h2>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-y-auto shadow-xl flex-1 mb-2">
        {loading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Chargement des scores...</div>
        ) : leaders.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Soyez le premier à marquer des points !</div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {leaders.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-5 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-yellow-900 shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                    index === 1 ? 'bg-slate-300 text-slate-800' :
                    index === 2 ? 'bg-amber-700 text-amber-100' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-white font-medium text-lg capitalize">{player.username}</span>
                </div>
                <div className="flex items-center gap-2 text-green-400 font-bold bg-green-400/10 px-3 py-1 rounded-full">
                  <Medal size={16} /> {player.score} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}