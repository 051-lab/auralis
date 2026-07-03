# Auralis Development Roadmap

This roadmap turns the July 2, 2026 working note into small implementation chunks. The UI dashboard is considered stable; new work should prioritize audio quality, responsible research translation, preset usefulness, and creator workflows.

## Track 1 - Audio Safety And Listening Quality

### Chunk 1.1 - Metering Baseline

Status: Complete.

- Keep the existing limiter visible through output metering.
- Use meter feedback when tuning presets.
- Avoid adding duplicate limiters unless measurement shows a real need.

### Chunk 1.2 - Gain Staging Review

Status: Complete.

- Maintain conservative starter oscillator levels.
- Keep noise, texture, and reverb defaults below harsh output levels.
- Review new presets against the output meter before release.

### Chunk 1.3 - Listening Quality Checklist

Status: Owner QA pending.

- Automated preset QA is in place for metadata, gain range, and binaural movement conflicts.
- Test each built-in preset at low, medium, and high master volume.
- Check headphones and laptop speakers separately.
- Watch for sustained hot/limiter states.
- Keep binaural-focused presets free of stereo motion that disrupts hard-left/hard-right carriers.

## Track 2 - Modulation And Movement

### Chunk 2.1 - Modulation Model

Status: Complete.

- Add preset-safe modulation state.
- Support off, gentle, breathing, pulse, and drift movement modes.
- Add bounded modulation targets for noise filter, noise width, and oscillator pan.

### Chunk 2.2 - Engine Modulation

Status: Complete.

- Move only existing safe parameters within clamped ranges.
- Disable oscillator-pan modulation automatically during binaural mode.
- Restore base noise and pan settings when modulation is disabled.

### Chunk 2.3 - Modulation UI

Status: Complete.

- Add a compact Master Chain modulation card.
- Keep controls small and rack-like.
- Save and share modulation settings with presets.

## Track 3 - Texture Layers

### Chunk 3.1 - Texture State

Status: Complete.

- Add preset-safe texture state for rain, storm, wind, ocean, and drone.
- Store level, tone, stereo width, and motion.

### Chunk 3.2 - Procedural Texture Engine

Status: Complete.

- Add a separate texture branch into the existing master chain.
- Use filtered noise plus an optional low drone oscillator.
- Keep texture output behind its own gain stage.

### Chunk 3.3 - Texture UI

Status: Complete.

- Add a compact Master Chain texture card.
- Save and share texture settings with presets.
- Update the Signal Chain display to include Texture.

## Track 4 - Presets And Session Design

### Chunk 4.1 - Preset Expansion

Status: Complete for the current built-in set; future presets can continue incrementally.

- Continue adding purpose-built presets for relaxation, meditation-style listening, focus, ambience, and drone.
- Use responsible language: "designed around", "inspired by", "intended for", and "may support".
- Avoid claims that audio causes, heals, treats, or guarantees mental states.

### Chunk 4.2 - Preset Quality Review

Status: Engineering complete; manual listening review pending.

- Automated code-level preset checks are implemented.
- Review each built-in preset with the output meter.
- Prefer lower texture gain and narrower movement for binaural presets.
- Prefer richer texture/motion only for non-binaural ambient presets.

## Track 5 - Research Foundation

### Chunk 5.1 - Reading Roadmap

Status: Complete.

- Maintain the audio research notes under `docs/audio/`.
- Use the knowledge base as a conceptual reference only.
- Do not copy copyrighted book content into source docs.

### Chunk 5.2 - Research Notes

Status: Complete.

- Add original implementation notes for browser audio, psychoacoustics, spatial hearing, rhythm, and sound design.
- Convert notes into concrete backlog items only after they can be implemented responsibly.

## Track 6 - Creator Workflow

### Chunk 6.1 - Creator Session Metadata

Status: Complete.

- Add editable creator title, purpose, notes, and visual theme fields.
- Save/share creator metadata with presets.

### Chunk 6.2 - Creator Copy Draft

Status: Complete.

- Generate copyable creator notes with title, description, tags, and pre-export checklist.
- Keep responsible-use language in the generated copy.

### Chunk 6.3 - YouTube Content Machine

Status: Complete for the current pass.

- Add duration targets for long-form sessions. Complete.
- Add export naming templates. Complete.
- Add preset categories for sleep, focus, meditation-style, ambience, and drone. Complete.
- Add optional session storyboard notes for future visualizer recording. Complete.
- Add export-ready preset metadata. Complete.

## Track 7 - Tests And Release Gates

### Chunk 7.1 - Pure Utility Tests

Status: Complete for the current pass.

- Keep adding unit tests for preset serialization, audio math, gain staging, creator export helpers, and store normalization.
- Export helper tests are included for filename/sample-rate/WAV behavior.

### Chunk 7.2 - Browser Smoke Tests

Status: Complete.

- Add Playwright smoke tests once the audio feature set stabilizes.
- Cover start/stop, timer fade, preset load/share, recording/export, modulation controls, and texture controls.

## Low-Priority UI Polish

Status: Planned.

- Preserve the locked dashboard layout.
- Only apply micro-polish: hover states, focus states, visualizer energy, thumbnail richness, and compact spacing refinements.
- Do not restart the full layout process unless a concrete usability issue appears.
