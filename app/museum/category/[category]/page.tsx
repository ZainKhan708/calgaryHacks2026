"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface SessionSummary {
  sessionId: string;
}

function toLabel(value: string): string {
  const spaced = value.replace(/[_-]/g, " ");
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

export default function CategoryMuseumResolverPage() {
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const category = params?.category?.toLowerCase() ?? "";
  const [error, setError] = useState<string | null>(null);

  const categoryLabel = useMemo(() => toLabel(category), [category]);

  useEffect(() => {
    if (!category) {
      setError("Category not provided.");
      return;
    }

    let ignore = false;

    async function resolveMuseum() {
      const response = await fetch(
        `/api/sessions?category=${encodeURIComponent(category)}&limit=1`
      );

      if (!response.ok) {
        if (!ignore) setError("Could not load museum for this category.");
        return;
      }

      const sessions = (await response.json()) as SessionSummary[];
      const firstSession = Array.isArray(sessions) ? sessions[0] : undefined;
      if (!firstSession?.sessionId) {
        if (!ignore) setError(`No museum found yet for ${categoryLabel}.`);
        return;
      }

      router.replace(
        `/museum/${encodeURIComponent(firstSession.sessionId)}?category=${encodeURIComponent(category)}`
      );
    }

    void resolveMuseum();

    return () => {
      ignore = true;
    };
  }, [category, categoryLabel, router]);

  if (!error) {
    return (
      <main className="min-h-screen grid place-items-center text-museum-muted bg-[#0f1115]">
        Opening {categoryLabel} museum...
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center bg-[#0f1115] gap-4">
      <p className="text-museum-spotlight text-lg">{error}</p>
      <div className="flex items-center gap-3">
        <Link
          href="/categories"
          className="rounded-md bg-museum-surface border border-museum-amber/50 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          Back to categories
        </Link>
        <Link
          href={`/upload?category=${encodeURIComponent(category)}`}
          className="rounded-md bg-museum-surface border border-museum-amber/50 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          Upload for this category
        </Link>
      </div>
    </main>
  );
}
