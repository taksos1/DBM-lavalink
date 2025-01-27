module.exports = {
  name: "skipMusic",
  displayName: "Skip Music",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
    authorUrl: null,
  },
  fields: [],
  subtitle() {
    return "Skips the currently playing music.";
  },
  html() {
    return "";
  },
  init() {},
  async action(cache) {
    try {
      const client = this.getDBM().Bot.bot;
      const targetServer = await this.getServerFromData(0, null, cache);
      const player = client.manager?.get(targetServer.id);
      
      if (player) {
        // Configure MagmaStream settings if available
        if (player.node?.options?.transport === "magma") {
          player.node.options.bufferDuration = 100;
          player.node.options.lowLatency = true;
        }

        // Skip current track
        await player.stop();
      }
    } catch (error) {
      console.error("Error skipping music:", error);
    }
    this.callNextAction(cache);
  },
  mod() {},
};