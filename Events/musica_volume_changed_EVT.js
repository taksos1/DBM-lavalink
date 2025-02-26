const { ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'volume change',
  isEvent: true,
  fields: [],
  
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    // Pre-cache event reference to avoid lookup on each event
    let volumeChangeEvents = null;

    DBM.Events.volumeChange = function volumeChange(player, oldVolume, newVolume) {
      // Only fetch events once and cache them
      if (volumeChangeEvents === null) {
        volumeChangeEvents = Bot.$evts['volume change'];
      }
      
      if (!volumeChangeEvents || volumeChangeEvents.length === 0) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      // Create data object once outside the loop
      const eventData = { player, oldVolume, newVolume };
      
      // Optimize loop by checking length once
      const eventCount = volumeChangeEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(volumeChangeEvents[i], server, eventData);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function volumeChangeOnReady(...params) {
      // Use a more reliable initialization method with handler reference
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
          // Remove any existing listeners to prevent duplicates
          Bot.bot.manager.removeListener(ManagerEventTypes.PlayerStateUpdate, playerStateHandler);
          Bot.bot.manager.on(ManagerEventTypes.PlayerStateUpdate, playerStateHandler);
          return true;
        }
        return false;
      };
      
      // Try to initialize immediately
      if (!initManager()) {
        // Set up a more efficient retry mechanism with exponential backoff
        let attempts = 0;
        const maxAttempts = 5;
        const tryInit = () => {
          attempts++;
          if (initManager() || attempts >= maxAttempts) return;
          
          // Exponential backoff (500ms, 1000ms, 2000ms, 4000ms, 8000ms)
          setTimeout(tryInit, Math.min(500 * Math.pow(2, attempts - 1), 8000));
        };
        
        setTimeout(tryInit, 500);
      }
      
      // Call original onReady with proper arguments
      if (onReady) onReady.apply(this, params);
    };
  },
};