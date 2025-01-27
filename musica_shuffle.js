module.exports = {
  name: "shuffleQueue",
  displayName: "Shuffle Music Queue",
  section: "Lavalink",
  meta: {
    version: "1.0.0",
    preciseCheck: true,
    author: "Taksos",
  },

  subtitle() {
    return "Shuffle Current Queue";
  },

  fields: ["shuffle"],

  html() {
    return `
    <div style="float: left; width: 100%;">
      <span class="dbminputlabel">Shuffle Queue</span><br>
      <select id="shuffle" class="round">
        <option value="0" selected>Current Queue</option>
      </select>
    </div>`;
  },

  async action(cache) {
    const client = this.getDBM().Bot.bot;
    const targetServer = await this.getServerFromData(0, null, cache);
    const player = client.manager.get(targetServer.id);

    try {
      if (!player) {
        console.error("[Shuffle] No active player found!");
        return this.callNextAction(cache);
      }

      if (!player.queue || player.queue.length === 0) {
        console.log("[Shuffle] Queue is empty, nothing to shuffle.");
        return this.callNextAction(cache);
      }

      // Fisher-Yates shuffle algorithm for optimal randomization
      const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };

      // Keep track of current track and position if any
      const currentTrack = player.queue.current;
      const currentPosition = player.position;

      // Shuffle the queue
      player.queue = shuffleArray(player.queue);

      // Restore current track and position if they existed
      if (currentTrack) {
        player.queue.current = currentTrack;
        player.position = currentPosition;
      }

      console.log("[Shuffle] Queue has been shuffled successfully!");
    } catch (err) {
      console.error("Error shuffling queue:", err);
    }

    this.callNextAction(cache);
  },

  mod() {
    console.log("Queue Shuffle Action loaded successfully.");
  },
};