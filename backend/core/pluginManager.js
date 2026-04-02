const path = require("path");

const registry = require(path.join(__dirname, "..", "data", "sources.json"));

const adapterMap = {
  YoutubeProvider: require("../adapters/youtubeAdapter"),
  YoutubeMusicProvider: require("../adapters/youtubeMusicAdapter"),
  SpotifyProvider: require("../adapters/spotifyAdapter"),
  SoundcloudProvider: require("../adapters/soundcloudAdapter"),
  SaavnProvider: require("../adapters/saavnAdapter"),
  LrcLibProvider: require("../adapters/lrcLibAdapter")
};

class PluginManager {
  constructor(sourceRegistry = registry) {
    this.registry = Array.isArray(sourceRegistry) ? sourceRegistry : [];
    this.plugins = [];
    this.pluginMap = new Map();
    this.searchTimeoutMs = 8000;
    
    // Performance Layer: Store recent search queries in memory (clears on restart)
    this.searchCache = new Map();
    
    this.load();
  }

  load() {
    const selected = this.registry.filter((entry) => entry.enabledByDefault);
    const ordered = [];
    const seen = new Set();

    const visit = (entry) => {
      if (!entry?.source_id || seen.has(entry.source_id)) {
        return;
      }

      const dependencies = Array.isArray(entry.extraDeps) ? entry.extraDeps : [];
      dependencies.forEach(visit);

      seen.add(entry.source_id);
      ordered.push(this.toInternalPlugin(entry));
    };

    selected.forEach(visit);

    this.plugins = ordered.map((plugin) => this.attachDependencies(plugin, ordered));
    this.pluginMap = new Map(this.plugins.map((plugin) => [plugin.name, plugin]));
  }

  toInternalPlugin(entry) {
    return {
      id: entry.source_id,
      name: entry.source_name,
      type: entry.source_type,
      enabled: Boolean(entry.enabledByDefault),
      adapter: adapterMap[entry.source_name] || null,
      extraDeps: Array.isArray(entry.extraDeps) ? entry.extraDeps : [],
      source: entry
    };
  }

  attachDependencies(plugin, allPlugins) {
    const dependencies = {};

    for (const dependency of plugin.extraDeps) {
      const match = allPlugins.find((candidate) => candidate.id === dependency.source_id);

      if (!match || !match.adapter) {
        continue;
      }

      dependencies[match.name] = match.adapter;
    }

    return {
      ...plugin,
      dependencies
    };
  }

  getPlugins() {
    return this.plugins;
  }

  getActivePlugins() {
    return this.plugins.filter((plugin) => plugin.enabled);
  }

  getPluginByName(name) {
    return this.pluginMap.get(name) || null;
  }

  async searchAll(query) {
    // Check Cache First! Converts 8.0s delays into 0.001s instant hits for repeated typings
    if (this.searchCache.has(query)) {
      console.log(`[cache] Search HIT: "${query}"`);
      return this.searchCache.get(query);
    }
    console.log(`[cache] Search MISS: "${query}"`);

    const searchablePlugins = this.getActivePlugins().filter(
      (plugin) =>
        plugin.adapter &&
        plugin.enabled &&
        (plugin.type === "QUERYABLE_PROVIDER" || plugin.type === "DOWNLOADABLE_PROVIDER" || plugin.type === "PROVIDER")
    );

    const searchResponses = await Promise.allSettled(
      searchablePlugins.map((plugin) => {
        if (typeof plugin.adapter.search !== "function") return Promise.resolve([]);
        return Promise.race([
          plugin.adapter.search(query, this.buildContext(plugin)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Search timeout for ${plugin.name}`)), this.searchTimeoutMs)
          )
        ]);
      })
    );

    const results = searchResponses.flatMap((response) => (response.status === "fulfilled" && Array.isArray(response.value) ? response.value : []));
    
    // Store in cache for 15 minutes before deleting to preserve RAM
    this.searchCache.set(query, results);
    setTimeout(() => this.searchCache.delete(query), 900000);

    return results;
  }

  async getStream(sourceName, id) {
    const plugin = this.getPluginByName(sourceName);

    if (!plugin || !plugin.adapter) {
      throw new Error("Plugin not found");
    }

    return plugin.adapter.stream(id, this.buildContext(plugin));
  }

  async getMetadata(sourceName, id) {
    const plugin = this.getPluginByName(sourceName);

    if (!plugin || !plugin.adapter || typeof plugin.adapter.metadata !== "function") {
      return null;
    }

    try {
      return await plugin.adapter.metadata(id, this.buildContext(plugin));
    } catch (err) {
      return null;
    }
  }

  async getLyrics(trackName, artistName, duration) {
    // Try LrcLib first as it's the standard from Music Nexus
    const plugin = this.getPluginByName("LrcLibProvider");
    if (plugin && plugin.adapter && typeof plugin.adapter.lyrics === "function") {
      try {
        return await plugin.adapter.lyrics(trackName, artistName, parseInt(duration, 10));
      } catch (err) {
        console.error("[lyrics] LrcLib failed", err.message);
      }
    }
    return { found: false };
  }

  buildContext(plugin) {
    return {
      plugin,
      manager: this,
      dependencies: plugin.dependencies || {}
    };
  }
}

module.exports = {
  PluginManager,
  adapterMap
};
