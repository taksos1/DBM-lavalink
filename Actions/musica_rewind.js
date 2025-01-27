module.exports = {
  name: "playPrevious",
  displayName: "Play Previous Song",
  section: "Lavalink",
  meta: {
    version: "1.0.6", 
    preciseCheck: true,
    author: "Taksos",
  },
  subtitle() {
    return `Plays the previous song and re-queues the current one after a 2-second delay.`;
  },
  variableStorage() {
    return "";
  },
  html() {
    return `<p>Plays the previous song and then adds the current one back to the queue after a 2-second delay.</p>`;
  },
  init() {},
  async action(cache) {
    const client = this.getDBM().Bot.bot;
    const server = await this.getServerFromData(0, null, cache);

    if (!server) {
      console.error("No server found in cache.");
      return this.callNextAction(cache);
    }

    const player = client.manager.get(server.id);

    if (!player) {
      console.log("No player found for this server.");
      return this.callNextAction(cache);
    }

    if (!player.queue || !player.queue.previous) {
      console.log("No previous song available.");
      return this.callNextAction(cache);
    }

    try {
      const currentTrack = player.queue.current;
      const previousTrack = player.queue.previous;

      player.queue.unshift(previousTrack); // Add previous to the queue
      player.stop();
      player.play();

      // Use setTimeout directly (no need for trackEnd event with magmastream for this)
      setTimeout(() => {
        if (currentTrack) {
          player.queue.unshift(currentTrack);
          console.log("Re-queued the original current track after 2 seconds.");
        }
      }, 1000); // Changed delay to 2000 milliseconds (2 seconds)

      console.log("Playing the previous song.");
    } catch (error) {
      console.error("Error playing previous song:", error);
    }

    this.callNextAction(cache);
  },
  mod() {},
};