const { ManagerEventTypes } = require('magmastream');

module.exports = {
  name: 'Queue Finished',
  isEvent: true,

  fields: [],

  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    // Pre-cache event reference to avoid lookup on each event
    let queueFinishEvents = null;

    DBM.Events.queueFinish = function queueFinish(player) {
      // Only fetch events once and cache them
      if (queueFinishEvents === null) {
        queueFinishEvents = Bot.$evts['Queue Finished'];
      }
      
      if (!queueFinishEvents || queueFinishEvents.length === 0) return;
      
      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      // Optimize loop by checking length once
      const eventCount = queueFinishEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(queueFinishEvents[i], server);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function queueFinishOnReady(...params) {
      // Use a more reliable initialization method
      const initManager = () => {
        if (Bot.bot.manager) {
          // Using proper ManagerEventTypes for consistency with Magmastream v2.8
          // Remove any existing listeners to prevent duplicates
          Bot.bot.manager.removeListener('queueEnd', DBM.Events.queueFinish);
          Bot.bot.manager.on('queueEnd', DBM.Events.queueFinish);
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