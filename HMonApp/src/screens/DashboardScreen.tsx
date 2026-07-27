import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SectionTitle } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import { watchSensorReadings } from '../lib/repo';
import {
  EXPERIMENT_DAYS,
  TOTAL_MEASUREMENT_POINTS,
  dayOfExperiment,
  findScheduledDay,
  nextScheduledDay,
  weekOfExperiment,
} from '../lib/schedule';
import { SensorReading } from '../lib/types';
import { colors, spacing } from '../theme';

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function fmt(v: number | null, digits = 1): string {
  return v === null || v === undefined ? '—' : v.toFixed(digits);
}

export default function DashboardScreen() {
  const { experiment } = useExperiment();
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!experiment) return;
      const unsub = watchSensorReadings(
        experiment.id,
        1,
        (readings) => {
          setError(null);
          setLatest(readings[0] ?? null);
        },
        (e) => setError(e.message),
      );
      return unsub;
    }, [experiment?.id]),
  );

  if (!experiment) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Welcome to HMon</Text>
        <Text style={styles.emptyText}>
          Create your experiment in the Setup tab to start collecting hydroponics data for the
          HAI project.
        </Text>
      </View>
    );
  }

  const today = new Date();
  const day = dayOfExperiment(experiment.startDate, today);
  const week = weekOfExperiment(experiment.startDate, today);
  const todayTask = findScheduledDay(experiment.startDate, today);
  const upcoming = nextScheduledDay(experiment.startDate, today);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>{experiment.name}</SectionTitle>
        <Text style={styles.metaLine}>
          {experiment.school} · {experiment.country} · System {experiment.systemId}
        </Text>
        <Text style={styles.metaLine}>Cultivar: {experiment.cultivar}</Text>
        <Text style={styles.metaLine}>
          {week
            ? `Week ${week} of 6 — day ${day} of ${EXPERIMENT_DAYS}`
            : day < 1
              ? `Starts on ${experiment.startDate}`
              : 'Experimental period finished'}
        </Text>
      </Card>

      <Card>
        <SectionTitle>Today's tasks</SectionTitle>
        {todayTask ? (
          <View>
            <Text style={styles.taskLine}>
              • Phenotyping (P1–P10) — measurement point {todayTask.measurementPoint} of{' '}
              {TOTAL_MEASUREMENT_POINTS}
            </Text>
            {todayTask.weekday === 'Monday' && (
              <>
                <Text style={styles.taskLine}>• Weekly lighting log</Text>
                <Text style={styles.taskLine}>• Photo session: 1 overview + 10 plant photos</Text>
              </>
            )}
          </View>
        ) : (
          <Text style={styles.metaLine}>
            No manual measurements scheduled today.
            {upcoming
              ? ` Next: ${upcoming.weekday} ${upcoming.date} (point ${upcoming.measurementPoint}/${TOTAL_MEASUREMENT_POINTS}).`
              : ''}
          </Text>
        )}
      </Card>

      <Card>
        <SectionTitle>Latest sensor readings</SectionTitle>
        {error ? (
          <Text style={[styles.metaLine, { color: colors.danger }]}>{error}</Text>
        ) : !latest ? (
          <Text style={styles.metaLine}>No sensor data yet.</Text>
        ) : (
          <>
            <View style={styles.metricsRow}>
              <Metric label="pH" value={fmt(latest.ph, 2)} />
              <Metric label="EC" value={fmt(latest.ec, 2)} unit="mS/cm" />
              <Metric label="TDS" value={fmt(latest.tds, 0)} unit="ppm" />
            </View>
            <View style={styles.metricsRow}>
              <Metric label="Water temp" value={fmt(latest.waterTempC)} unit="°C" />
              <Metric label="Air temp" value={fmt(latest.ambientTempC)} unit="°C" />
              <Metric label="Humidity" value={fmt(latest.ambientHumidityPct, 0)} unit="%" />
            </View>
            <Text
              style={[
                styles.waterLevel,
                { color: latest.waterLevelOk ? colors.primaryDark : colors.danger },
              ]}
            >
              Water level: {latest.waterLevelOk ? 'OK' : 'LOW — refill needed'}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(latest.timestamp).toLocaleString()} ({latest.source})
            </Text>
          </>
        )}
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  metaLine: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  taskLine: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  waterLevel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
