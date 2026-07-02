# Auralis Preset Design Guide

This guide defines how Auralis presets should be designed, named, described, and reviewed. It favors useful sound design and responsible language over claims about medical or neurological outcomes.

## Preset Naming Principles

Good preset names should:

- Describe the sound or intended listening context.
- Avoid medical or guaranteed-result language.
- Mention rhythm-band inspiration only when the design actually uses that beat relationship.
- Stay understandable without hidden theory.

Preferred patterns:

- `Delta-Inspired Sleep Descent`
- `Theta-Inspired Meditation Bed`
- `Alpha-Inspired Soft Focus`
- `Low Drone With Brown Noise`
- `Calm Stereo Texture`

Avoid:

- `Cure Anxiety`
- `Guaranteed Deep Sleep`
- `Instant Theta Brainwave`
- `Healing Frequency`
- `Trauma Release Tone`

## Frequency Selection Principles

General:

- Use exact frequencies intentionally, not because they are popular online.
- Keep base tones comfortable, especially for headphone use.
- Avoid stacking many high-gain tones in the same frequency region.
- Use low frequencies carefully because small speakers/headphones may distort.
- Use high frequencies sparingly because they can become fatiguing.

For binaural-style presets:

- Use two primary tones panned hard left and right.
- Beat difference equals right frequency minus left frequency.
- Keep additional oscillators off or very low unless they serve a clear support role.
- Avoid reverb and auto-panning on strict binaural pairs.
- Include headphone guidance.

## Gain Balance Principles

- Start quieter than expected.
- Leave headroom for noise, reverb, and modulation.
- Avoid all four oscillators at high gain unless there is strong limiting and metering.
- Treat square and sawtooth waves as perceptually stronger than sine waves.
- Use support tones at lower gain than the primary tone pair.

Suggested starting points:

- Primary sine pair: 0.35-0.6 each
- Support drone: 0.03-0.15
- Noise bed: 0.05-0.18
- Master volume: 0.5-0.65

## Noise Layer Use

Noise can:

- Mask abrupt tonal edges.
- Add softness and body.
- Reduce the starkness of pure tones.
- Provide a stable bed for ambient presets.

Guidelines:

- Brown noise works well for darker, softer beds.
- Pink noise works well for balanced broad texture.
- White noise should be used carefully and usually at lower gain.
- Do not let noise mask the primary binaural pair in beat-focused presets.

Future preset design should consider filtered noise once filter controls exist.

## Reverb Use

Reverb can:

- Add spaciousness.
- Smooth isolated tones.
- Make ambient presets feel less clinical.

Guidelines:

- Use low wet values for frequency-precise presets.
- Use higher decay only when the preset is explicitly ambient.
- Avoid reverb for strict binaural beat presentation.
- Watch for smeared transients and increased loudness.

## Stereo and Pan Use

Pan can:

- Separate binaural pairs.
- Give layered presets width.
- Reduce masking between tones.

Guidelines:

- Hard left/right is appropriate for binaural tone pairs.
- Center support tones should be low gain.
- Avoid rapid movement for rest-oriented presets.
- Use auto-panner only when motion is part of the design.

## Tremolo Use

Tremolo can:

- Add slow movement.
- Create rhythmic pulse.
- Make static tones more organic.

Guidelines:

- Use low depth for subtle motion.
- Use slower rates for rest and ambient presets.
- Use faster rates carefully; they can feel rough or distracting.
- Do not stack strong tremolo on every oscillator unless the preset is intentionally rhythmic.

## Binaural Preset Language

Use:

- "Designed around a 10 Hz interaural difference."
- "Alpha-inspired focus context."
- "Intended for headphone listening."
- "May support a calm focus session for some listeners."

Avoid:

- "Puts your brain into alpha."
- "Causes theta."
- "Guaranteed entrainment."
- "Treats anxiety."
- "Heals sleep problems."

## What Not to Claim

Auralis presets must not claim to:

- Diagnose, treat, cure, or prevent any condition.
- Force a brain state.
- Guarantee sleep, focus, relaxation, insight, or healing.
- Replace medical care.
- Produce the same result for all listeners.

## Responsible Preset Descriptions

A good preset description should include:

- Sonic design summary.
- Intended listening context.
- Headphone recommendation when relevant.
- Volume/safety note when useful.
- Conservative outcome language.

Example:

```text
Designed around a 10 Hz left/right frequency difference with a low brown-noise bed.
Intended for quiet headphone focus sessions. Start at low volume and stop if the sound feels uncomfortable.
```

## Example Preset Templates

### Sleep / Delta-Inspired

Purpose:

- Slow, quiet, minimal motion.

Suggested design:

- Oscillator 1: low base tone, hard left
- Oscillator 2: base + 2 Hz, hard right
- Oscillator 3: very low support tone or off
- Oscillator 4: off
- Noise: brown, low gain
- Reverb: low-to-moderate, soft decay
- Auto-panner: off

Description language:

- "Delta-inspired low-frequency difference for a quiet rest context."

### Meditation / Theta-Inspired

Purpose:

- Calm, stable, spacious, not overly bright.

Suggested design:

- Oscillator pair with 4-8 Hz difference
- Soft sine or triangle support tone
- Pink or brown noise at low gain
- Low reverb
- Auto-panner off for binaural focus, shallow motion only for non-binaural variants

Description language:

- "Theta-inspired listening bed intended for quiet meditation practice."

### Focus / Alpha-Inspired

Purpose:

- Gentle alertness without aggressive brightness.

Suggested design:

- Oscillator pair with around 8-12 Hz difference
- Moderate base frequency
- Low support harmonic
- Brown or pink noise at very low gain
- Reverb low
- Auto-panner off or very subtle in non-binaural variants

Description language:

- "Alpha-inspired tone pair intended for calm focus with headphones."

### Alertness / Beta-Inspired

Purpose:

- Brighter and more active, but not harsh.

Suggested design:

- Beat difference around 13-20 Hz
- Lower gain than calmer presets because faster beating can feel more intense
- Minimal noise
- Minimal reverb
- Avoid fast auto-panning

Description language:

- "Beta-inspired rhythmic difference for short alert listening sessions."

### Insight / Gamma-Inspired

Purpose:

- Experimental, clear, precise, short-session listening.

Suggested design:

- Beat difference around 30-40 Hz
- Primary pair only or very low support layers
- Noise low enough not to mask the pair
- Reverb and auto-panning off

Description language:

- "Gamma-inspired 40 Hz interaural difference for experimental headphone listening."

### Ambient Relaxation

Purpose:

- Pleasant, spacious, non-clinical sound bed.

Suggested design:

- Multiple low-gain oscillators
- Gentle triangle/sine mix
- Brown or pink noise
- Moderate reverb
- Slow auto-panner depth

Description language:

- "Soft ambient texture intended for relaxed background listening."

### Deep Drone

Purpose:

- Stable, grounded, minimal movement.

Suggested design:

- One or two low-frequency tones
- Support octave or fifth at low gain
- Brown noise optional
- Reverb low to moderate
- Tremolo off or very shallow

Description language:

- "Low drone texture designed for steady, minimal listening."

### Soft Noise Bed

Purpose:

- Non-tonal background masking.

Suggested design:

- Oscillators off or very low
- Brown or pink noise primary
- Future filter controls should shape brightness
- Reverb low
- No binaural claims

Description language:

- "Soft broadband noise bed intended to mask environmental distractions at comfortable volume."
