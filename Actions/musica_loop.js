module.exports = {
    name: "loopCurrentSong",
    displayName: "Loop Current Song",
    section: "Lavalink",
    meta: {
      version: "2.2.0",
      preciseCheck: true,
      author: "Taksos",
      
    },
    fields: ["loop", "loopType"],
    subtitle(data) {
      return `Loop current song: ${data.loop === "on" ? "On" : "Off"} - Loop type: ${data.loopType === "track" ? "Track" : "Queue"}`;
    },
    variableStorage() {
      return "";
    },
    html(isEvent, data) {
      return `
        <div class="loop-control-container">
          <style>
            .loop-control-container {
              background:rgba(248, 249, 250, 0.23);
              border-radius: 8px;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            
            .control-group {
              margin-bottom: 16px;
            }
            
            .control-group:last-child {
              margin-bottom: 0;
            }
            
            .control-label {
              display: block;
              font-size: 14px;
              font-weight: 500;
              color: #374151;
              margin-bottom: 8px;
            }
            
            .select-wrapper {
              position: relative;
            }
            
            .select-wrapper::after {
              content: "▼";
              font-size: 12px;
              color: #6b7280;
              position: absolute;
              right: 12px;
              top: 50%;
              transform: translateY(-50%);
              pointer-events: none;
            }
            
            select {
              width: 100%;
              padding: 8px 12px;
              font-size: 14px;
              border: 2px solidrgba(229, 231, 235, 0.32);
              border-radius: 6px;
              background: white;
              appearance: none;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            
            select:hover {
              border-color:rgba(209, 213, 219, 0.23);
            }
            
            select:focus {
              outline: none;
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .info-text {
              font-size: 12px;
              color: #6b7280;
              margin-top: 4px;
            }
          </style>
          
          <div class="control-group">
            <label class="control-label" for="loop">Loop Current Song</label>
            <div class="select-wrapper">
              <select id="loop" name="loop">
                <option value="on" ${data.loop === "on" ? "selected" : ""}>On</option>
                <option value="off" ${data.loop === "off" ? "selected" : ""}>Off</option>
              </select>
            </div>
            <div class="info-text">Enable or disable song looping</div>
          </div>
          
          <div class="control-group">
            <label class="control-label" for="loopType">Loop Type</label>
            <div class="select-wrapper">
              <select id="loopType" name="loopType">
                <option value="track" ${data.loopType === "track" ? "selected" : ""}>Loop Track</option>
                <option value="queue" ${data.loopType === "queue" ? "selected" : ""}>Loop Queue</option>
              </select>
            </div>
            <div class="info-text">Choose between looping a single track or the entire queue</div>
          </div>
        </div>
      `;
    },
    init() {},
    async action(cache) {
      const data = cache.actions[cache.index];
      const client = this.getDBM().Bot.bot;
      const server = await this.getServerFromData(0, null, cache);
  
      if (!server) {
        console.error("No server found in cache.");
        return this.callNextAction(cache);
      }
  
      const player = client.manager.get(server.id);
  
      if (!player) {
        console.log("No player found for this server.");
        return this.callNextAction(cache);
      }
  
      if (!player.queue || !player.queue.current) {
        console.log("No song is currently playing.");
        player.play(player.queue.current);
  
        if (player.queue.size === 0) {
          console.log("Queue is empty, adding the track to queue again.");
          player.queue.add(player.queue.current);
        }
        return this.callNextAction(cache);
      }
  
      try {
        const shouldLoop = data.loop === "on";
        const loopType = data.loopType === "queue";
  
        if (loopType) {
          player.setQueueRepeat(shouldLoop);
          console.log(shouldLoop ? "Looping the queue." : "Stopped looping the queue.");
        } else {
          player.setTrackRepeat(shouldLoop);
          console.log(shouldLoop ? "Looping the track." : "Stopped looping the track.");
        }
      } catch (error) {
        console.error("Error toggling loop:", error);
      }
  
      this.callNextAction(cache);
    },
    mod() {},
  };