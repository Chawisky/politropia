import { useState, useEffect } from 'react';
import { supabase } from '../../core/supabase';
import { useAppStore } from '../../store/useAppStore';
import { User, LogOut, Edit2, Check } from 'lucide-react';

export default function Profile() {
  const session = useAppStore((state) => state.session);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');

  // Charger le pseudo existant si l'utilisateur est connecté
  useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('username').eq('id', session.user.id).single()
      .then(({ data }) => {
        if (data) {
          setCurrentUsername(data.username);
          setUsername(data.username);
        }
      });
  }, [session]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!username.trim()) {
          throw new Error("Le pseudo est obligatoire pour l'inscription.");
        }

        // 1. Inscription Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          // 2. Enregistrement du pseudo dans la table profiles
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            username: username.trim()
          });
          if (profileError) throw profileError;
        }

        setMessage('Inscription réussie ! Vous êtes connecté.');
      }
    } catch (error: any) {
      setMessage(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!session || !username.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username: username.trim()
    });

    if (error) {
      setMessage("Erreur ou pseudo déjà pris.");
    } else {
      setCurrentUsername(username.trim());
      setIsEditingUsername(false);
      setMessage("Pseudo mis à jour avec succès !");
    }
    setLoading(false);
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
          <h2 className="text-xl font-bold text-white mb-1">Mon Profil</h2>
          <p className="text-slate-400 text-xs mb-6 truncate">{session.user.email}</p>
          
          {/* Gestion du pseudo */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6 text-left">
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Mon Pseudo</label>
            {isEditingUsername ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  maxLength={20}
                />
                <button
                  onClick={handleUpdateUsername}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors"
                  title="Enregistrer"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-lg">{currentUsername || 'Aucun pseudo'}</span>
                <button
                  onClick={() => setIsEditingUsername(true)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>

          {message && (
            <p className={`text-xs text-center mb-4 ${message.includes('Erreur') ? 'text-red-400' : 'text-green-400'}`}>
              {message}
            </p>
          )}

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
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Pseudo</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="MonSuperPseudo"
                maxLength={20}
              />
            </div>
          )}
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