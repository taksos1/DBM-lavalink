const { ManagerEventTypes } = require('magmastream');

module.exports = {
  name: 'Track Started Playing',
  isEvent: true,
  
  fields: [],
  
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;
    
    // Pre-cache event reference to avoid lookup on each event
    let trackStartEvents = null;
    
    DBM.Events.trackStart = function trackStart(player, track) {
      // Only fetch events once and cache them
      if (trackStartEvents === null) {
        trackStartEvents = Bot.$evts['Track Started Playing'];
      }
      
      if (!trackStartEvents || trackStartEvents.length === 0) return;
      
      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;
      
      // Optimize loop by checking length once
      const eventCount = trackStartEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(trackStartEvents[i], server);
      }
    };
    
    const { onReady } = Bot;
    Bot.onReady = function trackStartOnReady(...params) {
      // Use a more reliable initialization method
      const initManager = () => {
        if (Bot.bot.manager) {
          // Remove any existing listeners to prevent duplicates
          Bot.bot.manager.removeListener(ManagerEventTypes.TrackStart, DBM.Events.trackStart);
          Bot.bot.manager.on(ManagerEventTypes.TrackStart, DBM.Events.trackStart);
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