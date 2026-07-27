/**
 * Data repository: all reads/writes go through here.
 *
 * When Firebase is configured, data lives in Firestore + Cloud Storage.
 * When it is not (demo/offline mode), the same operations transparently use
 * the on-device local store instead, so the app remains fully usable.
 *
 * Firestore layout (one common database consolidating every school/system,
 * enabling cross-country comparison as required by the spec):
 *
 *   experiments/{experimentId}                     - metadata (school, country, cultivar...)
 *   experiments/{experimentId}/sensorReadings/{id} - IoT + manual time-series
 *   experiments/{experimentId}/phenotype/{id}      - per-plant P1..P10 measurements
 *   experiments/{experimentId}/lightingLogs/{id}   - weekly Monday lighting logs
 *   experiments/{experimentId}/photos/{id}         - photo metadata + storage path
 *
 * Storage layout (structured & tagged for future AI image analysis):
 *
 *   experiments/{experimentId}/week-{n}/{yyyy-mm-dd}_{overview|P1..P10}.jpg
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { ensureSignedIn, firebaseReady, getDb, getStorageRef } from './firebase';
import * as local from './localStore';
import {
  Experiment,
  LightingLog,
  PhenotypeRecord,
  PhotoRecord,
  SensorReading,
} from './types';

const EXPERIMENTS_KEY = 'index';

// ---------------------------------------------------------------- experiments

export async function saveExperiment(exp: Experiment): Promise<void> {
  if (!firebaseReady()) {
    const all = await local.readAll<Experiment>(EXPERIMENTS_KEY, 'experiments');
    const others = all.filter((e) => e.id !== exp.id);
    await local.replaceAll(EXPERIMENTS_KEY, 'experiments', [...others, exp]);
    return;
  }
  await ensureSignedIn();
  const { id, ...data } = exp;
  await setDoc(doc(getDb(), 'experiments', id), data, { merge: true });
}

export async function listExperiments(): Promise<Experiment[]> {
  if (!firebaseReady()) {
    const all = await local.readAll<Experiment>(EXPERIMENTS_KEY, 'experiments');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }
  await ensureSignedIn();
  const snap = await getDocs(
    query(collection(getDb(), 'experiments'), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Experiment, 'id'>) }));
}

// ------------------------------------------------------------ sensor readings

export async function addSensorReading(
  experimentId: string,
  reading: SensorReading,
): Promise<void> {
  if (!firebaseReady()) {
    await local.add(experimentId, 'sensorReadings', reading);
    return;
  }
  await ensureSignedIn();
  await addDoc(collection(getDb(), 'experiments', experimentId, 'sensorReadings'), reading);
}

/** Bulk insert used by the sample-data seeder (local mode writes once). */
export async function setSensorReadings(
  experimentId: string,
  readings: SensorReading[],
): Promise<void> {
  if (!firebaseReady()) {
    await local.replaceAll(experimentId, 'sensorReadings', readings);
    return;
  }
  for (const r of readings) {
    await addSensorReading(experimentId, r);
  }
}

/** Live subscription to the most recent sensor readings (IoT + manual). */
export function watchSensorReadings(
  experimentId: string,
  count: number,
  onData: (readings: SensorReading[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  if (!firebaseReady()) {
    local
      .readAll<SensorReading>(experimentId, 'sensorReadings')
      .then((rs) => onData(rs.sort((a, b) => b.timestamp - a.timestamp).slice(0, count)))
      .catch((e) => onError(e instanceof Error ? e : new Error(String(e))));
    return () => {};
  }
  const q = query(
    collection(getDb(), 'experiments', experimentId, 'sensorReadings'),
    orderBy('timestamp', 'desc'),
    limit(count),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SensorReading, 'id'>) })));
    },
    onError,
  );
}

// ---------------------------------------------------------------- phenotyping

export async function addPhenotypeRecord(
  experimentId: string,
  record: PhenotypeRecord,
): Promise<void> {
  if (!firebaseReady()) {
    await local.add(experimentId, 'phenotype', record);
    return;
  }
  await ensureSignedIn();
  await addDoc(collection(getDb(), 'experiments', experimentId, 'phenotype'), record);
}

/** Bulk insert used by the sample-data seeder (local mode writes once). */
export async function setPhenotypeRecords(
  experimentId: string,
  records: PhenotypeRecord[],
): Promise<void> {
  if (!firebaseReady()) {
    await local.replaceAll(experimentId, 'phenotype', records);
    return;
  }
  for (const r of records) {
    await addPhenotypeRecord(experimentId, r);
  }
}

export async function phenotypeRecordsForDate(
  experimentId: string,
  date: string,
): Promise<PhenotypeRecord[]> {
  if (!firebaseReady()) {
    const all = await local.readAll<PhenotypeRecord>(experimentId, 'phenotype');
    return all.filter((r) => r.date === date);
  }
  await ensureSignedIn();
  const snap = await getDocs(
    query(
      collection(getDb(), 'experiments', experimentId, 'phenotype'),
      where('date', '==', date),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PhenotypeRecord, 'id'>) }));
}

// --------------------------------------------------------------- lighting log

export async function addLightingLog(
  experimentId: string,
  log: LightingLog,
): Promise<void> {
  if (!firebaseReady()) {
    await local.add(experimentId, 'lightingLogs', log);
    return;
  }
  await ensureSignedIn();
  await addDoc(collection(getDb(), 'experiments', experimentId, 'lightingLogs'), log);
}

/** Bulk insert used by the sample-data seeder (local mode writes once). */
export async function setLightingLogs(
  experimentId: string,
  logs: LightingLog[],
): Promise<void> {
  if (!firebaseReady()) {
    await local.replaceAll(experimentId, 'lightingLogs', logs);
    return;
  }
  for (const l of logs) {
    await addLightingLog(experimentId, l);
  }
}

export async function listLightingLogs(experimentId: string): Promise<LightingLog[]> {
  if (!firebaseReady()) {
    const all = await local.readAll<LightingLog>(experimentId, 'lightingLogs');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }
  await ensureSignedIn();
  const snap = await getDocs(
    query(
      collection(getDb(), 'experiments', experimentId, 'lightingLogs'),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LightingLog, 'id'>) }));
}

// --------------------------------------------------------------------- photos

/**
 * Uploads one photo and records its metadata. In local mode the picked image
 * URI is kept as-is on the device instead of Cloud Storage.
 */
export async function uploadPhoto(
  experimentId: string,
  localUri: string,
  meta: Omit<PhotoRecord, 'id' | 'storagePath' | 'downloadUrl' | 'largestLeafAreaCm2' | 'createdAt'>,
): Promise<PhotoRecord> {
  const label = meta.kind === 'overview' ? 'overview' : meta.plantId ?? 'unknown';
  const storagePath = `experiments/${experimentId}/week-${meta.week}/${meta.date}_${label}.jpg`;

  if (!firebaseReady()) {
    const record: PhotoRecord = {
      ...meta,
      storagePath: `local/${storagePath}`,
      downloadUrl: localUri,
      largestLeafAreaCm2: null,
      createdAt: Date.now(),
    };
    await local.add(experimentId, 'photos', record);
    return record;
  }

  await ensureSignedIn();
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(getStorageRef(), storagePath);
  await uploadBytes(storageRef, blob, {
    contentType: 'image/jpeg',
    customMetadata: {
      experimentId,
      week: String(meta.week),
      date: meta.date,
      kind: meta.kind,
      plantId: meta.plantId ?? '',
    },
  });
  const downloadUrl = await getDownloadURL(storageRef);

  const record: PhotoRecord = {
    ...meta,
    storagePath,
    downloadUrl,
    largestLeafAreaCm2: null,
    createdAt: Date.now(),
  };
  await addDoc(collection(getDb(), 'experiments', experimentId, 'photos'), record);
  return record;
}

/** Bulk insert used by the sample-data seeder (local mode writes once). */
export async function setPhotos(
  experimentId: string,
  photos: PhotoRecord[],
): Promise<void> {
  if (!firebaseReady()) {
    await local.replaceAll(experimentId, 'photos', photos);
    return;
  }
  for (const photo of photos) {
    const { id: _id, ...data } = photo;
    await ensureSignedIn();
    await addDoc(collection(getDb(), 'experiments', experimentId, 'photos'), data);
  }
}

export async function photosForWeek(
  experimentId: string,
  week: number,
): Promise<PhotoRecord[]> {
  if (!firebaseReady()) {
    const all = await local.readAll<PhotoRecord>(experimentId, 'photos');
    return all.filter((p) => p.week === week);
  }
  await ensureSignedIn();
  const snap = await getDocs(
    query(
      collection(getDb(), 'experiments', experimentId, 'photos'),
      where('week', '==', week),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PhotoRecord, 'id'>) }));
}
