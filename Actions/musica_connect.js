module.exports = {
  name: "LavaLinkConnect",
  displayName: "Connect to Lavalink server",
  section: "Lavalink",
  meta: {
    version: "2.1.8",
    preciseCheck: true,
    author: "Taksos",
    authorUrl: "",
  },
  fields: [
    "primaryHost",
    "primaryPort",
    "primaryPassword",
    "primarySecure",
    "backupHost",
    "backupPort",
    "backupPassword",
    "backupSecure",
    "enableQueueEndEvent",
    "enablePlayerMoveEvent",
  ],
  subtitle(data) {
    return `Connect to Lavalink: ${data.primaryHost}:${data.primaryPort}`;
  },
  variableStorage(data, varType) {
    return ``;
  },
  html() {
    return `
      <div style="padding: 10px;">
        <div style="padding: 10px; background: #2c2f33; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #ffffff; text-align: center;">Primary Lavalink Server</h3>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Host:</label>
            <input id="primaryHost" class="round" type="text" style="width: 100%; margin-top: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Port:</label>
            <input id="primaryPort" class="round" type="text" style="width: 100%; margin-top: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Password:</label>
            <input id="primaryPassword" class="round" type="password" style="width: 100%; margin-top: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Secure (true/false):</label>
            <select id="primarySecure" class="round" style="width: 100%; margin-top: 5px;">
              <option value="true">True</option>
              <option value="false" selected>False</option>
            </select>
          </div>
        </div>

        <div style="padding: 10px; background: #2c2f33; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #ffffff; text-align: center;">Backup Lavalink Server</h3>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Host:</label>
            <input id="backupHost" class="round" type="text" style="width: 100%; margin-top: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Port:</label>
            <input id="backupPort" class="round" type="text" style="width: 100%; margin-top: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Password:</label>
            <input id="backupPassword" class="round" type="password" style="width: 100%; margin-top: 5px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Secure (true/false):</label>
            <select id="backupSecure" class="round" style="width: 100%; margin-top: 5px;">
              <option value="true">True</option>
              <option value="false" selected>False</option>
            </select>
          </div>
        </div>

        <div style="padding: 10px; background: #2c2f33; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #ffffff; text-align: center;">Event Settings</h3>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Disconnect on Queue End:</label>
            <select id="enableQueueEndEvent" class="round" style="width: 100%; margin-top: 5px;">
              <option value="true" selected>Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div style="margin-bottom: 10px;">
            <label style="color: #ffffff; font-weight: bold;">Disconnect on Move:</label>
            <select id="enablePlayerMoveEvent" class="round" style="width: 100%; margin-top: 5px;">
              <option value="true" selected>Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </div>

      <style>
        div[style*="padding: 10px;"] {
          max-height: 400px;
          overflow-y: auto;
        }
      </style>
    `;
  },
  init() {},
  async action(cache) {
    try {
      const { MessageEmbed } = require("discord.js");
      const { Manager } = require("magmastream");
      const client = this.getDBM().Bot.bot;
    
      const data = cache.actions[cache.index];
      
      const primaryNode = {
        host: this.evalMessage(data.primaryHost, cache),
        port: parseInt(this.evalMessage(data.primaryPort, cache)),
        password: this.evalMessage(data.primaryPassword, cache),
        secure: this.evalMessage(data.primarySecure, cache).toLowerCase() === "true",
        identifier: "primary",
      };
      
      const backupNode = {
        host: this.evalMessage(data.backupHost, cache),
        port: parseInt(this.evalMessage(data.backupPort, cache)),
        password: this.evalMessage(data.backupPassword, cache),
        secure: this.evalMessage(data.backupSecure, cache).toLowerCase() === "true",
        identifier: "backup",
      };
    
      const enableQueueEndEvent = this.evalMessage(data.enableQueueEndEvent, cache).toLowerCase() === "true";
      const enablePlayerMoveEvent = this.evalMessage(data.enablePlayerMoveEvent, cache).toLowerCase() === "true";
    
      let currentNode = primaryNode;
      let isUsingBackup = false;
    
      const initializeManager = () => {
        try {
          const managerOptions = {
            nodes: [currentNode],
            autoPlay: true, // Explicitly set autoPlay to false
            send: (id, payload) => {
              const guild = client.guilds.cache.get(id);
              if (guild) guild.shard.send(payload);
            },
          };

          console.log('Initializing manager with options:', managerOptions);
          client.manager = new Manager(managerOptions);
    
          client.manager.on("nodeConnect", (node) => {
            console.log(`Node "${node.options.identifier}" connected.`);
            if (node.options.identifier === "primary" && isUsingBackup) {
              console.log("Switched back to the primary node.");
              isUsingBackup = false;
            }
          });
    
          client.manager.on("nodeError", (node, error) => {
            console.error(`Node "${node.options.identifier}" encountered an error:`, error);
            if (node.options.identifier === "primary" && !isUsingBackup) {
              console.log("Primary node failed. Switching to backup node...");
              currentNode = backupNode;
              isUsingBackup = true;
              reconnectManager();
            } else if (isUsingBackup) {
              console.log("Backup node failed. Attempting to reconnect to primary...");
              currentNode = primaryNode;
              isUsingBackup = false;
              reconnectManager();
            }
          });
    
          if (enableQueueEndEvent) {
            client.manager.on("queueEnd", (player) => {
              console.log(`Queue ended for guild: ${player.guild}`);
              player.destroy();
            });
          }
    
          if (enablePlayerMoveEvent) {
            client.manager.on("playerMove", (player, oldChannel, newChannel) => {
              if (!newChannel) {
                console.log(`Player disconnected in guild: ${player.guild}`);
                player.destroy();
              }
            });
          }
    
          client.on("raw", (d) => client.manager.updateVoiceState(d));
          client.manager.init(client.user.id);
    
          if (isUsingBackup) {
            schedulePrimaryReconnectCheck();
          }
        } catch (error) {
          console.error("Error initializing manager:", error);
          throw error;
        }
      };
    
      const reconnectManager = () => {
        try {
          if (client.manager) {
            client.manager.destroy();
          }
          initializeManager();
        } catch (error) {
          console.error("Error during reconnection:", error);
        }
      };
    
      const schedulePrimaryReconnectCheck = () => {
        const interval = Math.floor(Math.random() * (1200000 - 600000 + 1)) + 600000;
        setTimeout(async () => {
          if (isUsingBackup) {
            console.log("Checking primary node status...");
            try {
              const testManagerOptions = {
                nodes: [primaryNode],
                autoPlay: true, // Explicitly set autoPlay to false here too
                send: () => {},
              };
              
              const primaryTestManager = new Manager(testManagerOptions);
              await primaryTestManager.nodes[0].connect();
              console.log("Primary node is back online. Switching...");
              currentNode = primaryNode;
              reconnectManager();
            } catch (error) {
              console.log("Primary node still unavailable. Scheduling next check...");
              schedulePrimaryReconnectCheck();
            }
          }
        }, interval);
      };

      initializeManager();
      this.callNextAction(cache);
      
    } catch (error) {
      console.error("Error in LavaLinkConnect action:", error);
      this.callNextAction(cache);
    }
  },
  
  mod() {},
};