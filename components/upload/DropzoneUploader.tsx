"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AnalysisStatus = "idle" | "preparing" | "calling-ai" | "done" | "error";

interface AnalysisPreview {
  memoryId: string;
  userId: string;
  category: string;
  tags: string[];
  caption: string;
  summary: string;
  sentiment: string;
  confidence: number;
  modelInfo: {
    provider: string;
    model: string;
    fallbackUsed: boolean;
    latencyMs: number;
  };
}

function prettyStatus(status: AnalysisStatus): string {
  if (status === "preparing") return "Preparing payload...";
  if (status === "calling-ai") return "Calling /api/ai/analyze...";
  if (status === "done") return "AI analysis complete.";
  if (status === "error") return "AI analysis failed.";
  return "Idle";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function filenameBase(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: string | { message?: string };
    };
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
    if (payload.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
      return payload.error.message;
    }
    return `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function DropzoneUploader({ category }: { category?: string }) {
  const router = useRouter();

  const [message, setMessage] = useState("Drop files or click to upload");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisPreview, setAnalysisPreview] = useState<AnalysisPreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentFile = pendingFiles[currentIndex];
  const isModalOpen = currentFile != null;
  const isBusy = isAnalyzing || isSubmitting;

  useEffect(() => {
    if (!currentFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    if (currentFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(currentFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [currentFile]);

  function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setPendingFiles(list);
    setCurrentIndex(0);
    setTitle("");
    setDescription("");
    setMessage("Drop files or click to upload");
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setAnalysisPreview(null);
  }

  async function runPipeline(files: File[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    if (category) formData.append("category", category);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    if (!uploadRes.ok) throw new Error(await extractErrorMessage(uploadRes));

    const uploadData = (await uploadRes.json()) as { sessionId?: string; files?: unknown[] };
    const sessionId = uploadData?.sessionId;
    if (!sessionId) throw new Error("Missing session id");

    let pipelineRes = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, category })
    });

    if (pipelineRes.status === 404 && Array.isArray(uploadData.files) && uploadData.files.length) {
      pipelineRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, category, files: uploadData.files })
      });
    }

    if (!pipelineRes.ok) throw new Error(await extractErrorMessage(pipelineRes));

    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    router.push(`/museum/${sessionId}${query}`);
  }

  async function runLiveAnalysis(file: File) {
    const payload = {
      userId: "local-user",
      title: title.trim() || filenameBase(file.name) || "Untitled Memory",
      description: description.trim() || `Memory entry from ${file.name}.`,
      imageDataUrl: file.type.startsWith("image/") ? await fileToDataUrl(file) : undefined
    };

    setAnalysisStatus("calling-ai");
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const body = (await response.json()) as { data: AnalysisPreview };
    setAnalysisPreview(body.data);
    setAnalysisStatus("done");
    setToast(`File analyzed: ${body.data.category}`);
  }

  async function handleSave() {
    if (!currentFile || isBusy) return;

    try {
      setIsAnalyzing(true);
      setAnalysisStatus("preparing");
      setAnalysisError(null);
      await runLiveAnalysis(currentFile);

      if (currentIndex + 1 < pendingFiles.length) {
        setCurrentIndex((i) => i + 1);
        setTitle("");
        setDescription("");
        return;
      }

      setIsSubmitting(true);
      setMessage("Building your museum...");
      await runPipeline(pendingFiles);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unexpected processing error.";
      setAnalysisStatus("error");
      setAnalysisError(msg);
      setToast(msg);
    } finally {
      setIsAnalyzing(false);
      setIsSubmitting(false);
      if (currentIndex + 1 >= pendingFiles.length) {
        setPendingFiles([]);
        setCurrentIndex(0);
      }
      setMessage("Drop files or click to upload");
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="space-y-4">
      <label className="block border-2 border-dashed border-museum-amber/50 rounded-xl p-12 text-center cursor-pointer bg-museum-surface/50 text-museum-text transition-colors duration-300 hover:bg-museum-warm/30 hover:border-museum-warm">
        <input
          type="file"
          className="hidden"
          multiple
          accept="image/*,text/*,audio/*,.txt,.md"
          disabled={isBusy}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="text-xl">{message}</div>
      </label>

      {isModalOpen && currentFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-museum-amber/40 bg-museum-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-museum-spotlight mb-4">Add details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-museum-muted mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title"
                  className="w-full rounded-md border border-museum-amber/40 bg-museum-bg px-3 py-2 text-museum-text placeholder:text-museum-dim focus:border-museum-amber focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-museum-muted mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full rounded-md border border-museum-amber/40 bg-museum-bg px-3 py-2 text-museum-text placeholder:text-museum-dim focus:border-museum-amber focus:outline-none resize-none"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-museum-muted mb-2">Preview</span>
                {currentFile.type.startsWith("image/") && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="rounded-lg border border-museum-amber/30 max-h-48 w-full object-contain bg-museum-bg"
                  />
                ) : (
                  <div className="rounded-lg border border-museum-amber/30 bg-museum-bg px-4 py-6 text-center text-museum-muted text-sm">
                    {currentFile.name} ({(currentFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isBusy) return;
                  setPendingFiles([]);
                  setCurrentIndex(0);
                }}
                disabled={isBusy}
                className="rounded-md border border-museum-amber/50 px-4 py-2 text-sm text-museum-text hover:bg-museum-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={isBusy}
                className="rounded-md bg-museum-surface border-2 border-museum-amber/60 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
              >
                {isAnalyzing ? "Analyzing..." : isSubmitting ? "Building..." : "Save"}
              </button>
            </div>
            {pendingFiles.length > 1 && (
              <p className="mt-3 text-xs text-museum-dim text-center">
                File {currentIndex + 1} of {pendingFiles.length}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-museum-amber/30 bg-museum-bg/60 p-4 space-y-2">
        <div className="text-sm text-museum-muted">
          AI Processing Status: <span className="text-museum-spotlight">{prettyStatus(analysisStatus)}</span>
        </div>
        {analysisError ? <div className="text-sm text-red-300">{analysisError}</div> : null}

        {analysisPreview ? (
          <div className="space-y-2 text-sm text-museum-text">
            <div>
              <span className="text-museum-muted">Category:</span> {analysisPreview.category}
            </div>
            <div>
              <span className="text-museum-muted">Tags:</span> {analysisPreview.tags.join(", ")}
            </div>
            <div>
              <span className="text-museum-muted">Caption:</span> {analysisPreview.caption}
            </div>
            <div>
              <span className="text-museum-muted">Summary:</span> {analysisPreview.summary}
            </div>
            <div>
              <span className="text-museum-muted">Sentiment:</span> {analysisPreview.sentiment}
              {" | "}
              <span className="text-museum-muted">Confidence:</span> {(analysisPreview.confidence * 100).toFixed(1)}%
            </div>
            <div>
              <span className="text-museum-muted">Model:</span> {analysisPreview.modelInfo.provider} /{" "}
              {analysisPreview.modelInfo.model}
              {analysisPreview.modelInfo.fallbackUsed ? " (fallback)" : ""}
            </div>
            <div>
              <span className="text-museum-muted">Latency:</span> {analysisPreview.modelInfo.latencyMs}ms
            </div>
          </div>
        ) : (
          <div className="text-sm text-museum-dim">Save a file to see live AI results here.</div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-museum-amber/40 bg-museum-surface px-4 py-2 text-sm text-museum-spotlight shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
