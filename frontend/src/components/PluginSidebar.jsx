export function PluginSidebar({ plugins, enabledSources, onToggle }) {
  return (
    <aside className="rounded-[2rem] border border-white/10 bg-slate-950/35 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.35)] backdrop-blur-xl">
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.35em] text-stone-500">Signal Stack</div>
        <h2 className="mt-2 text-xl font-semibold text-stone-100">Sources</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Keep the reliable providers on and mute the noisy ones when you want cleaner results.
        </p>
      </div>
      <div className="space-y-3">
        {plugins.map((plugin) => {
          const enabled = enabledSources.includes(plugin.name);
          const shortName = plugin.name.replace(/Provider$/, "");

          return (
            <label
              key={plugin.name}
              className={`flex cursor-pointer items-center gap-3 rounded-[1.4rem] border px-4 py-3 transition ${
                enabled
                  ? "border-orange-400/45 bg-gradient-to-r from-orange-500/18 to-amber-300/8 text-stone-100"
                  : "border-white/8 bg-white/4 text-stone-400 hover:border-white/15 hover:bg-white/6"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold uppercase ${
                  enabled ? "bg-orange-400/20 text-orange-100" : "bg-white/7 text-stone-400"
                }`}
              >
                {shortName.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{shortName}</div>
                <div className="truncate text-xs text-stone-500">{enabled ? "Live in search mix" : "Muted"}</div>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => onToggle(plugin.name)}
                className="h-4 w-4 shrink-0"
              />
            </label>
          );
        })}
      </div>
    </aside>
  );
}
