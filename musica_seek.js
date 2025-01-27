module.exports = {
  name: "Seek Music",
  section: "Lavalink",
  fields: ["time"],

  subtitle(data) {
    return `Seek to ${data.time} seconds`;
  },

  variableStorage(data, varType) {
    return "";
  },

  html(isEvent, data) {
    return `
      <div style="float: left; width: 60%;">
          Time (in seconds or temp variable):<br>
          <input id="time" class="round" type="text">
      </div><br>
    `;
  },

  init() {},

  action(cache) {
    const data = cache.actions[cache.index];
    const time = parseInt(this.evalMessage(data.time, cache));
    const player = this.getDBM().Bot.bot.manager.players.get(cache.server.id);

    if (!player || !player.playing) {
      console.error("No music is currently playing.");
      this.callNextAction(cache);
      return;
    }

    if (isNaN(time) || time < 0) {
      console.error("Invalid time value.");
      this.callNextAction(cache);
      return;
    }

    player.seek(time * 1000); // converting seconds to milliseconds
    this.callNextAction(cache);
  }
};
