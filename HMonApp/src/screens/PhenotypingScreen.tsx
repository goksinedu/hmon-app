import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ChipRow, NumberField, SectionTitle } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import { firebaseReady } from '../lib/firebase';
import { addPhenotypeRecord, phenotypeRecordsForDate } from '../lib/repo';
import {
  MeasurementDay,
  TOTAL_MEASUREMENT_POINTS,
  findScheduledDay,
  measurementDays,
  toISODate,
} from '../lib/schedule';
import { PLANT_IDS, PhenotypeRecord, PlantId } from '../lib/types';
import { colors, spacing } from '../theme';

function parseNum(v: string): number | null {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
}

export default function PhenotypingScreen() {
  const { experiment } = useExperiment();

  const [selectedDay, setSelectedDay] = useState<MeasurementDay | null>(null);
  const [plantId, setPlantId] = useState<PlantId>('P1');
  const [donePlants, setDonePlants] = useState<Set<string>>(new Set());

  const [height, setHeight] = useState('');
  const [stemLength, setStemLength] = useState('');
  const [leafCount, setLeafCount] = useState('');
  const [leafArea, setLeafArea] = useState('');
  const [shootCount, setShootCount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!experiment) return;
    const today = findScheduledDay(experiment.startDate);
    if (today) {
      setSelectedDay(today);
    } else {
      // Default to the nearest past (or first) scheduled day for late entry.
      const days = measurementDays(experiment.startDate);
      const iso = toISODate(new Date());
      const past = [...days].reverse().find((d) => d.date <= iso);
      setSelectedDay(past ?? days[0]);
    }
  }, [experiment?.id]);

  const refreshDone = useCallback(async () => {
    if (!experiment || !selectedDay || !firebaseReady()) return;
    try {
      const records = await phenotypeRecordsForDate(experiment.id, selectedDay.date);
      setDonePlants(new Set(records.map((r) => r.plantId)));
    } catch {
      // non-fatal; progress indicator just stays empty
    }
  }, [experiment?.id, selectedDay?.date]);

  useEffect(() => {
    refreshDone();
  }, [refreshDone]);

  if (!experiment) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Create an experiment in the Setup tab first.</Text>
      </View>
    );
  }

  const days = measurementDays(experiment.startDate);

  const onSave = async () => {
    if (!selectedDay) return;
    if (!firebaseReady()) {
      Alert.alert('Cloud not configured', 'Configure Firebase (see README) before saving.');
      return;
    }
    const record: PhenotypeRecord = {
      date: selectedDay.date,
      week: selectedDay.week,
      measurementPoint: selectedDay.measurementPoint,
      plantId,
      plantHeightCm: parseNum(height),
      stemLengthCm: parseNum(stemLength),
      leafCount: parseNum(leafCount),
      leafAreaCm2: parseNum(leafArea),
      shootCount: parseNum(shootCount),
      createdAt: Date.now(),
    };
    if (
      record.plantHeightCm === null &&
      record.stemLengthCm === null &&
      record.leafCount === null &&
      record.leafAreaCm2 === null &&
      record.shootCount === null
    ) {
      Alert.alert('Nothing to save', 'Enter at least one measurement.');
      return;
    }
    setSaving(true);
    try {
      await addPhenotypeRecord(experiment.id, record);
      setHeight(''); setStemLength(''); setLeafCount(''); setLeafArea(''); setShootCount('');
      await refreshDone();
      // Move to the next plant that has no record yet, to speed up field work.
      const next = PLANT_IDS.find((p) => p !== plantId && !donePlants.has(p) && p > plantId)
        ?? PLANT_IDS.find((p) => !donePlants.has(p) && p !== plantId);
      if (next) setPlantId(next);
      Alert.alert('Saved', `${plantId} stored in the cloud database.`);
    } catch (e) {
      Alert.alert('Cloud error', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Measurement day</SectionTitle>
        <Text style={styles.hint}>
          Mondays, Wednesdays and Fridays — {TOTAL_MEASUREMENT_POINTS} points over 6 weeks.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.dayRow}>
            {days.map((d) => {
              const active = selectedDay?.date === d.date;
              return (
                <Text
                  key={d.date}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => setSelectedDay(d)}
                >
                  {`#${d.measurementPoint} · W${d.week} ${d.weekday.slice(0, 3)}\n${d.date}`}
                </Text>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <SectionTitle>Plant</SectionTitle>
        <ChipRow
          options={PLANT_IDS}
          labels={Object.fromEntries(
            PLANT_IDS.map((p) => [p, donePlants.has(p) ? `${p} ✓` : p]),
          ) as Partial<Record<PlantId, string>>}
          selected={plantId}
          onSelect={setPlantId}
        />
        <Text style={styles.progress}>
          {donePlants.size}/10 plants recorded for {selectedDay?.date ?? '—'}
        </Text>
      </Card>

      <Card>
        <SectionTitle>Measurements — {plantId}</SectionTitle>
        <NumberField label="Plant height" value={height} onChangeText={setHeight} unit="cm" />
        <NumberField label="Stem length" value={stemLength} onChangeText={setStemLength} unit="cm" />
        <NumberField label="Leaf number" value={leafCount} onChangeText={setLeafCount} unit="count" />
        <NumberField label="Leaf area" value={leafArea} onChangeText={setLeafArea} unit="cm²" />
        <NumberField label="Shoot number" value={shootCount} onChangeText={setShootCount} unit="count" />
        <Button title={`Save ${plantId} to cloud`} onPress={onSave} loading={saving} />
      </Card>
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
    marginBottom: spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: '#fff',
    fontWeight: '700',
  },
  progress: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
