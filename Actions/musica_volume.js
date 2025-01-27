module.exports = {
  name: "LavalinkSetVolume",
  displayName: "Set Lavalink Player Volume",
  section: "Lavalink",
  fields: ["volume"],
  subtitle(data) {
    return `Set volume to ${data.volume}`;
  },
  variableStorage(data, varType) {
    return "";
  },
  html(isEvent, data) {
    return `
      <div style="float: left; width: 60%;">
        Volume (0-100):<br>
        <input id="volume" class="round" type="text">
      </div>
    `;
  },
  init() {},
  async action(cache) {
    const data = cache.actions[cache.index];
    const volume = parseInt(this.evalMessage(data.volume, cache));
    if (isNaN(volume) || volume < 0 || volume > 100) {
      return this.callNextAction(cache);
    }

    const client = this.getDBM().Bot.bot;
    const targetServer = await this.getServerFromData(0, null, cache);

    // Check for Lavalink player
    const lavalinkPlayer = client.manager?.get(targetServer.id);
    if (lavalinkPlayer) {
      // If Lavalink player exists, set the volume
      try {
        await lavalinkPlayer.setVolume(volume);
      } catch (error) {
        console.error("Error setting Lavalink volume:", error);
      }
    } else {
      console.warn("Lavalink player not found, volume adjustment skipped."); // Only log a warning if Lavalink is not available
    }

    this.callNextAction(cache);
  },

  mod() {},
};