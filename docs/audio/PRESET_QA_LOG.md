# Auralis Preset Listening QA Log

Automated checks cover metadata, ranges, serialization, and incompatible movement in binaural presets. Listening remains required because comfort, timbre, perceived loudness, width, and fatigue are subjective.

## Test Method

1. Use a quiet environment and begin with the operating-system output low.
2. Test Auralis master volume at approximately 25%, 50%, then 70% only if comfortable.
3. Use stereo headphones for binaural presets. Test speakers only for non-binaural presets.
4. Observe input peak, output peak, RMS, and limiter reduction throughout each test.
5. Listen for clicks, abrupt level jumps, harsh brightness, excessive width or motion, and masking of carrier tones.
6. Stop immediately if discomfort, pressure, dizziness, headache, or fatigue occurs.
7. Record an objective observation rather than a therapeutic conclusion.

## Pass Criteria

- No click or abrupt level jump at start, stop, preset load, or timer fade.
- No sustained input `Clip Risk` state at the default preset level.
- Limiter reduction normally remains 0 dB; brief peaks up to about 1 dB are acceptable, but sustained reduction requires retuning.
- Strict binaural presets retain an isolated hard-left/hard-right carrier pair.
- Texture and noise do not unintentionally mask the preset’s principal tones.
- Descriptions remain responsible and non-medical.

## Results

| Preset | Headphones 25/50/70% | Speakers | Input / output peak | Limiter reduction | Comfort / brightness / width / motion | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Gamma Neural Binding (40Hz) | Pending | N/A | Pending | Pending | Pending | Pending |
| Alpha Relaxed Focus (10Hz) | Pending | N/A | Pending | Pending | Pending | Pending |
| Theta Meditation Gate (6Hz) | Pending | N/A | Pending | Pending | Pending | Pending |
| Delta Sleep Descent (2Hz) | Pending | N/A | Pending | Pending | Pending | Pending |
| Soft Evening Unwind (4Hz) | Pending | N/A | Pending | Pending | Pending | Pending |
| Calm Breathing Bed (6Hz) | Pending | N/A | Pending | Pending | Pending | Pending |
| Alpha Lantern (10Hz) | Pending | N/A | Pending | Pending | Pending | Pending |
| Deep Drone Horizon | Pending | Pending | Pending | Pending | Pending | Pending |
| Soft Noise Cocoon | Pending | Pending | Pending | Pending | Pending | Pending |

## Release Decision

- [ ] Every built-in preset has a completed row.
- [ ] Any sustained limiter activity has been corrected and retested.
- [ ] No preset produces uncomfortable starts, stops, movement, or brightness at its intended level.
- [ ] Browser compatibility checks are complete on target browsers and devices.
