import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card, ChipRow, SectionTitle } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import { firebaseReady } from '../lib/firebase';
import { photosForWeek, uploadPhoto } from '../lib/repo';
import {
  isSamplePhotoKey,
  resolveSamplePhotoUrl,
} from '../lib/sampleData';
import { mondaySessions, toISODate } from '../lib/schedule';
import { PLANT_IDS, PhotoRecord, PlantId } from '../lib/types';
import { colors, radius, spacing } from '../theme';

type Slot = { key: string; kind: 'overview' | 'plant'; plantId: PlantId | null; label: string };

const SLOTS: Slot[] = [
  { key: 'overview', kind: 'overview', plantId: null, label: 'Overview' },
  ...PLANT_IDS.map<Slot>((p) => ({ key: p, kind: 'plant', plantId: p, label: p })),
];

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function PhotosScreen() {
  const { experiment } = useExperiment();
  const [session, setSession] = useState<{ date: string; week: number } | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!experiment) return;
    const sessions = mondaySessions(experiment.startDate);
    const iso = toISODate(new Date());
    const pastOrToday = [...sessions].reverse().find((s) => s.date <= iso) ?? sessions[0];
    setSession(pastOrToday);
  }, [experiment?.id]);

  const refresh = useCallback(async () => {
    if (!experiment || !session) return;
    try {
      const list = await photosForWeek(experiment.id, session.week);
      setPhotos(list);

      const urlMap: Record<string, string> = {};
      await Promise.all(
        list.map(async (p) => {
          const key = p.id ?? `${p.week}-${p.kind}-${p.plantId ?? 'overview'}`;
          if (isSamplePhotoKey(p.downloadUrl)) {
            urlMap[key] = await resolveSamplePhotoUrl(p.downloadUrl);
          } else {
            urlMap[key] = p.downloadUrl;
          }
        }),
      );
      setResolvedUrls(urlMap);
    } catch {
      // ignore; grid just shows empty slots
    }
  }, [experiment?.id, session?.week]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // If the current week has no photos, jump to the latest earlier week that does.
  useEffect(() => {
    if (!experiment || !session || photos.length > 0) return;
    let cancelled = false;
    (async () => {
      const sessions = mondaySessions(experiment.startDate);
      for (const s of [...sessions].reverse()) {
        if (s.week >= session.week) continue;
        const list = await photosForWeek(experiment.id, s.week);
        if (cancelled) return;
        if (list.length > 0) {
          setSession(s);
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [experiment?.id, session?.week, photos.length]);

  if (!experiment) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Create an experiment in the Setup tab first.</Text>
      </View>
    );
  }

  const sessions = mondaySessions(experiment.startDate);

  const photoForSlot = (slot: Slot): PhotoRecord | undefined =>
    photos.find((p) =>
      slot.kind === 'overview' ? p.kind === 'overview' : p.plantId === slot.plantId,
    );

  const uriForPhoto = (photo: PhotoRecord): string | undefined => {
    const key = photo.id ?? `${photo.week}-${photo.kind}-${photo.plantId ?? 'overview'}`;
    return resolvedUrls[key] || (isSamplePhotoKey(photo.downloadUrl) ? undefined : photo.downloadUrl);
  };

  const pickAndUpload = async (slot: Slot, fromCamera: boolean) => {
    if (!session) return;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    };
    const result = fromCamera
      ? await (async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            showMessage('Permission needed', 'Camera access is required to take photos.');
            return null;
          }
          return ImagePicker.launchCameraAsync(options);
        })()
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result || result.canceled || !result.assets?.length) return;

    setUploadingKey(slot.key);
    setStatus(null);
    try {
      await uploadPhoto(experiment.id, result.assets[0].uri, {
        date: session.date,
        week: session.week,
        kind: slot.kind,
        plantId: slot.plantId,
      });
      await refresh();
      setStatus(
        firebaseReady()
          ? `${slot.label} uploaded to cloud storage.`
          : `${slot.label} saved on this device.`,
      );
    } catch (e) {
      setStatus(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingKey(null);
    }
  };

  const onSlotPress = (slot: Slot) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      pickAndUpload(slot, false);
      return;
    }
    Alert.alert(
      `${slot.label} photo`,
      'Choose the image source. Photos are tagged for AI leaf-area analysis.',
      [
        { text: 'Camera', onPress: () => pickAndUpload(slot, true) },
        { text: 'Photo library', onPress: () => pickAndUpload(slot, false) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const uploadedCount = SLOTS.filter((s) => photoForSlot(s)).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Weekly photo session (Mondays)</SectionTitle>
        <ChipRow
          options={sessions.map((s) => String(s.week)) as readonly string[]}
          labels={Object.fromEntries(sessions.map((s) => [String(s.week), `W${s.week}`]))}
          selected={session ? String(session.week) : null}
          onSelect={(w) => setSession(sessions.find((s) => String(s.week) === w) ?? null)}
        />
        <Text style={styles.hint}>
          {session ? `Session date: ${session.date} — ` : ''}
          {uploadedCount}/11 photos uploaded (1 overview + 10 plants). Sample pictures are
          available for weeks 1–2. Images are tagged for the BAU leaf-area application and
          future AI analysis.
        </Text>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </Card>

      <View style={styles.grid}>
        {SLOTS.map((slot) => {
          const photo = photoForSlot(slot);
          const uploading = uploadingKey === slot.key;
          const uri = photo ? uriForPhoto(photo) : undefined;
          return (
            <TouchableOpacity
              key={slot.key}
              style={[styles.slot, photo && styles.slotDone]}
              onPress={() => onSlotPress(slot)}
              disabled={uploading}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.slotImage} />
              ) : (
                <Text style={styles.slotPlus}>{uploading ? '…' : photo ? '…' : '+'}</Text>
              )}
              <Text style={[styles.slotLabel, photo && styles.slotLabelDone]}>
                {slot.label}
                {photo ? ' ✓' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  status: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  slot: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotDone: {
    borderColor: colors.primary,
  },
  slotImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  slotPlus: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '300',
  },
  slotLabel: {
    position: 'absolute',
    bottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  slotLabelDone: {
    color: colors.primaryDark,
  },
});
