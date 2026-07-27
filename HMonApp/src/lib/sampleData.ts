/**
 * Generates a realistic 2-week sample dataset for demo and training purposes:
 * an experiment that started two Mondays ago, IoT sensor readings every
 * 3 hours, P1-P10 phenotyping for the first 6 measurement points
 * (Mon/Wed/Fri x 2 weeks), the two weekly lighting logs, and sample
 * photographs for both Monday sessions (1 overview + 10 plants each).
 */
import { Asset } from 'expo-asset';

import {
  saveExperiment,
  setLightingLogs,
  setPhenotypeRecords,
  setPhotos,
  setSensorReadings,
} from './repo';
import { measurementDays, parseISODate, toISODate } from './schedule';
import {
  Experiment,
  LightingLog,
  PLANT_IDS,
  PhenotypeRecord,
  PhotoRecord,
  PlantId,
  SensorReading,
} from './types';

export const SAMPLE_EXPERIMENT_ID = 'demo-sample-2weeks';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const SAMPLE_IMAGE_MODULES = {
  w1Overview: require('../../assets/sample/w1-overview.jpg'),
  w1Plant: require('../../assets/sample/w1-plant.jpg'),
  w2Overview: require('../../assets/sample/w2-overview.jpg'),
  w2Plant: require('../../assets/sample/w2-plant.jpg'),
} as const;

/** Marker stored in downloadUrl so the UI can resolve the current bundle asset. */
export function samplePhotoKey(week: number, kind: 'overview' | 'plant'): string {
  return `sample:w${week}:${kind}`;
}

export function isSamplePhotoKey(url: string | null | undefined): boolean {
  return !!url && url.startsWith('sample:w');
}

export async function resolveSamplePhotoUrl(key: string): Promise<string> {
  const match = /^sample:w([12]):(overview|plant)$/.exec(key);
  if (!match) return '';
  const week = Number(match[1]);
  const kind = match[2] as 'overview' | 'plant';
  const mod =
    week === 1
      ? kind === 'overview'
        ? SAMPLE_IMAGE_MODULES.w1Overview
        : SAMPLE_IMAGE_MODULES.w1Plant
      : kind === 'overview'
        ? SAMPLE_IMAGE_MODULES.w2Overview
        : SAMPLE_IMAGE_MODULES.w2Plant;
  const asset = Asset.fromModule(mod);
  if (!asset.downloaded) {
    await asset.downloadAsync().catch(() => undefined);
  }
  return asset.localUri ?? asset.uri ?? '';
}

/** Deterministic pseudo-random generator so the demo data is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The Monday two weeks before the current week's Monday. */
function sampleStartDate(today = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (d.getDay() !== 1) {
    d.setTime(d.getTime() - DAY_MS);
  }
  d.setTime(d.getTime() - 14 * DAY_MS);
  return toISODate(d);
}

export function buildSampleExperiment(today = new Date()): Experiment {
  return {
    id: SAMPLE_EXPERIMENT_ID,
    name: 'Demo — 2-week lettuce trial',
    school: 'Bahçeşehir University (demo)',
    country: 'Türkiye',
    systemId: 'SYS-DEMO',
    cultivar: 'Lactuca sativa L. var. capitata',
    startDate: sampleStartDate(today),
    createdAt: Date.now(),
  };
}

function buildSensorReadings(startDate: string, rand: () => number): SensorReading[] {
  const start = parseISODate(startDate).getTime();
  const end = Math.min(Date.now(), start + 14 * DAY_MS);
  const readings: SensorReading[] = [];
  for (let t = start + 6 * HOUR_MS; t <= end; t += 3 * HOUR_MS) {
    const dayFrac = (t - start) / (14 * DAY_MS);
    const hourOfDay = new Date(t).getHours();
    const diurnal = Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);
    const ec = 1.2 + 0.55 * dayFrac + (rand() - 0.5) * 0.08;
    readings.push({
      timestamp: t,
      ph: round2(6.2 - 0.25 * dayFrac + (rand() - 0.5) * 0.12),
      ec: round2(ec),
      tds: Math.round(ec * 500 + (rand() - 0.5) * 25),
      waterTempC: round1(20 + 1.2 * diurnal + (rand() - 0.5) * 0.5),
      ambientTempC: round1(23.5 + 2.5 * diurnal + (rand() - 0.5) * 0.8),
      ambientHumidityPct: Math.round(58 - 6 * diurnal + (rand() - 0.5) * 4),
      waterLevelOk: !((t - start) % (7 * DAY_MS) > 6.2 * DAY_MS),
      source: 'iot',
    });
  }
  return readings;
}

function buildPhenotypeRecords(startDate: string, rand: () => number): PhenotypeRecord[] {
  const records: PhenotypeRecord[] = [];
  const days = measurementDays(startDate).filter((d) => d.week <= 2);
  for (const day of days) {
    for (const plantId of PLANT_IDS) {
      const vigour = 0.85 + (0.3 * ((plantId.charCodeAt(1) * 7 + plantId.length) % 10)) / 10;
      const growth = day.measurementPoint;
      records.push({
        date: day.date,
        week: day.week,
        measurementPoint: day.measurementPoint,
        plantId,
        plantHeightCm: round1((3.5 + growth * 1.4) * vigour + (rand() - 0.5) * 0.6),
        stemLengthCm: round1((1.8 + growth * 0.55) * vigour + (rand() - 0.5) * 0.3),
        leafCount: Math.max(3, Math.round((3 + growth * 0.9) * vigour + (rand() - 0.5))),
        leafAreaCm2: round1((6 + growth * 5.2) * vigour + (rand() - 0.5) * 2),
        shootCount: Math.max(1, Math.round(1 + growth * 0.25 + (rand() - 0.5) * 0.6)),
        createdAt: parseISODate(day.date).getTime() + 10 * HOUR_MS,
      });
    }
  }
  return records;
}

function buildLightingLogs(startDate: string, rand: () => number): LightingLog[] {
  const mondays = measurementDays(startDate).filter(
    (d) => d.weekday === 'Monday' && d.week <= 2,
  );
  return mondays.map((m) => ({
    date: m.date,
    week: m.week,
    lightType: 'Full-spectrum LED panel 36 W',
    dailyLightHours: 14,
    lightPlantDistanceCm: m.week === 1 ? 25 : 22,
    zoneLightLevels: {
      left: Math.round(11800 + (rand() - 0.5) * 600),
      center: Math.round(15200 + (rand() - 0.5) * 600),
      right: Math.round(12100 + (rand() - 0.5) * 600),
    },
    plantIssue: m.week === 1 ? 'none' : 'stretching',
    notes:
      m.week === 1
        ? 'All plants look healthy after transplanting.'
        : 'Slight stretching on the left zone; lowered the light panel by 3 cm.',
    createdAt: parseISODate(m.date).getTime() + 9 * HOUR_MS,
  }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildPhotos(experimentId: string, startDate: string): PhotoRecord[] {
  const mondays = measurementDays(startDate).filter(
    (d) => d.weekday === 'Monday' && d.week <= 2,
  );
  const photos: PhotoRecord[] = [];
  for (const m of mondays) {
    const slots: Array<{ kind: 'overview' | 'plant'; plantId: PlantId | null }> = [
      { kind: 'overview', plantId: null },
      ...PLANT_IDS.map((p) => ({ kind: 'plant' as const, plantId: p })),
    ];
    for (const slot of slots) {
      const fileLabel = slot.kind === 'overview' ? 'overview' : slot.plantId!;
      photos.push({
        date: m.date,
        week: m.week,
        kind: slot.kind,
        plantId: slot.plantId,
        storagePath: `experiments/${experimentId}/week-${m.week}/${m.date}_${fileLabel}.jpg`,
        // Stable key — resolved to a real asset URL when the Photos screen renders.
        downloadUrl: samplePhotoKey(m.week, slot.kind),
        largestLeafAreaCm2:
          slot.kind === 'plant'
            ? round1(8 + m.week * 4 + (slot.plantId!.charCodeAt(1) % 5))
            : null,
        createdAt: parseISODate(m.date).getTime() + 11 * HOUR_MS,
      });
    }
  }
  return photos;
}

/**
 * Creates (or resets) the demo experiment with two weeks of data.
 * Returns the experiment so the caller can make it active.
 */
export async function loadSampleData(): Promise<Experiment> {
  const rand = mulberry32(20260713);
  const experiment = buildSampleExperiment();
  // Warm asset cache so the Photos tab can resolve URLs quickly.
  await Promise.all(
    Object.values(SAMPLE_IMAGE_MODULES).map((mod) =>
      Asset.fromModule(mod).downloadAsync().catch(() => undefined),
    ),
  );
  await saveExperiment(experiment);
  await setSensorReadings(experiment.id, buildSensorReadings(experiment.startDate, rand));
  await setPhenotypeRecords(experiment.id, buildPhenotypeRecords(experiment.startDate, rand));
  await setLightingLogs(experiment.id, buildLightingLogs(experiment.startDate, rand));
  await setPhotos(experiment.id, buildPhotos(experiment.id, experiment.startDate));
  return experiment;
}
