"use client";

import { useState } from "react";

type Stage = "idle" | "uploading" | "analyzing" | "done" | "error";

export function DropzoneUploader() {
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState("Drop files or click to upload");

  async function runPipeline(files: FileList | null) {
    if (!files?.length) return;
    setStage("uploading");
    setMessage("Uploading files...");

    const uploadBody = new FormData();
    Array.from(files).forEach((file) => uploadBody.append("files", file));

    const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadBody });
    if (!uploadRes.ok) {
      setStage("error");
      setMessage("Upload failed.");
      return;
    }

    const upload = await uploadRes.json();
    setStage("analyzing");
    setMessage("Analyzing and generating museum...");

    const pipelineRes = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: upload.sessionId })
    });

    if (!pipelineRes.ok) {
      setStage("error");
      setMessage("Pipeline failed.");
      return;
    }

    setStage("done");
    setMessage("Museum generated. Opening...");
    window.location.href = `/museum/${upload.sessionId}`;
  }

  return (
    <div className="space-y-4">
      <label className="block border-2 border-dashed border-white/30 rounded-xl p-12 text-center cursor-pointer bg-black/20 hover:bg-black/30 transition">
        <input
          type="file"
          className="hidden"
          multiple
          accept="image/*,text/*,audio/*,.txt,.md"
          onChange={(e) => runPipeline(e.target.files)}
        />
        <div className="text-xl">{message}</div>
      </label>
      <p className="text-sm text-neutral-400">
        MVP supports mixed image/text/audio. If `OPENAI_API_KEY` is missing, deterministic fallback analysis is used.
      </p>
      <div className="text-xs uppercase tracking-wide text-neutral-500">Status: {stage}</div>
    </div>
  );
}
