import { Map, Trophy, User } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  const navItems = [
    { id: 'tree', label: 'Arbre', icon: Map },
    { id: 'leaderboard', label: 'Classement', icon: Trophy },
    { id: 'profile', label: 'Profil', icon: User },
  ] as const;

  return (
    <div className="bg-slate-900 border-t border-slate-800 pb-safe">
      <div className="flex justify-around items-center p-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center w-16 p-2 transition-colors ${
                isActive ? 'text-blue-500' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Icon size={24} className={isActive ? 'animate-pulse' : ''} />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}