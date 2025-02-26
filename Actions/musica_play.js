const searchSong = async (client, song, member) => {
  try {
    const res = await client.manager.search(song, member.user);
    
    if (res.loadType === "empty" || res.loadType === "error") {
      console.error("Could not find the song");
      return null;
    }

    return res;
  } catch (error) {
    console.error("Error searching for song:", error);
    return null;
  }
};

const getOrCreatePlayer = async (client, targetServer, member, cache) => {
  try {
    let player = client.manager.get(targetServer.id);

    if (!player) {
      player = client.manager.create({
        guildId: targetServer.id,
        textChannelId: cache.msg?.channel?.id || "",
        voiceChannelId: member.voice.channel.id,
        selfDeafen: true,
        volume: 4,
      });

      // Optimize player settings for Magmastream 2.8
      if (player.node?.options) {
        player.node.options.transport = "rest"; // Updated for Magmastream 2.8
        player.node.options.bufferDuration = 400;
        player.node.options.frameBufferSize = 4000;
        player.node.options.nullBufferTimeout = 5000;
      }
    } else {
      player.textChannel = cache.msg?.channel?.id || player.textChannel;
      player.voiceChannel = member.voice.channel.id;
    }

    await player.connect();
    return player;
  } catch (error) {
    console.error("Error creating/getting player:", error);
    return null;
  }
};

const handlePlaylist = async (player, searchResult, originalSong, addTrackToQueue) => {
  const safeUrl = originalSong.replace(/[<>]/g, '');
  player.queue.string += `Playlist: [${searchResult.playlist.name}](${safeUrl})\n`;
  
  const batchSize = 50;
  for (let i = 0; i < searchResult.playlist.tracks.length; i += batchSize) {
    const batch = searchResult.playlist.tracks.slice(i, i + batchSize);
    batch.forEach(addTrackToQueue);
    if (i + batchSize < searchResult.playlist.tracks.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
};

const handleSingleTrack = (player, searchResult, addTrackToQueue) => {
  const track = searchResult.tracks[0];
  const safeUrl = track.uri.replace(/[<>]/g, '');
  player.queue.string += `[${track.title}](${safeUrl})\n`;
  addTrackToQueue(track);
};

const handleQueueAndPlay = async (player, searchResult, queuePosition, originalSong) => {
  try {
    if (!player.queue.string) {
      player.queue.string = "";
    }

    const addTrackToQueue = (track) => {
      if (queuePosition === "start") {
        player.queue.unshift(track);
      } else {
        player.queue.add(track);
      }
    };

    if (searchResult.loadType === "playlist") {
      await handlePlaylist(player, searchResult, originalSong, addTrackToQueue);
    } else {
      handleSingleTrack(player, searchResult, addTrackToQueue);
    }

    if (queuePosition === "instant") {
      player.queue.shift();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await player.play(searchResult.tracks[0]);
    } else if (!player.playing && !player.paused) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await player.play();
    }

  } catch (error) {
    console.error("Error handling queue and play:", error);
  }
};

module.exports = {
  name: "playMusic",
  displayName: "Play Music",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Taksos",
  },
  fields: ["song", "queuePosition"],
  
  subtitle(data) {
    const position = data.queuePosition || "end";
    const positionMap = {
      instant: "Play Instantly",
      start: "Add to Beginning of Queue",
      end: "Add to End of Queue"
    };
    return `Play ${data.song} - ${positionMap[position]}`;
  },

  variableStorage(data, varType) {
    return ``;
  },

  html(isEvent, data) {
    return `
      <div style="float: left; width: 60%;">
          Song URL or Name:<br>
          <input id="song" class="round" type="text">
      </div><br>
      <div style="float: left; width: 60%;">
          Queue Position:<br>
          <select id="queuePosition" class="round">
              <option value="end" selected>Add to End</option>
              <option value="instant">Play Instantly</option>
              <option value="start">Add to Beginning</option>
          </select>
      </div>
    `;
  },

  init() {},

  async action(cache) {
    const data = cache.actions[cache.index];
    const client = this.getDBM().Bot.bot;

    try {
      const link = this.evalMessage(data.song, cache);
      const song = link.includes("&") ? link.split("&")[0] : link;
      const targetServer = await this.getServerFromData(0, null, cache);
      const member = await this.getMemberFromData(1, null, cache);

      if (!member?.voice?.channel) {
        console.error("User is not in a voice channel or member data is invalid.");
        return this.callNextAction(cache);
      }

      const searchResult = await searchSong(client, song, member);
      if (!searchResult) return this.callNextAction(cache);

      const player = await getOrCreatePlayer(client, targetServer, member, cache);
      if (!player) return this.callNextAction(cache);

      await handleQueueAndPlay(player, searchResult, data.queuePosition, song);

    } catch (error) {
      console.error("Error in playMusic action:", error);
    }

    this.callNextAction(cache);
  },

  mod() {},
};