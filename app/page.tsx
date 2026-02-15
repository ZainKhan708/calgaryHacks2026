import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight">Mnemosyne</h1>
        <p className="text-lg text-neutral-300">
          Upload personal media, run multimodal analysis, and explore a procedural memory museum in first-person.
        </p>
        <Link href="/upload" className="inline-block rounded-md bg-white/10 border border-white/20 px-6 py-3 hover:bg-white/20 transition">
          Start Building Museum
        </Link>
      </section>
    </main>
  );
}
