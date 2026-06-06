# Background music

The 🎵 button plays background music. By default it uses a built-in **generative
synth loop** (no file needed). To use your own track instead:

## Use your own track

1. Get a short, loopable, **royalty-free** track (see sources below).
2. Name it **`background.mp3`** and put it in this folder:
   ```
   public/music/background.mp3
   ```
3. Refresh the page and press 🎵. The app loads `/music/background.mp3` and plays
   it on loop; if the file is missing it automatically falls back to the synth.

That's it — no code changes. (Want a different filename/format like `.ogg`, or a
volume tweak? Adjust `MUSIC_ASSET` / `MUSIC_FILE_VOLUME` in
`src/lib/audio/soundManager.ts`.)

## SFX overrides

This folder can also hold real-file replacements for individual sound effects.
Each override is registered in the `SFX_ASSETS` map in
`src/lib/audio/soundManager.ts` (volume: `SFX_FILE_VOLUME`); a registered key
plays the file instead of the synthesized blip and falls back to the synth when
the file is missing. Currently registered:

- `round_start.mp3` → the `roundStart` effect (new round begins)
- `drum_roll.mp3` → verdict suspense loop (`startDrumRoll`/`stopDrumRoll`,
  volume: `DRUM_ROLL_VOLUME`); plays while the judge deliberates and stops the
  moment the verdict is disclosed

Tips for a good loop:
- Keep it **calm and low-key** so it doesn't fight the debate text.
- Pick a clip that **loops seamlessly** (or fade the ends).
- ~1–3 minutes is plenty since it loops.
- Compress to a reasonable bitrate (~128kbps) to keep the download small.

## Where to find royalty-free music

Free (check the license/attribution terms for each track):
- **Pixabay Music** — https://pixabay.com/music/ (royalty-free, no attribution)
- **Incompetech (Kevin MacLeod)** — https://incompetech.com/music/ (CC-BY, credit required)
- **Free Music Archive** — https://freemusicarchive.org/
- **YouTube Audio Library** — https://www.youtube.com/audiolibrary (in YT Studio)
- **OpenGameArt** — https://opengameart.org/ (great for chiptune/arcade loops)
- **Chosic** — https://www.chosic.com/free-music/all/

Paid / subscription (higher quality, simple licensing):
- **Epidemic Sound**, **Artlist**, **Soundstripe**

Search terms that fit this app: *"lofi chill loop"*, *"chiptune ambient"*,
*"arcade background loop"*, *"focus study loop"*.

> Don't commit copyrighted music to the repo. `background.mp3` is fine for local
> use; for deployment make sure you have the rights to the track.
