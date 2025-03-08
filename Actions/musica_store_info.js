module.exports = {
    name: "playerMusic",
    displayName: "Store Player",
    section: "Lavalink",
    meta: {
        version: "2.3.4",
        preciseCheck: true,
        author: "Taksos",
    },
    subtitle(data) {
        return `Return the player ${data.info} in ${data.varName2}`;
    },
    variableStorage(data, varName2) {
        const type = parseInt(data.storage, 10);
        if (type !== varName2) return;
        let dataType = "Unknown";
        if (data.info === "") {
            dataType = "Player";
        } else if (data.info === "queue" || data.info === "queue.noicons") {
            dataType = "String";
        } else if (data.info.startsWith("queue.current")) {
            dataType = "Object";
        } else if (data.info === "queue.size") {
            dataType = "Number";
        } else if (data.info === "loop") {
            dataType = "String";
        } else if (data.info === "state") {
            dataType = "String";
        } else if (data.info === "volume") {
            dataType = "Number";
        } else if (data.info === "playing") {
            dataType = "Boolean";
        } else if (data.info === "paused") {
            dataType = "Boolean";
        } else if (data.info === "autoplay") {
            dataType = "Boolean";
        } else if (data.info === "voiceChannel") {
            dataType = "Channel";
        } else if (data.info === "textChannel") {
            dataType = "Channel";
        } else if (data.info === "guild") {
            dataType = "Guild";
        } else if (data.info === "id") {
            dataType = "String";
        } else if (data.info === "manager") {
            dataType = "Object";
        } else if (data.info === "queue.current.durationMS" || 
                  data.info === "queue.current.durationFormatted" ||
                  data.info === "queue.current.durationTimestamp") {
            dataType = "String";
        }
        return [data.varName2, dataType];
    },
    fields: ["storage", "varName2", "info", "songIndex", "queueLimit", "youtubeEmoji", "spotifyEmoji", "appleEmoji"],
    html(isEvent, data) {
        return `
            <div style="padding: 10px; position: relative;">
                <div style="width: 100%; margin-bottom: 8px;">
                    <label>Select Data to Store:</label>
                    <select id="info" class="round" style="width: 100%;">
                        <optgroup label="🎵 Player Info">
                            <option value="">Player (Full Object)</option>
                            <option value="state">Player State</option>
                            <option value="volume">Player Volume</option>
                            <option value="playing">Is Player Playing?</option>
                            <option value="paused">Is Player Paused?</option>
                            <option value="autoplay">Is Autoplay Enabled?</option>
                            <option value="loop">Loop Mode</option>
                            <option value="voiceChannel">Player Voice Channel</option>
                            <option value="textChannel">Player Text Channel</option>
                            <option value="guild">Player Guild</option>
                            <option value="id">Player ID</option>
                            <option value="manager">Player Manager</option>
                        </optgroup>
        
                        <optgroup label="📜 Queue Info">
                            <option value="queue">Queue (With Icons)</option>
                            <option value="queue.noicons">Queue (No Icons)</option>
                            <option value="queue.size">Queue Size</option>
                        </optgroup>
        
                        <optgroup label="🎶 Current Track Info">
                            <option value="queue.current">Current Track (Full Object)</option>
                            <option value="queue.current.title">Title</option>
                            <option value="queue.current.author">Author</option>
                            <option value="queue.current.duration">Duration</option>
                            <option value="queue.current.durationMS">Duration (Milliseconds)</option>
                            <option value="queue.current.durationFormatted">Duration (Minutes:Seconds)</option>
                            <option value="queue.current.durationTimestamp">Duration (Timestamp)</option>
                            <option value="queue.current.uri">Track URI</option>
                            <option value="queue.current.sourceName">Source Name</option>
                            <option value="queue.current.thumbnail">Thumbnail URL</option>
                            <option value="queue.current.artworkUrl">Artwork URL</option>
                            <option value="queue.current.requester">Requester</option>
                            <option value="queue.current.pluginInfo">Plugin Info</option>
                            <option value="queue.current.isStream">Is Stream?</option>
                            <option value="queue.current.isSeekable">Is Seekable?</option>
                            <option value="queue.current.displayThumbnail">Display Thumbnail</option>
                            <option value="queue.current.identifier">Track Identifier</option>
                            <option value="queue.current.track">Track Object</option>
                        </optgroup>
                    </select>
                </div>
        
                <div style="width: 100%; margin-bottom: 8px;">
                    <label>Queue Song Index (Optional):</label>
                    <input id="songIndex" class="round" type="text" style="width: 100%;" placeholder="Leave blank for current">
                    <small>Use this to get info about specific songs in the queue. Leave empty to use the current song.</small>
                </div>
        
                <div id="queueLimitContainer" style="width: 100%; margin-bottom: 8px; display: none;">
                    <label>Max Songs to Display (Queue Only):</label>
                    <input id="queueLimit" class="round" type="text" style="width: 100%;" placeholder="10" value="10">
                    <small>Number of songs to show before adding "...and X more songs". Default is 10.</small>
                </div>
                
                <div id="emojiContainer" style="width: 100%; margin-bottom: 8px; display: none;">
                    <div style="margin-bottom: 8px;">
                        <label>YouTube Emoji:</label>
                        <input id="youtubeEmoji" class="round" type="text" style="width: 100%;" placeholder="Enter YouTube emoji" value="<:youtube:1347840729464180737>">
                    </div>
                    <div style="margin-bottom: 8px;">
                        <label>Spotify Emoji:</label>
                        <input id="spotifyEmoji" class="round" type="text" style="width: 100%;" placeholder="Enter Spotify emoji" value="<:spotify:1347840718718373929>">
                    </div>
                    <div style="margin-bottom: 8px;">
                        <label>Apple Music Emoji:</label>
                        <input id="appleEmoji" class="round" type="text" style="width: 100%;" placeholder="Enter Apple Music emoji" value="<:apple:1347840708077293621>">
                    </div>
                    <small>Enter custom emojis for each source (e.g., <:name:id> or regular emoji)</small>
                </div>
        
                <div style="display: flex; gap: 20px; align-items: center; width: 100%; margin-top: 10px;">
                    <store-in-variable dropdownLabel="Store In" selectId="storage" variableContainerId="varNameContainer2" variableInputId="varName2" style="flex-grow: 1;"></store-in-variable>
                </div>
            </div>`;
    },
    init() {
        const infoSelect = document.getElementById("info");
        const queueLimitContainer = document.getElementById("queueLimitContainer");
        const emojiContainer = document.getElementById("emojiContainer");

        function toggleContainers() {
            if (infoSelect && queueLimitContainer && emojiContainer) {
                const isQueueSelected = infoSelect.value === "queue" || infoSelect.value === "queue.noicons";
                queueLimitContainer.style.display = isQueueSelected ? "block" : "none";
                emojiContainer.style.display = infoSelect.value === "queue" ? "block" : "none";
            }
        }

       
        toggleContainers();

      
        if (infoSelect) {
            infoSelect.onchange = toggleContainers;
        }
    },
    async action(cache) {
        const data = cache.actions[cache.index];
        const client = this.getDBM().Bot.bot;
        const targetServer = await this.getServerFromData(0, null, cache);
        const player = client.manager.get(targetServer.id);
  
        if (player) {
            const info = this.evalMessage(data.info, cache);
            const storage = parseInt(data.storage, 10);
            const varName2 = this.evalMessage(data.varName2, cache);
            const songIndex = this.evalMessage(data.songIndex, cache);
            const queueLimit = parseInt(this.evalMessage(data.queueLimit, cache)) || 10; 
            const youtubeEmoji = this.evalMessage(data.youtubeEmoji, cache) || "<:youtube:1347840729464180737>";
            const spotifyEmoji = this.evalMessage(data.spotifyEmoji, cache) || "<:spotify:1347840718718373929>";
            const appleEmoji = this.evalMessage(data.appleEmoji, cache) || "<:apple:1347840708077293621>";
  
            let valueToStore;
            if (info === "loop") {
                const isTrackLooping = player.trackRepeat ?? false;
                const isQueueLooping = player.queueRepeat ?? false;
                if (isTrackLooping) {
                    valueToStore = "Looping Track";
                } else if (isQueueLooping) {
                    valueToStore = "Looping Queue";
                } else {
                    valueToStore = "Not Looping";
                }
            } else if (info === "autoplay") {
                valueToStore = player.autoplay ?? false;
            } else if (info === "queue") {
                if (!player.queue || player.queue.length === 0) {
                    valueToStore = "\n◢◤ Queue is empty ◥◣\n";
                } else {
                    const queueLength = player.queue.length;
                    const displayLimit = Math.min(queueLength, Math.max(1, queueLimit));
                    
                    const sourceIcons = {
                        "youtube": youtubeEmoji,
                        "spotify": spotifyEmoji,
                        "apple": appleEmoji,
                        "default": "🎵" 
                    };
                    
                    let queueString = "\n";
                    for (let i = 0; i < displayLimit; i++) {
                        const track = player.queue[i];
                        let duration = "0:00";
                        if (track && track.duration) {
                            const totalSeconds = Math.floor(track.duration / 1000);
                            const minutes = Math.floor(totalSeconds / 60);
                            const seconds = totalSeconds % 60;
                            duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        }
                        const sourceIcon = sourceIcons[track.sourceName?.toLowerCase()] || sourceIcons["default"];
                        queueString += `${i + 1}. ${sourceIcon} | ${track.title} | ${duration}\n`;
                    }
                    if (queueLength > displayLimit) {
                        const remaining = queueLength - displayLimit;
                        queueString += `\n...and ${remaining} more song${remaining === 1 ? '' : 's'}\n`;
                    }
                    queueString += "\n";
                    valueToStore = queueString;
                }
            } else if (info === "queue.noicons") {
                if (!player.queue || player.queue.length === 0) {
                    valueToStore = "\n◢◤ Queue is empty ◥◣\n";
                } else {
                    const queueLength = player.queue.length;
                    const displayLimit = Math.min(queueLength, Math.max(1, queueLimit));
                    
                    let queueString = "\n";
                    for (let i = 0; i < displayLimit; i++) {
                        const track = player.queue[i];
                        let duration = "0:00";
                        if (track && track.duration) {
                            const totalSeconds = Math.floor(track.duration / 1000);
                            const minutes = Math.floor(totalSeconds / 60);
                            const seconds = totalSeconds % 60;
                            duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        }
                        queueString += `${i + 1}. ${track.title} | ${duration}\n`;
                    }
                    if (queueLength > displayLimit) {
                        const remaining = queueLength - displayLimit;
                        queueString += `\n...and ${remaining} more song${remaining === 1 ? '' : 's'}\n`;
                    }
                    queueString += "\n";
                    valueToStore = queueString;
                }
            } else if (info === "queue.current.durationMS") {
                const track = songIndex && !isNaN(parseInt(songIndex)) ? 
                    player.queue[parseInt(songIndex) - 1] : 
                    player.queue.current;
                valueToStore = track && track.duration ? String(track.duration) : "0";
            } else if (info === "queue.current.durationFormatted") {
                const track = songIndex && !isNaN(parseInt(songIndex)) ? 
                    player.queue[parseInt(songIndex) - 1] : 
                    player.queue.current;
                if (track && track.duration) {
                    const totalSeconds = Math.floor(track.duration / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    valueToStore = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    valueToStore = "0:00";
                }
            } else if (info === "queue.current.durationTimestamp") {
                const track = songIndex && !isNaN(parseInt(songIndex)) ? 
                    player.queue[parseInt(songIndex) - 1] : 
                    player.queue.current;
                if (track && track.duration) {
                    const totalSeconds = Math.floor(track.duration / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    valueToStore = hours > 0 ? 
                        `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : 
                        `${minutes}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    valueToStore = "0:00";
                }
            } else if (info) {
                try {
                    if (songIndex && !isNaN(parseInt(songIndex)) && info.startsWith("queue.current")) {
                        const index = parseInt(songIndex) - 1;
                        if (index >= 0 && player.queue && index < player.queue.length) {
                            const trackInfo = info.replace("queue.current", "");
                            valueToStore = trackInfo ? 
                                getValue(player.queue[index], trackInfo.slice(1)) : 
                                player.queue[index];
                        } else {
                            valueToStore = "Invalid song index";
                        }
                    } else {
                        valueToStore = getValue(player, info);
                    }
                } catch (err) {
                    console.error("Error getting player info:", err);
                    valueToStore = undefined;
                }
            } else {
                valueToStore = player;
            }
  
            this.storeValue(valueToStore, storage, varName2, cache);
        }
  
        this.callNextAction(cache);
    },
};

function getValue(obj, expr) {
    if (!obj || typeof obj !== 'object' || !expr || typeof expr !== 'string') return undefined;
    try {
        return expr.split(".").reduce((p, c) => p && p[c], obj);
    } catch (e) {
        return undefined;
    }
}