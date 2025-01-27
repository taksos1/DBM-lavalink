module.exports = {
  name: 'Player State Changed',
  isEvent: true,

  fields: ['Temp Variable Name (stores state data):', 'Temp Variable Name (stores player data):'],

  mod(DBM) {
    DBM.Events = DBM.Events || {};
    const { Bot, Actions } = DBM;

    // Helper function to handle state changes
    DBM.Events.playerStateChange = function playerStateChange(player, stateType, newValue, oldValue) {
      if (!Bot.$evts['Player State Changed']) return;
      const server = Bot.bot.guilds.cache.get(player.guild);
      if (!server) return;

      for (const event of Bot.$evts['Player State Changed']) {
        const temp = {};
        if (event.temp) temp[event.temp] = {
          type: stateType,
          newValue: newValue,
          oldValue: oldValue,
          timestamp: Date.now(),
        };
        
        if (event.temp2) temp[event.temp2] = {
          guildId: player.guild,
          textChannelId: player.textChannel,
          voiceChannelId: player.voiceChannel,
          volume: player.volume,
          queueLength: player.queue?.length || 0,
          currentTrack: player.queue?.current ? {
            title: player.queue.current.title,
            author: player.queue.current.author,
            url: player.queue.current.uri
          } : null
        };
        
        Actions.invokeEvent(event, server, temp);
      }
    };

    const { onReady } = Bot;
    Bot.onReady = function playerStateOnReady(...params) {
      const initManager = () => {
        if (Bot.bot.manager) {
          // Store original values to detect changes
          const playerStates = new Map();

          // Helper function to get queue signature
          const getQueueSignature = (queue) => {
            if (!queue || !Array.isArray(queue)) return '';
            return queue.map(track => track.uri || track.identifier).join(',');
          };

          // Helper function to get last tracks in queue
          const getLastTracks = (queue, count = 1) => {
            if (!queue || !Array.isArray(queue)) return [];
            return queue.slice(-count).map(track => ({
              title: track.title,
              author: track.author,
              url: track.uri,
              duration: track.duration,
              thumbnail: track.thumbnail,
              requester: track.requester
            }));
          };

          // Initialize state tracking for a player
          const initPlayerState = (player) => {
            if (!playerStates.has(player.guild)) {
              playerStates.set(player.guild, {
                autoplay: player.autoplay || false,
                loop: player.trackRepeat || player.queueRepeat || false,
                volume: player.volume || 100,
                queueSignature: getQueueSignature(player.queue),
                queueLength: player.queue?.length || 0
              });
            }
          };

          // Check for state changes
          const checkStateChanges = (player) => {
            const oldState = playerStates.get(player.guild);
            if (!oldState) {
              initPlayerState(player);
              return;
            }

            // Check autoplay changes
            const newAutoplay = player.autoplay || false;
            if (newAutoplay !== oldState.autoplay) {
              DBM.Events.playerStateChange(player, 'autoplay', newAutoplay, oldState.autoplay);
              oldState.autoplay = newAutoplay;
            }

            // Check loop changes
            const newLoop = player.trackRepeat || player.queueRepeat || false;
            if (newLoop !== oldState.loop) {
              const loopState = player.trackRepeat ? 'track' : player.queueRepeat ? 'queue' : 'off';
              DBM.Events.playerStateChange(player, 'loop', loopState, oldState.loop ? (oldState.loopType || 'unknown') : 'off');
              oldState.loop = newLoop;
              oldState.loopType = loopState;
            }

            // Check volume changes
            const newVolume = player.volume || 100;
            if (newVolume !== oldState.volume) {
              DBM.Events.playerStateChange(player, 'volume', newVolume, oldState.volume);
              oldState.volume = newVolume;
            }

            // Check for queue additions
            const currentLength = player.queue?.length || 0;
            if (currentLength > oldState.queueLength) {
              const addedCount = currentLength - oldState.queueLength;
              const addedTracks = getLastTracks(player.queue, addedCount);
              
              DBM.Events.playerStateChange(player, 'queueAdd', {
                addedTracks: addedTracks,
                addedCount: addedCount,
                newQueueSize: currentLength
              }, {
                previousQueueSize: oldState.queueLength
              });
            }

            // Check for shuffle by comparing queue signatures
            const newQueueSignature = getQueueSignature(player.queue);
            if (newQueueSignature !== oldState.queueSignature && 
                player.queue?.length === oldState.queueLength) {
              DBM.Events.playerStateChange(player, 'shuffle', {
                queueSize: player.queue?.length || 0,
                timestamp: Date.now()
              }, null);
            }

            oldState.queueSignature = newQueueSignature;
            oldState.queueLength = currentLength;
          };

          // Set up interval to check for state changes
          setInterval(() => {
            Bot.bot.manager.players.forEach(player => {
              checkStateChanges(player);
            });
          }, 500);

          // Clean up when player is destroyed
          Bot.bot.manager.on('playerDestroy', (player) => {
            playerStates.delete(player.guild);
          });

          // Initialize state for new players
          Bot.bot.manager.on('playerCreate', (player) => {
            initPlayerState(player);
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