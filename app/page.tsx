import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-museum-spotlight">Mnemosyne</h1>
        <p className="text-lg text-museum-muted">
          Upload personal media and explore a procedural memory museum in first-person.
        </p>
        <Link
          href="/categories"
          className="inline-block rounded-md bg-museum-surface border-2 border-museum-amber/60 px-6 py-3 text-museum-text transition-colors duration-300 ease-out hover:bg-museum-warm hover:border-museum-warm hover:text-museum-bg"
        >
          Start Building Museum
        </Link>
      </section>
    </main>
  );
}
