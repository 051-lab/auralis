# Browser Audio Compatibility Checklist

This checklist is for local QA before releases or larger audio-engine changes.

## Browsers

- Chrome / Chromium desktop
- Edge desktop
- Firefox desktop
- Safari desktop if available
- Mobile Safari and Chrome Android for basic playback if available

## Audio Context

- Audio starts only after a user gesture.
- Start, stop, and restart work without console errors.
- The `Fading` state clears after manual stop and timer completion.
- Rapid start/stop clicks do not leave output stuck silent.
- Master volume changes are smooth and do not click.

## Recorder Support

- Wet export records the post-effects, post-limiter path.
- Dry export skips reverb and auto-panner but records through the dry safety limiter.
- WebM / browser-native export downloads with the expected extension.
- WAV target export renders at 44.1 kHz and 48 kHz.
- Failed decode/export paths show a non-crashing status message.

## Meter And Visualizer

- Output meter remains silent before playback.
- Output meter updates during playback and during fade-out.
- Limiter / hot indicators do not flicker wildly under normal presets.
- Visualizer starts, animates, and returns to standby without layout shifts.

## Presets And Sharing

- Built-in presets load without console errors.
- Saved presets restore oscillator, noise, master FX, metadata, and binaural flags.
- Shared preset URLs decode correctly after a hard reload.
- Old presets without newer fields load with safe defaults.

## Binaural Listening

- First binaural activation shows the headphone and low-volume acknowledgement.
- Binaural activation hard-pans the carrier pair and suppresses stereo-smearing FX.
- Exit restores the previous oscillator and master FX state.

## Notes

- Auralis is browser audio software, not medical software.
- Keep test volume low, especially when using headphones.
- Browser-native recording MIME types vary by browser; verify actual downloaded file types.
