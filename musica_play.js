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
    let positionText = "Add to End of Queue";
    if (position === "instant") {
      positionText = "Play Instantly";
    } else if (position === "start") {
      positionText = "Add to Beginning of Queue";
    }
    return `Play ${data.song} - ${positionText}`;
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
    const link = this.evalMessage(data.song, cache);
    const song = link.includes("&") ? link.split("&")[0] : link;
    const queuePosition = this.evalMessage(data.queuePosition, cache);
    const client = this.getDBM().Bot.bot;
    const targetServer = await this.getServerFromData(0, null, cache);
    const member = await this.getMemberFromData(1, null, cache);

    if (!member?.voice?.channel) {
      console.error("User is not in a voice channel or member data is invalid.");
      return this.callNextAction(cache);
    }

    try {
      const res = await client.manager.search(song, member.user);
      
      if (res.loadType === "empty" || res.loadType === "error") {
        console.error("Could not find the song");
        return this.callNextAction(cache);
      }

      let player = client.manager.get(targetServer.id);

      if (!player) {
        player = client.manager.create({
          guild: targetServer.id,
          textChannel: cache.msg?.channel?.id || "",
          voiceChannel: member.voice.channel.id,
          selfDeafen: true,
          volume: 10,
        });

        // Apply optimized settings if MagmaStream is available
        if (player.node?.options) {
          player.node.options.transport = "magma";
          player.node.options.bufferDuration = 400;
          player.node.options.smoothTransition = true;
        }
      } else {
        const textChannelId = cache.msg?.channel?.id;
        if (textChannelId) player.setTextChannel(textChannelId);
        player.setVoiceChannel(member.voice.channel.id);
      }

      await player.connect();

      // Initialize queue string if it doesn't exist
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

      // Handle playlist
      if (res.loadType === "playlist") {
        const safeUrl = song.replace(/[<>]/g, ''); // Remove < > from URL
        player.queue.string += `Playlist: [${res.playlist.name}](${safeUrl})\n`;
        res.playlist.tracks.forEach(addTrackToQueue);
      } else {
        // Handle single track
        const track = res.tracks[0];
        const safeUrl = track.uri.replace(/[<>]/g, ''); // Remove < > from URL
        player.queue.string += `[${track.title}](${safeUrl})\n`;
        addTrackToQueue(track);
      }

      if (queuePosition === "instant") {
        player.queue.shift();
        // Small buffer delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        await player.play(res.tracks[0]);
      } else if (!player.playing && !player.paused) {
        // Small buffer delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        await player.play();
      }

    } catch (error) {
      console.error("Error in playMusic action:", error);
    }

    this.callNextAction(cache);
  },
  mod() {},
};