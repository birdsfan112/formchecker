# FormChecker Architecture Research

**Date:** 2026-04-04
**Purpose:** Reference document for architectural decisions on the FormChecker project — a single-file HTML fitness PWA using MediaPipe Pose for real-time bodyweight exercise form analysis, running entirely in-browser on mobile (primarily iOS Safari).

---

## 1. MediaPipe Pose Performance on Mobile

### Model Architecture

FormChecker uses the legacy MediaPipe JavaScript Solutions (`Pose` class, loaded via CDN script tag), which bundles BlazePose. BlazePose runs a two-stage pipeline:
1. **Pose detector** — lightweight network that locates the person in the frame (runs every N frames)
2. **Pose landmark model** — extracts 33 3D landmarks from the detected region (runs every frame in tracking mode)

Three model complexity variants exist: `0` (Lite), `1` (Full), `2` (Heavy). FormChecker should use `0` or `1` on mobile.

### Frame Rate Reality

Published numbers from Google's BlazePose paper and TensorFlow.js blog:
- **Lite model on Pixel 2 (2017 hardware):** ~31 FPS via CPU
- **Full model via WebGL GPU:** 25–30 FPS on mid-range Android
- **WASM backend (no GPU):** 10–15 FPS on mid-range mobile

Real-world experience diverges from these numbers. Community reports (GitHub issues, forum posts) show:
- iPhone 12 and newer: 25–30 FPS sustained with GPU backend
- iPhone X / older: 15–20 FPS, degrades to 10–15 FPS under thermal load
- The frame-throttling approach FormChecker already uses (4-frame idle / 2-frame active cycles) meaningfully reduces GPU pressure — this is the right call

**Practical guidance:** Do not assume 30 FPS. Design rep detection, form analysis, and voice gating around 15–20 FPS as a floor. Everything that depends on frame count (e.g., consecutive-frame direction filtering) should use wall-clock time or a conservative FPS assumption of 15, not 30.

### CPU vs. GPU Backend

The legacy MediaPipe JS Solutions use WebGL by default on supported devices. On iOS:
- **WebGL is available** via Safari's WebKit engine (OpenGL ES 3.0 on most iPhones)
- **Metal is not directly accessible** from web JavaScript
- If WebGL fails or is unavailable, the library falls back to WASM/CPU

CPU-only inference is significantly slower and generates more heat. You cannot directly control which backend is chosen in the legacy solutions API — it auto-selects. The newer MediaPipe Tasks API gives explicit backend control but requires refactoring the integration.

### Thermal Throttling

Thermal throttling is the dominant performance variable in sustained workouts. Research on mobile SoCs shows:
- Throttling begins at **~40°C** CPU temperature
- By **47°C**, big-core cluster frequency is capped below 50% of maximum
- At **56°C**, emergency shutdown protocols engage

For FormChecker's use case (5–10 minute workout sessions with camera always on), thermal throttling is not theoretical — it is expected. What this means in practice:
- **Minutes 1–3:** Full-speed inference, 25–30 FPS
- **Minutes 4–8:** Throttling begins, 15–20 FPS, possible landmark jitter increase
- **Minutes 8+:** Sustained low performance, ~10–15 FPS

**Mitigation strategies already in FormChecker:**
- Frame skip cycling (idle vs. active modes) — correct approach
- Canvas context reset only on dimension change — correct approach

**Additional mitigations to consider:**
- Reduce `modelComplexity` to `0` (Lite) if not already — the Full model runs at half the speed for modest accuracy gains in the angle-based analysis use case
- Skipping frames more aggressively (3-frame or 4-frame cycle) during rest periods is already done; consider also reducing after ~7 minutes of continuous use if a "workout duration" counter exists

### Landmark Accuracy at Distance (6+ Feet)

Published research ([PMC accuracy study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11644880/)) on MediaPipe Pose for physical exercise evaluation reports:
- Mean joint coordinate error: **~0.097 m** (about 10 cm) across all joints
- Mean joint angle error: **~10°** across all joints

These are average errors. For the joints FormChecker uses most (shoulders, elbows, hips, knees), errors vary:
- **Hips and shoulders:** Tend to be more accurate (~5–7° typical) because they're large landmarks usually visible
- **Wrists and ankles:** More error-prone (~10–15°) due to smaller size, faster movement, and frequent occlusion
- **Fingertip landmarks (17–22):** Lowest reliability, especially at 6+ feet — well below 0.5 visibility score routinely

**At 6 feet specifically:** Camera resolution limits the landmark region to a small pixel area. Lesson 7 in CLAUDE.md documents the empirical finding: loosen thresholds (visibility 0.5, not 0.65) when working with wrist/hand landmarks at distance. This is consistent with the published error data.

**Angle error implications:**
- FormChecker uses angle thresholds for rep detection and form cues
- A 10° average error means thresholds tighter than ±10° from a biomechanical ideal will produce false positives in both directions
- The existing practice of using ±12° buffers on calibrated thresholds is well-grounded

### Visibility Score Reliability

The `visibility` value (0.0–1.0) is a model confidence estimate, not a ground-truth occludedness signal. Key behaviors:
- **Not monotonic with actual visibility** — a landmark can be physically visible but have low score if the model is uncertain (e.g., unusual clothing, camera angle)
- **Useful as a gate, not a filter** — use `visibility < 0.5` as a hard discard, but do not use graduated weights on visibility values
- **Jitter artifact:** When a landmark repeatedly crosses the visibility threshold (e.g., 0.48–0.52), analysis toggles rapidly. Use hysteresis: require `visibility > 0.6` to activate and `visibility < 0.4` to deactivate, not a single crossing threshold

### Jitter Characteristics

Jitter in the legacy MediaPipe Pose solution has two sources:
1. **Model uncertainty** — the neural net produces slightly different outputs for nearly identical frames
2. **Tracking mode edge cases** — when the pose detector re-runs (every N frames), the landmark region can shift

Empirically (GitHub issue #4507 and FormChecker's own Lesson 15): single-frame jitter of 3–5° is routine. This is why:
- Direction reversal detection requires N=3 consecutive frames (FormChecker already does this)
- Raw angle thresholds need ±4° dead zone minimum
- The `smoothLandmarks` flag in the legacy API was the smoothing control — it is `true` by default in the `Pose` class, which applies a 1-Euro filter. Even with smoothing, 1–3° noise remains on active limbs.

---

## 2. Single-File PWA Architecture: Limits and Thresholds

### When a Single File Works Well

FormChecker's single-file architecture is a deliberate constraint. It works well when:
- Total file size stays under **500 KB** (HTML + inlined CSS + inlined JS, no assets)
- The app has no build step (no bundling, no transpiling)
- Caching strategy is simple (browser HTTP cache or manual `?v=N` busting)
- Debugging happens via browser DevTools on desktop (the file is readable)
- The team is one developer (no merge conflicts in a 3000-line file)

### Size Thresholds to Watch

| File size | Status |
|-----------|--------|
| < 200 KB | No concerns |
| 200–500 KB | Still fine; browser parses JS synchronously at load |
| 500 KB–1 MB | Parse time becomes noticeable on low-end phones (~100–200ms) |
| 1–2 MB | Real user impact on first load, hard-refresh pain |
| > 2 MB | Should split; inline assets are the likely culprit |

The main risk is **inlined data URLs for images or audio**. A single base64-encoded image can add hundreds of KB. FormChecker draws silhouettes programmatically on canvas (no image assets), which is the right call.

### Where Single-File Breaks Down

**Caching:** HTTP caching treats the file as one unit. Change one line of CSS and the entire 500 KB JS re-downloads. Service workers can work around this but add complexity. The current `?v=N` approach (Lesson 5) is adequate for a single-developer project — just remember to bump it.

**PWA manifest limitations:** A true PWA installable from the home screen requires a separate `manifest.json` and at least one service worker JS file. You cannot embed these in `index.html`. If home screen installation and offline support become important, these files must be extracted. This is the single biggest structural constraint of single-file architecture for PWA purposes.

**Debugging on mobile:** The single-file approach makes it impossible to use source maps. On desktop this is fine (readable source). On mobile, errors in the console show line numbers in a 3000+ line file — manageable but tedious.

**Service worker registration:** A service worker must be a separate file. If FormChecker ever needs offline support (e.g., CDN-loaded MediaPipe is unavailable), the worker and a cached version of the CDN assets must be externalized. GitHub Pages can host these files alongside `index.html`.

### What Should Stay Single-File vs. What Should Be Extracted

**Keep inlined:**
- All application CSS
- All application JavaScript logic
- HTML structure

**Must be extracted if needed:**
- `manifest.json` — required for PWA install prompt
- `sw.js` — required for service worker / offline caching
- Any file > ~100 KB that changes infrequently (e.g., a large JSON exercise database)

**iOS-specific note:** iOS Safari's 50 MB Cache API quota per partition means a service worker caching the full MediaPipe CDN assets would consume a significant chunk. The CDN-loaded approach (no local cache of ML model) is fine as long as connectivity is assumed.

---

## 3. iOS Safari Constraints

### Web Speech API: Gesture Unlock

iOS Safari restricts the Web Speech API (both `SpeechSynthesis` and `SpeechRecognition`) behind a user gesture requirement. This is not a bug — it is intentional browser policy to prevent autoplay audio.

**The constraint:**
- `speechSynthesis.speak()` will silently fail if called before the user has interacted with the page
- Even after a gesture, if the audio session lapses (e.g., device lock, backgrounding), the unlock may need to be re-acquired

**FormChecker's mitigation (already implemented):** A `touchstart`/`click` event listener speaks a zero-length or silent utterance to "prime" the audio pipeline. This is correct and robust. Do not remove it. If the app is ever modified to start immediately on load (e.g., auto-start on camera detection), this unlock must still fire first.

**Edge case to watch:** If the user backgrounds the app mid-workout and returns, the Web Speech unlock may need to be re-fired. The symptom is voice cues silently failing (no error thrown). Robust approach: wrap every `speechSynthesis.speak()` call with a check that re-fires the unlock utterance if `speechSynthesis.speaking === false` and `state.audioUnlocked === true` suggests it was already unlocked.

### Camera: HTTPS Requirement

`getUserMedia()` (camera access) requires a secure context on iOS Safari. Secure means:
- `https://` (valid or self-signed cert)
- `localhost` on desktop (not applicable for phone access)

**ngrok behavior (Lesson 3):** ngrok must point to the HTTP (port 8080) upstream, not HTTPS. ngrok handles TLS termination itself. Pointing it at port 8443 causes double-TLS and connection errors.

**GitHub Pages:** Serves over HTTPS — no setup needed. Camera permission works out of the box.

**Camera permission persistence:** iOS Safari re-prompts for camera permission on every page load if the origin is not "trusted" (i.e., not added to home screen). After adding to home screen, permissions persist within a session but may reset between launches depending on iOS version and privacy settings. There is no programmatic way to check in advance whether permission will be granted.

### PWA Installation Limitations on iOS

| Feature | iOS Status (2025) |
|---------|-------------------|
| Add to home screen | Manual only — no install prompt API (`beforeinstallprompt` not supported) |
| Push notifications | Supported (iOS 16.4+), requires home screen install, no silent push |
| Background sync | Not supported |
| Persistent storage | 50 MB quota, may be cleared if app unused for weeks |
| Standalone window | Supported — hides browser chrome when launched from home screen |
| EU region | Standalone mode removed under DMA (iOS 17.4+); PWAs open in Safari tab |
| Screen orientation lock | Not supported in PWA context |

**FormChecker implication:** Do not rely on push notifications for workout reminders. LocalStorage (Phase 4 persistence) is the right storage mechanism. Be aware that iOS may evict LocalStorage after weeks of inactivity — this affects the workout log. IndexedDB has slightly better persistence guarantees but the same eviction risk.

### Safari WebGL Context Loss

This is a well-documented and ongoing bug that directly affects FormChecker.

**The bug:** When Safari is backgrounded (user switches apps, locks screen, notification overlay appears), the WebGL context is destroyed. When the user returns, MediaPipe's GPU inference pipeline no longer has a valid rendering context. The result is either a frozen canvas or an uncaught exception.

**Scope:** Affects iOS 17+ on iPhone (a partial fix shipped in Safari 17.1 for iPad but the iPhone fix was incomplete as of 2024). Safari 26 beta (2026) reportedly addresses more WebGL issues, but active testing on production iOS is required before relying on this.

**Mitigation pattern:**
```javascript
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  // Stop pose.send() loop
  // Show user message: "Session paused — tap to resume"
});

canvas.addEventListener('webglcontextrestored', () => {
  // Reinitialize MediaPipe Pose object
  // Restart camera feed
});
```

MediaPipe does not auto-recover from context loss. The entire `Pose` instance must be re-created. This is a significant reliability concern for a workout app where backgrounding (checking a note, pausing music) is a natural user behavior.

**Workaround status:** No fully reliable workaround exists as of early 2026. The best UX is graceful detection + a "Resume" button that reinitializes the pipeline rather than a cryptic blank screen.

### Additional iOS Safari Bugs Relevant to FormChecker

- **Canvas resize memory leak (WebKit bug #219780):** Resizing a canvas with an active WebGL context leaks GPU memory. FormChecker's mitigation (Lesson 11: skip canvas context resets when dimensions haven't changed) directly addresses this. Do not add code that resizes the canvas dynamically.
- **`ImageBitmap` not supported:** The legacy MediaPipe solutions may pass `ImageBitmap` objects internally; this caused black canvas issues with SelfieSegmentation. Pose is generally less affected, but upgrading to MediaPipe Tasks (which has explicit iOS Safari support improvements) would reduce this risk.
- **Audio session conflicts:** Web Speech API and background music (e.g., Spotify) compete for the audio session on iOS. The `playsinline` attribute and audio context management affect whether they coexist. The current approach of using `SpeechSynthesis` (not Web Audio API) is generally compatible with background music, but volume can be unpredictable.

---

## 4. Accessibility Patterns for Fitness PWAs

### Audio Coaching as Primary Accessibility Mechanism

FormChecker's voice coaching is not just a UX feature — it is the primary accessibility mechanism for users who cannot read on-screen text at 6 feet while exercising. This reframes audio coaching as infrastructure, not polish.

**Implications for the cue system:**
- Every critical state change (set start, rep count, form error) should have an audio path
- Audio cues should not assume the user is looking at the screen
- The rep count should be spoken periodically (every 5 reps is already done; consider a spoken count on request via gesture)

### Screen Reader Considerations

Real-time canvas-based fitness apps are inherently inaccessible to screen readers. The canvas element is opaque to accessibility trees — VoiceOver (iOS) and TalkBack (Android) cannot read landmark coordinates or rep counts from a canvas.

**Mitigation options:**
1. **ARIA live regions:** A visually hidden `<div aria-live="polite">` updated with rep counts and form cues gives screen readers something to announce. This is low-cost and high-impact.
   ```html
   <div id="a11y-announcer" aria-live="polite" aria-atomic="true"
        style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
   </div>
   ```
   Update this div with each rep count and each form cue. Screen readers will announce it. This does not conflict with visual rendering.
2. **`role="status"` for current exercise and set count** — static elements, not real-time, but helps orientation
3. **Do not add `aria-hidden="true"` to the canvas** unless you provide a full text alternative (you don't)

**WCAG 2.2 relevance for FormChecker:**
- **1.4.3 (Contrast Minimum):** The on-screen feedback text (angle hints, form cues) should meet 4.5:1 contrast ratio. Text-shadow on white text over a live camera feed is unreliable — consider a semi-transparent background strip behind text instead.
- **2.1.1 (Keyboard):** Not directly relevant for a touch/camera app, but gesture-alternative controls (on-screen buttons for palm gesture actions) already address this.
- **2.3.1 (Three Flashes):** The yellow flash on counter reset (Phase 2) could trigger photosensitivity issues if it exceeds 3 flashes per second. A single 200ms flash is fine; verify it does not repeat.

### Motor and Visual Impairment Considerations

**One-handed use:** The palm gesture start (requiring raising a hand) may be difficult for users with upper-body limitations. The existing "Ready" button is the correct accessible fallback — keep it.

**Low vision at exercise distance:** At 6+ feet, standard-size UI text is illegible. FormChecker already uses 28px bold for feedback text. The minimum readable size at 6 feet for a phone screen is approximately 24px at 1x pixel density. For high-density screens (most iPhones), 28px CSS pixels renders at 56–84 physical pixels — readable.

**Colorblindness:** Green/yellow/red form score colors (Phase 3) convey meaning through color alone. Add a secondary indicator (icon or text label: "Good", "Okay", "Needs Work") so the signal is not color-dependent. The SVG silhouette green tint for alignment confirmation has the same issue — add a text "Aligned" indicator.

---

## 5. Privacy Patterns for On-Device Camera Processing

### The Key Privacy Advantage

FormChecker's architecture is inherently privacy-preserving: **no video frames leave the device**. MediaPipe Pose inference runs in the browser using WebGL/WASM. The camera stream (`getUserMedia`) feeds directly into the MediaPipe pipeline without being encoded, transmitted, or stored. Even the pose landmark data (33 x/y/z/visibility coordinates per frame) is never sent anywhere — it is consumed in-memory by the JavaScript analysis layer.

This is not merely a design choice; it is a regulatory and trust asset.

### GDPR Relevance

Under GDPR, camera data is personal data (and potentially biometric data under Article 9). Key rules:

**What triggers GDPR obligations:**
- Processing personal data of EU residents, regardless of where the app is hosted
- "Processing" includes capturing, analyzing, and storing camera data — even transiently in RAM

**What FormChecker must have if it ever collects user data beyond camera:**
- A lawful basis for processing (for a free personal tool: "legitimate interest" or "consent")
- A clear privacy policy stating what data is processed, where, and for how long
- A mechanism for data subjects to request deletion

**What FormChecker does NOT need for on-device-only processing:**
- Explicit consent to analyze camera frames (the frames are never persisted or transmitted)
- Data processing agreements with third parties (there are no third parties receiving data)
- GDPR Article 30 records of processing activities (as a solo developer, likely under the SME exemption)

**The workout log (LocalStorage) is in scope:** Workout history (reps, sets, exercise names, timestamps) stored in LocalStorage constitutes personal data. If this data is ever synced to a server, full GDPR obligations apply.

### CCPA Relevance

CCPA applies to for-profit businesses exceeding revenue/data thresholds. For a personal-use or small-monetization scenario:
- A developer earning under $25M/year and processing data for fewer than 100,000 California consumers is **exempt**
- If FormChecker monetizes and grows, the threshold is crossed; at that point CCPA requires a "Do Not Sell My Personal Information" mechanism

For practical purposes: CCPA is not currently relevant but becomes relevant at monetization scale.

### Camera Data: What "On-Device Only" Means in Practice

**What never leaves the device:**
- Raw video frames from `getUserMedia`
- MediaPipe pose landmarks (x, y, z, visibility per landmark per frame)
- Computed joint angles used for rep counting and form analysis

**What could leave the device if not careful:**
- Workout logs exported as JSON/CSV — user-initiated, user's responsibility
- Any future analytics integration (do not add Google Analytics or similar without disclosing it)
- Error logs — if a future error reporting tool (Sentry, etc.) is added, ensure it does not capture landmark data or video frames

### User-Facing Privacy Communication

Trust is built proactively, not reactively. Users are increasingly suspicious of apps requesting camera access. Recommended practices:

1. **Permission rationale before prompt:** Before `getUserMedia()` fires, display a one-sentence explanation: "FormChecker uses your camera to detect body position. No video is recorded or transmitted." This reduces permission-denial rates and sets accurate expectations.

2. **"Camera stays on your device" indicator:** A persistent badge (small icon + "On-device only") in the UI reinforces this. Inspired by Apple's camera indicator light pattern — visible, passive reassurance.

3. **No analytics by default:** If analytics are ever added, use privacy-respecting options (Plausible, Fathom, or self-hosted) that do not use cookies or fingerprinting, and disclose this in a privacy policy.

4. **Privacy policy requirement:** Even for a personal tool hosted on GitHub Pages, if it becomes public and processes EU user data, a privacy policy is legally required under GDPR. A simple one-page static HTML file covering: what data is processed (locally only), what is stored (LocalStorage, user-initiated exports), and contact information satisfies the basic requirement.

### Health Data Classification

**HIPAA:** Applies to "covered entities" (healthcare providers, insurers) and their business associates. A fitness PWA with no healthcare provider relationship is **not a covered entity** and HIPAA does not apply.

**GDPR Article 9 (special category data):** Body position data from MediaPipe is arguably not "health data" under Article 9 because it does not reveal health conditions — it reveals movement patterns. Workout logs (reps, exercises) are borderline. The conservative interpretation (treat workout data as health-adjacent) is appropriate for any public-facing version.

---

## 6. Monetization Patterns for Fitness PWAs

### The PWA Monetization Advantage

PWAs bypass app store distribution, which eliminates:
- **Apple App Store commission:** 15–30% of every transaction
- **Google Play commission:** 15–30% (15% for first $1M/year)
- **App store review delays:** 1–7 days per update

On a $5/month subscription, this is $0.75–$1.50/month per user returned to the developer. At scale this is significant.

**The tradeoff:** No app store discoverability. A PWA must acquire users through other channels (SEO, social, word of mouth, content marketing).

### Payment Infrastructure for PWAs

**Recommended stack:**
- **Stripe** — best-in-class for developer experience; handles subscriptions, one-time purchases, SCA compliance, and the Payment Request API integration. No fixed monthly fee; 2.9% + $0.30 per transaction.
- **Payment Request API** — browser native checkout flow, supports Apple Pay in Safari and Google Pay in Chrome. Reduces checkout friction (no card number entry for users with Apple Pay). Supported in Safari since 2016; Chrome since 2017.

**Important Apple Pay nuance:** Apple Pay via Safari PWA charges no Apple commission (unlike in-app purchases in native iOS apps). A user paying $10/month via Apple Pay on your PWA pays you $10 minus Stripe's fee (~$0.59), not 30% to Apple. This is a significant structural advantage.

**Backend requirement:** Any payment flow requires a server-side component to create Stripe PaymentIntents and validate webhooks. This breaks the "no backend" architecture. Options:
- **Serverless functions** (Cloudflare Workers, Vercel Edge Functions, Netlify Functions) — minimal backend, no infrastructure management, cold-start ~50ms
- **Firebase Functions** — ties to Google ecosystem but has generous free tier
- A payment integration cannot be done safely client-side only (Stripe secret keys cannot be exposed in browser code)

### Monetization Models Ranked for FormChecker's Context

#### 1. Freemium + Premium Subscription (Recommended)

**Free tier:** Full rep counting, form analysis, voice coaching, workout log — everything Phase 1–4 provides. Users experience real value.

**Premium tier ($4–8/month or $30–50/year):** Phase 5+ features:
- Full exercise library (beyond the 4 current exercises)
- AI-generated workout programs
- Progress analytics beyond the 7-day chart
- Template sharing or community features
- Calibration profiles (multiple users on one device)

**Conversion rate benchmark:** 2–5% for well-designed freemium; fitness apps with genuine free value and clear upgrade moments trend toward 3–4%. At 1,000 monthly active users: 30–40 paying users.

**Trial strategy:** 14-day free trial of premium with no credit card (removes friction, builds trust). Apps using this pattern show 45%+ trial-to-paid conversion in the fitness category.

#### 2. One-Time Purchase (Viable Alternative)

**$10–20 one-time** for premium features. Works well for utility apps where users are skeptical of recurring charges. Less predictable revenue but simpler tax treatment and no churn management.

**Consideration:** One-time purchase removes the upgrade pressure but also removes the retention mechanism. Without a subscription renewal, users have no financial reason to re-engage after going inactive.

#### 3. Donation / Pay-What-You-Want

Platforms like Ko-fi or Buy Me a Coffee require no backend integration (they handle payments). Good fit for a personal-project phase before building payment infrastructure. Conversion rates are low (< 1%) but zero marginal cost.

#### 4. What Does Not Work for PWAs

- **App Store in-app purchases:** Not available without building a native wrapper (React Native, Capacitor) around the PWA. Adding a wrapper defeats most of the architectural simplicity.
- **Advertising:** Requires significant traffic (100K+ monthly sessions) before ad revenue is material. Ads in a workout app are a poor UX fit — the user is exercising, not browsing.
- **Data monetization:** Selling workout data or analytics to third parties. Legally complex, ethically problematic, and incompatible with the privacy-first positioning. Do not pursue.

### UX Patterns for the Upgrade Moment

The most effective upgrade moment in fitness apps is **at the point of genuine friction**: the user has done 3 sets of squats and wants to do Bulgarian split squats, but that exercise is premium. Show the upgrade prompt in context, not as a popup on launch.

Key UX principles from 2025 data:
- **Show value before asking for payment** — let users experience the core loop before any paywall
- **2–3 tiers max** — decision paralysis is real; fitness users are already mentally taxed from exercising
- **Annual plan discount (typically 40–50% off monthly rate)** drives higher LTV and lower churn
- **No credit card for trial** — removes the #1 conversion barrier

### Pricing Reference Points (2025 Market)

| Product | Price |
|---------|-------|
| Strava (basic fitness tracking) | $11.99/month |
| Freeletics (AI workout coach) | $17.99/month |
| Nike Training Club | Free (removed premium tier 2020) |
| Fitbod (personalized lifting) | $12.99/month or $79.99/year |
| FormChecker suggested starting price | $4.99/month or $34.99/year |

FormChecker's on-device AI positioning justifies a premium price for privacy-conscious users; the suggested starting price is conservative and can be raised if retention data supports it.

---

## Summary and Recommendations

### Critical Findings

1. **WebGL context loss on iOS backgrounding is the top reliability risk.** Implement `webglcontextlost` / `webglcontextrestored` event handlers before any public release. The bug is well-documented in Safari 17+ and has no complete Apple fix as of early 2026.

2. **Thermal throttling degrades performance in minutes 4–8 of a workout.** Frame rate assumptions in rep detection should be conservative (15 FPS floor). Consecutive-frame direction filtering (already implemented at N=3) is the correct mitigation.

3. **10° mean joint angle error at typical distances** is the noise floor of MediaPipe Pose. Any form analysis threshold tighter than ±8° from a target angle will produce false positives. The existing ±12° buffer is appropriate.

4. **PWA manifest and service worker require separate files.** Single-file architecture cannot support home-screen installability or offline caching without extracting at minimum `manifest.json` and `sw.js`.

5. **iOS camera permission resets between sessions** unless the app is installed to the home screen. This is expected browser behavior, not a bug to fix.

### Recommended Actions by Phase

**Before any Phase 5 work:**
- Add `webglcontextlost` / `webglcontextrestored` handlers
- Add ARIA live region for rep count announcements (one `<div>`, two lines of JS)
- Add pre-permission camera rationale text

**For home screen installation (optional but improves stickiness):**
- Extract `manifest.json` and add `<link rel="manifest">` to `index.html`
- Minimum viable manifest: `name`, `short_name`, `start_url`, `display: standalone`, `icons` (192px + 512px)
- Note: this breaks single-file-only hosting unless `manifest.json` is committed to GitHub Pages

**For monetization (when ready):**
- Start with Ko-fi or GitHub Sponsors — zero infrastructure, validates willingness to pay
- Add Stripe + serverless functions when moving to subscription model
- Keep the current 4-exercise core free permanently; sell the exercise library expansion

**For privacy compliance:**
- Add one-sentence camera rationale before `getUserMedia()` fires
- Write a minimal privacy policy (one static HTML page)
- Do not add any third-party analytics or tracking without disclosure

---

## Sources

- [MediaPipe Holistic — Simultaneous Face, Hand and Pose Prediction, on Device](https://research.google/blog/mediapipe-holistic-simultaneous-face-hand-and-pose-prediction-on-device/)
- [On-device, Real-time Body Pose Tracking with MediaPipe BlazePose](https://research.google/blog/on-device-real-time-body-pose-tracking-with-mediapipe-blazepose/)
- [High Fidelity Pose Tracking with MediaPipe BlazePose and TensorFlow.js](https://blog.tensorflow.org/2021/05/high-fidelity-pose-tracking-with-mediapipe-blazepose-and-tfjs.html)
- [Accuracy Evaluation of 3D Pose Reconstruction Algorithms for Physical Exercises (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11644880/)
- [Pose Landmarker Jittering — MediaPipe GitHub Issue #4507](https://github.com/google/mediapipe/issues/4507)
- [YOLOv7 Pose vs MediaPipe in Human Pose Estimation — LearnOpenCV](https://learnopencv.com/yolov7-pose-vs-mediapipe-in-human-pose-estimation/)
- [WebGL context get lost on iOS if Safari went into background — MediaPipe GitHub Issue #5122](https://github.com/google-ai-edge/mediapipe/issues/5122)
- [WebGL: context lost error when backgrounding Safari — Apple Developer Forums](https://developer.apple.com/forums/thread/737042)
- [Resizing on-screen WebGL canvas in iOS Safari causes memory leak — WebKit bug #219780](https://bugs.webkit.org/show_bug.cgi?id=219780)
- [Supporting iOS Safari for a website using MediaPipe ML models — Medium](https://julien-decharentenay.medium.com/supporting-ios-safari-for-a-website-using-mediapipe-ml-models-canvas-mediastreams-and-webm-e3423514f7e6)
- [PWA iOS Limitations and Safari Support 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [PWA on iOS — Current Status & Limitations — Brainhub](https://brainhub.eu/library/pwa-on-ios)
- [iOS PWA Compatibility — firt.dev](https://firt.dev/notes/pwa-ios/)
- [What is the Service Worker Cache Storage Limit? — love2dev](https://love2dev.com/blog/what-is-the-service-worker-cache-storage-limit/)
- [Storage for the web — web.dev](https://web.dev/storage-for-the-web/)
- [Mitigating Interactive Performance Degradation from Mobile Device Thermal Throttling — IEEE Xplore](https://ieeexplore.ieee.org/document/9081929)
- [GDPR Compliance for Fitness Apps — GDPR Advisor](https://www.gdpr-advisor.com/gdpr-compliance-for-fitness-apps-safeguarding-personal-health-information/)
- [On General Data Protection Regulation Vulnerabilities and Privacy Issues for Wearable Devices — MDPI](https://www.mdpi.com/2410-387X/5/4/29)
- [On-Device AI and Security — Microsoft Tech Community](https://techcommunity.microsoft.com/blog/surfaceitpro/on-device-ai-and-security-what-really-matters-for-the-enterprise/4424458)
- [Payment Request API for online purchases in PWAs — NearForm](https://www.nearform.com/blog/payment-request-api-for-online-purchases-in-pwas/)
- [Pricing for Progressive Web Apps: Mobile-First Monetization Strategies — Monetizely](https://www.getmonetizely.com/articles/pricing-for-progressive-web-apps-mobile-first-monetization-strategies)
- [Top Fitness App Paywalls (UX Patterns + Pricing Insights) — DEV Community](https://dev.to/paywallpro/top-fitness-app-paywalls-ux-patterns-pricing-insights-2868)
- [State of Subscription Apps 2025 — RevenueCat](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- [Mobile accessibility checklist — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Mobile_accessibility_checklist)
- [Privacy-First AI: How to Implement AI Video Security Without Compromising Data Privacy — Lumana](https://www.lumana.ai/blog/privacy-first-ai-how-to-implement-ai-video-security-without-compromising-data-privacy)
- [MediaPipe Pose Detection: Real-Time Performance Analysis — Hackaday.io](https://lb.lax.hackaday.io/project/203704/log/242569-mediapipe-pose-detection-real-time-performance-analysis)
