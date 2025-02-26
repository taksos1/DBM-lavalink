module.exports = {
  name: "AudioFilter",
  displayName: "Apply Audio Filter",
  section: "Lavalink",
  meta: {
    version: "2.1.7",
    preciseCheck: true,
    author: "Assistant",
  },

  subtitle(data) {
    return `Apply ${data.filter} filter`;
  },

  fields: ["filter", "value"],
  
  html() {
    return `
      <div class="audio-filter-container">
        <div class="filter-card">
          <h3 class="filter-title">Audio Filter Settings</h3>
          
          <div class="form-group">
            <label for="filter" class="form-label">Filter Type:</label>
            <select 
              id="filter" 
              class="form-select" 
              onchange="glob.onFilterChange(this)"
              aria-label="Select audio filter type"
            >
              <optgroup label="Basic Filters">
                <option value="bassboost">Bass Boost</option>
                <option value="soft">Soft</option>
                <option value="pop">Pop</option>
                <option value="treble">Treble Bass</option>
                <option value="electronic">Electronic</option>
              </optgroup>

              <optgroup label="Special Effects">
                <option value="radio">Radio</option>
                <option value="vaporwave">Vaporwave</option>
                <option value="tv">TV</option>
                <option value="distortion">Distortion</option>
                <option value="karaoke">Karaoke</option>
                <option value="rotation">Rotation</option>
                <option value="timescale">Timescale</option>
                <option value="vibrato">Vibrato</option>
              </optgroup>

              <optgroup label="Voice Effects">
                <option value="china">China</option>
                <option value="chipmunk">Chipmunk</option>
                <option value="darthvader">Darth Vader</option>
                <option value="nightcore">Nightcore</option>
              </optgroup>

              <optgroup label="Time Effects">
                <option value="slowmo">Slowmo</option>
                <option value="daycore">Daycore</option>
              </optgroup>

              <optgroup label="Other Effects">
                <option value="tremolo">Tremolo</option>
                <option value="earrape">Earrape</option>
                <option value="eightD">8D</option>
                <option value="party">Party</option>
              </optgroup>

              <optgroup label="Control">
                <option value="clear">Clear Filters</option>
                <option value="custom">Custom</option>
              </optgroup>
            </select>
          </div>

          <div id="valueContainer" class="form-group" style="display: none;">
            <label for="value" class="form-label">Custom Filter JSON:</label>
            <input 
              id="value" 
              class="form-input"
              type="text" 
              placeholder='{"equalizer":[{"band":0,"gain":0.2}]}'
              aria-label="Custom filter JSON configuration"
            />
            <small class="help-text">Enter a valid JSON configuration for custom filter settings</small>
          </div>
        </div>

        <style>
          .audio-filter-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            padding: 16px;
          }

          .filter-card {
            background: #2c2f33;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .filter-title {
            color: #ffffff;
            text-align: center;
            margin: 0 0 16px 0;
            font-size: 1.25rem;
            font-weight: 600;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-label {
            display: block;
            color: #ffffff;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .form-select,
          .form-input {
            width: 100%;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #4a4d52;
            background: #36393f;
            color: #ffffff;
            font-size: 14px;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .form-select:hover,
          .form-input:hover {
            border-color: #7289da;
          }

          .form-select:focus,
          .form-input:focus {
            outline: none;
            border-color: #7289da;
            box-shadow: 0 0 0 2px rgba(114, 137, 218, 0.3);
          }

          .help-text {
            display: block;
            color: #99aab5;
            font-size: 12px;
            margin-top: 4px;
          }

          optgroup {
            color: #99aab5;
            font-weight: 600;
          }

          option {
            color: #ffffff;
            padding: 4px;
          }
        </style>
      </div>
    `;
  },

  init() {
    const { glob } = this;
    glob.onFilterChange = function (event) {
      const value = document.getElementById('valueContainer');
      value.style.display = event.value === 'custom' ? null : 'none';
    };
  },

  async action(cache) {
    const data = cache.actions[cache.index];
    const client = this.getDBM().Bot.bot;
    const targetServer = await this.getServerFromData(0, null, cache);

    if (!client?.manager) {
      console.error("Lavalink manager not found!");
      return this.callNextAction(cache);
    }

    const player = client.manager.get(targetServer.id);
    if (!player) {
      console.error("No active player found!");
      return this.callNextAction(cache);
    }

    const filter = this.evalMessage(data.filter, cache);
    const value = this.evalMessage(data.value, cache);

    try {
      // Store the current position to resume from same position after filter change
      const currentPosition = player.position || 0;
      
      // Function to safely get equalizer settings
      const getPlayerEqualizer = () => {
        try {
          if (player.filters && player.filters.options && Array.isArray(player.filters.options.equalizer)) {
            return player.filters.options.equalizer;
          }
          return []; // Return empty array if no equalizer is found
        } catch (err) {
          console.log("Could not access equalizer settings, using defaults");
          return [];
        }
      };
      
      // Function to send direct node update for faster filter application
      const sendDirectFilterUpdate = async (filterData) => {
        try {
          if (player.node && typeof player.node.send === 'function') {
            // Send filter update (primary method)
            await player.node.send({
              op: 'filters',
              guildId: targetServer.id,
              ...filterData
            });
            
            // Emit filter change event for other parts of the app
            client.emit('lavalinkFilterUpdate', targetServer.id, filter, filterData);
          }
        } catch (err) {
          console.error("Error sending direct filter update:", err);
        }
      };
      
      let filterData = {};
      
      switch (filter) {
        case 'clear':
          // Clears all applied filters on the player
          if (player.filters && typeof player.filters.clearFilters === 'function') {
            await player.filters.clearFilters();
          }
          filterData = {}; // Empty filter data for direct update
          break;

        case 'custom':
          try {
            // Applying custom filter from JSON input
            const customFilters = JSON.parse(value);
            if (player.filters && typeof player.filters.setEqualizer === 'function') {
              await player.filters.setEqualizer(customFilters.equalizer || []);
            }
            filterData = customFilters; // Use the custom filter data
          } catch (err) {
            console.error('Invalid custom filter JSON:', err);
          }
          break;

        case 'distortion':
          // Apply distortion effect
          const distortionOptions = { distortion: { level: 0.5 } };
          if (player.filters && typeof player.filters.setDistortion === 'function') {
            await player.filters.setDistortion(distortionOptions);
          }
          filterData = distortionOptions;
          break;

        case 'karaoke':
          // Apply karaoke effect
          const karaokeOptions = { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 0.5 } };
          if (player.filters && typeof player.filters.setKaraoke === 'function') {
            await player.filters.setKaraoke(karaokeOptions.karaoke);
          }
          filterData = karaokeOptions;
          break;

        case 'rotation':
          // Apply rotation effect
          const rotationOptions = { rotation: { rotationHz: 1.0 } };
          if (player.filters && typeof player.filters.setRotation === 'function') {
            await player.filters.setRotation(rotationOptions.rotation);
          }
          filterData = rotationOptions;
          break;

        case 'timescale':
          // Apply timescale effect (speed, pitch, rate)
          const timescaleOptions = { timescale: { speed: 1.0, pitch: 1.0, rate: 1.0 } };
          if (player.filters && typeof player.filters.setTimescale === 'function') {
            await player.filters.setTimescale(timescaleOptions.timescale);
          }
          filterData = timescaleOptions;
          break;

        case 'vibrato':
          // Apply vibrato effect
          const vibratoOptions = { vibrato: { frequency: 5.0, depth: 0.5 } };
          if (player.filters && typeof player.filters.setVibrato === 'function') {
            await player.filters.setVibrato(vibratoOptions.vibrato);
          }
          filterData = vibratoOptions;
          break;

        case 'slowmo':
          // Apply slow-motion effect
          if (player.filters && typeof player.filters.slowmo === 'function') {
            await player.filters.slowmo();
          }
          filterData = { timescale: { speed: 0.5, pitch: 0.8, rate: 0.8 } };
          break;

        case 'tremolo':
          // Apply tremolo effect
          if (player.filters && typeof player.filters.tremolo === 'function') {
            await player.filters.tremolo();
          }
          filterData = { tremolo: { depth: 0.5, frequency: 4.0 } };
          break;

        case 'bassboost':
          // Apply bass boost effect
          if (player.filters && typeof player.filters.bassBoost === 'function') {
            await player.filters.bassBoost();
          }
          // Default bassboost equalizer settings
          filterData = {
            equalizer: [
              { band: 0, gain: 0.3 },
              { band: 1, gain: 0.25 },
              { band: 2, gain: 0.2 },
              { band: 3, gain: 0.1 }
            ]
          };
          break;

        case 'soft':
          // Apply soft equalizer effect
          if (player.filters && typeof player.filters.soft === 'function') {
            await player.filters.soft();
          }
          filterData = { equalizer: getPlayerEqualizer() };
          break;

        case 'pop':
          // Apply pop effect
          if (player.filters && typeof player.filters.pop === 'function') {
            await player.filters.pop();
          }
          filterData = { equalizer: getPlayerEqualizer() };
          break;

        case 'treble':
          // Apply treble and bass boost effect
          if (player.filters && typeof player.filters.trebleBass === 'function') {
            await player.filters.trebleBass();
          }
          filterData = { equalizer: getPlayerEqualizer() };
          break;

        case 'tv':
          // Apply TV effect
          if (player.filters && typeof player.filters.tv === 'function') {
            await player.filters.tv();
          }
          filterData = { 
            equalizer: getPlayerEqualizer(),
            tremolo: { depth: 0.3, frequency: 14 }
          };
          break;

        case 'vaporwave':
          // Apply vaporwave effect
          if (player.filters && typeof player.filters.vaporwave === 'function') {
            await player.filters.vaporwave();
          }
          filterData = { 
            timescale: { pitch: 0.8, speed: 0.8 },
            equalizer: getPlayerEqualizer()
          };
          break;

        case 'china':
          // Apply china effect
          if (player.filters && typeof player.filters.china === 'function') {
            await player.filters.china();
          }
          filterData = { equalizer: getPlayerEqualizer() };
          break;

        case 'chipmunk':
          // Apply chipmunk effect
          if (player.filters && typeof player.filters.chipmunk === 'function') {
            await player.filters.chipmunk();
          }
          filterData = { timescale: { pitch: 1.5, speed: 1.5, rate: 1 } };
          break;

        case 'darthvader':
          // Apply darthvader effect
          if (player.filters && typeof player.filters.darthvader === 'function') {
            await player.filters.darthvader();
          }
          filterData = { timescale: { pitch: 0.5, speed: 0.8, rate: 1 } };
          break;

        case 'daycore':
          // Apply daycore effect
          if (player.filters && typeof player.filters.daycore === 'function') {
            await player.filters.daycore();
          }
          filterData = { timescale: { pitch: 0.8, speed: 0.8, rate: 1 } };
          break;

        case 'earrape':
          // Apply earrape effect
          if (player.filters && typeof player.filters.earrape === 'function') {
            await player.filters.earrape();
          }
          filterData = { volume: 5.0 };
          break;

        case 'eightD':
          // Apply 8D audio effect
          if (player.filters && typeof player.filters.eightD === 'function') {
            await player.filters.eightD();
          }
          filterData = { rotation: { rotationHz: 0.2 } };
          break;

        case 'nightcore':
          // Apply nightcore effect
          if (player.filters && typeof player.filters.nightcore === 'function') {
            await player.filters.nightcore();
          }
          filterData = { timescale: { pitch: 1.2, speed: 1.3, rate: 1 } };
          break;

        case 'party':
          // Apply party effect
          if (player.filters && typeof player.filters.party === 'function') {
            await player.filters.party();
          }
          filterData = { equalizer: getPlayerEqualizer() };
          break;

        case 'radio':
          // Apply radio effect
          if (player.filters && typeof player.filters.radio === 'function') {
            await player.filters.radio();
          }
          filterData = { 
            equalizer: getPlayerEqualizer(),
            timescale: { pitch: 1.1, speed: 1, rate: 1 }
          };
          break;

        default:
          // Apply predefined filter
          if (player.filters && typeof player.filters.setFilter === 'function') {
            await player.filters.setFilter(filter);
          }
          filterData = player.filters?.options || {};
          break;
      }

      // Send direct filter update command to node
      await sendDirectFilterUpdate(filterData);
      
      // Additional approach: Send multiple commands to ensure filter is applied
      try {
        // Force apply filter by setting it directly through the node connection
        if (player.node && typeof player.node.send === 'function') {
          // Send a filters reset command first
          await player.node.send({
            op: 'filters',
            guildId: targetServer.id
          });
          
          // Wait a tiny amount of time
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Then send the new filter
          await player.node.send({
            op: 'filters',
            guildId: targetServer.id,
            ...filterData
          });
        }
      } catch (err) {
        // Ignore errors in this additional approach
      }
      
      // Force seek to current position to apply filters immediately
      if (currentPosition > 0 && player.playing) {
        try {
          await player.seek(currentPosition);
          
          // Some implementations might need a slight offset to trigger a refresh
          setTimeout(async () => {
            if (player.playing) {
              await player.seek(currentPosition + 1);
            }
          }, 50);
        } catch (err) {
          console.error("Error during seek operation:", err);
        }
      }

      console.log(`Applied ${filter} filter to player in guild ${targetServer.id}`);
    } catch (err) {
      console.error('Failed to apply audio filter:', err);
    }

    this.callNextAction(cache); // Continue to the next action
  },

  mod() {}
};