/**
 * Data model for the HAI (Hydroponics, AI and IoT for Sustainable Education)
 * monitoring application. Mirrors the project protocol specification.
 */

/** Plants are labelled P1..P10 in each hydroponic system. */
export const PLANT_IDS = [
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10',
] as const;
export type PlantId = (typeof PLANT_IDS)[number];

export const PLANT_ISSUES = ['none', 'leaf_burn', 'stretching', 'yellowing'] as const;
export type PlantIssue = (typeof PLANT_ISSUES)[number];

export const PLANT_ISSUE_LABELS: Record<PlantIssue, string> = {
  none: 'None',
  leaf_burn: 'Leaf burn',
  stretching: 'Stretching',
  yellowing: 'Yellowing',
};

export const CULTIVARS = [
  'Lactuca sativa L. var. capitata',
  'Brassica rapa subsp. rapa',
] as const;

/** Experiment metadata (spec section 4). */
export interface Experiment {
  id: string;
  name: string;
  school: string;
  country: string;
  systemId: string;
  cultivar: string;
  /** ISO date (yyyy-mm-dd) of day 1 of the 42-day experiment. */
  startDate: string;
  createdAt: number;
}

/**
 * One time-series record of the IoT-monitored parameters (spec section 1).
 * `source` distinguishes automatic IoT ingestion from manual backup entry.
 */
export interface SensorReading {
  id?: string;
  timestamp: number;
  ph: number | null;
  ec: number | null;
  tds: number | null;
  waterTempC: number | null;
  ambientTempC: number | null;
  ambientHumidityPct: number | null;
  waterLevelOk: boolean;
  source: 'iot' | 'manual';
}

/** One phenotyping record for one plant on one measurement day (spec section 2). */
export interface PhenotypeRecord {
  id?: string;
  /** ISO date of the measurement (a Monday, Wednesday or Friday). */
  date: string;
  /** 1-based week of the experiment (1..6). */
  week: number;
  /** 1-based measurement point (1..18). */
  measurementPoint: number;
  plantId: PlantId;
  plantHeightCm: number | null;
  stemLengthCm: number | null;
  leafCount: number | null;
  leafAreaCm2: number | null;
  shootCount: number | null;
  createdAt: number;
}

/** Weekly lighting log, recorded on Mondays (spec section 2). */
export interface LightingLog {
  id?: string;
  date: string;
  week: number;
  lightType: string;
  dailyLightHours: number | null;
  lightPlantDistanceCm: number | null;
  zoneLightLevels: {
    left: number | null;
    center: number | null;
    right: number | null;
  };
  plantIssue: PlantIssue;
  notes: string;
  createdAt: number;
}

export type PhotoKind = 'overview' | 'plant';

/**
 * Metadata for one uploaded photograph (spec section 3).
 * Files are stored in Cloud Storage under a structured, taggable path so the
 * BAU photo application and future AI pipelines can locate them.
 */
export interface PhotoRecord {
  id?: string;
  date: string;
  week: number;
  kind: PhotoKind;
  plantId: PlantId | null;
  storagePath: string;
  downloadUrl: string;
  /** Filled in later by the BAU leaf-area application / AI pipeline. */
  largestLeafAreaCm2: number | null;
  createdAt: number;
}
