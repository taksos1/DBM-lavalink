module.exports = {
  name: "LavalinkPlaySpecificSong",
  displayName: "Play Specific Song in Queue (MagmaStream)",
  section: "Lavalink",
  fields: ["position"],
  subtitle(data) {
    return `Play song at position ${data.position} in queue`;
  },
  variableStorage(data, varType) {
    return "";
  },
  html(isEvent, data) {
    return `
      <div style="float: left; width: 60%;">
        Queue Position (number):<br>
        <input id="position" class="round" type="text" placeholder="1">
      </div>
      <div style="float: left; width: 100%; padding-top: 8px;">
        <p>
          <b>Note:</b> Position starts at 1 (first song in queue, not the currently playing song).<br>
          This will play the specified song and then return to the normal queue order.
        </p>
      </div>
    `;
  },
  init() {},
  async action(cache) {
    const data = cache.actions[cache.index];
    const position = parseInt(this.evalMessage(data.position, cache));
    
    // Validate position input
    if (isNaN(position) || position < 1) {
      console.error("Invalid queue position. Please provide a number greater than 0.");
      return this.callNextAction(cache);
    }

    const client = this.getDBM().Bot.bot;
    const targetServer = await this.getServerFromData(0, null, cache);

    // Check for Lavalink player
    const lavalinkPlayer = client.manager?.get(targetServer.id);
    if (!lavalinkPlayer) {
      console.warn("Lavalink player not found, operation skipped.");
      return this.callNextAction(cache);
    }

    try {
      // Get the queue from the player
      const queue = lavalinkPlayer.queue;
      if (!queue) {
        console.warn("Queue is not available, operation skipped.");
        return this.callNextAction(cache);
      }

      // Store the currently playing track
      const currentTrack = lavalinkPlayer.track || lavalinkPlayer.current;
      
      // Get all tracks in the queue - handle different queue implementations
      // MagmaStream typically uses a simple array for queue
      let allTracks = [];
      
      // Try different possible queue structures
      if (Array.isArray(queue)) {
        // Direct array queue
        allTracks = [...queue];
      } else if (typeof queue.tracks !== 'undefined' && Array.isArray(queue.tracks)) {
        // Some implementations use queue.tracks
        allTracks = [...queue.tracks];
      } else if (typeof queue.toArray === 'function') {
        // Some use a collection with toArray method
        allTracks = [...queue.toArray()];
      } else if (typeof queue.values === 'function') {
        // Some use a collection with values method
        allTracks = [...Array.from(queue.values())];
      } else {
        // Last resort - try to extract tracks from queue object
        allTracks = Object.values(queue).filter(item => 
          item && typeof item === 'object' && 
          (item.track || item.title || item.uri || item.identifier)
        );
      }
      
      // Check if we have any tracks in queue
      if (allTracks.length === 0) {
        console.warn("No tracks found in queue, operation skipped.");
        return this.callNextAction(cache);
      }

      // Now position directly corresponds to index in queue (minus 1 for zero-based indexing)
      // Position 1 = index 0, Position 2 = index 1, etc.
      const targetIndex = position - 1;
      
      if (targetIndex < 0 || targetIndex >= allTracks.length) {
        console.warn(`Position ${position} is not valid. Queue has ${allTracks.length} songs total.`);
        return this.callNextAction(cache);
      }

      // Get the target track to play
      const targetTrack = allTracks[targetIndex];
      
      // Create a backup of the original queue order
      const originalQueue = [...allTracks];
      
      // Remove the target track from the backup (we'll play it immediately)
      originalQueue.splice(targetIndex, 1);
      
      // Store metadata about the current state to restore later
      const queueMetadata = {
        currentTrackInfo: currentTrack,
        originalQueue: originalQueue,
        targetTrackIndex: targetIndex
      };
      
      console.log(`Found song at queue position ${position}, preparing to play it next`);
      
      // Save metadata for reference
      if (!lavalinkPlayer._queueMetadata) {
        lavalinkPlayer._queueMetadata = {};
      }
      lavalinkPlayer._queueMetadata.specificSongPlay = queueMetadata;
      
      // Clear the current queue using available methods
      if (typeof queue.clear === 'function') {
        queue.clear();
      } else if (Array.isArray(queue)) {
        // If queue is an array, remove all items
        queue.length = 0;
      } else if (queue.tracks && Array.isArray(queue.tracks)) {
        queue.tracks.length = 0;
      }
      
      // Add the song we want to play first
      if (typeof queue.add === 'function') {
        queue.add(targetTrack);
      } else if (Array.isArray(queue)) {
        queue.push(targetTrack);
      } else if (queue.tracks && Array.isArray(queue.tracks)) {
        queue.tracks.push(targetTrack);
      }
      
      // Add all the original tracks back (except for the one we're playing)
      for (const track of originalQueue) {
        if (typeof queue.add === 'function') {
          queue.add(track);
        } else if (Array.isArray(queue)) {
          queue.push(track);
        } else if (queue.tracks && Array.isArray(queue.tracks)) {
          queue.tracks.push(track);
        }
      }
      
      // Now skip the current song to play our selected song
      if (typeof lavalinkPlayer.stop === 'function') {
        await lavalinkPlayer.stop();
      } else if (typeof lavalinkPlayer.skip === 'function') {
        await lavalinkPlayer.skip();
      }
      
      console.log(`Playing song at queue position ${position} without disrupting queue order for guild ${targetServer.id}`);
      
      // Emit custom event if needed
      client.emit('lavalinkSpecificSongPlay', targetServer.id, position);
      
    } catch (error) {
      console.error("Error playing specific song in queue:", error);
    }

    this.callNextAction(cache);
  },

  mod() {},
};