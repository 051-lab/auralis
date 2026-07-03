# Auralis Preset QA Log

This log tracks built-in preset review after the modulation and texture-layer pass.

Automated code-level QA is covered by `src/utils/presetQuality.ts` and `src/utils/presetQuality.test.ts`. Manual listening is still required because perceived loudness, brightness, motion comfort, and headphone fatigue cannot be fully validated by unit tests.

## Manual Review Method

For each built-in preset:

1. Load the preset.
2. Start at low master volume.
3. Listen on stereo headphones.
4. Watch output meter status for Safe, Hot, Limiter Active, or Clip Risk.
5. Raise to medium volume if comfortable.
6. Check laptop speakers or normal speakers where appropriate.
7. Stop immediately if the preset feels harsh, too bright, too wide, too active, or uncomfortable.
8. Record notes below.

## Preset Checklist

| Preset | Headphones | Speakers | Meter notes | Comfort notes | Status |
| --- | --- | --- | --- | --- | --- |
| Gamma Neural Binding (40Hz) | Pending | Optional | Pending | Pending | Pending |
| Alpha Relaxed Focus (10Hz) | Pending | Optional | Pending | Pending | Pending |
| Theta Meditation Gate (6Hz) | Pending | Optional | Pending | Pending | Pending |
| Delta Sleep Descent (2Hz) | Pending | Optional | Pending | Pending | Pending |
| Soft Evening Unwind (4Hz) | Pending | Optional | Pending | Pending | Pending |
| Calm Breathing Bed (6Hz) | Pending | Optional | Pending | Pending | Pending |
| Alpha Lantern (10Hz) | Pending | Optional | Pending | Pending | Pending |
| Deep Drone Horizon | Pending | Pending | Pending | Pending | Pending |
| Soft Noise Cocoon | Pending | Pending | Pending | Pending | Pending |

## Pass Criteria

- Binaural-style presets keep stereo movement minimal.
- Texture layers do not dominate carrier tones unless the preset is explicitly texture-focused.
- Meter does not sit in sustained Hot or Limiter Active state at default master volume.
- Descriptions remain responsible and non-medical.
- Preset feels comfortable enough for the intended session length at low-to-medium volume.
