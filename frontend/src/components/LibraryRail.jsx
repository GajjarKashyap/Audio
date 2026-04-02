const navItems = [
  { id: "home", label: "Home", hint: "For you" },
  { id: "explore", label: "Explore", hint: "Search and picks" },
  { id: "library", label: "Library", hint: "History and queue" },
  { id: "playlists", label: "Playlists", hint: "Quick mixes" }
];

export function LibraryRail({ activeSong, history, enabledSources, onReplayHistory }) {
  const quickPlay = history.slice(0, 4);

  return (
    <aside className="space-y-4">
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.32)] backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Music Shell</div>
        <div className="mt-4 space-y-2">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-[1.3rem] border px-4 py-3 ${
                item.id === "home"
                  ? "border-orange-400/35 bg-gradient-to-r from-orange-500/15 to-amber-300/8"
                  : "border-white/8 bg-white/5"
              }`}
            >
              <div className="text-sm font-semibold text-stone-100">{item.label}</div>
              <div className="mt-1 text-xs text-stone-500">{item.hint}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.32)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Pinned Mix</div>
            <h2 className="mt-2 text-xl font-semibold text-stone-100">Night Drive</h2>
          </div>
          <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs text-stone-400">
            {enabledSources.length} live
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          A rotating stack of your recent plays, active sources, and fast-access tracks.
        </p>
        {activeSong ? (
          <div className="mt-4 rounded-[1.4rem] border border-orange-400/20 bg-orange-500/10 p-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-orange-200">Current focus</div>
            <div className="mt-2 truncate text-sm font-semibold text-stone-100">{activeSong.title}</div>
            <div className="mt-1 truncate text-xs text-stone-400">{activeSong.artist}</div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.32)] backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Quick Play</div>
        <div className="mt-4 space-y-3">
          {quickPlay.length ? (
            quickPlay.map((entry) => (
              <button
                key={`${entry.source}:${entry.id}`}
                onClick={() => onReplayHistory(entry)}
                className="flex w-full items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/5 px-3 py-3 text-left transition hover:border-white/20 hover:bg-white/8"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400/20 to-cyan-400/15 text-xs font-semibold text-stone-200">
                  {entry.title?.slice(0, 2) || "SB"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-100">{entry.title}</div>
                  <div className="truncate text-xs text-stone-500">{entry.artist}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/4 p-4 text-sm text-stone-500">
              Play a few tracks and your quick picks will land here.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
