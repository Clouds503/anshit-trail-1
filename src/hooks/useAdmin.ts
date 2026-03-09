import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { invokeAdminFunction } from "@/lib/edge-functions";

export const useAdmin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (u: User | null, accessToken?: string) => {
    if (!u) {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (accessToken) {
      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      if (userError || !userData?.user?.id) {
        // Stale/corrupt JWT in local storage: force fresh login.
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
    }

    setUser(u);
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdmin(session?.user ?? null, session?.access_token);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        checkAdmin(session?.user ?? null, session?.access_token);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (!error && data.user) {
      try {
        await invokeAdminFunction("bootstrap-admin");
      } catch {}
    }
    return { error };
  };

  const signOut = () => supabase.auth.signOut();

  return { user, isAdmin, loading, signIn, signUp, signOut };
};
