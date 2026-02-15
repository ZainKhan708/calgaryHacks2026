import Link from "next/link";
import { CATEGORY_OPTIONS } from "@/lib/categories/catalog";

export default function CategoriesPage() {
  return (
    <main className="min-h-screen px-6 py-10 flex flex-col items-center justify-center">
      <div className="mx-auto max-w-4xl w-full">
        <h1 className="text-3xl font-semibold text-museum-spotlight mb-2">
          Choose a Category
        </h1>
        <p className="text-museum-muted mb-8">
          Select a theme for your memory museum, or contribute to the archives by uploading your own media.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 place-items-center justify-items-center">
          {CATEGORY_OPTIONS.map((cat) => (
            <li key={cat.slug} className="w-full max-w-[200px]">
              <div className="block rounded-lg border border-museum-amber/40 bg-museum-surface px-5 py-4 text-museum-text text-center w-full transition-colors duration-300 ease-out hover:bg-museum-warm hover:border-museum-amber hover:text-museum-bg cursor-default">
                {cat.label}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-20 flex justify-center">
          <Link
            href="/upload"
            className="inline-block rounded-md bg-museum-surface border-2 border-museum-amber/60 px-6 py-3 text-museum-text transition-colors duration-300 ease-out hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
          >
            Upload Memory Archive
          </Link>
        </div>
      </div>
    </main>
  );
}
