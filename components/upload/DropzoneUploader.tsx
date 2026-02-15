"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const [fileInputs, setFileInputs] = useState<Array<{ title: string; description: string }>>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentFile = pendingFiles[currentIndex];
  const isModalOpen = currentFile != null;

  // Preview URL for current file (images only)
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
    setFileInputs(list.map(() => ({ title: "", description: "" })));
    setCurrentIndex(0);
    setTitle("");
    setDescription("");
  }

  function updateCurrentInput(field: "title" | "description", value: string) {
    setFileInputs((prev) =>
      prev.map((item, idx) => (idx === currentIndex ? { ...item, [field]: value } : item))
    );
  }

  async function runPipeline(files: File[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("metadata", JSON.stringify(fileInputs));
    if (category) formData.append("category", category);
    if (sessionId) formData.append("sessionId", sessionId);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) throw new Error(await extractErrorMessage(uploadRes));
    const uploadData = (await uploadRes.json()) as { sessionId?: string; files?: unknown[] };
    const returnedSessionId = uploadData?.sessionId;
    if (!returnedSessionId) throw new Error("Missing session id");

    if (typeof window !== "undefined" && Array.isArray(uploadData.files)) {
      sessionStorage.setItem(`mnemosyne:files:${returnedSessionId}`, JSON.stringify(uploadData.files));
    }

    let pipelineRes = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: returnedSessionId, category })
    });
    if (pipelineRes.status === 404 && Array.isArray(uploadData.files) && uploadData.files.length) {
      pipelineRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: returnedSessionId, category, files: uploadData.files })
      });
    }
    if (!pipelineRes.ok) throw new Error(await extractErrorMessage(pipelineRes));
    const pipelineData = (await pipelineRes.json()) as { scene?: unknown };
    if (typeof window !== "undefined" && pipelineData?.scene) {
      sessionStorage.setItem(`mnemosyne:scene:${returnedSessionId}`, JSON.stringify(pipelineData.scene));
    }

    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    router.push(`/museum/${returnedSessionId}${query}`);
  }

  async function handleSave() {
    if (!currentFile) return;
    setToast("File has been archived");
    if (currentIndex + 1 < pendingFiles.length) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTitle(fileInputs[nextIndex]?.title ?? "");
      setDescription(fileInputs[nextIndex]?.description ?? "");
    } else {
      setIsSubmitting(true);
      setMessage("Building your museum...");
      try {
        await runPipeline(pendingFiles);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not build museum. Please try again.";
        setToast(message);
        setIsSubmitting(false);
        setMessage("Drop files or click to upload");
      } finally {
        setPendingFiles([]);
        setFileInputs([]);
        setCurrentIndex(0);
      }
    }
  }

  // Auto-dismiss toast
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
          disabled={isSubmitting}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="text-xl">{message}</div>
      </label>

      {/* Modal: title, description, preview, Save */}
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
                  onChange={(e) => {
                    const value = e.target.value;
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
                  onChange={(e) => {
                    const value = e.target.value;
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
                  if (isSubmitting) return;
                  setPendingFiles([]);
                  setFileInputs([]);
                  setCurrentIndex(0);
                }}
                disabled={isSubmitting}
                className="rounded-md border border-museum-amber/50 px-4 py-2 text-sm text-museum-text hover:bg-museum-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="rounded-md bg-museum-surface border-2 border-museum-amber/60 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
              >
                {isSubmitting ? "Building..." : "Save"}
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-museum-amber/40 bg-museum-surface px-4 py-2 text-sm text-museum-spotlight shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
