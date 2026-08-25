"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createSeedSource,
  getSeedSources,
} from "./api";

import type {
  SeedSource,
  SeedSourceType,
} from "./types";

import { SeedToolbar } from "./seed-toolbar";
import { SeedStats } from "./seed-stats";
import { SeedTable } from "./seed-table";
import { CreateSeedDialog } from "./create-seed-dialog";
import { LoadingTable } from "./loading-table";
import { EmptyState } from "./empty-state";

export function SeedPage() {
  const [sources, setSources] =
    useState<SeedSource[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("ALL");

  const [createOpen, setCreateOpen] =
    useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      setLoading(true);

      const data =
        await getSeedSources();

      setSources(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: {
    name: string;
    url: string;
    type: SeedSourceType;
    active: boolean;
  }) {
    const created =
      await createSeedSource(data);

    setSources((prev) => [
      created,
      ...prev,
    ]);
  }

  function handleUpdated(
    updated: SeedSource
  ) {
    setSources((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? updated
          : item
      )
    );
  }

  function handleDeleted(
    id: string
  ) {
    setSources((prev) =>
      prev.filter(
        (item) => item.id !== id
      )
    );
  }

  const filtered = useMemo(() => {
    return sources.filter((source) => {
      const matchesSearch =
        source.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        source.url
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesType =
        filter === "ALL" ||
        source.type === filter;

      return (
        matchesSearch &&
        matchesType
      );
    });
  }, [sources, search, filter]);

  return (
    <div className="space-y-6">

      <SeedStats
        sources={sources}
      />

      <SeedToolbar
        search={search}
        filter={filter}
        onSearchChange={
          setSearch
        }
        onFilterChange={
          setFilter
        }
        onCreate={() =>
          setCreateOpen(true)
        }
      />

      {loading ? (
        <LoadingTable />
      ) : filtered.length === 0 ? (
        <EmptyState
          onCreate={() =>
            setCreateOpen(true)
          }
        />
      ) : (
        <SeedTable
          sources={filtered}
          onUpdated={
            handleUpdated
          }
          onDeleted={
            handleDeleted
          }
        />
      )}

      <CreateSeedDialog
        open={createOpen}
        onOpenChange={
          setCreateOpen
        }
        onCreated={
          handleCreate
        }
      />

    </div>
  );
}