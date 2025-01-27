// pauseMusic.js
module.exports = {
  name: "pauseMusic",
  displayName: "Pause Music",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
    
  },
  fields: [],
  subtitle(data) {
    return ``;
  },
  variableStorage(data, varType) {
    return ``;
  },
  html() {
    return ``;
  },
  init() {},
  async action(cache) {
    const client = this.getDBM().Bot.bot;
    let targetServer;
    try {
      targetServer = await this.getServerFromData(0, null, cache);
      const player = client.manager.get(targetServer.id);
      
      if (player) {
        // Configure MagmaStream settings if available
        if (player.node?.options?.transport === "magma") {
          player.node.options.bufferDuration = 200;
          player.node.options.lowLatency = true;
        }

        if (!player.paused) {
          await player.pause(true);
        }
      }
    } catch (error) {
      console.error("Error pausing music:", error);
    }
    this.callNextAction(cache);
  },
  mod() {},
};

// resumeMusic.js
module.exports = {
  name: "resumeMusic",
  displayName: "Resume Music",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Caio Sclavi",
    authorUrl: "https://ko-fi.com/caiozin",
  },
  fields: [],
  subtitle(data) {
    return ``;
  },
  variableStorage(data, varType) {
    return ``;
  },
  html() {
    return ``;
  },
  init() {},
  async action(cache) {
    try {
      const targetServer = await this.getServerFromData(0, null, cache);
      const client = this.getDBM().Bot.bot;
      const player = client.manager.get(targetServer.id);
      
      if (player) {
        // Configure MagmaStream settings if available
        if (player.node?.options?.transport === "magma") {
          player.node.options.bufferDuration = 200;
          player.node.options.lowLatency = true;
        }

        if (player.paused) {
          await player.pause(false);
        }
      }
    } catch (error) {
      console.error("Error resuming music:", error);
    }
    this.callNextAction(cache);
  },
  mod() {},
};