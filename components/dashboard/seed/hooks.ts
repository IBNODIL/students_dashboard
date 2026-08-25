import { useEffect, useState } from "react";

import { getSeedSources } from "./api";
import type { SeedSource } from "./types";

export function useSeedSources() {
  const [sources, setSources] =
    useState<SeedSource[]>([]);

  const [loading, setLoading] =
    useState(true);

  async function refresh() {
    try {
      setLoading(true);

      setSources(
        await getSeedSources()
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return {
    sources,
    setSources,
    loading,
    refresh,
  };
}