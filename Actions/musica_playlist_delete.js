const fs = require('fs');
const path = require('path');

module.exports = {
  name: "deletePlaylist",
  displayName: "Delete Playlist",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
  },
  fields: ["playlistId", "storage", "varName"],
  
  subtitle(data) {
    return `Delete Playlist: ${data.playlistId}`;
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
    const storage = parseInt(data.storage);
    const varName = this.evalMessage(data.varName, cache);
    
    try {
      if (!playlistId) {
        console.error("Playlist ID is required");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist ID is required", 1, "deletePlaylistError", cache);
        return this.callNextAction(cache);
      }
      

      const filePath = path.resolve("./data/playlists.json");


      if (!fs.existsSync(filePath)) {
        console.error("Playlist file does not exist");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist file does not exist", 1, "deletePlaylistError", cache);
        return this.callNextAction(cache);
      }


      let playlists;
      try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        playlists = JSON.parse(fileData);
      } catch (error) {
        console.error("Error reading playlist file:", error);
        this.storeValue(false, storage, varName, cache);
        this.storeValue(`Error reading playlist file: ${error.message}`, 1, "deletePlaylistError", cache);
        return this.callNextAction(cache);
      }


      const playlistIndex = playlists.findIndex(p => p.id === playlistId);
      if (playlistIndex === -1) {
        console.error("Playlist not found");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist not found", 1, "deletePlaylistError", cache);
        return this.callNextAction(cache);
      }
      

      const member = cache.interaction?.member || cache.msg?.member;
      const userId = member?.user?.id;
      const guildId = cache.server?.id;

      // Check for permission to delete playlist based on user or guild
      if (playlists[playlistIndex].isGuild && playlists[playlistIndex].owner !== guildId) {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("This is a server playlist from another server", 1, "deletePlaylistError", cache);
        return this.callNextAction(cache);
      }

      if (!playlists[playlistIndex].isGuild && playlists[playlistIndex].owner !== userId) {
        this.storeValue(false, storage, varName, cache);
        this.storeValue("You don't have permission to delete this playlist", 1, "deletePlaylistError", cache);
        return this.callNextAction(cache);
      }
      
     
      const deletedPlaylist = playlists[playlistIndex];
      this.storeValue(deletedPlaylist, 1, "deletedPlaylist", cache);
      
      
      playlists.splice(playlistIndex, 1);
      
      
      fs.writeFileSync(filePath, JSON.stringify(playlists, null, 2));
      
      this.storeValue(true, storage, varName, cache);
      this.storeValue("Playlist deleted successfully", 1, "deletePlaylistResult", cache);
    } catch (error) {
      console.error("Error in deletePlaylist action:", error);
      this.storeValue(false, storage, varName, cache);
      this.storeValue(`Error deleting playlist: ${error.message}`, 1, "deletePlaylistError", cache);
    }
    
    this.callNextAction(cache);
  },
  
  mod() {},
};
