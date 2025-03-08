const { ManagerEventTypes } = require('magmastream');

module.exports = {
  name: 'Track Started Playing',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;
    let trackStartEvents = null;

    DBM.Events.trackStart = function trackStart(player, track) {
      if (trackStartEvents === null) {
        trackStartEvents = Bot.$evts['Track Started Playing'];
      }
      
      if (!trackStartEvents || trackStartEvents.length === 0) return;
      
      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;
      
      const eventCount = trackStartEvents.length;
      for (let i = 0; i < eventCount; i++) {
        Actions.invokeEvent(trackStartEvents[i], server);
      }
    };
    
    const { onReady } = Bot;
    Bot.onReady = function trackStartOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.removeListener(ManagerEventTypes.TrackStart, DBM.Events.trackStart);
          Bot.bot.manager.on(ManagerEventTypes.TrackStart, DBM.Events.trackStart);
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