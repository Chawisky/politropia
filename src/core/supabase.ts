import { createClient } from '@supabase/supabase-js';

// Nous utiliserons des variables d'environnement pour la sécurité
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Attention: Les clés Supabase sont manquantes dans le fichier .env");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');