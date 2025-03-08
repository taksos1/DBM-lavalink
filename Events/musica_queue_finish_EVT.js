const { ManagerEventTypes } = require('magmastream');

module.exports = {
  name: 'Queue Finished',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;
    let queueFinishEvents = null;

    DBM.Events.queueFinish = function queueFinish(player) {
      if (queueFinishEvents === null) {
        queueFinishEvents = Bot.$evts['Queue Finished'];
      }
      
      if (!queueFinishEvents || queueFinishEvents.length === 0) return;
      
      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      const eventCount = queueFinishEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(queueFinishEvents[i], server);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function queueFinishOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.removeListener('queueEnd', DBM.Events.queueFinish);
          Bot.bot.manager.on('queueEnd', DBM.Events.queueFinish);
          return true;
        }
        return false;
      };
      
      if (!initManager()) {
        let attempts = 0;
        const maxAttempts = 5;
        const tryInit = () => {
          attempts++;
          if (initManager() || attempts >= maxAttempts) return;
          setTimeout(tryInit, Math.min(500 * Math.pow(2, attempts - 1), 8000));
        };
        setTimeout(tryInit, 500);
      }
      
      if (onReady) onReady.apply(this, params);
    };
  },
};