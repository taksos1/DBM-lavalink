module.exports = {
  name: 'Queue Finished',
  isEvent: true,

  fields: ['Temp Variable Name (stores player data):'],

  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    DBM.Events.queueFinish = function queueFinish(player) {
      if (!Bot.$evts['Queue Finished']) return;
      const server = Bot.bot.guilds.cache.get(player.guild);
      if (!server) return;

      for (const event of Bot.$evts['Queue Finished']) {
        const temp = {};
        if (event.temp) temp[event.temp] = {
          guildId: player.guild,
          textChannelId: player.textChannel,
          voiceChannelId: player.voiceChannel,
          totalPlayedTracks: player.queue.string ? player.queue.string.split('\n').length : 0,
          lastVolume: player.volume,
          disconnectReason: 'queue_finish'
        };
        Actions.invokeEvent(event, server, temp);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function queueFinishOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on('queueEnd', DBM.Events.queueFinish);
        } else {
          setTimeout(initManager, 1000);
        }
      };
      
      initManager();
      onReady.apply(this, ...params);
    };
  },
};