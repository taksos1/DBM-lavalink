const { Manager } = require('magmastream');

module.exports = {
  name: 'Queue Finished',
  isEvent: true,

  fields: [],

  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    DBM.Events.queueFinish = function queueFinish(player) {
      if (!Bot.$evts['Queue Finished']) return;
      
      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      for (const event of Bot.$evts['Queue Finished']) {
        Actions.invokeEvent(event, server);
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