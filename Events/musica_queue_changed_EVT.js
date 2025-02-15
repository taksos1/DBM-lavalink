const { Manager, ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'queue change',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    DBM.Events.queueChange = function queueChange(player, oldQueue, newQueue) {
      if (!Bot.$evts['queue change']) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      for (const event of Bot.$evts['queue change']) {
        Actions.invokeEvent(event, server, { player, oldQueue, newQueue }); // Pass queue info
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function queueChangeOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on(ManagerEventTypes.PlayerStateUpdate, (oldState, newState, { changeType: type, details }) => {
            if (type === PlayerStateEventTypes.QueueChange) {
              DBM.Events.queueChange(newState, details.previousQueue, details.currentQueue)
            }
          });
        } else {
          setTimeout(initManager, 1000);
        }
      };

      initManager();
      onReady.apply(this, ...params);
    };
  },
};