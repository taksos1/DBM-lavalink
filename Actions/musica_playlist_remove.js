const fs = require('fs');
const path = require('path');

module.exports = {
  name: "removeFromPlaylist",
  displayName: "Remove Song from Playlist",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
  },
  fields: ["playlistId", "songUrl", "songIndex", "storage", "varName"],

  subtitle(data) {
    if (data.songUrl) {
      return `Remove Song by URL from Playlist: ${data.playlistId}`;
    } else if (data.songIndex) {
      return `Remove Song by Index from Playlist: ${data.playlistId}`;
    }
    return `Remove Song from Playlist: ${data.playlistId}`;
  },

  variableStorage(data, varType) {
    if (parseInt(data.storage) !== varType) return;
    return [data.varName, 'Boolean'];
  },

  html(isEvent, data) {
    return `
      <div style="padding: 10px; background: #2c2f33; border-radius: 8px; margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">
          <label style="color: #ffffff; font-weight: bold;">Playlist ID:</label>
          <input id="playlistId" class="round" type="text" style="width: 100%; margin-top: 5px;" placeholder="Enter playlist ID or use \${tempVars('playlistId')}">
        </div>

        <div style="margin-bottom: 10px;">
          <label style="color: #ffffff; font-weight: bold;">Song URL (Leave empty to use Index):</label>
          <input id="songUrl" class="round" type="text" style="width: 100%; margin-top: 5px;">
        </div>
        
        <div style="margin-bottom: 10px;">
          <label style="color: #ffffff; font-weight: bold;">Song Index (Used if URL is empty):</label>
          <input id="songIndex" class="round" type="text" style="width: 100%; margin-top: 5px;" placeholder="0 = first song, 1 = second song, etc.">
        </div>
      </div>

      <div style="padding-top: 8px;">
        <div style="float: left; width: 40%;">
          <span class="dbminputlabel">Store Result In</span>
          <select id="storage" class="round">
            ${data.variables[1]}
          </select>
        </div>
        <div style="float: right; width: 55%;"><span class="dbminputlabel">Variable Name</span>
          <input id="varName" class="round" type="text">
        </div>
      </div>
    `;
  },

  init() {},

  async action(cache) {
    const data = cache.actions[cache.index];
    const playlistId = this.evalMessage(data.playlistId, cache);
    const songUrl = this.evalMessage(data.songUrl, cache);
    const songIndexRaw = this.evalMessage(data.songIndex, cache);
    const songIndex = songIndexRaw ? parseInt(songIndexRaw) : null;
    const storage = parseInt(data.storage);
    const varName = this.evalMessage(data.varName, cache);

    try {
      if (!playlistId) {
        console.error("Playlist ID is required");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist ID is required", 1, "removeFromPlaylistError", cache);
        return this.callNextAction(cache);
      }

      if (!songUrl && (songIndex === null || isNaN(songIndex))) {
        console.error("Either Song URL or Song Index must be provided");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Either Song URL or Song Index must be provided", 1, "removeFromPlaylistError", cache);
        return this.callNextAction(cache);
      }

      
      const filePath = path.resolve("./data/playlists.json");

      
      if (!fs.existsSync(filePath)) {
        console.error("Playlist file does not exist");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist file does not exist", 1, "removeFromPlaylistError", cache);
        return this.callNextAction(cache);
      }

      
      let playlists;
      try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        playlists = JSON.parse(fileData);
      } catch (error) {
        console.error("Error reading playlist file:", error);
        this.storeValue(false, storage, varName, cache);
        this.storeValue(`Error reading playlist file: ${error.message}`, 1, "removeFromPlaylistError", cache);
        return this.callNextAction(cache);
      }

      
      const playlistIndex = playlists.findIndex(p => p.id === playlistId);
      if (playlistIndex === -1) {
        console.error("Playlist not found");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist not found", 1, "removeFromPlaylistError", cache);
        return this.callNextAction(cache);
      }

      
      const member = cache.interaction?.member || cache.msg?.member;
      const userId = member?.user?.id;
      const guildId = cache.server?.id;

      if (playlists[playlistIndex].isGuild && playlists[playlistIndex].owner !== guildId) {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("This is a server playlist from another server", 1, "removeFromPlaylistError", cache);
        return this.callNextAction(cache);
      }

      if (!playlists[playlistIndex].isGuild && playlists[playlistIndex].owner !== userId) {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("You don't have permission to modify this playlist", 1, "removeFromPlaylistError", cache);
        return this.callNextAction(cache);
      }

      const playlist = playlists[playlistIndex];
      let removedSong = null;

      if (songUrl) {
        
        const trackIndex = playlist.tracks.findIndex(track => 
          (typeof track === 'string' && track === songUrl) || 
          (typeof track === 'object' && track.url === songUrl)
        );
        
        if (trackIndex === -1) {
          console.error("Song not found in playlist");
          this.storeValue(false, storage, varName, cache);
          this.storeValue("Song not found in playlist", 1, "removeFromPlaylistError", cache);
          return this.callNextAction(cache);
        }
        
        removedSong = playlist.tracks.splice(trackIndex, 1)[0];
      } else if (songIndex !== null) {
        
        if (songIndex < 0 || songIndex >= playlist.tracks.length) {
          console.error("Song index out of range");
          this.storeValue(false, storage, varName, cache);
          this.storeValue("Song index out of range", 1, "removeFromPlaylistError", cache);
          return this.callNextAction(cache);
        }
        
        removedSong = playlist.tracks.splice(songIndex, 1)[0];
      }

      if (removedSong) {
        
        fs.writeFileSync(filePath, JSON.stringify(playlists, null, 2));
        
        this.storeValue(true, storage, varName, cache);
        this.storeValue("Song removed from playlist successfully", 1, "removeFromPlaylistResult", cache);
        
        
        this.storeValue(removedSong, 1, "removedSong", cache);
      } else {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Failed to remove song", 1, "removeFromPlaylistError", cache);
      }

    } catch (error) {
      console.error("Error in removeFromPlaylist action:", error);
      this.storeValue(false, storage, varName, cache);
      this.storeValue(`Error removing song from playlist: ${error.message}`, 1, "removeFromPlaylistError", cache);
    }

    this.callNextAction(cache);
  },

  mod() {},
};