module.exports = {
    name: "playerMusic",
    displayName: "Store Player",
    section: "Lavalink",
    meta: {
        version: "2.3.4",
        preciseCheck: true,
        author: "Taksos",
        authorUrl: "",
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
        } else if (data.info === "queue") {
            dataType = "Array";
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
        } else if (data.info === "filters") {
            dataType = "String";
        }
        return [data.varName2, dataType];
    },
    fields: ["storage", "varName2", "info"],
    html(isEvent, data) {
        return `
            <div style="float: left; width: 60%;">
                Select Data to Store:<br>
                <select id="info" class="round">
                    <option value="">Player</option>
                    <option value="queue">Queue</option>
                    <option value="queue.current.title">Current Track Title</option>
                    <option value="queue.current.author">Current Track Author</option>
                    <option value="queue.current.duration">Current Track Duration</option>
                    <option value="queue.current.uri">Current Track URI</option>
                    <option value="queue.current.sourceName">Current Track Source Name</option>
                    <option value="queue.current.thumbnail">Current Track Thumbnail</option>
                    <option value="queue.current.artworkUrl">Current Track Artwork URL</option>
                    <option value="queue.current.requester">Current Track Requester</option>
                    <option value="queue.current.pluginInfo">Current Track Plugin Info</option>
                    <option value="queue.current.isStream">Current Track Is Stream</option>
                    <option value="queue.current.isSeekable">Current Track Is Seekable</option>
                    <option value="queue.current.displayThumbnail">Current Track Display Thumbnail</option>
                    <option value="queue.current.identifier">Current Track Identifier</option>
                    <option value="queue.current.track">Current Track Object</option>
                    <option value="queue.current">Current Track Object (All)</option>
                    <option value="queue.size">Queue Size</option>
                    <option value="loop">Is Looping?</option>
                    <option value="state">Player State</option>
                    <option value="volume">Player Volume</option>
                    <option value="playing">Is Player Playing?</option>
                    <option value="paused">Is Player Paused?</option>
                    <option value="autoplay">Is Autoplaying?</option>
                    <option value="voiceChannel">Player Voice Channel</option>
                    <option value="textChannel">Player Text Channel</option>
                    <option value="guild">Player Guild</option>
                    <option value="id">Player ID</option>
                    <option value="manager">Player Manager</option>
                    <option value="filters">Active Filters</option>
                </select>
            </div><br><br><br><br><br>
  
            <store-in-variable dropdownLabel="Store In" selectId="storage" variableContainerId="varNameContainer2" variableInputId="varName2"></store-in-variable>`;
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
  
            let valueToStore;
            if (info === "filters") {
                const activeFilters = [];
                if (player.filters) {
                    if (player.filters.bassboost) activeFilters.push("Bass Boost");
                    if (player.filters.eightD) activeFilters.push("8D");
                    if (player.filters.nightcore) activeFilters.push("Nightcore");
                    if (player.filters.vaporwave) activeFilters.push("Vaporwave");
                    if (player.filters.earrape) activeFilters.push("Earrape");
                    if (player.filters.chipmunk) activeFilters.push("Chipmunk");
                    if (player.filters.darthvader) activeFilters.push("Darth Vader");
                    if (player.filters.party) activeFilters.push("Party");
                    if (player.filters.radio) activeFilters.push("Radio");
                }
                valueToStore = activeFilters.length > 0 ? activeFilters.join('\n') : 'None';
            } else if (info === "loop") {
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
                    valueToStore = "Queue is empty.";
                } else {
                    let queueList = [];
                    if (typeof player.queue[0] === 'string' && player.queue[0].startsWith("Up next:")) {
                        queueList = player.queue.slice(1).map((track, index) => `**${index + 1}.** ${track.title}`);
                    } else {
                        queueList = player.queue.map((track, index) => `**${index + 1}.** ${track.title}`);
                    }
  
                    let fullList = queueList.join("\n");
  
                    if (fullList.length > 850) {
                        let truncatedList = [];
                        let charCount = 0;
                        let remaining = 0;
  
                        for (let i = 0; i < queueList.length; i++) {
                            if (charCount + queueList[i].length + 1 > 850) {
                                remaining = queueList.length - i;
                                break;
                            }
                            truncatedList.push(queueList[i]);
                            charCount += queueList[i].length + 1;
                        }
  
                        fullList = `${truncatedList.join("\n")}\n...and ${remaining} more songs.`;
                    }
  
                    valueToStore = fullList;
                }
            } else if (info) {
                try {
                    valueToStore = getValue(player, info);
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