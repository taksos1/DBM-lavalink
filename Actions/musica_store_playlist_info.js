const fs = require('fs');
const path = require('path');

module.exports = {
  name: "storePlaylistInfo",
  displayName: "Store Playlist Info",
  section: "Lavalink",
  meta: {
    version: "2.1.9",
    preciseCheck: true,
    author: "Taksos",
  },
  fields: ["playlistId", "infoType", "storage", "varName"],  // Removed 'resolveNames' from fields

  subtitle(data) {
    return `Store Playlist Info: ${data.playlistId}`;
  },

  variableStorage(data, varType) {
    if (parseInt(data.storage) !== varType) return;
    let dataType = 'String';
    
    switch(data.infoType) {
      case "songs":
        dataType = 'List';
        break;
      case "songsArray":
        dataType = 'Array';
        break;
      case "count":
        dataType = 'Number';
        break;
      default:
        dataType = 'String';
    }
    
    return [data.varName, dataType];
  },

  html(isEvent, data) {
    return `
    <div style="padding: 8px;">
      <div style="margin-bottom: 15px;">
        <span class="dbminputlabel">Playlist ID</span>
        <input id="playlistId" class="round" type="text" value="${data.playlistId || ""}">
      </div>

      <div style="margin-bottom: 15px;">
        <span class="dbminputlabel">Select Info to Store</span>
        <select id="infoType" class="round" style="width: 100%;">
          <option value="name" selected>Playlist Name</option>
          <option value="songs">Playlist Songs (Formatted)</option>
          <option value="songsArray">Playlist Songs (Array)</option>
          <option value="id">Playlist ID</option>
          <option value="count">Song Count</option>
        </select>
      </div>
      
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 35%;">
          <span class="dbminputlabel">Store Result In</span>
          <select id="storage" class="round">
            ${data.variables[1]}
          </select>
        </div>
        <div style="width: 60%;">
          <span class="dbminputlabel">Variable Name</span>
          <input id="varName" class="round" type="text">
        </div>
      </div>
    </div>
    `;
  },

  init() {},

  async action(cache) {
    const data = cache.actions[cache.index];
    const playlistId = this.evalMessage(data.playlistId, cache);
    const infoType = data.infoType;
    const storage = parseInt(data.storage);
    const varName = this.evalMessage(data.varName, cache);

    try {
      
      const filePath = path.resolve("./data", "playlists.json");

      let playlists = [];
      if (fs.existsSync(filePath)) {
        playlists = JSON.parse(fs.readFileSync(filePath));
      }

      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) {
        console.error(`Playlist with ID ${playlistId} not found.`);
        return this.callNextAction(cache);
      }

      const extractTrackInfo = (trackStr) => {
        let title = "Unknown";
        let url = trackStr;
        let videoId = null;

        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const youtubeWatchRegex = /watch\?v=([^&]+)/i;

        const youtubeMatch = trackStr.match(youtubeRegex);
        const watchMatch = trackStr.match(youtubeWatchRegex);

        if (youtubeMatch && youtubeMatch[1]) {
          videoId = youtubeMatch[1];

          if (!trackStr.includes('youtube.com') && !trackStr.includes('youtu.be')) {
            url = `https://www.youtube.com/watch?v=${videoId}`;
          }
        } else if (watchMatch && watchMatch[1]) {
          videoId = watchMatch[1];
          url = `https://www.youtube.com/watch?v=${videoId}`;
        }

        if (trackStr.includes('youtube.com') || trackStr.includes('youtu.be')) {
          const pathSegments = trackStr.split('/');
          const lastSegment = pathSegments[pathSegments.length - 1];

          if (lastSegment.includes('watch?v=')) {
            title = lastSegment;
          } else if (videoId) {
            title = `YouTube Video (${videoId})`;
          } else {
            title = lastSegment || "YouTube Video";
          }
        } else {
          const lastPathSegment = trackStr.split('/').pop();
          title = lastPathSegment || trackStr;
        }

        return { title, url, videoId };
      };

      let result;
      switch(infoType) {
        case "name":
          result = playlist.name;
          break;
        case "songs":
          if (Array.isArray(playlist.tracks) && playlist.tracks.length > 0) {
            if (typeof playlist.tracks[0] === 'object' && playlist.tracks[0].title) {
              result = playlist.tracks.map((track, index) => 
                `${index} | ${track.title || 'Unknown'} | ${track.url || track.uri || 'No URL'}`
              ).join('\n');
            } else if (typeof playlist.tracks[0] === 'string') {
              result = playlist.tracks.map((track, index) => {
                const { title, url } = extractTrackInfo(track);
                return `${index} | ${title} | ${url}`;
              }).join('\n');
            }
          } else {
            result = "No songs in playlist";
          }
          break;
        case "songsArray":
          if (Array.isArray(playlist.tracks) && typeof playlist.tracks[0] === 'string') {
            result = playlist.tracks.map((track, index) => {
              const { title, url, videoId } = extractTrackInfo(track);
              return {
                index,
                url,
                title,
                videoId,
                originalString: track
              };
            });
          } else {
            result = playlist.tracks;
          }
          break;
        case "id":
          result = playlist.id;
          break;
        case "count":
          result = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;
          break;
        default:
          result = JSON.stringify(playlist);
      }

      this.storeValue(result, storage, varName, cache);

    } catch (error) {
      console.error("Error retrieving playlist info:", error);
      this.storeValue(`Error: ${error.message}`, storage, varName, cache);
    }

    this.callNextAction(cache);
  },

  mod() {},
};
