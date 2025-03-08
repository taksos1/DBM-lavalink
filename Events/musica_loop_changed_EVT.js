const { ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'repeat change',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;
    let repeatChangeEvents = null;

    DBM.Events.repeatChange = function repeatChange(player, oldRepeat, newRepeat) {
      if (repeatChangeEvents === null) {
        repeatChangeEvents = Bot.$evts['repeat change'];
      }
      
      if (!repeatChangeEvents || repeatChangeEvents.length === 0) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      const eventData = { player, oldRepeat, newRepeat };
      const eventCount = repeatChangeEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(repeatChangeEvents[i], server, eventData);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function repeatChangeOnReady(...params) {
      const playerStateHandler = (oldState, newState, payload) => {
        if (payload.changeType === PlayerStateEventTypes.RepeatChange) {
          const queueRepeatChanged = newState.queueRepeat !== oldState.queueRepeat;
          const trackRepeatChanged = newState.trackRepeat !== oldState.trackRepeat;
          
          if (queueRepeatChanged || trackRepeatChanged) {
            DBM.Events.repeatChange(newState, oldState.repeat, newState.repeat);
          }
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