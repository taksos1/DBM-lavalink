const { Manager, ManagerEventTypes } = require('magmastream');

module.exports = {
  name: 'Track Started Playing',
  isEvent: true,
  
  fields: [],
  
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;
    
    DBM.Events.trackStart = function trackStart(player, track) {
      if (!Bot.$evts['Track Started Playing']) return;
      
      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;
      
      for (const event of Bot.$evts['Track Started Playing']) {
        Actions.invokeEvent(event, server);
      }
    };
    
    const { onReady } = Bot;
    Bot.onReady = function trackStartOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on(ManagerEventTypes.TrackStart, DBM.Events.trackStart);
        } else {
          setTimeout(initManager, 1000);
        }
      };
      
      initManager();
      onReady.apply(this, ...params);
    };
  },
};