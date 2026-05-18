"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, DEMO_MODE } from "@/utils/supabase/client";
import { isDemoMode } from "@/utils/supabase/config";
import { fetchProfile } from "@/utils/supabase/profiles";

export interface AuthProfileSnapshot {
  username: string | null;
  avatarUrl: string | null;
  vipStatus: string;
  profileFrame: string | null;
}

export function useAuth() {
  const demo = DEMO_MODE;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(!demo);

  const applyProfileRow = useCallback(
    (row: {
      username: string | null;
      avatar_url?: string | null;
      vip_status?: string;
      profile_frame?: string | null;
    } | null) => {
      if (!row) {
        setProfile(null);
        return;
      }
      setProfile({
        username: row.username ?? null,
        avatarUrl: row.avatar_url ?? null,
        vipStatus: row.vip_status ?? "Joueur",
        profileFrame: row.profile_frame ?? null,
      });
    },
    []
  );

  const loadUserProfile = useCallback(
    async (userId: string) => {
      const { profile: row } = await fetchProfile(userId);
      applyProfileRow(row);
    },
    [applyProfileRow]
  );

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await loadUserProfile(user.id);
  }, [user?.id, loadUserProfile]);

  useEffect(() => {
    if (demo) {
      setUser(null);
      setProfile(null);
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
        setProfile(null);
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
        setProfile(null);
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
    setProfile(null);
  }, []);

  return {
    user,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    vipStatus: profile?.vipStatus ?? "Joueur",
    profileFrame: profile?.profileFrame ?? null,
    profile,
    loading,
    isAuthenticated: !!user,
    isConfigured: !demo,
    isDemoMode: demo,
    signOut,
    refreshProfile,
  };
}

export { isDemoMode };
