# MathPad — Android Port Plan

Goal: bring Android to **exact parity with the current iOS app** — same screens, same
recognition, same pricing, same feel — from the one shared codebase. iOS is the
reference; nothing new is designed here, only ported.

**Status: ACTIVE.** iOS has shipped **1.2.0** (Operations + Clock, both live paid
IAPs). Android is now being built, testing on the **Android emulator** (no
physical device needed — ML Kit Digital Ink works on the emulator; it just
downloads the model over the emulator's network like any device).

**Execution order (incremental — validate each before moving on):**
1. **Addition works** — the hard milestone: Android build runs + the native
   recognition module works + Addition's full flow (write → mark → review). Once
   recognition works, it works for *every* operation (same digit/sign model).
2. **Full Operations** — verify Subtraction / Multiplication / Division / Mix:
   the borrow arrows, carry boxes, partial-product rows, long-division draft grid,
   and the live-recognition + undo behaviors, on Android.
3. **Clock** — verify the Skia clock face, the **draggable hands** (react-native-
   gesture-handler `Gesture.Pan`), and the digital "write the time" answer (same
   recognition module) on Android.
Then: IAP via Play Billing, Play Console, assets, store admin, AAB.

## Current state (what is NOT yet cross-platform)

- ~85–90% of the app is platform-agnostic JS/UI (expo-router, Skia, reanimated,
  expo-audio, expo-localization, all `lib/` + `components/` + `hooks/`) and runs
  on Android once it builds.
- **The one real gap (now implemented, needs build+test):** the custom
  recognition native module `modules/digital-ink` was iOS-only. **Android is now
  written** — `expo-module.config.json` declares `["apple","android"]`, plus
  `android/build.gradle` (ML Kit dep) and
  `android/src/main/java/expo/modules/digitalink/DigitalInkModule.kt` (Kotlin,
  mirrors the Swift API + error codes). Not yet compiled/run — that's Milestone 1.
- IAP (`usePurchases`) is **real now** (not a stub): live StoreKit for both
  `com.mc.mathpad.operations` ($9.99) and `com.mc.mathpad.clock` ($7.99).
  `expo-iap` also wraps **Google Play Billing**, so the shared hook should work on
  Android — the remaining work is Play Console products + verifying the flow, not
  new client code (see Phase 3).
- `app.json` already has an `android` block (package `com.mc.mathpad`, adaptive
  icon, `edgeToEdgeEnabled`, `predictiveBackGestureEnabled: false`), so config is
  partially there.

---

## Phase 1 — Digital-ink recognition Android module (the main work) — CODE DONE, needs build ✅🟠

**Written** (2026 Android port): the Kotlin module, `build.gradle`, and the
config are in place. Remaining: generate the Android project and build/run it on
an emulator, then confirm recognition matches iOS. The JS side is unchanged.

Mirror `modules/digital-ink/ios/DigitalInkModule.swift` in Kotlin so the JS API
is byte-for-byte identical. The JS side (`lib/recognition/index.ts`,
`hooks/useRecognition.ts`, including the `disambiguateZeroAndSix` heuristic) is
platform-agnostic and needs **no changes** — it just calls the same module.

**API to replicate exactly** (`modules/digital-ink/src/DigitalInkModule.ts`):
- `isModelDownloaded(language: string): Promise<boolean>`
- `downloadModel(language: string): Promise<void>`
- `recognize(language: string, strokes: Stroke[]): Promise<RecognitionCandidate[]>`
  - `Stroke = [x, y, t][]`; candidate = `{ text: string, score: number | null }`
  - Language tag in use: `RECOGNITION_LANGUAGE = 'en-US'` (digits + minus are
    language-independent; one model serves every locale).

**Keep the same error codes** so JS behaves identically: `E_INVALID_LANG`,
`E_MODEL_NOT_DOWNLOADED`, `E_DOWNLOAD_TIMEOUT`, `E_RECOGNIZE`. Empty stroke list
resolves `[]`.

**Steps:**
1. `modules/digital-ink/expo-module.config.json` → add Android:
   ```json
   { "platforms": ["apple", "android"],
     "apple":   { "modules": ["DigitalInkModule"] },
     "android": { "modules": ["expo.modules.digitalink.DigitalInkModule"] } }
   ```
2. Create `modules/digital-ink/android/build.gradle` with the ML Kit dependency:
   `implementation 'com.google.mlkit:digital-ink-recognition:18.1.0'` (pin the
   current stable at execution time). Apply the Expo modules Gradle plugin like
   other local modules.
3. Create `modules/digital-ink/android/src/main/java/expo/modules/digitalink/DigitalInkModule.kt`
   using the Expo Modules Kotlin DSL (`Name("DigitalInk")`, `AsyncFunction(...)`):
   - **Model id:** `DigitalInkRecognitionModelIdentifier.fromLanguageTag(language)`
     → null ⇒ reject `E_INVALID_LANG`. Wrap in `DigitalInkRecognitionModel.builder(id).build()`.
   - **isModelDownloaded:** `RemoteModelManager.getInstance().isModelDownloaded(model)`
     (returns a `Task<Boolean>`) → resolve/reject via listeners.
   - **downloadModel:** `RemoteModelManager.getInstance().download(model,
     DownloadConditions.Builder().build())` → resolve on success listener, reject
     on failure. (No manual polling needed — Android exposes a real `Task`,
     unlike the iOS poll loop; keep a timeout guard for parity.)
   - **recognize:** guard `isModelDownloaded` first (reject `E_MODEL_NOT_DOWNLOADED`),
     build `Ink` from strokes (`Ink.builder()`, `Ink.Stroke.builder()`,
     `Ink.Point.create(x, y, t)`), then `recognizer.recognize(ink)` →
     map `result.candidates` to `{ text, score }` (`candidate.score` is a
     nullable `Float`).
   - **Recognizer cache:** keep a `language → DigitalInkRecognizer` map (built
     from `DigitalInkRecognizerOptions.builder(model).build()`), mirroring the
     iOS cache, so recognizers survive the async callback.
4. Network: ML Kit model download needs INTERNET (Expo includes it by default).
   This matches iOS — it's a one-time Google ML Kit model fetch, not a backend,
   so it's consistent with the "offline, no backend" stance (note in Data Safety).

**Build & run it (no physical device — emulator is fine):**
1. `npx expo prebuild -p android` — generates `android/` and links the local
   module (it reads the updated `expo-module.config.json`).
2. Start an Android emulator (Android Studio → Device Manager → a Pixel API 34
   image), then `npx expo run:android`. Grant network so ML Kit can fetch the
   model on first run.
3. First launch downloads the model (needs internet); after that recognition is
   on-device/offline, same as iOS.

**Done when:** on the **emulator**, the model downloads on first run and
digit/sign recognition returns the same candidates as iOS for the same strokes —
proving Milestone 1 (Addition works end to end).

---

## Phase 2 — App config & native build settings 🟢

- `app.json`: confirm the `android` block — `package`, `adaptiveIcon`
  (foreground `assets/adaptive-icon.png`, bg `#5B74E8`), `edgeToEdgeEnabled`,
  `predictiveBackGestureEnabled`. Add an Android `splash` if the look differs
  from iOS (Android 12+ uses the system splash API via `expo-splash-screen`).
- `expo-build-properties` plugin currently sets only `ios.deploymentTarget`. Add
  `android` props as needed: `minSdkVersion` (≥ 21 for ML Kit), `compileSdkVersion`
  / `targetSdkVersion` to the current Play requirement, and `newArchEnabled`
  already true.
- Verify edge-to-edge insets render correctly with `react-native-safe-area-context`
  (status bar + nav bar) on Android, since `edgeToEdgeEnabled` is on.

---

## Phase 3 — IAP parity (Google Play Billing) 🟡

The real `expo-iap` implementation already shipped (iOS 1.2.0). It wraps **Google
Play Billing** as well as StoreKit, so `hooks/usePurchases.tsx` is largely shared:
- Verify product fetch (`fetchProducts`), `requestPurchase`, and restore
  (`getAvailablePurchases`) work on Android for **both** products. The success
  handler already keys on `productId` for Operations *and* Clock, so no new client
  code is expected — just confirm the Android round-trip.
- **Google Play Console** setup (mirrors App Store Connect): create **two**
  managed (one-time) products — **`com.mc.mathpad.operations`** (~$9.99) and
  **`com.mc.mathpad.clock`** (~$7.99) — plus a merchant/payments profile and
  license/closed-testing testers for sandbox purchases.
- Billing permission is added by the library/config plugin — confirm it's present.
- Note: this is **Milestone-2/3 work** — get recognition + the operation/clock
  flows running first; wire Play Billing once the app runs.

---

## Phase 4 — UI / UX parity pass (mostly testing + small fixes) 🟢

The shared UI renders on Android, but verify each against the iOS look:
- **Typography:** system font becomes **Roboto** (not SF). Check
  `constants/design.ts` sizes/line-heights don't clip or reflow; adjust per-platform
  only if needed.
- **Back navigation:** Android hardware/gesture back. expo-router handles stack
  back, but verify it on modals/dialogs (`ConfirmDialog`, the Practice leave flow,
  the writing pad) and that `predictiveBackGestureEnabled` matches intent.
- **Status bar / edge-to-edge:** light content style, correct insets top + bottom.
- **Press feedback:** Android shows ripples; confirm `Pressable`-based primitives
  (`Button`, `Card`, `IconButton`, `Pill`) look right (ripple vs the iOS opacity).
- **Shadows/elevation:** `shadows` tokens already include `elevation` — confirm
  cards/tiles read the same.
- **Audio:** `expo-audio` is cross-platform; verify the feedback sounds play and
  the (currently disabled) scratch sound stays disabled.
- **Skia + reanimated:** the hand-cursor solve, bring-down drop, borrow/carry
  animations — verify timing/visuals match iOS.
- **Clock module (Milestone 3):** the Skia `ClockFace`, the **draggable hands**
  (`SettableClock` via react-native-gesture-handler `Gesture.Pan` — verify the
  pan/drag + hand-snap feel on Android), the **pattern word-tile drag**
  (`PatternBuilder`), tick haptic/sound, and the digital "write the time" answer
  (`DigitalClockAnswer`, same recognition module). Gesture handling is the most
  likely place to differ from iOS.
- **Keyboard / haptics:** confirm tap feedback (`lib/feedback`) maps to Android.
- **Density / tablets:** check phone + tablet layouts at several densities.

---

## Phase 5 — Assets 🟢

- Adaptive icon (foreground + `#5B74E8` background) already configured — eyeball
  it on a device (round/squircle masks).
- Splash parity with the iOS rounded-logo look.
- Play Store assets: 512² icon, feature graphic, phone + tablet screenshots.

---

## Phase 6 — Google Play Console & store admin 🟢

- Google Play Console account (one-time ~$25).
- App listing (name, descriptions, screenshots) matching the App Store copy.
- **Data Safety form** — declare "no data collected" (consistent with iOS privacy
  label); note the ML Kit model download is a one-time Google fetch, not user data.
- **Content rating** (IARC questionnaire) and the **Designed for Families**
  program (target audience 5–12) — the kids equivalent of Apple's Kids Category.
- Privacy policy URL: `https://www.microclouds.ca/mathpad-privacy` (same page).
- Meet Play's current **target API level** requirement.

---

## Phase 7 — Build & test (EAS) 🟢

- Add/confirm an Android profile in `eas.json`; EAS manages the upload keystore.
- Output an **AAB** for Play. (Manual EAS build — never automated, per the
  EAS-on-request rule.)
- **Test matrix:** min-SDK + latest Android, phone + tablet, a couple of
  densities; first-run model download; full session per operation; back-gesture;
  IAP buy + restore on a Play tester account.

---

## Definition of done — "Android == iOS"

- [ ] Recognition module works on Android with identical JS API + behavior.
- [ ] Every screen/flow visually + behaviorally matches iOS (Phase 4 list).
- [ ] Operations gate + `/unlock` + purchase/restore work via Play Billing.
- [ ] Icon, splash, adaptive icon correct on device.
- [ ] No crashes across the test matrix; history + settings persist.
- [ ] Play listing, Data Safety, content rating, Families program complete.
- [ ] AAB built via EAS and submitted.

## Notes

- Keep all logic in shared `lib/` / `hooks/`; only the `modules/digital-ink`
  Android native code and any `Platform.OS` tweaks are Android-specific. Do not
  fork screens — parity means the same components, not parallel ones.
- The recognition model download requiring the network once is already true on
  iOS; it does not violate the offline/no-backend stance (no app backend, no
  analytics) — it's a Google ML Kit on-device model fetch.
