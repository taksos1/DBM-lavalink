const fs = require('fs');
const path = require('path');

module.exports = {
  name: "addToPlaylist",
  displayName: "Add Song to Playlist",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
  },
  fields: ["playlistId", "songUrl", "songName", "songInfo", "storage", "varName"],

  subtitle(data) {
    return `Add Song to Playlist: ${data.playlistId}`;
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
          <label style="color: #ffffff; font-weight: bold;">Song URL:</label>
          <input id="songUrl" class="round" type="text" style="width: 100%; margin-top: 5px;">
        </div>

        <div style="margin-bottom: 10px;">
          <label style="color: #ffffff; font-weight: bold;">Song Name:</label>
          <input id="songName" class="round" type="text" style="width: 100%; margin-top: 5px;" placeholder="Enter song name">
        </div>

        <div style="margin-bottom: 10px;">
          <label style="color: #ffffff; font-weight: bold;">Song Info (optional):</label>
          <input id="songInfo" class="round" type="text" style="width: 100%; margin-top: 5px;" placeholder="Variable containing song information">
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
    const songName = this.evalMessage(data.songName, cache);  
    const songInfoVarName = this.evalMessage(data.songInfo, cache);
    const storage = parseInt(data.storage);
    const varName = this.evalMessage(data.varName, cache);

    try {
      if (!playlistId) {
        console.error("Playlist ID is required");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist ID is required", 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      if (!songUrl) {
        console.error("Song URL is required");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Song URL is required", 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      let songInfo = null;
      if (songInfoVarName) {
        songInfo = this.getVariable(1, songInfoVarName, cache);
      }

      const filePath = path.resolve("./data/playlists.json");

      if (!fs.existsSync(filePath)) {
        console.error("Playlist file does not exist");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist file does not exist", 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      let playlists;
      try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        playlists = JSON.parse(fileData);
      } catch (error) {
        console.error("Error reading playlist file:", error);
        this.storeValue(false, storage, varName, cache);
        this.storeValue(`Error reading playlist file: ${error.message}`, 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      console.log("Existing Playlist IDs:", playlists.map(p => p.id));
      console.log("Searching for Playlist ID:", playlistId);

      const playlistIndex = playlists.findIndex(p => String(p.id).trim() === String(playlistId).trim());
      if (playlistIndex === -1) {
        console.error(`Playlist not found. Provided ID: '${playlistId}'`);
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist not found", 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      const member = cache.interaction?.member || cache.msg?.member;
      const userId = member?.user?.id;
      const guildId = cache.server?.id;

      if (playlists[playlistIndex].isGuild && playlists[playlistIndex].owner !== guildId) {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("This is a server playlist from another server", 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      if (!playlists[playlistIndex].isGuild && playlists[playlistIndex].owner !== userId) {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("You don't have permission to modify this playlist", 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      const songExists = playlists[playlistIndex].tracks.some(track => 
        (typeof track === 'string' && track === songUrl) || 
        (typeof track === 'object' && track.url === songUrl)
      );

      if (songExists) {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Song already exists in playlist", 1, "addToPlaylistError", cache);
        return this.callNextAction(cache);
      }

      if (songInfo) {
        playlists[playlistIndex].tracks.push({
          url: songUrl,
          title: songName || songInfo.title || "Unknown Title",  
          author: songInfo.author || "Unknown Artist",
          duration: songInfo.duration || 0,
          thumbnail: songInfo.thumbnail || null,
          addedAt: new Date().toISOString()
        });
      } else {
        playlists[playlistIndex].tracks.push({
          url: songUrl,
          title: songName || "Unknown Title"  
        });
      }

      fs.writeFileSync(filePath, JSON.stringify(playlists, null, 2));

      console.log(`Song added to Playlist ID: ${playlistId}, Song URL: ${songUrl}`);

      this.storeValue(true, storage, varName, cache);
      this.storeValue("Song added to playlist successfully", 1, "addToPlaylistResult", cache);
    } catch (error) {
      console.error("Error in addToPlaylist action:", error);
      this.storeValue(false, storage, varName, cache);
      this.storeValue(`Error adding song to playlist: ${error.message}`, 1, "addToPlaylistError", cache);
    }

    this.callNextAction(cache);
  },

  mod() {},
};
