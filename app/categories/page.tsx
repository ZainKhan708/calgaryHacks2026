import Link from "next/link";

const CATEGORIES = [
  { slug: "science", label: "Science" },
  { slug: "history", label: "History" },
  { slug: "arts", label: "Arts" },
  { slug: "sports", label: "Sports" },
  { slug: "nature", label: "Nature" },
  { slug: "technology", label: "Technology" },
  { slug: "culture", label: "Culture" },
  { slug: "travel", label: "Travel" },
];

export default function CategoriesPage() {
  return (
    <main className="min-h-screen px-6 py-10 flex flex-col items-center justify-center">
      <div className="mx-auto max-w-4xl w-full">
        <Link
          href="/"
          className="inline-block mb-6 rounded-md bg-museum-surface border border-museum-amber/50 px-4 py-2 text-sm text-museum-text transition-colors duration-300 hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-semibold text-museum-spotlight mb-2">
          Choose a Category
        </h1>
        <p className="text-museum-muted mb-8">
          Select a theme for your memory museum, or contribute to the archives by uploading your own media.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 place-items-center justify-items-center">
          {CATEGORIES.map((cat) => (
            <li key={cat.slug} className="w-full max-w-[200px]">
              <Link
                href={`/museum/category/${encodeURIComponent(cat.slug)}`}
                className="block rounded-lg border border-museum-amber/40 bg-museum-surface px-5 py-4 text-museum-text text-center w-full transition-colors duration-300 ease-out hover:bg-museum-warm hover:border-museum-amber hover:text-museum-bg"
              >
                {cat.label}
              </Link>
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
