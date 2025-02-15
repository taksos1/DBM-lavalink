const { Manager, ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'repeat change',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    // Define repeatChange event
    DBM.Events.repeatChange = function repeatChange(player, oldRepeat, newRepeat) {
      if (!Bot.$evts['repeat change']) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      // Trigger the repeat change event for each listener
      for (const event of Bot.$evts['repeat change']) {
        Actions.invokeEvent(event, server, { player, oldRepeat, newRepeat });
      }
    };

    // Bot onReady function to initialize manager
    const { onReady } = Bot;
    Bot.onReady = function repeatChangeOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on(ManagerEventTypes.PlayerStateUpdate, (oldState, newState, { changeType, details }) => {
            if (changeType === PlayerStateEventTypes.RepeatChange) {
              const loopModeChanged = newState.queueRepeat !== oldState.queueRepeat || newState.trackRepeat !== oldState.trackRepeat;
              
              if (loopModeChanged) {
                const loopMode = newState.queueRepeat ? 'queue' : newState.trackRepeat ? 'track' : 'off';
                
                // Trigger the repeat change event
                DBM.Events.repeatChange(newState, oldState.repeat, newState.repeat);
              }
            }
          });
        } else {
          setTimeout(initManager, 1000);
        }
      };

      initManager();
      if (onReady) onReady.call(this, ...params);
    };
  },
};
