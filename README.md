Discord Music Bot
A feature-rich Discord music bot built with Lavalink integration for high-quality music playback and stream management.
Features
Music Playback Controls

Play/Pause: Control playback of current track
Resume: Continue playing paused music
Skip: Move to the next track in queue
Shuffle: Randomize the current queue
Stop: Stop playback and clear queue
Volume Control: Adjust playback volume
Rewind: Restart current track
Loop: Toggle track/queue repeat
Autoplay: Automatically play related tracks when queue ends

System Features

Lavalink server integration for stable audio streaming
Queue management system
Track information storage and retrieval
Automatic voice channel connection handling

Events
The bot responds to the following events:
Player Changed
Triggers when:

Loop status changes
Playback is paused/resumed
Volume is adjusted
Track position is changed (seek)

Queue Finish
Triggers when:

The music queue has completed
No more tracks are available to play

Track Start
Triggers when:

A new track begins playing
Provides track information and status updates

Technical Details
Prerequisites

Node.js
Discord.js
Lavalink server
Discord Bot Token
