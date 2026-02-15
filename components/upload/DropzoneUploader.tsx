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

interface UploadResponse {
  sessionId?: string;
  files?: unknown[];
}

interface PipelineResponse {
  scene?: unknown;
}

interface FileInputMeta {
  title: string;
  description: string;
  aiCategory?: string;
  aiTags?: string[];
  aiCaption?: string;
  aiSummary?: string;
  aiSentiment?: string;
  aiConfidence?: number;
}

function prettyStatus(status: AnalysisStatus): string {
  if (status === "preparing") return "Preparing AI payload...";
  if (status === "calling-ai") return "Calling /api/ai/analyze...";
  if (status === "done") return "AI analysis complete.";
  if (status === "error") return "AI analysis failed.";
  return "Idle";
}

function fileNameBase(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
}

function clampConfidence(value: unknown): number | undefined {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
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

export function DropzoneUploader({ category, sessionId }: { category?: string; sessionId?: string }) {
  const router = useRouter();

  const [message, setMessage] = useState("Drop files or click to upload");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileInputs, setFileInputs] = useState<FileInputMeta[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisPreview, setAnalysisPreview] = useState<AnalysisPreview | null>(null);

  const currentFile = pendingFiles[currentIndex];
  const isModalOpen = currentFile != null;
  const isBusy = isSubmitting || isAnalyzing;

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
  }, [currentFile, previewUrl]);

  function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setPendingFiles(list);
    setFileInputs(list.map(() => ({ title: "", description: "" })));
    setCurrentIndex(0);
    setTitle("");
    setDescription("");
    setToast(null);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setAnalysisPreview(null);
  }

  function updateCurrentInput(field: "title" | "description", value: string) {
    setFileInputs((prev) =>
      prev.map((item, idx) => (idx === currentIndex ? { ...item, [field]: value } : item))
    );
  }

  async function runLiveAnalysis(file: File, effectiveTitle: string, effectiveDescription: string): Promise<FileInputMeta> {
    setAnalysisStatus("calling-ai");
    const payload = {
      userId: "local-user",
      title: effectiveTitle,
      description: effectiveDescription,
      imageDataUrl: file.type.startsWith("image/") ? await fileToDataUrl(file) : undefined
    };

    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res));

    const body = (await res.json()) as { data?: Partial<AnalysisPreview> };
    const data = body.data;
    if (!data || typeof data.category !== "string") {
      throw new Error("AI response missing category.");
    }

    const preview: AnalysisPreview = {
      memoryId: typeof data.memoryId === "string" ? data.memoryId : "memory-local",
      userId: typeof data.userId === "string" ? data.userId : "local-user",
      category: data.category,
      tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
      caption: typeof data.caption === "string" ? data.caption : "",
      summary: typeof data.summary === "string" ? data.summary : "",
      sentiment: typeof data.sentiment === "string" ? data.sentiment : "neutral",
      confidence: clampConfidence(data.confidence) ?? 0.5,
      modelInfo: {
        provider:
          data.modelInfo && typeof data.modelInfo === "object" && typeof data.modelInfo.provider === "string"
            ? data.modelInfo.provider
            : "mock",
        model:
          data.modelInfo && typeof data.modelInfo === "object" && typeof data.modelInfo.model === "string"
            ? data.modelInfo.model
            : "unknown",
        fallbackUsed:
          data.modelInfo && typeof data.modelInfo === "object" && typeof data.modelInfo.fallbackUsed === "boolean"
            ? data.modelInfo.fallbackUsed
            : false,
        latencyMs:
          data.modelInfo && typeof data.modelInfo === "object" && Number.isFinite(Number(data.modelInfo.latencyMs))
            ? Number(data.modelInfo.latencyMs)
            : 0
      }
    };

    setAnalysisPreview(preview);
    setAnalysisStatus("done");
    setAnalysisError(null);

    return {
      title: effectiveTitle,
      description: effectiveDescription,
      aiCategory: preview.category,
      aiTags: preview.tags,
      aiCaption: preview.caption,
      aiSummary: preview.summary,
      aiSentiment: preview.sentiment,
      aiConfidence: preview.confidence
    };
  }

  async function runPipeline(files: File[], metadata: FileInputMeta[]) {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    formData.append("metadata", JSON.stringify(metadata));
    if (category) formData.append("category", category);
    if (sessionId) formData.append("sessionId", sessionId);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error(await extractErrorMessage(uploadRes));
    const uploadData = (await uploadRes.json()) as UploadResponse;
    const returnedSessionId = uploadData.sessionId;
    if (!returnedSessionId) throw new Error("Missing session id");

    if (typeof window !== "undefined" && Array.isArray(uploadData.files)) {
      sessionStorage.setItem(`mnemosyne:files:${returnedSessionId}`, JSON.stringify(uploadData.files));
    }

    const pipelineRes = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: returnedSessionId,
        category,
        files: Array.isArray(uploadData.files) ? uploadData.files : []
      })
    });
    if (!pipelineRes.ok) throw new Error(await extractErrorMessage(pipelineRes));

    const pipelineData = (await pipelineRes.json()) as PipelineResponse;
    if (typeof window !== "undefined" && pipelineData.scene) {
      const serialized = JSON.stringify(pipelineData.scene);
      sessionStorage.setItem(`mnemosyne:scene:${returnedSessionId}`, serialized);
      sessionStorage.setItem(`scene_${returnedSessionId}`, serialized);
    }

    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    router.push(`/museum/${returnedSessionId}${query}`);
  }

  async function handleSave() {
    if (!currentFile || isBusy) return;

    const effectiveTitle = title.trim() || fileNameBase(currentFile.name) || "Untitled Memory";
    const effectiveDescription = description.trim() || `Memory entry from ${currentFile.name}.`;

    const metaWithText = fileInputs.map((item, idx) =>
      idx === currentIndex ? { ...item, title: effectiveTitle, description: effectiveDescription } : item
    );
    setFileInputs(metaWithText);

    try {
      setIsAnalyzing(true);
      setAnalysisStatus("preparing");
      const analyzedMeta = await runLiveAnalysis(currentFile, effectiveTitle, effectiveDescription);

      const finalMeta = metaWithText.map((item, idx) => (idx === currentIndex ? analyzedMeta : item));
      setFileInputs(finalMeta);
      setToast(`AI category: ${analyzedMeta.aiCategory ?? "unknown"}`);

      if (currentIndex + 1 < pendingFiles.length) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setTitle(finalMeta[nextIndex]?.title ?? "");
        setDescription(finalMeta[nextIndex]?.description ?? "");
        return;
      }

      setIsSubmitting(true);
      setMessage("Building your museum...");
      await runPipeline(pendingFiles, finalMeta);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not process file.";
      setAnalysisStatus("error");
      setAnalysisError(errorMessage);
      setToast(errorMessage);
      setMessage("Drop files or click to upload");
      setIsSubmitting(false);
    } finally {
      setIsAnalyzing(false);
      if (currentIndex + 1 >= pendingFiles.length) {
        setPendingFiles([]);
        setFileInputs([]);
        setCurrentIndex(0);
        setTitle("");
        setDescription("");
      }
    }
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeout);
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
          onChange={(event) => handleFileSelect(event.target.files)}
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
                  onChange={(event) => {
                    const value = event.target.value;
                    setTitle(value);
                    updateCurrentInput("title", value);
                  }}
                  placeholder="Enter title"
                  className="w-full rounded-md border border-museum-amber/40 bg-museum-bg px-3 py-2 text-museum-text placeholder:text-museum-dim focus:border-museum-amber focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-museum-muted mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDescription(value);
                    updateCurrentInput("description", value);
                  }}
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
                  setFileInputs([]);
                  setCurrentIndex(0);
                  setTitle("");
                  setDescription("");
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
          <div className="text-sm text-museum-dim">Save a file to run AI analysis and preview the result.</div>
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
