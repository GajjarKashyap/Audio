import { useEffect, useMemo, useState } from "react";
import { ActivityPanel } from "../components/ActivityPanel";
import { LibraryRail } from "../components/LibraryRail";
import { Player } from "../components/Player";
import { PluginSidebar } from "../components/PluginSidebar";
import { ResultsList } from "../components/ResultsList";
import { SearchBar } from "../components/SearchBar";
import { buildPlayUrl, getPlugins, getRecommendations, searchSongs } from "../lib/api";

const historyStorageKey = "soundbound_history";

export function HomePage({ apiKey, onLogout }) {
  const [plugins, setPlugins] = useState([]);
  const [enabledSources, setEnabledSources] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [activeSong, setActiveSong] = useState(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [linkStatus, setLinkStatus] = useState({ youtube: false, spotify: false });
  const [linkingProvider, setLinkingProvider] = useState(null);

  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(historyStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    getPlugins(apiKey)
      .then((data) => {
        setPlugins(data.plugins);
        setEnabledSources(data.plugins.map((plugin) => plugin.name));
      })
      .catch((requestError) => {
        if (requestError.message === "Unauthorized") {
          onLogout();
          return;
        }
        setError(requestError.message);
      });

    // Fetch link status
    fetch("http://localhost:3001/api/link-status", {
      headers: { "x-api-key": apiKey }
    })
      .then(r => r.json())
      .then(setLinkStatus)
      .catch(() => console.log("Failed to fetch link status"));
  }, [apiKey, onLogout]);

  async function handleLinkAccount(provider) {
    setLinkingProvider(provider);
    try {
      await fetch("http://localhost:3001/api/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({ provider })
      });
      // Poll for status every 2s to detect when user finishes
      const interval = setInterval(async () => {
        const res = await fetch("http://localhost:3001/api/link-status", {
          headers: { "x-api-key": apiKey }
        });
        const status = await res.json();
        setLinkStatus(status);
        if (status[provider]) {
          clearInterval(interval);
          setLinkingProvider(null);
        }
      }, 2000);
      // Timeout after 3 mins
      setTimeout(() => {
        clearInterval(interval);
        setLinkingProvider(null);
      }, 180000);
    } catch (err) {
      console.error(err);
      setLinkingProvider(null);
    }
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (!enabledSources.length) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError("");

      searchSongs(query.trim(), apiKey)
        .then((data) => setResults(data.filter((song) => enabledSources.includes(song.source))))
        .catch((requestError) => {
          if (requestError.message === "Unauthorized") {
            onLogout();
            return;
          }
          setError(requestError.message);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [apiKey, enabledSources, onLogout, query]);

  async function handleSelectSong(song) {
    setActiveSong(song);
    setStreamUrl("");
    setError("");

    try {
      // Single-hop: backend resolves + pipes audio in one request
      const playUrl = buildPlayUrl(song.id, song.source, apiKey);
      setStreamUrl(playUrl);

      // Fetch AI Recommendations (Music Nexus Style)
      getRecommendations(song.artist, song.title, apiKey)
        .then(setRecommendations)
        .catch(err => console.error("Rec failed", err));

      setHistory((current) => {
        const next = [song, ...current.filter((entry) => !(entry.id === song.id && entry.source === song.source))];
        return next.slice(0, 18);
      });
    } catch (requestError) {
      if (requestError.message === "Unauthorized") {
        onLogout();
        return;
      }
      setError(requestError.message);
    }
  }

  const activeSongIndex = results.findIndex((song) => song.id === activeSong?.id && song.source === activeSong?.source);
  const canGoPrevious = activeSongIndex > 0;
  const canGoNext = activeSongIndex >= 0 && activeSongIndex < results.length - 1;

  function playRelative(direction) {
    if (activeSongIndex < 0) {
      return;
    }

    const nextSong = results[activeSongIndex + direction];
    if (!nextSong) {
      return;
    }

    handleSelectSong(nextSong);
  }

  function toggleSource(name) {
    setEnabledSources((current) => {
      if (current.includes(name)) {
        return current.filter((entry) => entry !== name);
      }

      return [...current, name];
    });
  }

  const resultCountLabel = useMemo(() => {
    if (!results.length) {
      return "No results";
    }

    return `${results.length} tracks`;
  }, [results]);

  const queue = useMemo(() => {
    if (activeSongIndex < 0) {
      return results.slice(0, 8);
    }

    const upcoming = results.slice(activeSongIndex + 1, activeSongIndex + 7);
    const current = activeSong ? [activeSong] : [];
    return [...current, ...upcoming];
  }, [activeSong, activeSongIndex, results]);

  const highlightCards = useMemo(() => {
    const picks = (query ? results : history).slice(0, 3);
    return picks;
  }, [history, query, results]);

  return (
    <div className="flex bg-[#000000] text-[#FFFFFF] overflow-hidden" style={{ flexDirection: 'column', height: '100vh', padding: '13px', gap: '21px' }}>
      <div className="flex flex-1 overflow-hidden min-h-0" style={{ gap: '21px' }}>
        
        {/* LEFT SIDEBAR ~ 280px (38% of typical 740px constraint area) */}
        <aside className="shrink-0 overflow-y-auto hide-scrollbar" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '21px' }}>
          <div className="bg-[#121212] flex flex-col" style={{ padding: '21px', borderRadius: '13px', gap: '21px' }}>
            <h1 className="font-bold flex items-center" style={{ fontSize: '26px', gap: '13px' }}>
               <div className="bg-[#FFFFFF] text-[#000000] flex items-center justify-center font-bold" style={{ width: '34px', height: '34px', borderRadius: '13px', fontSize: '21px' }}>ॐ</div>
               Omstream
            </h1>
            <SearchBar value={query} onChange={setQuery} loading={loading} />
          </div>
          
          <div className="bg-[#121212] flex-1 overflow-y-auto hide-scrollbar" style={{ padding: '13px', borderRadius: '13px' }}>
            <PluginSidebar plugins={plugins} enabledSources={enabledSources} onToggle={toggleSource} />
            <div style={{ marginTop: '21px' }}>
              <LibraryRail
                activeSong={activeSong}
                history={history}
                enabledSources={enabledSources}
                onReplayHistory={handleSelectSong}
              />
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-[#121212] flex flex-col overflow-y-auto hide-scrollbar relative" style={{ borderRadius: '13px' }}>
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between bg-[#121212]/95 backdrop-blur-md" style={{ padding: '21px 34px' }}>
             <div className="flex items-center" style={{ gap: '13px' }}>
               <div className="font-semibold text-[#B3B3B3]" style={{ fontSize: '14px' }}>Search across active providers</div>
             </div>
            <div className="flex items-center bg-[#121212] border border-white/5 shadow-sm" style={{ padding: '6px', borderRadius: '13px', gap: '8px' }}>
              <button
                onClick={() => !linkStatus.youtube && handleLinkAccount("youtube")}
                disabled={linkStatus.youtube || linkingProvider === "youtube"}
                className={`transition font-semibold flex items-center justify-center ${linkStatus.youtube ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-inner" : "bg-[#1A1A1A] text-[#B3B3B3] hover:bg-[#282828] hover:text-[#FFFFFF]"}`}
                style={{ borderRadius: '8px', padding: '6px 13px', fontSize: '13px', gap: '8px' }}
              >
                {linkStatus.youtube && <div className="rounded-full bg-[#FF0000] shadow-[0_0_8px_rgba(255,0,0,0.5)]" style={{ width: '8px', height: '8px' }} />}
                {linkingProvider === "youtube" ? "Linking..." : linkStatus.youtube ? "YT Music" : "Link YT Music"}
              </button>

              <button
                onClick={() => !linkStatus.spotify && handleLinkAccount("spotify")}
                disabled={linkStatus.spotify || linkingProvider === "spotify"}
                className={`transition font-semibold flex items-center justify-center ${linkStatus.spotify ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-inner" : "bg-[#1A1A1A] text-[#B3B3B3] hover:bg-[#282828] hover:text-[#FFFFFF]"}`}
                style={{ borderRadius: '8px', padding: '6px 13px', fontSize: '13px', gap: '8px' }}
              >
                {linkStatus.spotify && <div className="rounded-full bg-[#1DB954] shadow-[0_0_8px_rgba(29,185,84,0.5)]" style={{ width: '8px', height: '8px' }} />}
                {linkingProvider === "spotify" ? "Linking..." : linkStatus.spotify ? "Spotify" : "Link Spotify"}
              </button>

              <div className="h-6 w-px bg-white/10 mx-1" />

              <button
                onClick={onLogout}
                className="bg-transparent text-[#B3B3B3] hover:text-[#FFFFFF] transition font-semibold"
                style={{ borderRadius: '8px', padding: '6px 13px', fontSize: '13px' }}
              >
                Log out
              </button>
            </div>
          </header>

          <div style={{ padding: '34px', display: 'flex', flexDirection: 'column', gap: '55px' }}>
            {/* Quick Picks / Home */}
            <section>
              <div className="flex items-end justify-between" style={{ marginBottom: '21px' }}>
                <h2 className="font-bold text-[#FFFFFF] tracking-tight" style={{ fontSize: '42px' }}>
                  {query ? `Searching for "${query}"` : "Home Feed"}
                </h2>
                <span className="font-semibold text-[#B3B3B3]" style={{ fontSize: '14px' }}>{resultCountLabel} • {enabledSources.length} sources enabled</span>
              </div>
              
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 focus-grid" style={{ gap: '21px' }}>
                {highlightCards.length ? (
                  highlightCards.map((song, index) => (
                    <button
                      key={`highlight:${song.source}:${song.id}`}
                      onClick={() => handleSelectSong(song)}
                      className="group flex flex-col bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 text-left transition"
                      style={{ gap: '13px', borderRadius: '8px', padding: '13px' }}
                    >
                      <div className="font-bold uppercase tracking-widest text-[#B3B3B3]" style={{ fontSize: '12px' }}>
                        {index === 0 ? "Quick Pick" : index === 1 ? "Replay" : "Mix Seed"}
                      </div>
                      <div>
                        <div className="truncate font-bold text-[#FFFFFF]" style={{ fontSize: '16px' }}>{song.title}</div>
                        <div className="truncate text-[#B3B3B3]" style={{ fontSize: '14px', marginTop: '8px' }}>{song.artist}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full border border-white/10 text-[#B3B3B3]" style={{ borderRadius: '8px', padding: '21px', fontSize: '14px' }}>
                    Search or start playback to populate your mixes and quick picks.
                  </div>
                )}
              </div>
            </section>

             {/* AI Recommendations */}
            {recommendations.length > 0 && (
              <section>
                <div style={{ marginBottom: '21px' }}>
                  <h2 className="font-bold text-[#FFFFFF] tracking-tight" style={{ fontSize: '26px' }}>Up Next / Recommendations</h2>
                </div>
                <div className="flex min-w-full overflow-x-auto hide-scrollbar" style={{ gap: '21px', paddingBottom: '21px' }}>
                  {recommendations.map((song) => (
                    <button
                      key={`rec:${song.source}:${song.id}`}
                      onClick={() => handleSelectSong(song)}
                      className="group flex shrink-0 flex-col bg-[#121212] hover:bg-[#1A1A1A] text-left transition"
                      style={{ width: '160px', padding: '8px', borderRadius: '8px' }}
                    >
                      <div className="relative w-full bg-[#1A1A1A] overflow-hidden" style={{ marginBottom: '13px', aspectRatio: '1/1', borderRadius: '8px' }}>
                        <img
                          src={song.thumbnail}
                          className="h-full w-full object-cover transition duration-200"
                        />
                        <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex items-center justify-center bg-[#1DB954] text-[#000000]" style={{ width: '42px', height: '42px', borderRadius: '50%' }}>
                              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '21px', height: '21px', marginLeft: '4px' }}><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                      </div>
                      <div className="truncate font-bold text-[#FFFFFF]" style={{ fontSize: '16px' }}>{song.title}</div>
                      <div className="truncate text-[#B3B3B3]" style={{ fontSize: '14px', marginTop: '4px' }}>{song.artist}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Main Results grid */}
            <section>
              <div style={{ marginBottom: '21px' }}>
                <h2 className="font-bold text-[#FFFFFF] tracking-tight" style={{ fontSize: '26px' }}>Results</h2>
              </div>
              <ResultsList
                results={results}
                activeSong={activeSong}
                onSelect={handleSelectSong}
                loading={loading}
                error={error}
              />
            </section>
          </div>
        </main>

        {/* RIGHT SIDEBAR ~ Activity / Queue (Hidden on small screens) */}
        <aside className="shrink-0 bg-[#121212] overflow-y-auto hide-scrollbar hidden xl:block relative" style={{ width: '320px', borderRadius: '13px', padding: '21px' }}>
          <ActivityPanel queue={queue} history={history} activeSong={activeSong} onPickSong={handleSelectSong} />
        </aside>
      </div>

      {/* BOTTOM PLAYER BAR */}
      <Player
        song={activeSong}
        streamUrl={streamUrl}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={() => playRelative(-1)}
        onNext={() => playRelative(1)}
      />
    </div>
  );
}
