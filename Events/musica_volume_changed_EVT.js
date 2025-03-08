const { ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'volume change',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;
    let volumeChangeEvents = null;

    DBM.Events.volumeChange = function volumeChange(player, oldVolume, newVolume) {
      if (volumeChangeEvents === null) {
        volumeChangeEvents = Bot.$evts['volume change'];
      }
      
      if (!volumeChangeEvents || volumeChangeEvents.length === 0) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      const eventData = { player, oldVolume, newVolume };
      const eventCount = volumeChangeEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(volumeChangeEvents[i], server, eventData);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function volumeChangeOnReady(...params) {
      const playerStateHandler = (oldState, newState, payload) => {
        if (payload.changeType === PlayerStateEventTypes.VolumeChange) {
          DBM.Events.volumeChange(
            newState, 
            payload.details.previousVolume, 
            payload.details.currentVolume
          );
        }
      };
      
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.removeListener(ManagerEventTypes.PlayerStateUpdate, playerStateHandler);
          Bot.bot.manager.on(ManagerEventTypes.PlayerStateUpdate, playerStateHandler);
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