const { Manager, ManagerEventTypes, PlayerStateEventTypes } = require('magmastream');

module.exports = {
  name: 'queue change',
  isEvent: true,
  fields: [],
  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    // Helper function to validate and optimize queue data before passing to events
    function optimizeQueueData(queue) {
      if (!queue) return null;
      
      // Create a lightweight version of the queue instead of deep cloning
      const optimizedQueue = {
        current: queue.current ? {
          title: queue.current.title,
          author: queue.current.author,
          duration: queue.current.duration,
          uri: queue.current.uri,
          thumbnail: validateUrl(queue.current.thumbnail) ? queue.current.thumbnail : null,
          identifier: queue.current.identifier
        } : null,
        // Only include essential information about tracks and limit the number
        tracks: queue.tracks ? queue.tracks.slice(0, 10).map(track => ({
          title: track.title,
          author: track.author,
          duration: track.duration,
          uri: track.uri,
          thumbnail: validateUrl(track.thumbnail) ? track.thumbnail : null,
          identifier: track.identifier
        })) : [],
        // Add a count of remaining tracks if there are more than 10
        totalTracks: queue.tracks ? queue.tracks.length : 0
      };
      
      return optimizedQueue;
    }
    
    // Validate URL format
    function validateUrl(url) {
      if (!url) return false;
      return url.startsWith('http://') || url.startsWith('https://');
    }

    DBM.Events.queueChange = function queueChange(player, oldQueue, newQueue) {
      if (!Bot.$evts['queue change']) return;

      const server = Bot.bot.guilds.cache.get(player.guildId);
      if (!server) return;

      // Compare queue size to determine if this is a large queue addition
      const isLargeQueueChange = 
        (newQueue?.tracks?.length > 10 && 
         (!oldQueue?.tracks || newQueue.tracks.length - oldQueue.tracks.length > 5));
        
      // Create optimized queue data
      const optimizedOldQueue = optimizeQueueData(oldQueue);
      const optimizedNewQueue = optimizeQueueData(newQueue);
      
      // Add flag to indicate if this was a large queue change
      const eventData = { 
        player, 
        oldQueue: optimizedOldQueue, 
        newQueue: optimizedNewQueue,
        isLargeQueueChange: isLargeQueueChange
      };

      for (const event of Bot.$evts['queue change']) {
        Actions.invokeEvent(event, server, eventData);
      }
    };

    // Prevent multiple rapid queue change events
    let queueChangeTimeouts = {};
    
    const { onReady } = Bot;
    Bot.onReady = function queueChangeOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          Bot.bot.manager.on(ManagerEventTypes.PlayerStateUpdate, (oldState, newState, { changeType: type, details }) => {
            if (type === PlayerStateEventTypes.QueueChange) {
              const guildId = newState.guildId;
              
              // Clear existing timeout
              if (queueChangeTimeouts[guildId]) {
                clearTimeout(queueChangeTimeouts[guildId]);
              }
              
              // Use a longer delay for large queue changes
              const queueSize = details.currentQueue?.tracks?.length || 0;
              const delay = queueSize > 20 ? 500 : 100;
              
              // Set a small timeout to prevent multiple rapid triggers
              queueChangeTimeouts[guildId] = setTimeout(() => {
                DBM.Events.queueChange(newState, details.previousQueue, details.currentQueue);
                delete queueChangeTimeouts[guildId];
              }, delay);
            }
          });
        } else {
          setTimeout(initManager, 1000);
        }
      };

      initManager();
      if (onReady) {
        onReady.apply(this, params);
      }
    };
  },
};