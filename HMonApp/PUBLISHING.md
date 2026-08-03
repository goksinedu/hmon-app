# Publishing HMon to Android & iPhone

This guide turns the Expo project in `HMonApp` into installable **Android** and **iOS** apps and submits them to the stores.

HMon is already a React Native / Expo app. Store builds are produced with **EAS Build** (Expo Application Services) in the cloud — you do **not** need Android Studio or Xcode installed on your PC to create the binaries (you still need developer accounts).

---

## What you need

| Item | Why | Cost / notes |
| --- | --- | --- |
| [Expo](https://expo.dev) account | Cloud builds (`eas build`) | Free tier is enough to start |
| [Google Play Console](https://play.google.com/console) account | Publish Android | One-time ~US$25 registration |
| [Apple Developer Program](https://developer.apple.com/programs/) | Publish iPhone/iPad | ~US$99 / year |
| Privacy policy URL | Required by both stores | Host a short page (see template below) |
| Firebase project (optional but recommended) | Cloud sync for schools | Free Spark plan works for pilots |

---

## 1. One-time project setup

```bash
cd HMonApp
npm install

# Install EAS CLI (once per machine)
npm install -g eas-cli

# Log in to Expo
eas login

# Link this folder to an Expo project (creates/updates projectId in app.json)
eas init
```

When `eas init` finishes it replaces:

- `expo.extra.eas.projectId`
- `expo.owner`

in `app.json` with your real values. Keep those committed.

Also set a real app display name if you want (already `HMon`):

```json
"name": "HMon",
"ios": { "bundleIdentifier": "edu.bau.hmon" },
"android": { "package": "edu.bau.hmon" }
```

Do **not** change `bundleIdentifier` / `package` after the first store listing exists.

### Firebase (recommended before store launch)

1. Create a Firebase project.
2. Paste the web config into `src/lib/firebaseConfig.ts`.
3. Enable Anonymous Auth, Firestore, and Storage (see main README).

Without Firebase the app still runs in **demo / on-device** mode.

### Privacy policy (required)

Both stores ask for a public URL. Host a short page (GitHub Pages, school site, Notion public page, etc.) covering:

- What data is collected (sensor readings, plant measurements, photos, school/country metadata)
- That photos may be used for educational AI leaf-area analysis
- That data may be shared among HAI partner schools for research comparison
- Contact email for the project

A starter page is in [`docs/privacy-policy.md`](docs/privacy-policy.md) — publish it somewhere and keep the URL handy.

---

## 2. Test on a real phone (fastest path)

### Option A — Expo Go (development only)

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS). Good for UI testing; **not** what you submit to stores.

### Option B — Internal preview build (closer to production)

```bash
# Android APK you can sideload / share
eas build --platform android --profile preview

# iOS (needs Apple account; installs via TestFlight or device register)
eas build --platform ios --profile preview
```

When the build finishes, EAS shows a download / install link.

---

## 3. Production builds (store binaries)

```bash
# Android App Bundle (.aab) for Google Play
eas build --platform android --profile production

# iOS IPA for App Store Connect
eas build --platform ios --profile production

# Or both at once
eas build --platform all --profile production
```

First iOS build will walk you through Apple credentials (EAS can manage certificates and provisioning profiles for you — choose that option).

`eas.json` is set so production Android builds an **App Bundle** and auto-increments build numbers.

---

## 4. Publish to Google Play (Android)

1. Open [Google Play Console](https://play.google.com/console) → **Create app**.
2. Fill store listing:
   - Title: **HMon**
   - Short description: Hydroponics monitoring for the HAI Erasmus+ education project
   - Full description: mention IoT sensors, phenotyping P1–P10, photos, lighting logs, Results/AI tab
   - Screenshots: phone screenshots of Dashboard, Plants, Photos, Results (use a device or emulator)
   - App icon: `assets/icon.png`
   - Privacy policy URL
3. Complete **Content rating**, **Target audience**, **Data safety** (declare sensor/photo data).
4. Create a release on **Internal testing** first:
   ```bash
   eas submit --platform android --profile production
   ```
   Or upload the `.aab` from the EAS build page manually under **Production / Testing → Create release**.
5. Add testers → verify install → promote to **Closed** then **Production**.

**Package name:** `edu.bau.hmon` (must stay unique forever on Play).

---

## 5. Publish to the App Store (iPhone / iPad)

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/).
2. In [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → New App.
   - Bundle ID: `edu.bau.hmon` (create it first under Certificates, Identifiers & Profiles if needed)
   - Platforms: iOS
3. Fill listing: name **HMon**, subtitle, description, keywords, screenshots (6.7" and 6.1" recommended), privacy policy URL.
4. Under **App Privacy**, declare camera, photos, and product-interaction data.
5. Submit the build:
   ```bash
   eas submit --platform ios --profile production
   ```
   Or download the IPA / use Transporter. After the first app exists in App Store Connect, put its numeric **Apple ID** into `eas.json` → `submit.production.ios.ascAppId`.
6. Add the build to a version → **Add for Review**.
7. Expect 24–48 h for first review. Answer any questions about education use and photo uploads.

**Note:** iOS builds cannot be produced on Windows alone without EAS cloud; this project is already set up for EAS, so Windows is fine.

---

## 6. Over-the-air updates (after the first release)

For JS/asset-only fixes (no native module changes):

```bash
eas update --branch production --message "Fix Results chart labels"
```

Requires the app to be configured with `expo-updates` (optional next step). Native changes (permissions, icons, SDK upgrades) still need a new store build.

---

## 7. Versioning cheat sheet

| Field | Where | When to bump |
| --- | --- | --- |
| `expo.version` (e.g. `1.0.1`) | `app.json` | User-visible release |
| Android `versionCode` | auto via EAS `autoIncrement` | Every Play upload |
| iOS `buildNumber` | auto via EAS `autoIncrement` | Every App Store upload |

---

## 8. Store listing copy (ready to paste)

**Name:** HMon  

**Subtitle / short description:**  
Hydroponics, AI and IoT monitoring for sustainable education  

**Full description (draft):**

> HMon supports the Erasmus+ project “Hydroponics, AI and IoT for Sustainable Education” (HAI). Schools record IoT sensor readings (pH, EC, TDS, temperatures, humidity, water level), weekly phenotyping for plants P1–P10, lighting logs, and standardized plant photos. A Results tab charts growth and provides AI-assisted nutrition and lighting recommendations for the weeks ahead. Data can sync to a shared cloud database so partner countries can compare experiments.

**Category:** Education  

**Content rating:** Everyone / PEGI 3  

---

## 9. Checklist before you press Submit

- [ ] `eas init` done; real `projectId` in `app.json`
- [ ] Firebase configured **or** demo mode accepted for the pilot
- [ ] Privacy policy URL live
- [ ] Screenshots captured on phone-sized screens
- [ ] `eas build --platform android --profile production` succeeded
- [ ] `eas build --platform ios --profile production` succeeded (Apple account active)
- [ ] Internal / TestFlight testing done on at least one device each
- [ ] Store listings, data-safety / privacy forms completed

---

## Quick commands summary

```bash
cd HMonApp
npm install
eas login
eas init

# Try on device via Expo Go
npx expo start

# Preview APK / iOS build
eas build -p android --profile preview
eas build -p ios --profile preview

# Store builds
eas build -p all --profile production

# Upload to stores
eas submit -p android --profile production
eas submit -p ios --profile production
```

If a command asks for credentials, prefer **“Let Expo handle it”** unless your university IT requires managing keys manually.

For project features and Firebase details, see the main [README.md](README.md).
