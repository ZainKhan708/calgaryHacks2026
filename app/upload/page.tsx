import Link from "next/link";
import { DropzoneUploader } from "@/components/upload/DropzoneUploader";

export default async function UploadPage({
  searchParams
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params?.category?.trim().toLowerCase() || undefined;

  return (
    <main className="min-h-screen px-6 py-10 flex flex-col items-center justify-center">
      <section className="w-full max-w-3xl space-y-6">
        <Link
          href="/categories"
          className="inline-block rounded-md bg-museum-surface border-2 border-museum-amber/60 px-4 py-2 text-sm font-medium text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          ← Back to Categories
        </Link>
        <h1 className="text-3xl font-semibold text-museum-text">Upload Memory Archive</h1>
        {selectedCategory ? (
          <p className="text-sm text-museum-muted">
            Selected category:{" "}
            <span className="text-museum-spotlight capitalize">{selectedCategory}</span>
          </p>
        ) : null}
        <DropzoneUploader category={selectedCategory} />
      </section>
    </main>
  );
}
