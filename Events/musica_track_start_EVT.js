module.exports = {
  name: 'Track Started Playing',
  isEvent: true,

  fields: ['Temp Variable Name (stores track data):', 'Temp Variable Name (stores player data):'],

  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    DBM.Events.trackStart = function trackStart(player, track) {
      if (!Bot.$evts['Track Started Playing']) return;
      const server = Bot.bot.guilds.cache.get(player.guild);
      if (!server) return;

      for (const event of Bot.$evts['Track Started Playing']) {
        const temp = {};
        if (event.temp) temp[event.temp] = {
          title: track.title,
          duration: track.duration,
          url: track.uri,
          requester: track.requester,
          thumbnail: track.thumbnail,
          author: track.author,
          position: 0, // Track just started
          isStream: track.isStream
        };
        if (event.temp2) temp[event.temp2] = {
          guildId: player.guild,
          textChannelId: player.textChannel,
          voiceChannelId: player.voiceChannel,
          volume: player.volume,
          queueLength: player.queue.length
        };
        Actions.invokeEvent(event, server, temp);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function trackStartOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on('trackStart', DBM.Events.trackStart);
        } else {
          setTimeout(initManager, 1000);
        }
      };
      
      initManager();
      onReady.apply(this, ...params);
    };
  },
};