"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { isDemoMode } from "@/utils/supabase/config";
import {
  fetchProfile,
  updateProfileIdentity,
} from "@/utils/supabase/profiles";
import { isValidAvatarUrl } from "@/utils/profile/display";

export function useProfileEditor(onSaved?: () => void) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [vipStatus, setVipStatus] = useState("Joueur");
  const [profileFrame, setProfileFrame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemoMode()) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Supabase non configuré");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    const { profile, error: fetchError } = await fetchProfile(user.id);
    if (fetchError) setError(fetchError);
    if (profile) {
      setUsername(profile.username ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setVipStatus(profile.vip_status ?? "Joueur");
      setProfileFrame(profile.profile_frame ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setError(null);
    setSuccess(null);

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setError("Le pseudo doit faire au moins 3 caractères.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Lettres, chiffres et _ uniquement.");
      return;
    }
    if (!isValidAvatarUrl(avatarUrl)) {
      setError("URL d'avatar invalide (http ou https).");
      return;
    }

    if (!userId || isDemoMode()) {
      setError("Connecte-toi pour enregistrer ton profil.");
      return;
    }

    setSaving(true);
    const { profile, error: saveError } = await updateProfileIdentity(userId, {
      username: trimmed,
      avatar_url: avatarUrl.trim() || null,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    if (profile) {
      setUsername(profile.username ?? trimmed);
      setAvatarUrl(profile.avatar_url ?? "");
      setVipStatus(profile.vip_status ?? "Joueur");
      setProfileFrame(profile.profile_frame ?? null);
    }

    setSuccess("Profil mis à jour.");
    onSaved?.();
    window.setTimeout(() => setSuccess(null), 3000);
  }, [username, avatarUrl, userId, onSaved]);

  return {
    loading,
    saving,
    isAuthenticated: !!userId,
    isDemoMode: isDemoMode(),
    username,
    setUsername,
    avatarUrl,
    setAvatarUrl,
    vipStatus,
    profileFrame,
    error,
    success,
    save,
    reload: load,
  };
}
