// Use direct file operations without relying on this context
const fs = require('fs');
const path = require('path');

// Helper functions defined outside the module
function getHistoryFilePath() {
  return path.join(__dirname, '..', 'data', 'musica.json');
}

function loadSongHistory() {
  try {
    const filePath = getHistoryFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading song history:", error);
  }
  return {};
}

function saveSongHistory(history) {
  try {
    const filePath = getHistoryFilePath();
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error("Error saving song history:", error);
  }
}

function getGuildHistory(guildId) {
  const history = loadSongHistory();
  if (!history[guildId]) {
    history[guildId] = [];
  }
  return history;
}

function addToHistory(guildId, track) {
  const history = getGuildHistory(guildId);
  
  // Add new track at the beginning
  if (!history[guildId]) {
    history[guildId] = [];
  }
  
  // Only store necessary track info to prevent circular references
  const trackData = {
    title: track.title,
    author: track.author,
    uri: track.uri,
    identifier: track.identifier,
    duration: track.duration
  };
  
  history[guildId].unshift(trackData);
  
  // Keep only 50 most recent tracks
  if (history[guildId].length > 50) {
    history[guildId] = history[guildId].slice(0, 50);
  }
  
  saveSongHistory(history);
  return history;
}

module.exports = {
  name: "playPrevious",
  displayName: "Play Previous Song",
  section: "Lavalink",
  meta: {
    version: "1.0.7", 
    preciseCheck: true,
    author: "Taksos",
  },
  
  subtitle() {
    return `Plays the previous song from history and re-queues the current one after a 1-second delay.`;
  },
  
  variableStorage() {
    return "";
  },
  
  html() {
    return `
Plays the previous song from history and then adds the current one back to the queue after a 1-second delay.
`;
  },
  
  init() {},
  
  async action(cache) {
    const client = this.getDBM().Bot.bot;
    const server = await this.getServerFromData(0, null, cache);

    if (!server) {
      console.error("No server found in cache.");
      return this.callNextAction(cache);
    }

    const guildId = server.id;
    const player = client.manager.get(guildId);

    if (!player) {
      console.log(`No player found for server: ${guildId}`);
      return this.callNextAction(cache);
    }

    try {
      const currentTrack = player.queue.current;
      const history = getGuildHistory(guildId);
      
      // If we have a current track, store it in history before playing previous
      if (currentTrack) {
        addToHistory(guildId, currentTrack);
      }
      
      // Get previous track (either from player.queue.previous or from our history)
      let previousTrack = null;
      
      if (player.queue.previous) {
        // Use the player's built-in previous track if available
        previousTrack = player.queue.previous;
      } else if (history[guildId] && history[guildId].length > 0) {
        // If no previous in player, use our history (skip current track if it's there)
        previousTrack = history[guildId].length > 1 ? history[guildId][1] : history[guildId][0];
      }
      
      if (!previousTrack) {
        console.log("No previous song available in history.");
        return this.callNextAction(cache);
      }

      // Different handling based on whether there's a current track
      if (currentTrack) {
        // If we have a current track, add previous to queue and stop the current (will play automatically)
        player.queue.unshift(previousTrack);
        player.stop();
        
        // Re-queue the original current track with delay
        setTimeout(() => {
          player.queue.unshift(currentTrack);
          console.log(`Re-queued the original track after 1 second for server: ${guildId}`);
        }, 1000);
      } else {
        // If no current track, we need to add the previous track and then play
        player.queue.add(previousTrack);
        player.play();
      }

      console.log(`Playing previous song for server: ${guildId}`);
    } catch (error) {
      console.error(`Error playing previous song for server ${guildId}:`, error);
    }

    this.callNextAction(cache);
  },
  
  // Track end listener to maintain history
  onReady(bot) {
    const manager = bot.manager;
    
    if (manager) {
      manager.on('trackEnd', (player, track) => {
        const guildId = player.guild;
        addToHistory(guildId, track);
      });
    }
  },
  
  mod() {},
};