const fs = require('fs');
const path = require('path');

module.exports = {
  name: "createPlaylist",
  displayName: "Create Playlist",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
  },
  fields: ["playlistName", "isGuild", "storage", "varName"],

  subtitle(data) {
    return `Create Playlist: ${data.playlistName}`;
  },

  variableStorage(data, varType) {
    if (parseInt(data.storage) !== varType) return;
    return [data.varName, 'Playlist ID'];
  },

  html(isEvent, data) {
    return `
      <div style="padding: 10px; background: #2c2f33; border-radius: 8px; margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">
          <label style="color: #ffffff; font-weight: bold;">Playlist Name:</label>
          <input id="playlistName" class="round" type="text" style="width: 100%; margin-top: 5px;">
        </div>
        <div style="margin-bottom: 10px;">
          <label style="color: #ffffff; font-weight: bold;">Server Playlist:</label>
          <select id="isGuild" class="round" style="width: 100%; margin-top: 5px;">
            <option value="false" selected>No (User Playlist)</option>
            <option value="true">Yes (Server Playlist)</option>
          </select>
        </div>
      </div>

      <div style="padding-top: 8px;">
        <div style="float: left; width: 40%;">
          <span class="dbminputlabel">Store Result In</span>
          <select id="storage" class="round">
            ${data.variables[1]}
          </select>
        </div>
        <div style="float: right; width: 55%;">
          <span class="dbminputlabel">Variable Name</span>
          <input id="varName" class="round" type="text">
        </div>
      </div>
    `;
  },

  init() {},

  async action(cache) {
    const data = cache.actions[cache.index];
    const playlistName = this.evalMessage(data.playlistName, cache);
    const isGuild = this.evalMessage(data.isGuild, cache) === "true";
    const storage = parseInt(data.storage);
    const varName = this.evalMessage(data.varName, cache);
  
    try {
      if (!playlistName) {
        console.error("Playlist name is required");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("Playlist name is required", 1, "createPlaylistError", cache);
        return this.callNextAction(cache);
      }
  
      let ownerId;
      if (isGuild) {
        const guild = cache.server;
        if (!guild?.id) {
          console.error("Failed to get guild id");
          this.storeValue(false, storage, varName, cache);
          this.storeValue("Failed to get guild ID", 1, "createPlaylistError", cache);
          return this.callNextAction(cache);
        }
        ownerId = guild.id;
      } else {
        const member = cache.interaction?.member || cache.msg?.member;
        if (!member?.user?.id) {
          console.error("Failed to get user id");
          this.storeValue(false, storage, varName, cache);
          this.storeValue("Failed to get user ID", 1, "createPlaylistError", cache);
          return this.callNextAction(cache);
        }
        ownerId = member.user.id;
      }
  
      const dataDir = path.resolve("./data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
  
      const filePath = path.resolve("./data/playlists.json");
  
      let playlists = [];
      if (fs.existsSync(filePath)) {
        try {
          const fileData = fs.readFileSync(filePath, 'utf8');
          playlists = JSON.parse(fileData);
  
          if (!Array.isArray(playlists)) {
            console.error("Invalid playlist data. Resetting to empty array.");
            playlists = [];
          }
        } catch (error) {
          console.error("Error reading playlist file:", error);
          playlists = [];
        }
      }
  
      // Check if the user already has a playlist
      const existingPlaylist = playlists.find(p => p.owner === ownerId);
      if (existingPlaylist) {
        console.error("User already has a playlist");
        this.storeValue(false, storage, varName, cache);
        this.storeValue("You already have a playlist", 1, "createPlaylistError", cache);
        return this.callNextAction(cache);
      }

      // Create the new playlist
      const playlistId = `${ownerId}-${Date.now()}`;
      const newPlaylist = {
        name: playlistName,
        id: playlistId,
        owner: ownerId,
        isGuild,
        tracks: [],
        createdAt: new Date().toISOString()
      };

      playlists.push(newPlaylist);
  
      fs.writeFileSync(filePath, JSON.stringify(playlists, null, 2));
  
      console.log(`Playlist Created: Name - "${playlistName}", ID - "${playlistId}"`);
  
      this.storeValue(playlistId, storage, varName, cache);
      this.storeValue("Playlist created successfully", 1, "createPlaylistResult", cache);
  
    } catch (error) {
      console.error("Error in createPlaylist action:", error);
      this.storeValue(false, storage, varName, cache);
      this.storeValue(`Error creating playlist: ${error.message}`, 1, "createPlaylistError", cache);
    }
  
    this.callNextAction(cache);
  },

  mod() {},
};
