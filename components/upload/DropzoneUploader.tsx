"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EntryDraft {
  title: string;
  description: string;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Ignore parsing errors and use fallback message.
  }

  return `Request failed (${response.status})`;
}

export function DropzoneUploader() {
  const router = useRouter();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [entryDrafts, setEntryDrafts] = useState<EntryDraft[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
    setEntryDrafts(list.map(() => ({ title: "", description: "" })));
    setCurrentIndex(0);
    setTitle("");
    setDescription("");
    setToast(null);
  }

  async function runPipeline(files: File[], drafts: EntryDraft[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("entries", JSON.stringify(drafts));

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    if (!uploadResponse.ok) {
      throw new Error(await readErrorMessage(uploadResponse));
    }

    const uploadPayload = (await uploadResponse.json()) as { sessionId?: string };
    if (!uploadPayload.sessionId) {
      throw new Error("Upload completed without a sessionId.");
    }

    const pipelineResponse = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: uploadPayload.sessionId })
    });
    if (!pipelineResponse.ok) {
      throw new Error(await readErrorMessage(pipelineResponse));
    }

    return uploadPayload.sessionId;
  }

  async function handleSave() {
    if (!currentFile) return;
    const finalizedDrafts = entryDrafts.map((draft, index) =>
      index === currentIndex
        ? {
            title: title.trim(),
            description: description.trim()
          }
        : draft
    );
    setEntryDrafts(finalizedDrafts);

    if (currentIndex + 1 < pendingFiles.length) {
      setCurrentIndex((i) => i + 1);
      setTitle("");
      setDescription("");
      setToast("File metadata saved");
      return;
    }

    setIsSubmitting(true);
    setToast("Uploading and classifying archive...");

    try {
      const sessionId = await runPipeline(pendingFiles, finalizedDrafts);
      setToast("Archive classified. Opening museum...");
      setPendingFiles([]);
      setEntryDrafts([]);
      setCurrentIndex(0);
      setTitle("");
      setDescription("");
      router.push(`/museum/${sessionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process archive.";
      setToast(message);
    } finally {
      setIsSubmitting(false);
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
        <div className="text-xl">{isSubmitting ? "Processing archive..." : "Drop files or click to upload"}</div>
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
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title"
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  setEntryDrafts([]);
                  setCurrentIndex(0);
                  setTitle("");
                  setDescription("");
                }}
                disabled={isSubmitting}
                className="rounded-md border border-museum-amber/50 px-4 py-2 text-sm text-museum-text hover:bg-museum-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={isSubmitting}
                className="rounded-md bg-museum-surface border-2 border-museum-amber/60 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
              >
                {isSubmitting ? "Processing..." : "Save"}
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
