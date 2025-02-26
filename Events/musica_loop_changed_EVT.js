const { ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'repeat change',
  isEvent: true,
  fields: [],
  
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    // Pre-cache event reference to avoid lookup on each event
    let repeatChangeEvents = null;

    // Define repeatChange event with optimizations
    DBM.Events.repeatChange = function repeatChange(player, oldRepeat, newRepeat) {
      // Only fetch events once and cache them
      if (repeatChangeEvents === null) {
        repeatChangeEvents = Bot.$evts['repeat change'];
      }
      
      if (!repeatChangeEvents || repeatChangeEvents.length === 0) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      // Create data object once outside the loop
      const eventData = { player, oldRepeat, newRepeat };
      
      // Optimize loop by checking length once
      const eventCount = repeatChangeEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(repeatChangeEvents[i], server, eventData);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function repeatChangeOnReady(...params) {
      // Use a more reliable initialization method with handler reference
      const playerStateHandler = (oldState, newState, payload) => {
        if (payload.changeType === PlayerStateEventTypes.RepeatChange) {
          // Faster condition check comparing only necessary properties
          const queueRepeatChanged = newState.queueRepeat !== oldState.queueRepeat;
          const trackRepeatChanged = newState.trackRepeat !== oldState.trackRepeat;
          
          if (queueRepeatChanged || trackRepeatChanged) {
            // Trigger the repeat change event
            DBM.Events.repeatChange(newState, oldState.repeat, newState.repeat);
          }
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