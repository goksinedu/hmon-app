/**
 * AsyncStorage-backed local collections, used whenever Firebase is not yet
 * configured (demo/offline mode). On the web build this persists to the
 * browser's localStorage, so each visitor keeps their own data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'hmon.local';

function collectionKey(experimentId: string, name: string): string {
  return `${PREFIX}.${experimentId}.${name}`;
}

let idCounter = 0;

export async function readAll<T>(experimentId: string, name: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(collectionKey(experimentId, name));
  return raw ? (JSON.parse(raw) as T[]) : [];
}

export async function add<T extends { id?: string }>(
  experimentId: string,
  name: string,
  item: T,
): Promise<void> {
  const items = await readAll<T>(experimentId, name);
  idCounter += 1;
  items.push({ ...item, id: `local-${Date.now()}-${idCounter}` });
  await AsyncStorage.setItem(collectionKey(experimentId, name), JSON.stringify(items));
}

export async function replaceAll<T>(
  experimentId: string,
  name: string,
  items: T[],
): Promise<void> {
  await AsyncStorage.setItem(collectionKey(experimentId, name), JSON.stringify(items));
}
