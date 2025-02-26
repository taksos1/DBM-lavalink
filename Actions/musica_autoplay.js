module.exports = {
  name: "toggleAutoplay",
  displayName: "Toggle Music Autoplay",
  section: "Lavalink",
  meta: {
    version: "2.0.0",
    preciseCheck: true,
    author: "Taksos & Claude",
  },

  fields: ["toggle", "storageType", "varName", "maxHistorySize", "minQueueSize"],

  subtitle(data) {
    return `${data.toggle === "1" ? "Enable" : "Disable"} Autoplay - Same Artist`;
  },

  variableStorage(data, varType) {
    if (parseInt(data.storageType) !== varType) return;
    return [data.varName, "Boolean"];
  },

  html(isEvent, data) {
    return `
    <div style="float: left; width: 100%;">
      <span class="dbminputlabel">Autoplay Setting</span><br>
      <select id="toggle" class="round">
        <option value="1" selected>Enable</option>
        <option value="0">Disable</option>
      </select>
    </div>
    <br><br>
    <div style="float: left; width: 100%;">
      <span class="dbminputlabel">History Size (tracks to remember)</span><br>
      <input id="maxHistorySize" class="round" type="number" min="10" max="2000" value="100">
    </div>
    <br><br>
    <div style="float: left; width: 100%;">
      <span class="dbminputlabel">Minimum Queue Size</span><br>
      <input id="minQueueSize" class="round" type="number" min="1" max="10" value="1">
    </div>
    <br><br>
    <div style="float: left; width: 35%;">
      <span class="dbminputlabel">Store Result In</span><br>
      <select id="storageType" class="round" onchange="glob.variableChange(this, 'varNameContainer')">
        ${data.variables[0]}
      </select>
    </div>
    <div id="varNameContainer" style="float: right; display: none; width: 60%;">
      <span class="dbminputlabel">Variable Name</span><br>
      <input id="varName" class="round" type="text">
    </div>`;
  },

  init() {
    const { glob, document } = this;
    glob.variableChange(document.getElementById("storageType"), "varNameContainer");
  },

  async action(cache) {
    // Helper methods
    function clearAutoplayHandlers(manager) {
      if (manager._events?.trackEnd) {
        const existingHandlers = Array.isArray(manager._events.trackEnd) 
          ? manager._events.trackEnd 
          : [manager._events.trackEnd];

        manager._events.trackEnd = existingHandlers.filter(handler => 
          !handler.toString().includes('autoplayHandler')
        );
      }
    }

    function updatePlayHistory(player, track) {
      player.playHistory.add(track.uri);
      if (player.playHistory.size > player.maxHistorySize) {
        const [firstItem] = player.playHistory;
        player.playHistory.delete(firstItem);
      }
    }

    // Simplified search function - focused only on artist
    async function findArtistTracks(client, player, currentTrack) {
      try {
        const artistName = currentTrack.author;
        if (!artistName) {
          return null;
        }
        
        const searchQueries = [
          `artist:${artistName}`,                 
          `${artistName}`,                        
          `"${artistName}"`,                      
          `${artistName} music`,                 
          `${artistName} ${currentTrack.title}`   
        ];

        for (const query of searchQueries) {
          const searchResults = await client.manager.search(query, currentTrack.requester);
          
          if (!searchResults?.tracks?.length) {
            continue;
          }
          
          // Filter out tracks already in history
          const filteredTracks = searchResults.tracks.filter(track => {
            return !player.playHistory.has(track.uri) && 
                  track.uri !== currentTrack.uri &&
                  track.author.toLowerCase().includes(artistName.toLowerCase());
          });
          
          if (filteredTracks.length > 0) {
            // Randomly select one track to avoid always picking the same songs
            const randomIndex = Math.floor(Math.random() * filteredTracks.length);
            return filteredTracks[randomIndex];
          }
        }
        
        // Last resort: try to find any track, even if we've played it before
        const lastResortSearch = await client.manager.search(`artist:${artistName}`, currentTrack.requester);
        if (lastResortSearch?.tracks?.length) {
          // Get a random track from results to avoid repetition
          const randomIndex = Math.floor(Math.random() * lastResortSearch.tracks.length);
          return lastResortSearch.tracks[randomIndex];
        }
        
        return null;
      } catch (error) {
        return null;
      }
    }

    async function ensureMinimumQueueSize(client, player) {
      try {
        const currentTrack = player.queue.current;
        if (!currentTrack) {
          return false;
        }
        
        // Calculate how many tracks we need to add
        const tracksToAdd = player.minQueueSize - player.queue.size;
        
        if (tracksToAdd <= 0) {
          return true;
        }
        
        let successCount = 0;
        
        for (let i = 0; i < tracksToAdd; i++) {
          const nextTrack = await findArtistTracks(client, player, currentTrack);
          
          if (nextTrack) {
            updatePlayHistory(player, nextTrack);
            player.queue.add(nextTrack);
            successCount++;
          } else {
            // Break the loop if we can't find anything - no point in retrying
            break;
          }
        }
        
        return successCount > 0;
      } catch (error) {
        return false;
      }
    }

    // Queue monitor - periodically check and maintain minimum queue size
    function startQueueMonitor(client, player) {
      // Clear existing monitor if any
      if (player.queueMonitorInterval) {
        clearInterval(player.queueMonitorInterval);
      }
      
      player.queueMonitorInterval = setInterval(async () => {
        if (!player.autoplay) {
          clearInterval(player.queueMonitorInterval);
          return;
        }
        
        if (player.playing && player.queue.size < player.minQueueSize) {
          await ensureMinimumQueueSize(client, player);
        }
      }, 10000); // Check every 10 seconds
    }

    function stopQueueMonitor(player) {
      if (player.queueMonitorInterval) {
        clearInterval(player.queueMonitorInterval);
        player.queueMonitorInterval = null;
      }
    }

    // MAIN ACTION CODE STARTS HERE
    const data = cache.actions[cache.index];
    const client = this.getDBM().Bot.bot;
    const toggle = parseInt(data.toggle) === 1;
    const maxHistorySize = parseInt(data.maxHistorySize) || 100;
    const minQueueSize = parseInt(data.minQueueSize) || 1;
    const targetServer = await this.getServerFromData(0, null, cache);

    if (!client?.manager) {
      return this.callNextAction(cache);
    }

    const player = client.manager.get(targetServer.id);

    if (!player) {
      return this.callNextAction(cache);
    }

    // Initialize player state
    if (!player.playHistory) {
      player.playHistory = new Set();
    }

    player.autoplay = toggle;
    player.maxHistorySize = maxHistorySize;
    player.minQueueSize = minQueueSize;

    // Clear existing autoplay handlers
    clearAutoplayHandlers(client.manager);
    stopQueueMonitor(player);

    if (toggle) {
      // Add enhanced autoplay event handler
      const autoplayHandler = async (_player, track, payload) => {
        if (!_player.autoplay || _player.guild !== targetServer.id) return;
        
        try {
          // Always ensure minimum queue size after a track ends
          await ensureMinimumQueueSize(client, _player);
          
          // Start playing if not already playing and we have tracks
          if (!_player.playing && !_player.paused && _player.queue.size > 0) {
            _player.play();
          }
        } catch (error) {
          // Error handling without logging
        }
      };

      // Store the handler reference to identify it later
      autoplayHandler.isAutoplayHandler = true;
      
      client.manager.on("trackEnd", autoplayHandler);

      // Start queue monitor to ensure minimum queue size is maintained
      startQueueMonitor(client, player);

      // Initialize queue immediately if needed
      if (player.queue.size < player.minQueueSize && player.queue.current) {
        await ensureMinimumQueueSize(client, player);
      }
    }

    // Store result
    const varName = this.evalMessage(data.varName, cache);
    const storage = parseInt(data.storageType);
    this.storeValue(toggle, storage, varName, cache);
    
    this.callNextAction(cache);
  },

  mod() {
    // Add any necessary mod-specific functionality here
  },
};