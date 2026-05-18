"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPublicProfilesByIds,
  type PublicPlayerProfile,
} from "@/utils/supabase/profiles";

export function usePlayerAvatars(userIds: string[]) {
  const key = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort().join(","),
    [userIds]
  );

  const [byUserId, setByUserId] = useState<Record<string, PublicPlayerProfile>>(
    {}
  );

  useEffect(() => {
    if (!key) {
      setByUserId({});
      return;
    }

    let cancelled = false;
    const ids = key.split(",");

    void fetchPublicProfilesByIds(ids).then(({ profiles }) => {
      if (cancelled) return;
      const map: Record<string, PublicPlayerProfile> = {};
      profiles.forEach((p) => {
        map[p.id] = p;
      });
      setByUserId(map);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return byUserId;
}
