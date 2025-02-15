module.exports = {
  name: "toggleAutoplay",
  displayName: "Toggle Music Autoplay",
  section: "Lavalink",
  meta: {
    version: "1.2.0",
    preciseCheck: true,
    author: "Taksos",
  },

  fields: ["toggle", "autoplayMode", "storageType", "varName", "maxHistorySize"],

  subtitle(data) {
    const modes = {
      similar: "Similar Songs (Genre & Language)",
      artist: "Same Artist",
      mix: "Smart Mix",
    };
    return `${data.toggle === "1" ? "Enable" : "Disable"} Autoplay - ${
      modes[data.autoplayMode] || "Similar Songs"
    }`;
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
      <span class="dbminputlabel">Autoplay Mode</span><br>
      <select id="autoplayMode" class="round">
        <option value="similar" selected>Similar Songs (Genre & Language)</option>
        <option value="artist">Same Artist</option>
        <option value="mix">Smart Mix</option>
      </select>
    </div>
    <br><br>
    <div style="float: left; width: 100%;">
      <span class="dbminputlabel">History Size (tracks to remember)</span><br>
      <input id="maxHistorySize" class="round" type="number" min="10" max="1000" value="50">
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
    const data = cache.actions[cache.index];
    const client = this.getDBM().Bot.bot;
    const toggle = parseInt(data.toggle) === 1;
    const autoplayMode = data.autoplayMode || "similar";
    const maxHistorySize = parseInt(data.maxHistorySize) || 50;
    const targetServer = await this.getServerFromData(0, null, cache);

    if (!client?.manager) {
      console.error("Manager not found!");
      return this.callNextAction(cache);
    }

    const player = client.manager.get(targetServer.id);

    if (!player) {
      console.error("No active player found!");
      return this.callNextAction(cache);
    }

    // Initialize player history if it doesn't exist
    if (!player.playHistory) {
      player.playHistory = new Set();
    }

    player.autoplay = toggle;
    player.autoplayMode = autoplayMode;
    player.maxHistorySize = maxHistorySize;

    const cleanText = (text) => {
      const cleaned = text
        .replace(/(official|video|audio|lyrics|music|hd|mv|performance|live|[0-9]+\s*(k|m)?\s*views?)/gi, "")
        .replace(/[\(\[\{].*?[\)\]\}]/g, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      const scripts = {
        ko: /[\uAC00-\uD7AF]/,
        ja: /[\u3040-\u30FF\u31F0-\u31FF]/,
        zh: /[\u4E00-\u9FFF]/,
        th: /[\u0E00-\u0E7F]/,
        ar: /[\u0600-\u06FF]/,
        hi: /[\u0900-\u097F]/,
      };
      
      for (const [lang, regex] of Object.entries(scripts)) {
        if (regex.test(cleaned)) return { text: cleaned, language: lang };
      }
      
      return { text: cleaned, language: "en" };
    };

    const searchArtistTracks = async (platform, artistName, offset = 0) => {
      const searchQuery = platform === "spotify" 
        ? `artist:${artistName}`
        : `"${artistName}"`;
        
      try {
        return await client.manager.search(searchQuery, platform);
      } catch (error) {
        console.error(`Error searching ${platform} for artist ${artistName}:`, error);
        return null;
      }
    };

    const detectGenre = (track) => {
      const title = track.title.toLowerCase();
      const genres = {
        edm: {
          weight: 1,
          patterns: [
            /(edm|electronic)/i,
            /(house|techno|trance)/i,
            /(dubstep|drum\s*&*\s*bass|dnb)/i,
          ]
        },
        rock: {
          weight: 1,
          patterns: [
            /(rock|metal)/i,
            /(punk|grunge|alternative)/i,
            /(indie|progressive)/i,
          ]
        },
        hiphop: {
          weight: 1,
          patterns: [
            /(hip\s*hop|rap)/i,
            /(trap|drill)/i,
            /(boom\s*bap|rhythmic)/i,
          ]
        },
      };

      let maxScore = 0;
      let detectedGenre = "unknown";

      for (const [genre, config] of Object.entries(genres)) {
        const score = config.patterns.reduce((acc, pattern) => 
          acc + (pattern.test(title) ? config.weight : 0), 0);
        
        if (score > maxScore) {
          maxScore = score;
          detectedGenre = genre;
        }
      }
      
      return { genre: detectedGenre, confidence: maxScore };
    };

    const isTrackSimilar = (track1, track2) => {
      const clean1 = cleanText(track1.title);
      const clean2 = cleanText(track2.title);
      
      const similarity = (str1, str2) => {
        if (Math.abs(str1.length - str2.length) > 5) return false;
        const set1 = new Set(str1.split(" "));
        const set2 = new Set(str2.split(" "));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size) > 0.8;
      };
      
      return similarity(clean1.text, clean2.text);
    };

    const getRelatedTracks = async (currentTrack) => {
      if (!currentTrack?.uri) return null;

      try {
        let searchResults;
        const platform = currentTrack.uri.split(":")[0];
        const { text: cleanedTitle, language } = cleanText(currentTrack.title);
        const { genre, confidence } = detectGenre(currentTrack);

        player.playHistory.add(currentTrack.uri);
        
        if (player.playHistory.size > player.maxHistorySize) {
          const [firstItem] = player.playHistory;
          player.playHistory.delete(firstItem);
        }

        switch (autoplayMode) {
          case "artist": {
            const pages = await Promise.all([ 
              searchArtistTracks(platform, currentTrack.author, 0),
              searchArtistTracks(platform, currentTrack.author, 1),
            ]);
            
            const allTracks = pages.filter(Boolean)
              .flatMap(result => result.tracks || [])
              .filter(track => 
                track && 
                !player.playHistory.has(track.uri) &&
                !isTrackSimilar(track, currentTrack)
              );

            searchResults = { tracks: allTracks };
            break;
          }

          case "mix": {
            const keywords = [
              genre !== "unknown" ? genre : "",
              language === "en" ? "" : `${language} music`,
              currentTrack.title.toLowerCase().includes("happy") ? "upbeat" : "",
              currentTrack.title.toLowerCase().includes("sad") ? "melancholic" : "",
            ].filter(Boolean);

            searchResults = await client.manager.search(`${keywords.join(" ")} ${cleanedTitle}`);
            break;
          }

          default: {
            const genreKeyword = genre !== "unknown" ? genre : "";
            const searchQuery = language === "en" 
              ? `${genreKeyword} ${cleanedTitle}`
              : `${language} ${genreKeyword} ${cleanedTitle}`;
            searchResults = await client.manager.search(searchQuery);
            break;
          }
        }

        if (searchResults?.tracks?.length > 0) {
          const validTracks = searchResults.tracks.filter(track => 
            track &&
            !player.playHistory.has(track.uri) &&
            !isTrackSimilar(track, currentTrack) &&
            !player.queue.some(qTrack => qTrack.uri === track.uri)
          );

          if (validTracks.length === 0) {
            const historyArray = Array.from(player.playHistory);
            const halfHistory = Math.floor(player.maxHistorySize / 2);
            for (let i = 0; i < halfHistory && i < historyArray.length; i++) {
              player.playHistory.delete(historyArray[i]);
            }
            return getRelatedTracks(currentTrack);
          }

          const scoredTracks = validTracks.map(track => {
            const trackInfo = cleanText(track.title);
            const trackGenre = detectGenre(track);
            let score = 0;
            
            if (trackInfo.language === language) score += 2;
            if (trackGenre.genre === genre) score += 2 * trackGenre.confidence;
            if (track.author === currentTrack.author) score += 1;
            
            return { track, score };
          });

          scoredTracks.sort((a, b) => b.score - a.score);
          
          const topN = Math.min(5, scoredTracks.length);
          const selectedTrack = scoredTracks[Math.floor(Math.random() * topN)].track;
          
          console.log(`[Autoplay] Selected: ${selectedTrack.title} (Score: ${scoredTracks[0].score.toFixed(2)})`);
          return selectedTrack;
        }
      } catch (err) {
        console.error("Error finding related track:", err);
      }

      return null;
    };

    const autoplayHandler = async () => {
      if (!player.autoplay) return;
    
      const addNextTrack = async () => {
        const currentTrack = player.queue.current || player.queue.previous;
        if (!currentTrack) return;
    
        const nextTrack = await getRelatedTracks(currentTrack);
    
        if (nextTrack) {
          console.log(`[Autoplay] Adding: ${nextTrack.title} (${autoplayMode} mode)`);
          player.queue.add(nextTrack);
    
          if (!player.playing && !player.paused && !player.queue.size) {
            player.play();
          }
        }
      };
    
      setInterval(() => {
        if (player.queue.size === 0) {
          addNextTrack();
        }
      }, 1000);
    };

    const handler = (currentPlayer) => {
      if (currentPlayer.guild === targetServer.id && player.autoplay) {
        autoplayHandler();
      }
    };

    if (!client.autoplayHandlers) {
      client.autoplayHandlers = new Map();
    }

    if (client.autoplayHandlers.has(targetServer.id)) {
      client.manager.off("trackEnd", client.autoplayHandlers.get(targetServer.id));
      client.autoplayHandlers.delete(targetServer.id);
    }

    if (toggle) {
      client.manager.on("trackEnd", handler);
      client.autoplayHandlers.set(targetServer.id, handler);
    
      if (!player.queue.size) {
        autoplayHandler();
      }
    } else {
      client.manager.off("trackEnd", handler);
      player.autoplay = false;
    }

    const varName = this.evalMessage(data.varName, cache);
    const storage = parseInt(data.storageType);
    this.storeValue(toggle, storage, varName, cache);
    
    this.callNextAction(cache);
  },

  mod() {
  },
};
