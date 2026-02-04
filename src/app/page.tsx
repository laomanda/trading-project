import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">
          QuantumAI Terminal
        </h1>
        <p className="mt-3 text-slate-400">
          Dashboard trading prediction (simulation) dengan chart realtime.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            Buka Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
