function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--:--";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function ResultsList({ results, activeSong, onSelect, loading, error }) {
  if (error) {
    return (
      <div className="rounded-[1.8rem] border border-red-500/25 bg-red-500/12 p-6 text-sm text-red-100 shadow-[0_18px_45px_rgba(127,29,29,0.2)]">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6 text-sm text-stone-300">
        Scanning active providers...
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-white/10 bg-white/5 p-6 text-sm text-stone-400">
        Search for a track to see aggregated results.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((song) => {
        const isActive = activeSong?.id === song.id && activeSong?.source === song.source;
        const sourceLabel = song.source?.replace(/Provider$/, "") || "Source";

        return (
          <button
            key={`${song.source}:${song.id}`}
            onClick={() => onSelect(song)}
            className={`grid w-full grid-cols-[72px_1fr_auto] gap-4 rounded-[1.6rem] border p-3 text-left shadow-[0_18px_40px_rgba(2,6,23,0.18)] transition ${
              isActive
                ? "border-orange-400/45 bg-gradient-to-r from-orange-500/18 to-orange-200/6"
                : "border-white/10 bg-slate-950/35 hover:border-white/20 hover:bg-white/6"
            }`}
          >
            {song.thumbnail ? (
              <img
                src={song.thumbnail}
                alt={song.title}
                className="h-[72px] w-[72px] rounded-[1.2rem] object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-slate-700/70 to-slate-900/90 text-lg font-semibold text-stone-300">
                {song.title?.slice(0, 1) || "S"}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-stone-100 md:text-lg">{song.title}</div>
              <div className="mt-1 truncate text-sm text-stone-400">{song.artist}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 capitalize">{sourceLabel}</span>
                <span>{formatDuration(song.duration)}</span>
              </div>
            </div>
            <div
              className={`self-center rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                isActive ? "bg-orange-400/15 text-orange-200" : "bg-white/5 text-stone-400"
              }`}
            >
              {isActive ? "Live" : "Play"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
