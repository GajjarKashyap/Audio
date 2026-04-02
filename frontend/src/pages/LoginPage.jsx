import { useState } from "react";

export function LoginPage({ onSubmit }) {
  const [value, setValue] = useState("2072G");

  function handleSubmit(event) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    onSubmit(value.trim());
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2.4rem] border border-white/10 bg-slate-950/35 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.4)] backdrop-blur-xl md:p-10">
          <div className="text-sm uppercase tracking-[0.4em] text-orange-300">SoundBound</div>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-stone-100 md:text-6xl">
            Search fast.
            <br />
            Play clean.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-stone-300 md:text-base">
            A focused multi-source music workspace with searchable providers, cleaner playback routing, and a
            faster path from search to stream.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/6 p-4">
              <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Sources</div>
              <div className="mt-2 text-2xl font-semibold text-stone-100">4</div>
              <div className="mt-1 text-sm text-stone-400">Active adapters loaded</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/6 p-4">
              <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Access</div>
              <div className="mt-2 text-2xl font-semibold text-stone-100">Local</div>
              <div className="mt-1 text-sm text-stone-400">Backend key protected</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/6 p-4">
              <div className="text-xs uppercase tracking-[0.28em] text-stone-500">Playback</div>
              <div className="mt-2 text-2xl font-semibold text-stone-100">Proxy</div>
              <div className="mt-1 text-sm text-stone-400">Stream through server</div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.4rem] border border-white/10 bg-black/35 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="mb-8">
            <div className="text-sm uppercase tracking-[0.38em] text-stone-500">Access Gate</div>
            <h2 className="mt-3 text-3xl font-semibold text-stone-100">Enter API key</h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Use the backend key to unlock search, aggregation, and streaming. Current key: <code>2072G</code>.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="2072G"
              className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-stone-100 outline-none placeholder:text-stone-500 focus:border-orange-400/60"
            />
            <button
              type="submit"
              className="w-full rounded-[1.4rem] bg-gradient-to-r from-orange-400 to-amber-300 px-4 py-3 font-semibold text-stone-950 transition hover:brightness-105"
            >
              Open Workspace
            </button>
          </form>
          <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/5 p-4 text-sm leading-6 text-stone-400">
            Keep only the providers that actually work in your region turned on. That gives cleaner search and fewer dead
            results.
          </div>
        </section>
      </div>
    </main>
  );
}
