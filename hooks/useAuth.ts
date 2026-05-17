"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, DEMO_MODE, safeGetUser } from "@/utils/supabase/client";
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

    async function init() {
      const { user: currentUser } = await safeGetUser();

      if (!mounted) return;

      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser.id);
      } else {
        setUsername(null);
      }
      setLoading(false);
    }

    init();

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        await loadUserProfile(nextUser.id);
      } else {
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
