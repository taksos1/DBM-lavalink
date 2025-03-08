module.exports = {
  name: "AudioFilter",
  displayName: "Apply Audio Filter",
  section: "Lavalink",
  meta: {
    version: "2.8.4",
    preciseCheck: true,
    author: "Assistant",
  },

  subtitle(data) {
    return `Apply ${data.filter} filter`;
  },

  fields: ["filter", "value", "level"],

  html(isEvent, data) {
    return `
      <div>
        <div style="padding: 16px; background: #2c2f33; border-radius: 8px;">
          <h3 style="color: #fff; text-align: center;">Audio Filter Settings</h3>
          <label style="color: #fff;">Filter Type:</label>
          <select id="filter" onchange="glob.onFilterChange(this)" style="width: 100%; padding: 8px; background: #36393f; color: #fff; border: 1px solid #4a4d52;">
            <option value="bassboost">Bass Boost</option>
            <option value="soft">Soft</option>
            <option value="pop">Pop</option>
            <option value="treblebass">Treble Bass</option>
            <option value="electronic">Electronic</option>
            <option value="radio">Radio</option>
            <option value="vaporwave">Vaporwave</option>
            <option value="tv">TV</option>
            <option value="distortion">Distortion</option>
            <option value="karaoke">Karaoke</option>
            <option value="rotation">Rotation</option>
            <option value="timescale">Timescale</option>
            <option value="vibrato">Vibrato</option>
            <option value="tremolo">Tremolo</option>
            <option value="nightcore">Nightcore</option>
            <option value="8d">8D Audio</option>
            <option value="chipmunk">Chipmunk</option>
            <option value="darthvader">Darth Vader</option>
            <option value="clear">Clear Filters</option>
            <option value="custom">Custom</option>
          </select>

          <div id="levelContainer" style="display: none; margin-top: 10px;">
            <label style="color: #fff;">Bass Boost Level:</label>
            <input id="level" type="text" placeholder="1-10, Insane, Extreme, Max, etc." value="5" style="width: 100%; padding: 8px; background: #36393f; color: #fff;">
            <div style="color: #aaa; margin-top: 5px; font-size: 12px;">
              You can use numbers 1-10 or presets like "Insane", "Extreme", "Max", "Hard", "Medium", "Soft"
            </div>
          </div>

          <div id="valueContainer" style="display: none; margin-top: 10px;">
            <label style="color: #fff;">Custom Filter JSON:</label>
            <input id="value" type="text" placeholder='{"equalizer":[{"band":0,"gain":0.2}]}' style="width: 100%; padding: 8px; background: #36393f; color: #fff;">
          </div>
        </div>
      </div>
    `;
  },

  init() {
    const { glob, document } = this;
    glob.onFilterChange = function (event) {
      document.getElementById('valueContainer').style.display = event.value === 'custom' ? 'block' : 'none';
      document.getElementById('levelContainer').style.display = event.value === 'bassboost' ? 'block' : 'none';
    };
    
    // Initialize the display based on default selection
    setTimeout(() => {
      const filterSelect = document.getElementById('filter');
      if (filterSelect) glob.onFilterChange(filterSelect);
    }, 100);
  },

  async action(cache) {
    const data = cache.actions[cache.index];
    const client = this.getDBM().Bot.bot;
    const targetServer = await this.getServerFromData(0, null, cache);
    if (!client?.manager || !targetServer) return this.callNextAction(cache);

    const player = client.manager.get(targetServer.id);
    if (!player) return this.callNextAction(cache);

    const filter = this.evalMessage(data.filter, cache);
    const value = this.evalMessage(data.value, cache);
    let level = this.evalMessage(data.level, cache);

    try {
      // Map of filter names to their corresponding method names (if different)
      const filterMethodMap = {
        "treblebass": "trebleBass",
        "distortion": "distort",
        "8d": "eightD"
      };
      
      // Get the correct method name
      const methodName = filterMethodMap[filter] || filter;
      
      // Apply the selected filter
      switch (filter) {
        case 'clear':
          // Try to find the most common clear filter method
          if (player.filters) {
            if (typeof player.filters.clearFilters === 'function') {
              await player.filters.clearFilters();
            } else if (typeof player.filters.clear === 'function') {
              await player.filters.clear();
            } else {
              // Reset filters by applying an empty set of EQ bands
              const emptyEQ = Array(15).fill(0).map((_, i) => ({ band: i, gain: 0 }));
              if (typeof player.filters.setEqualizer === 'function') {
                await player.filters.setEqualizer(emptyEQ);
              }
              
              // Reset all other filter settings
              const resetProperties = [
                'timescale', 'tremolo', 'vibrato', 'rotation', 'distortion', 
                'channelMix', 'lowPass', 'karaoke'
              ];
              
              resetProperties.forEach(prop => {
                if (player.filters[prop] !== undefined) {
                  player.filters[prop] = null;
                }
              });
              
              // Apply changes
              if (typeof player.filters.apply === 'function') {
                await player.filters.apply();
              }
            }
          }
          console.log("Cleared all audio filters");
          break;
          
        case 'custom':
          try {
            const filterObject = JSON.parse(value);
            
            if (player.filters) {
              // Apply each property from the custom filter
              Object.keys(filterObject).forEach(key => {
                player.filters[key] = filterObject[key];
              });
              
              // Apply the filter changes
              if (typeof player.filters.apply === 'function') {
                await player.filters.apply();
              }
            }
            console.log("Applied custom filter");
          } catch (err) {
            console.error('Failed to parse or apply custom filter:', err);
          }
          break;
          
        case 'bassboost':
          if (player.filters) {
            // Parse level input - can be number or string preset
            let bassGain = 0.5; // Default medium level
            let bassMultiplier = 1.0;
            
            // Handle preset names
            const presets = {
              'soft': { gain: 0.3, multiplier: 1.0 },
              'medium': { gain: 0.5, multiplier: 1.0 },
              'hard': { gain: 0.7, multiplier: 1.0 },
              'insane': { gain: 0.8, multiplier: 1.2 },
              'extreme': { gain: 0.9, multiplier: 1.4 },
              'max': { gain: 1.0, multiplier: 1.6 }
            };
            
            if (typeof level === 'string') {
              // Try to parse as number first
              const numLevel = parseFloat(level);
              
              if (!isNaN(numLevel)) {
                // It's a number as string, scale 0-10 to 0-1.0
                bassGain = Math.min(Math.max(numLevel / 10, 0), 1);
              } else {
                // Check for preset names
                const presetName = level.toLowerCase().trim();
                if (presets[presetName]) {
                  bassGain = presets[presetName].gain;
                  bassMultiplier = presets[presetName].multiplier;
                }
              }
            } else if (typeof level === 'number') {
              bassGain = Math.min(Math.max(level / 10, 0), 1);
            }
            
            // Enhanced bass boost with more dramatic effect
            const bassEQ = [
              { band: 0, gain: bassGain * bassMultiplier }, // Sub-bass
              { band: 1, gain: bassGain * bassMultiplier }, // Bass
              { band: 2, gain: bassGain * 0.8 * bassMultiplier }, // Upper bass
              { band: 3, gain: bassGain * 0.6 * bassMultiplier } // Lower mid-range
            ];
            
            // Add slight boost to low-mids for a fuller sound
            if (bassGain > 0.5) {
              bassEQ.push({ band: 4, gain: bassGain * 0.3 * bassMultiplier });
            }
            
            // Apply the equalizer
            if (typeof player.filters.setEqualizer === 'function') {
              await player.filters.setEqualizer(bassEQ);
            } else {
              // Alternatively, set the equalizer property directly
              player.filters.equalizer = bassEQ;
              
              // Apply changes
              if (typeof player.filters.apply === 'function') {
                await player.filters.apply();
              }
            }
            console.log(`Applied bassboost filter with gain: ${bassGain} and multiplier: ${bassMultiplier}`);
          }
          break;
          
        default:
          if (player.filters && typeof player.filters[methodName] === 'function') {
            // Call the filter method
            await player.filters[methodName](true);
            console.log(`Applied ${filter} filter`);
          } else {
            console.error(`Filter method ${methodName} not found`);
          }
          break;
      }
    } catch (err) {
      console.error('Failed to apply audio filter:', err);
    }

    this.callNextAction(cache);
  },

  mod() {}
};