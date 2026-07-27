/**
 * Cloud repository: all reads/writes to Firestore and Cloud Storage.
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

import { ensureSignedIn, getDb, getStorageRef } from './firebase';
import {
  Experiment,
  LightingLog,
  PhenotypeRecord,
  PhotoRecord,
  SensorReading,
} from './types';

// ---------------------------------------------------------------- experiments

export async function saveExperiment(exp: Experiment): Promise<void> {
  await ensureSignedIn();
  const { id, ...data } = exp;
  await setDoc(doc(getDb(), 'experiments', id), data, { merge: true });
}

export async function listExperiments(): Promise<Experiment[]> {
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
  await ensureSignedIn();
  await addDoc(collection(getDb(), 'experiments', experimentId, 'sensorReadings'), reading);
}

/** Live subscription to the most recent sensor readings (IoT + manual). */
export function watchSensorReadings(
  experimentId: string,
  count: number,
  onData: (readings: SensorReading[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
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
  await ensureSignedIn();
  await addDoc(collection(getDb(), 'experiments', experimentId, 'phenotype'), record);
}

export async function phenotypeRecordsForDate(
  experimentId: string,
  date: string,
): Promise<PhenotypeRecord[]> {
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
  await ensureSignedIn();
  await addDoc(collection(getDb(), 'experiments', experimentId, 'lightingLogs'), log);
}

export async function listLightingLogs(experimentId: string): Promise<LightingLog[]> {
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
 * Uploads one photo to Cloud Storage under the structured AI-ready path and
 * records its metadata in Firestore.
 */
export async function uploadPhoto(
  experimentId: string,
  localUri: string,
  meta: Omit<PhotoRecord, 'id' | 'storagePath' | 'downloadUrl' | 'largestLeafAreaCm2' | 'createdAt'>,
): Promise<PhotoRecord> {
  await ensureSignedIn();
  const label = meta.kind === 'overview' ? 'overview' : meta.plantId ?? 'unknown';
  const storagePath = `experiments/${experimentId}/week-${meta.week}/${meta.date}_${label}.jpg`;

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

export async function photosForWeek(
  experimentId: string,
  week: number,
): Promise<PhotoRecord[]> {
  await ensureSignedIn();
  const snap = await getDocs(
    query(
      collection(getDb(), 'experiments', experimentId, 'photos'),
      where('week', '==', week),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PhotoRecord, 'id'>) }));
}
