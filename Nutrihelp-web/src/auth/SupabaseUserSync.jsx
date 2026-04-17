import { useEffect, useContext } from "react";
import { supabase } from '../supabaseClient';
import { UserContext } from "../context/user.context";

export default function SupabaseUserSync() {
  const { setCurrentUser } = useContext(UserContext);

  useEffect(() => {

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        setCurrentUser({ email: u.email, id: u.id }, 0);
      }
    });


    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        setCurrentUser({ email: u.email, id: u.id }, 0);
      } else {
        setCurrentUser(null, 0);
      }
    });


    return () => sub.subscription.unsubscribe();
  }, [setCurrentUser]);

  return null;
}
