"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SessionSummary {
  sessionId: string;
  fileCount: number;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

function categoryLabel(category?: string): string {
  if (!category) return "Memory Museum";
  const spaced = category.replace(/[_-]/g, " ");
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)} Museum`;
}

function formatDateTime(value?: string): string {
  if (!value) return "Unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function SessionsList() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || sessions.length === 0) return null;

  return (
    <section className="mt-16 w-full max-w-2xl">
      <h2 className="text-lg font-medium text-museum-spotlight mb-4">Recent Museums</h2>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.sessionId}>
            {(() => {
              const museumTitle = categoryLabel(s.category);
              const timestamp = formatDateTime(s.createdAt ?? s.updatedAt);
              const href = s.category
                ? `/museum/${s.sessionId}?category=${encodeURIComponent(s.category)}`
                : `/museum/${s.sessionId}`;

              return (
                <Link
                  href={href}
                  className="block rounded-lg border border-museum-amber/40 bg-museum-surface px-4 py-3 text-museum-text hover:bg-museum-surface-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{museumTitle}</p>
                      <p className="text-museum-muted text-xs mt-1">{timestamp}</p>
                    </div>
                    <span className="text-museum-muted text-sm shrink-0">{s.fileCount} images</span>
                  </div>
                  <p className="text-[11px] text-museum-dim mt-2">ID: {s.sessionId}</p>
                </Link>
              );
            })()}
          </li>
        ))}
      </ul>
    </section>
  );
}
