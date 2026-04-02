function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function ActivityPanel({ queue, history, activeSong, onPickSong }) {
  return (
    <aside className="space-y-4">
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.32)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Now Queue</div>
            <h2 className="mt-2 text-xl font-semibold text-stone-100">Up next</h2>
          </div>
          <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs text-stone-400">
            {queue.length}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {queue.length ? (
            queue.map((song, index) => {
              const isActive = activeSong?.id === song.id && activeSong?.source === song.source;

              return (
                <button
                  key={`${song.source}:${song.id}`}
                  onClick={() => onPickSong(song)}
                  className={`flex w-full items-center gap-3 rounded-[1.25rem] border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-orange-400/35 bg-orange-500/12"
                      : "border-white/8 bg-white/5 hover:border-white/15 hover:bg-white/8"
                  }`}
                >
                  <div className="w-6 text-xs text-stone-500">{String(index + 1).padStart(2, "0")}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-stone-100">{song.title}</div>
                    <div className="truncate text-xs text-stone-500">{song.artist}</div>
                  </div>
                  <div className="text-xs text-stone-500">{formatDuration(song.duration)}</div>
                </button>
              );
            })
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/4 p-4 text-sm text-stone-500">
              Start a track to build an active queue.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.32)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-stone-500">History</div>
            <h2 className="mt-2 text-xl font-semibold text-stone-100">Recently played</h2>
          </div>
          <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs text-stone-400">
            {history.length}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {history.length ? (
            history.map((song) => (
              <button
                key={`history:${song.source}:${song.id}`}
                onClick={() => onPickSong(song)}
                className="flex w-full items-center gap-3 rounded-[1.25rem] border border-white/8 bg-white/5 px-3 py-3 text-left transition hover:border-white/15 hover:bg-white/8"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700/70 to-slate-900/90 text-xs font-semibold text-stone-300">
                  {song.title?.slice(0, 2) || "SB"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-100">{song.title}</div>
                  <div className="truncate text-xs text-stone-500">{song.artist}</div>
                </div>
                <div className="text-[11px] text-stone-500">{song.source?.replace(/Provider$/, "")}</div>
              </button>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/4 p-4 text-sm text-stone-500">
              Your listening history will appear here.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
