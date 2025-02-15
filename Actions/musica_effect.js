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
      switch (filter) {
        case 'clear':
          // Clears all applied filters on the player
          await player.filters.clearFilters();
          break;

        case 'custom':
          try {
            // Applying custom filter from JSON input
            const customFilters = JSON.parse(value);
            await player.filters.setEqualizer(customFilters.equalizer || []);
          } catch (err) {
            console.error('Invalid custom filter JSON:', err);
          }
          break;

        case 'distortion':
          // Apply distortion effect
          const distortionOptions = { distortion: { level: 0.5 } };  // Example value
          await player.filters.setDistortion(distortionOptions);
          break;

        case 'karaoke':
          // Apply karaoke effect
          const karaokeOptions = { level: 1.0, monoLevel: 1.0, filterBand: 0.5 };  // Example values
          await player.filters.setKaraoke(karaokeOptions);
          break;

        case 'rotation':
          // Apply rotation effect
          const rotationOptions = { rotationHz: 1.0 };  // Example value
          await player.filters.setRotation(rotationOptions);
          break;

        case 'timescale':
          // Apply timescale effect (speed, pitch, rate)
          const timescaleOptions = { speed: 1.0, pitch: 1.0, rate: 1.0 };  // Example values
          await player.filters.setTimescale(timescaleOptions);
          break;

        case 'vibrato':
          // Apply vibrato effect
          const vibratoOptions = { frequency: 5.0, depth: 0.5 };  // Example values
          await player.filters.setVibrato(vibratoOptions);
          break;

        case 'slowmo':
          // Apply slow-motion effect
          await player.filters.slowmo();
          break;

        case 'tremolo':
          // Apply tremolo effect
          await player.filters.tremolo();
          break;

        case 'bassboost':
          // Apply bass boost effect
          await player.filters.bassBoost();
          break;

        case 'soft':
          // Apply soft equalizer effect
          await player.filters.soft();
          break;

        case 'pop':
          // Apply pop effect
          await player.filters.pop();
          break;

        case 'treble':
          // Apply treble and bass boost effect
          await player.filters.trebleBass();
          break;

        case 'tv':
          // Apply TV effect
          await player.filters.tv();
          break;

        case 'vaporwave':
          // Apply vaporwave effect
          await player.filters.vaporwave();
          break;

        case 'china':
          // Apply china effect
          await player.filters.china();
          break;

        case 'chipmunk':
          // Apply chipmunk effect
          await player.filters.chipmunk();
          break;

        case 'darthvader':
          // Apply darthvader effect
          await player.filters.darthvader();
          break;

        case 'daycore':
          // Apply daycore effect
          await player.filters.daycore();
          break;

        case 'earrape':
          // Apply earrape effect
          await player.filters.earrape();
          break;

        case 'eightD':
          // Apply 8D audio effect
          await player.filters.eightD();
          break;

        case 'nightcore':
          // Apply nightcore effect
          await player.filters.nightcore();
          break;

        case 'party':
          // Apply party effect
          await player.filters.party();
          break;

        case 'radio':
          // Apply radio effect
          await player.filters.radio();
          break;

        default:
          // Apply predefined filter
          await player.filters.setFilter(filter);
          break;
      }

      console.log(`Applied ${filter} filter to player in guild ${targetServer.id}`);
    } catch (err) {
      console.error('Failed to apply audio filter:', err);
    }

    this.callNextAction(cache); // Continue to the next action
  },

  mod() {}
};
