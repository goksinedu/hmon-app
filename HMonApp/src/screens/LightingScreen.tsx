import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ChipRow, NumberField, SectionTitle, TextField } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import { firebaseReady } from '../lib/firebase';
import { addLightingLog, listLightingLogs } from '../lib/repo';
import { mondaySessions, toISODate } from '../lib/schedule';
import { LightingLog, PLANT_ISSUES, PLANT_ISSUE_LABELS, PlantIssue } from '../lib/types';
import { colors, spacing } from '../theme';

function parseNum(v: string): number | null {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
}

export default function LightingScreen() {
  const { experiment } = useExperiment();

  const [session, setSession] = useState<{ date: string; week: number } | null>(null);
  const [lightType, setLightType] = useState('');
  const [hours, setHours] = useState('');
  const [distance, setDistance] = useState('');
  const [left, setLeft] = useState('');
  const [center, setCenter] = useState('');
  const [right, setRight] = useState('');
  const [issue, setIssue] = useState<PlantIssue>('none');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<LightingLog[]>([]);

  useEffect(() => {
    if (!experiment) return;
    const sessions = mondaySessions(experiment.startDate);
    const iso = toISODate(new Date());
    const current = [...sessions].reverse().find((s) => s.date <= iso) ?? sessions[0];
    setSession(current);
    if (firebaseReady()) {
      listLightingLogs(experiment.id).then(setLogs).catch(() => {});
    }
  }, [experiment?.id]);

  if (!experiment) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Create an experiment in the Setup tab first.</Text>
      </View>
    );
  }

  const sessions = mondaySessions(experiment.startDate);

  const onSave = async () => {
    if (!session) return;
    if (!firebaseReady()) {
      Alert.alert('Cloud not configured', 'Configure Firebase (see README) before saving.');
      return;
    }
    if (!lightType.trim()) {
      Alert.alert('Missing information', 'Please enter the light type.');
      return;
    }
    const log: LightingLog = {
      date: session.date,
      week: session.week,
      lightType: lightType.trim(),
      dailyLightHours: parseNum(hours),
      lightPlantDistanceCm: parseNum(distance),
      zoneLightLevels: {
        left: parseNum(left),
        center: parseNum(center),
        right: parseNum(right),
      },
      plantIssue: issue,
      notes: notes.trim(),
      createdAt: Date.now(),
    };
    setSaving(true);
    try {
      await addLightingLog(experiment.id, log);
      setLogs([log, ...logs]);
      Alert.alert('Saved', `Week ${session.week} lighting log stored in the cloud database.`);
    } catch (e) {
      Alert.alert('Cloud error', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const loggedWeeks = new Set(logs.map((l) => l.week));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Weekly session (Mondays)</SectionTitle>
        <ChipRow
          options={sessions.map((s) => String(s.week)) as readonly string[]}
          labels={Object.fromEntries(
            sessions.map((s) => [
              String(s.week),
              `W${s.week}${loggedWeeks.has(s.week) ? ' ✓' : ''}`,
            ]),
          )}
          selected={session ? String(session.week) : null}
          onSelect={(w) => setSession(sessions.find((s) => String(s.week) === w) ?? null)}
        />
        <Text style={styles.hint}>
          {session ? `Session date: ${session.date}` : ''}
        </Text>
      </Card>

      <Card>
        <SectionTitle>Lighting system</SectionTitle>
        <TextField
          label="Light type"
          value={lightType}
          onChangeText={setLightType}
          placeholder="e.g. Full-spectrum LED 36W"
        />
        <NumberField label="Daily light duration" value={hours} onChangeText={setHours} unit="h/day" />
        <NumberField label="Light–plant distance" value={distance} onChangeText={setDistance} unit="cm" />
      </Card>

      <Card>
        <SectionTitle>Zone light levels (lux)</SectionTitle>
        <View style={styles.zoneRow}>
          <View style={styles.zoneItem}>
            <NumberField label="Left" value={left} onChangeText={setLeft} />
          </View>
          <View style={styles.zoneItem}>
            <NumberField label="Center" value={center} onChangeText={setCenter} />
          </View>
          <View style={styles.zoneItem}>
            <NumberField label="Right" value={right} onChangeText={setRight} />
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle>Observed plant issues</SectionTitle>
        <ChipRow
          options={PLANT_ISSUES}
          labels={PLANT_ISSUE_LABELS}
          selected={issue}
          onSelect={setIssue}
        />
        <View style={{ height: spacing.md }} />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional observations…"
          multiline
        />
      </Card>

      <Button title="Save lighting log to cloud" onPress={onSave} loading={saving} />
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
  },
  zoneRow: {
    flexDirection: 'row',
    columnGap: spacing.md,
  },
  zoneItem: {
    flex: 1,
  },
});
