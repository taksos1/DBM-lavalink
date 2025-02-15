const { Manager, ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'volume change',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    DBM.Events.volumeChange = function volumeChange(player, oldVolume, newVolume) {
      if (!Bot.$evts['volume change']) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      for (const event of Bot.$evts['volume change']) {
        Actions.invokeEvent(event, server, { player, oldVolume, newVolume }); // Pass volume info
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function volumeChangeOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on(ManagerEventTypes.PlayerStateUpdate, (oldState, newState, { changeType: type, details }) => {
            if (type === PlayerStateEventTypes.VolumeChange) {
              DBM.Events.volumeChange(newState, details.previousVolume, details.currentVolume)
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