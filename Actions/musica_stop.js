module.exports = {
  name: "stopMusic",
  displayName: "Stop Music",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
    authorUrl: null,
  },
  fields: [],
  subtitle() {
    return "Stops the currently playing music.";
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
          player.node.options.bufferDuration = 0;
          player.node.options.lowLatency = true;
        }

        // Clear queue and stop playback
        player.queue.clear();
        await player.stop();
        await player.destroy();
      }
    } catch (error) {
      console.error("Error stopping music:", error);
    }
    this.callNextAction(cache);
  },
  mod() {},
};