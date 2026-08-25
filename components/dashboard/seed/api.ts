import type {
  SeedSource,
  SeedSourceInput,
} from "./types";

const BASE = "/api/admin/seed-sources";

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => null);

    throw new Error(
      error?.error ?? "Something went wrong."
    );
  }

  return res.json();
}

export async function getSeedSources() {
  const res = await fetch(BASE, {
    cache: "no-store",
  });

  return parse<SeedSource[]>(res);
}

export async function createSeedSource(
  data: SeedSourceInput
) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parse<SeedSource>(res);
}

export async function updateSeedSource(
  id: string,
  data: Partial<SeedSourceInput>
) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return parse<SeedSource>(res);
}

export async function deleteSeedSource(
  id: string
) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
  });

  return parse<{ success: boolean }>(res);
}