# HMon — Hydroponics Monitoring App

Mobile application for the Erasmus+ project **"Hydroponics, AI and IoT for Sustainable
Education"** (2024-1-PT01-KA220-SCH-000248303), developed with Bahçeşehir University (BAU).

The app collects all data required by the HAI project protocol and stores it in a common
cloud database (Firebase), enabling performance tracking and cross-country comparison
among participating schools.

## Features (mapped to the specification)


| Spec section              | Feature                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. IoT sensor integration | Live dashboard + Sensors tab showing time-series of pH, EC, TDS, water temperature, ambient temperature, ambient humidity, and the binary water-level status. IoT devices write directly to the cloud (see *IoT ingestion* below); a manual entry form serves as backup.                                                                                                                                                              |
| 2. Manual data entry      | Phenotyping forms for plants **P1–P10**: plant height (cm), stem length (cm), leaf number, leaf area (cm²), shoot number. Scheduled on **Mondays, Wednesdays and Fridays** — 18 measurement points over the 6-week (42-day) period. Weekly Monday lighting log: light type, daily light duration, light–plant distance, zone light levels (left/center/right), and categorical plant issues (none, leaf burn, stretching, yellowing). |
| 3. Image management       | Weekly Monday photo session: **11 photos** per system (1 overview + 10 plant close-ups P1–P10), uploaded to Cloud Storage under a structured, tagged path ready for AI image analysis and the BAU leaf-area application.                                                                                                                                                                                                              |
| 4. Analytics & database   | All data consolidates into one Firestore database keyed by experiment, with metadata (school, country, system ID, cultivar such as *Lactuca sativa* L. var. *capitata* or *Brassica rapa* subsp. *rapa*, start date) for accurate cross-country variable tracking. Standardized datasets can be exported with the Firebase CLI or BigQuery integration.                                                                               |


## Tech stack

- [Expo](https://expo.dev) / React Native (TypeScript) — runs on Android, iOS and web
- Firebase **Firestore** (structured time-series + form data)
- Firebase **Cloud Storage** (photos)
- Firebase **Anonymous Auth** (so security rules can require a signed-in client)

## Getting started

```bash
cd HMonApp
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app (Android/iOS) or press `w` for web.

### Publish to Google Play & App Store

The project is configured for **EAS Build** (Android + iPhone). Follow the step-by-step guide:

**→ [PUBLISHING.md](PUBLISHING.md)** — accounts, `eas build`, Play Console, App Store Connect, privacy policy, checklists.

Quick start after creating an Expo account:

```bash
npm install -g eas-cli
eas login
eas init
eas build --platform all --profile production
```

## Connecting the cloud (required for data storage)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web app** to the project and copy its config object.
3. Paste the values into `src/lib/firebaseConfig.ts`.
4. In the console enable:
  - **Authentication → Sign-in method → Anonymous**
  - **Firestore Database** (production mode)
  - **Storage**
5. Suggested security rules (require an authenticated client):

```
// Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /experiments/{experimentId}/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /experiments/{experimentId} {
      allow read, write: if request.auth != null;
    }
  }
}

// Storage
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /experiments/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Cloud data model

```
experiments/{experimentId}                     school, country, systemId, cultivar, startDate
  sensorReadings/{autoId}                      timestamp, ph, ec, tds, waterTempC,
                                               ambientTempC, ambientHumidityPct,
                                               waterLevelOk (bool), source: iot|manual
  phenotype/{autoId}                           date, week, measurementPoint (1..18),
                                               plantId (P1..P10), plantHeightCm, stemLengthCm,
                                               leafCount, leafAreaCm2, shootCount
  lightingLogs/{autoId}                        date, week, lightType, dailyLightHours,
                                               lightPlantDistanceCm,
                                               zoneLightLevels {left, center, right},
                                               plantIssue (none|leaf_burn|stretching|yellowing)
  photos/{autoId}                              date, week, kind (overview|plant), plantId,
                                               storagePath, downloadUrl, largestLeafAreaCm2
```

Photo files live in Cloud Storage at:

```
experiments/{experimentId}/week-{n}/{yyyy-mm-dd}_{overview|P1..P10}.jpg
```

Each file also carries `customMetadata` tags (`experimentId`, `week`, `date`, `kind`,
`plantId`) so AI pipelines can query and process images without touching Firestore.

## IoT ingestion (automatic sensor data)

IoT controllers (e.g. ESP32) can write readings directly to Firestore through its REST
API — no server needed:

```
POST https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/experiments/EXPERIMENT_ID/sensorReadings
Content-Type: application/json

{
  "fields": {
    "timestamp":          {"integerValue": "1753628400000"},
    "ph":                 {"doubleValue": 6.1},
    "ec":                 {"doubleValue": 1.8},
    "tds":                {"doubleValue": 900},
    "waterTempC":         {"doubleValue": 21.5},
    "ambientTempC":       {"doubleValue": 24.0},
    "ambientHumidityPct": {"doubleValue": 55},
    "waterLevelOk":       {"booleanValue": true},
    "source":             {"stringValue": "iot"}
  }
}
```

Authenticate the device with an API key restricted to Firestore plus an auth token, or
route through a Cloud Function if you prefer per-device secrets. Readings appear live on
the app dashboard the moment they are written.

## Leaf-area AI integration (BAU photo application)

Uploaded photos include a `largestLeafAreaCm2: null` field in their Firestore metadata.
The BAU photo-analysis application (or any AI pipeline) can list images from Storage,
compute the largest-leaf area, and write the result back to the matching
`experiments/{id}/photos/{docId}` document — the standardized dataset then contains both
manual and AI-computed leaf areas.

## Exporting standardized datasets for AI analysis

- One-off export: `gcloud firestore export gs://YOUR_BUCKET/exports`
- Continuous analytics: enable the **Firestore → BigQuery** extension and query/export
CSVs for cross-country comparison.

