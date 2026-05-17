"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, DEMO_MODE } from "@/utils/supabase/client";
import { isDemoMode } from "@/utils/supabase/config";
import { fetchProfile } from "@/utils/supabase/profiles";

export function useAuth() {
  const demo = DEMO_MODE;

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(!demo);

  const loadUserProfile = useCallback(async (userId: string) => {
    const { profile } = await fetchProfile(userId);
    setUsername(profile?.username ?? null);
  }, []);

  useEffect(() => {
    if (demo) {
      setUser(null);
      setUsername(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser.id);
      } else {
        setUsername(null);
      }
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        await loadUserProfile(nextUser.id);
      } else if (event === "SIGNED_OUT") {
        setUsername(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [demo, loadUserProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setUsername(null);
  }, []);

  return {
    user,
    username,
    loading,
    isAuthenticated: !!user,
    isConfigured: !demo,
    isDemoMode: demo,
    signOut,
  };
}

// Réexport pour les composants qui importent depuis config
export { isDemoMode };
