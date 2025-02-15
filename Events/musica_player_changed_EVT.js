const { Manager, ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'player changed',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    // Define playerChanged event to handle different changes
    DBM.Events.playerChanged = function playerChanged(player, oldState, newState, changeType, details) {
      if (!Bot.$evts['player changed']) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      // Handle the specific change types
      if (changeType === PlayerStateEventTypes.RepeatChange) {
        const loopModeChanged = newState.queueRepeat !== oldState.queueRepeat || newState.trackRepeat !== oldState.trackRepeat;
        if (loopModeChanged) {
          const loopMode = newState.queueRepeat ? 'queue' : newState.trackRepeat ? 'track' : 'off';
          for (const event of Bot.$evts['player changed']) {
            Actions.invokeEvent(event, server, { player, changeType, loopMode });
          }
        }
      } else if (changeType === PlayerStateEventTypes.QueueChange) {
        for (const event of Bot.$evts['player changed']) {
          Actions.invokeEvent(event, server, { player, changeType, previousQueue: details.previousQueue, currentQueue: details.currentQueue });
        }
      } else if (changeType === PlayerStateEventTypes.VolumeChange) {
        for (const event of Bot.$evts['player changed']) {
          Actions.invokeEvent(event, server, { player, changeType, previousVolume: details.previousVolume, currentVolume: details.currentVolume });
        }
      }
    };

    // Bot onReady function to initialize manager
    const { onReady } = Bot;
    Bot.onReady = function playerChangedOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on(ManagerEventTypes.PlayerStateUpdate, (oldState, newState, { changeType, details }) => {
            DBM.Events.playerChanged(newState, oldState, newState, changeType, details);
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
