module.exports = {
  name: "LavalinkSetVolume",
  displayName: "Set Lavalink Player Volume",
  section: "Lavalink",
  fields: ["volume"],
  subtitle(data) {
    return `Set volume to ${data.volume}`;
  },
  variableStorage(data, varType) {
    return "";
  },
  html(isEvent, data) {
    return `
      <div style="float: left; width: 60%;">
        Volume (0-100):<br>
        <input id="volume" class="round" type="text">
      </div>
    `;
  },
  init() {},
  async action(cache) {
    const data = cache.actions[cache.index];
    const volume = parseInt(this.evalMessage(data.volume, cache));
    if (isNaN(volume) || volume < 0 || volume > 100) {
      return this.callNextAction(cache);
    }

    const client = this.getDBM().Bot.bot;
    const targetServer = await this.getServerFromData(0, null, cache);

    // Check for Lavalink player
    const lavalinkPlayer = client.manager?.get(targetServer.id);
    if (lavalinkPlayer) {
      try {
        // Store current position to help force update
        const currentPosition = lavalinkPlayer.position;
        
        // 1. Set volume through the player API
        await lavalinkPlayer.setVolume(volume);
        
        // 2. Force-update through direct node communication (primary method)
        if (lavalinkPlayer.node && typeof lavalinkPlayer.node.send === 'function') {
          // Send volume command with urgent flag
          await lavalinkPlayer.node.send({
            op: 'volume',
            guildId: targetServer.id,
            volume: volume,
            noReplace: false // Force replace any pending volume changes
          });
          
          // Send a filters update with volume included for redundancy
          await lavalinkPlayer.node.send({
            op: 'filters',
            guildId: targetServer.id,
            volume: volume / 100 // Lavalink filters use 0-1 volume scale
          });
        }
        
        // 3. Use the "seek trick" to force audio processing update
        if (currentPosition > 0) {
          // Seek to current position to force audio processing update
          await lavalinkPlayer.seek(currentPosition);
          
          // Some implementations might need a slight offset to trigger a refresh
          setTimeout(async () => {
            if (lavalinkPlayer.playing) {
              await lavalinkPlayer.seek(currentPosition + 1);
            }
          }, 50);
        }
        
        // 4. Update player options directly if possible (implementation dependent)
        if (lavalinkPlayer.options) {
          lavalinkPlayer.options.volume = volume;
        }
        
        // 5. Emit events for other components
        client.emit('lavalinkVolumeUpdate', targetServer.id, volume);
        
        // 6. Try to update the track itself if possible
        if (lavalinkPlayer.track && typeof lavalinkPlayer.updateTrack === 'function') {
          await lavalinkPlayer.updateTrack();
        }
        
        console.log(`Set volume to ${volume} for player in guild ${targetServer.id}`);
      } catch (error) {
        console.error("Error setting Lavalink volume:", error);
      }
    } else {
      console.warn("Lavalink player not found, volume adjustment skipped.");
    }

    this.callNextAction(cache);
  },

  mod() {},
};