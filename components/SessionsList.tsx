"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SessionSummary {
  sessionId: string;
  fileCount: number;
  updatedAt?: string;
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
            <Link
              href={`/museum/${s.sessionId}`}
              className="block rounded-lg border border-museum-amber/40 bg-museum-surface px-4 py-3 text-museum-text hover:bg-museum-surface-hover transition-colors"
            >
              <span className="font-medium">{s.sessionId}</span>
              <span className="text-museum-muted text-sm ml-2">({s.fileCount} images)</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
