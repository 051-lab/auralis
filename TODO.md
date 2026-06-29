# Auralis — Improvement Todo

A prioritized task list derived from a full code review. Items are grouped by
priority and tagged with the files they touch. Checkboxes are ready for use.

Legend: [P0]=critical/safety, [P1]=high, [P2]=medium, [P3]=polish.

---

## P0 — Audio safety & correctness

- [x] **Add a master limiter to the signal chain.**
  Insert `Tone.Limiter(-1)` (and optionally a `Tone.Compressor`) between
  `autoPanner` and `Tone.Destination`. This is the single most important fix
  before any public demo — four oscillators + reverb + panning clip easily.
  Files: `src/lib/audioEngine.ts`

- [x] **Add a master volume control to the UI.**
  `setMasterVolume()` already exists in the engine but is never wired up.
  Add a slider in the transport section; default to a safe level.
  Files: `src/app/page.tsx`, `src/lib/audioEngine.ts`, `src/store/useAuralisStore.ts`

- [x] **Reimplement tremolo as true amplitude modulation.**
  Current design *adds* the LFO output to `gain.gain` (raising volume) instead
  of modulating around the base gain. Replace with a multiplicative stage
  (e.g. a `Tone.Gain` whose `gain` is driven by the LFO, or use `Tone.Tremolo`).
  Verify: enabling tremolo no longer increases loudness; depth=0 is silent
  modulation, depth=1 is full AM. This fixes the documented "volume jumps."
  Files: `src/lib/audioEngine.ts`

- [x] **Properly disconnect/reset tremolo LFO on disable.**
  `lfo.stop()` leaves a held DC value in the gain path. Disconnect the LFO
  (or use a fresh node) so the base gain is fully restored after disable.
  Files: `src/lib/audioEngine.ts`

- [x] **Make binaural mode defeat reverb + auto-panner (manual activation path).**
  NARROWED after commits `d61c261`/`88f7cb5`: the new built-in curated presets
  (Gamma/Alpha/Theta/Delta in `useAuralisStore.ts`) already carry
  `autoPannerRate: 0`, `autoPannerDepth: 0`, low `reverbWet` — so loading one is
  binaural-safe. BUT the manual brainwave buttons (`activateBinaural` in
  `page.tsx`) only snapshot/restore *oscillators* via `binauralSnapshotRef`,
  not masterFX. So clicking a brainwave preset while reverb/auto-panner are
  active still undermines the beat. Fix: have `activateBinaural` also snapshot
  masterFX and force reverb wet→0 / auto-panner depth→0, restoring on exit.
  Files: `src/app/page.tsx`

---

## P1 — Bugs & UX correctness

- [x] **Fix timer double-stop.**
  `handleTimerComplete` calls `fadeOutAndStop(10)` AND `onStop()` (which calls
  `fadeOutAndStop(2)` again), and fires `trackAudioStop` twice. Either let the
  timer own the full stop path, or have `onStop` skip if already fading.
  Files: `src/components/Timer.tsx`, `src/app/page.tsx`

- [x] **Rewrite timer interval to use a single interval + ref.**
  Current effect recreates `setInterval` every second (because `remaining` is a
  dependency). Use a ref to hold the latest remaining and one stable interval.
  Files: `src/components/Timer.tsx`

- [x] **Diff-apply the engine sync effect.**
  The sync `useEffect` in `page.tsx` re-applies *all* params for *all* oscillators
  on any single change, and calls `setTremoloEnabled` each time (can fight the
  tremolo state machine). Apply only changed values, or debounce.
  Files: `src/app/page.tsx`

- [x] **Remove duplicate Plausible script loading.**
  `layout.tsx` injects Plausible via `next/script` AND `analytics.ts` injects it
  again via `document.createElement`. Pick one (recommend `next/script` only,
  and have `analytics.ts` only push events).
  Files: `src/app/layout.tsx`, `src/lib/analytics.ts`

- [x] **Delete or wire up `useAnalytics.ts`.**
  Currently dead code. Either use it for route-change tracking or remove it.
  Files: `src/lib/useAnalytics.ts`

- [x] **Align UI control bounds with store/engine bounds.**
  PARTIALLY STALE after `88f7cb5`: auto-panner rate clamp is now `0`–`20` in
  both store and engine (was `0.01`–`20`), so the lower bound is fixed at the
  data layer. Still mismatched:
  - Auto-panner rate number input in `page.tsx` is min 0.1 / max 2 — engine
    allows 0–20.
  - Tremolo rate slider in `OscillatorPanel.tsx` is 0.5–10; store/engine allow
    0.1–30.
  Make the UI bounds match the (now consistent) data-layer bounds.
  Files: `src/components/OscillatorPanel.tsx`, `src/app/page.tsx`

- [x] **Fix `fadeOutAndStop` stale-state resolution.**
  It resolves via `window.setTimeout`; if the engine is started/stopped again
  during the window, the promise resolves against stale state. Use `Tone.now()`
  scheduling or a cancellation token.
  Files: `src/lib/audioEngine.ts`

- [x] **Restore oscillator state on "Exit Binaural Mode".**
  DONE in `d61c261`. `activateBinaural` snapshots oscillators into
  `binauralSnapshotRef` (page.tsx:306); `exitBinaural` (page.tsx:324-343)
  restores all 7 params. (Note: masterFX is NOT snapshotted — see P0-5.)
  Files: `src/app/page.tsx`

- [x] **Add the missing `public/` directory + OG image.**
  `layout.tsx` references `/og-image.png` which doesn't exist. Add `public/`,
  a real `og-image.png`, a favicon, `robots.txt`, and a web manifest.
  Files: `public/*`, `src/app/layout.tsx`

---

## P2 — Quality & maintainability

- [x] **Add a test runner + unit tests for `audioMath.ts`.**
  Log/linear frequency conversion is pure and trivial to test. Add Vitest
  (or Jest) and cover `linearToLogFrequency` / `logFrequencyToLinear` round-trips,
  `formatFrequency`, and the store's `normalize*` functions.
  Files: `package.json`, `src/utils/audioMath.test.ts` (new)

- [x] **Add a CI workflow.**
  No `.github/workflows`. Add one that runs `npm run lint`, `npm run build`,
  and tests on push/PR.
  Files: `.github/workflows/ci.yml` (new)

- [x] **Consolidate `clamp` into one shared util.**
  Currently defined in `audioEngine.ts`, `useAuralisStore.ts`, `page.tsx`, and
  `OscillatorPanel.tsx`. Move to `src/utils/audioMath.ts` (or a new
  `src/utils/math.ts`) and import everywhere.
  Files: all four above

- [x] **Replace `NodeJS.Timeout` with a browser-safe type in `Timer.tsx`.**
  Use `ReturnType<typeof setInterval>`.
  Files: `src/components/Timer.tsx`

- [x] **Make the Visualizer canvas DPR-aware and responsive.**
  Fixed 800×450 backing store is blurry on retina. Size the canvas to its
  container × `devicePixelRatio` and handle resize.
  Files: `src/components/Visualizer.tsx`

- [x] **Add preset versioning + migration.**
  `SharedPresetPayload` has an optional `version` but it's ignored. Persisted
  presets have no migration path. Define a current version and a migrate()
  function. Also cap stored preset count/size.
  Files: `src/store/useAuralisStore.ts`

- [x] **Compress share URLs and enforce length limits.**
  Base64 JSON in `?preset=` can exceed URL limits. Use a compact encoding
  (e.g. pako gzip + base64url) and warn if too long.
  Files: `src/app/page.tsx`

- [x] **Add reverb decay / size controls.**
  Currently only `wet` is exposed. Add decay (and optionally preDelay) for a
  real "sound lab."
  Files: `src/lib/audioEngine.ts`, `src/app/page.tsx`, `src/store/useAuralisStore.ts`

- [x] **Remove duplicated `isRecording` state.**
  It exists as both local component state and store state; the store value is
  unused. Keep one source of truth.
  Files: `src/app/page.tsx`, `src/store/useAuralisStore.ts`

- [x] **Add a LICENSE file.**
  Public repo with no license is "all rights reserved" by default. Add MIT
  (or chosen) LICENSE.
  Files: `LICENSE` (new)

- [x] **Guard the AudioEngine singleton against HMR re-instantiation.**
  Store the instance on `globalThis` in dev so HMR doesn't build a second
  Tone graph.
  Files: `src/lib/audioEngine.ts`

---

## P3 — Polish & productization

- [x] **Accessibility pass.**
  - Add `aria-label` to icon-only buttons (▶ Start, ■ Stop, ● Record, etc.).
  - Add `aria-label` to range sliders that only have a paired number input.
  - Ensure state is not communicated by color alone (REC indicator, status dot).
  - Add `focus-visible` outlines and keyboard shortcuts (space=play/stop, R=record).
  Files: `src/app/page.tsx`, `src/components/*.tsx`

- [x] **Add keyboard shortcuts.**
  Space = play/stop, R = record toggle, Esc = exit binaural, S = save preset.
  Files: `src/app/page.tsx`

- [x] **Make binaural base frequency configurable.**
  Currently hardcoded to 400 Hz in `activateBinaural(400, ...)`. Add a small
  input or preset.
  Files: `src/app/page.tsx`

- [x] **Clean up unused env var.**
  `NEXT_PUBLIC_APP_URL` is documented but never read. Either use it (e.g. in
  metadata) or remove from `.env.example`.
  Files: `.env.example`, `src/app/layout.tsx`

- [x] **Add a short dev timer option for testing.**
  README suggests this. Add e.g. a 10s/30s option gated to dev.
  Files: `src/components/Timer.tsx`

- [x] **Single source of truth for app version.**
  Footer hardcodes "v1.0". Read from `package.json` version.
  Files: `src/app/page.tsx`

- [x] **Reconsider the split `distDir`.**
  `next.config.js` uses `.next` in dev and `.next-build` in prod. Add a
  comment explaining why, or simplify to the default.
  Files: `next.config.js`

- [x] **Add a "render dry" export option.**
  Recorder currently captures post-reverb/post-panner only. Optional dry mix
  export would be a useful power-user feature.
  Files: `src/lib/audioEngine.ts`, `src/app/page.tsx`

- [x] **Onboarding / safety copy.**
  Add headphone + volume safety warnings and a brief onboarding hint, per the
  README's own milestone plan.
  Files: `src/app/page.tsx`

---

## Done / N/A

(Use this section to record completed items or things decided against.)
