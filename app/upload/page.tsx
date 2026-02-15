import Link from "next/link";
import { DropzoneUploader } from "@/components/upload/DropzoneUploader";

export default function UploadPage() {
  return (
    <main className="min-h-screen px-6 py-10 flex justify-center">
      <section className="w-full max-w-3xl space-y-6">
        <Link href="/" className="text-sm text-museum-muted hover:text-museum-spotlight transition">
          {"<- Back"}
        </Link>
        <h1 className="text-3xl font-semibold text-museum-text">Upload Memory Archive</h1>
        <DropzoneUploader />
      </section>
    </main>
  );
}
