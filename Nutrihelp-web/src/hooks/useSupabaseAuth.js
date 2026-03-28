import { useEffect, useState } from "react";
import { supabase } from '../supabaseClient';

export function useSupabaseAuth() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null };
}
