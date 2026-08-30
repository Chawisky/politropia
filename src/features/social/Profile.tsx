import { useState } from 'react';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { User, LogOut } from 'lucide-react';

export default function Profile() {
  const session = useAppStore((state) => state.session);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Inscription réussie ! Vous êtes connecté.');
      }
    } catch (error: any) {
      setMessage(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- VUE SI DÉJÀ CONNECTÉ ---
  if (session) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-sm text-center shadow-xl">
          <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Mon Profil</h2>
          <p className="text-slate-400 text-sm mb-8 truncate">{session.user.email}</p>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 py-3 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // --- VUE SI NON CONNECTÉ (Formulaire) ---
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-sm shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isLogin ? 'Bon retour !' : 'Créer un compte'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="joueur@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {message && (
            <p className={`text-sm text-center ${message.includes('erreur') || message.includes('Invalid') ? 'text-red-400' : 'text-green-400'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}