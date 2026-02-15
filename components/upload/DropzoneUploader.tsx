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

interface AnalyzedFileResult {
  fileName: string;
  fileIndex: number;
  analyzedAt: string;
  preview: AnalysisPreview;
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

function dominantCategoryFromMetadata(metadata: FileInputMeta[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of metadata) {
    const category = item.aiCategory?.trim().toLowerCase();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  let winner: string | undefined;
  let winnerCount = -1;
  for (const [category, count] of counts) {
    if (count > winnerCount) {
      winner = category;
      winnerCount = count;
    }
  }

  return winner;
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
  const [finalMetadata, setFinalMetadata] = useState<FileInputMeta[] | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalyzedFileResult[]>([]);
  const [readyToBuild, setReadyToBuild] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisPreview, setAnalysisPreview] = useState<AnalysisPreview | null>(null);

  const currentFile = pendingFiles[currentIndex];
  const isModalOpen = Boolean(currentFile);
  const isBusy = isSubmitting || isAnalyzing;

  useEffect(() => {
    if (!currentFile || !currentFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(currentFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [currentFile]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  function resetFlow() {
    setMessage("Drop files or click to upload");
    setPendingFiles([]);
    setCurrentIndex(0);
    setTitle("");
    setDescription("");
    setFileInputs([]);
    setFinalMetadata(null);
    setAnalysisHistory([]);
    setReadyToBuild(false);
    setPreviewUrl(null);
    setIsAnalyzing(false);
    setIsSubmitting(false);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setAnalysisPreview(null);
  }

  function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;

    const list = Array.from(files);
    const initialInputs = list.map((file) => ({
      title: fileNameBase(file.name),
      description: ""
    }));

    setPendingFiles(list);
    setFileInputs(initialInputs);
    setCurrentIndex(0);
    setTitle(initialInputs[0]?.title ?? "");
    setDescription(initialInputs[0]?.description ?? "");
    setFinalMetadata(null);
    setAnalysisHistory([]);
    setReadyToBuild(false);
    setToast(null);
    setMessage("Add details and click Save to run AI analysis.");
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setAnalysisPreview(null);
  }

  function updateCurrentInput(field: "title" | "description", value: string) {
    setFileInputs((prev) =>
      prev.map((item, idx) => (idx === currentIndex ? { ...item, [field]: value } : item))
    );
  }

  function storeAnalysisResult(file: File, fileIndex: number, preview: AnalysisPreview) {
    setAnalysisHistory((prev) => {
      const next = prev.filter((item) => item.fileIndex !== fileIndex);
      next.push({
        fileName: file.name,
        fileIndex,
        analyzedAt: new Date().toISOString(),
        preview
      });
      next.sort((a, b) => a.fileIndex - b.fileIndex);
      return next;
    });
  }

  async function runLiveAnalysis(
    file: File,
    effectiveTitle: string,
    effectiveDescription: string
  ): Promise<{ meta: FileInputMeta; preview: AnalysisPreview }> {
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

    const meta: FileInputMeta = {
      title: effectiveTitle,
      description: effectiveDescription,
      aiCategory: preview.category,
      aiTags: preview.tags,
      aiCaption: preview.caption,
      aiSummary: preview.summary,
      aiSentiment: preview.sentiment,
      aiConfidence: preview.confidence
    };

    setAnalysisPreview(preview);
    setAnalysisStatus("done");
    setAnalysisError(null);

    return { meta, preview };
  }

  async function runPipeline(files: File[], metadata: FileInputMeta[]) {
    const inferredCategory = category?.trim().toLowerCase() || dominantCategoryFromMetadata(metadata);

    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    formData.append("metadata", JSON.stringify(metadata));
    if (inferredCategory) formData.append("category", inferredCategory);
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
        category: inferredCategory,
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

    const query = inferredCategory ? `?category=${encodeURIComponent(inferredCategory)}` : "";
    router.push(`/museum/${returnedSessionId}${query}`);
  }

  async function handleAnalyzeCurrentFile() {
    if (!currentFile || isBusy) return;

    const fileIndex = currentIndex;
    const effectiveTitle = title.trim() || fileNameBase(currentFile.name) || "Untitled Memory";
    const effectiveDescription = description.trim() || `Memory entry from ${currentFile.name}.`;

    const metadataWithText = fileInputs.map((item, idx) =>
      idx === fileIndex ? { ...item, title: effectiveTitle, description: effectiveDescription } : item
    );
    setFileInputs(metadataWithText);

    try {
      setIsAnalyzing(true);
      setAnalysisStatus("preparing");
      setAnalysisError(null);

      const { meta, preview } = await runLiveAnalysis(currentFile, effectiveTitle, effectiveDescription);
      const mergedMetadata = metadataWithText.map((item, idx) => (idx === fileIndex ? meta : item));

      setFileInputs(mergedMetadata);
      setFinalMetadata(mergedMetadata);
      storeAnalysisResult(currentFile, fileIndex, preview);
      setToast(`AI categorized "${currentFile.name}" as ${meta.aiCategory ?? "unknown"}.`);

      if (fileIndex + 1 < pendingFiles.length) {
        const nextIndex = fileIndex + 1;
        setCurrentIndex(nextIndex);
        setTitle(mergedMetadata[nextIndex]?.title ?? fileNameBase(pendingFiles[nextIndex]?.name ?? ""));
        setDescription(mergedMetadata[nextIndex]?.description ?? "");
        setAnalysisStatus("idle");
        return;
      }

      setReadyToBuild(true);
      setMessage("AI analysis complete. Review the results, then click Build Museum.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not process file.";
      setAnalysisStatus("error");
      setAnalysisError(errorMessage);
      setToast(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleBuildMuseum() {
    if (isSubmitting || isAnalyzing || !readyToBuild) return;

    const metadata = finalMetadata ?? fileInputs;
    if (!pendingFiles.length || metadata.length !== pendingFiles.length) {
      setAnalysisError("Missing files or metadata. Please run AI analysis again.");
      return;
    }

    try {
      setIsSubmitting(true);
      setAnalysisError(null);
      setMessage("Building your museum...");
      await runPipeline(pendingFiles, metadata);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not build museum.";
      setAnalysisError(errorMessage);
      setToast(errorMessage);
      setMessage("AI analysis complete. Review the results, then click Build Museum.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const analyzedCount = analysisHistory.length;
  const totalFiles = pendingFiles.length;
  const currentFileLabel = totalFiles ? `File ${currentIndex + 1} of ${totalFiles}` : "";

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
            <h3 className="text-lg font-semibold text-museum-spotlight mb-1">Add details</h3>
            <p className="text-xs text-museum-muted mb-4">{currentFileLabel}</p>

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

            {readyToBuild ? (
              <div className="mt-4 rounded-md border border-museum-amber/40 bg-museum-bg px-3 py-2 text-xs text-museum-muted">
                All files are analyzed. Review the AI results below, then click <span className="text-museum-spotlight">Build Museum</span>.
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isBusy) return;
                  resetFlow();
                }}
                disabled={isBusy}
                className="rounded-md border border-museum-amber/50 px-4 py-2 text-sm text-museum-text hover:bg-museum-surface-hover transition-colors"
              >
                Cancel
              </button>

              {readyToBuild ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleBuildMuseum();
                  }}
                  disabled={isBusy}
                  className="rounded-md bg-museum-surface border-2 border-museum-amber/60 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
                >
                  {isSubmitting ? "Building..." : "Build Museum"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void handleAnalyzeCurrentFile();
                  }}
                  disabled={isBusy}
                  className="rounded-md bg-museum-surface border-2 border-museum-amber/60 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
                >
                  {isAnalyzing
                    ? "Analyzing..."
                    : currentIndex + 1 < pendingFiles.length
                      ? "Save & Analyze Next"
                      : "Save & Analyze"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-museum-amber/30 bg-museum-bg/60 p-4 space-y-3">
        <div className="text-sm text-museum-muted">
          AI Processing Status: <span className="text-museum-spotlight">{prettyStatus(analysisStatus)}</span>
        </div>
        {totalFiles > 0 ? (
          <div className="text-xs text-museum-dim">
            Analyzed {analyzedCount} / {totalFiles} files
          </div>
        ) : null}

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

        {analysisHistory.length > 0 ? (
          <div className="pt-2 border-t border-museum-amber/20">
            <p className="text-xs uppercase tracking-wide text-museum-muted mb-2">Analyzed Files</p>
            <ul className="space-y-1 text-sm">
              {analysisHistory.map((item) => (
                <li key={`${item.fileIndex}-${item.fileName}`} className="flex items-start justify-between gap-3">
                  <span className="text-museum-text truncate">{item.fileName}</span>
                  <span className="text-museum-dim shrink-0">
                    {item.preview.category} ({(item.preview.confidence * 100).toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-museum-amber/40 bg-museum-surface px-4 py-2 text-sm text-museum-spotlight shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
