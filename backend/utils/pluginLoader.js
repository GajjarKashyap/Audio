const fs = require("fs");
const path = require("path");

function loadPlugins() {
  const pluginsDir = path.join(__dirname, "..", "plugins");

  return fs
    .readdirSync(pluginsDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => {
      const plugin = require(path.join(pluginsDir, file));

      if (!plugin?.name || typeof plugin.searchSongs !== "function" || typeof plugin.getStreamUrl !== "function") {
        throw new Error(`Invalid plugin: ${file}`);
      }

      return plugin;
    });
}

module.exports = {
  loadPlugins
};
