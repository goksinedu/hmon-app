import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, NumberField, SectionTitle } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import { addSensorReading, watchSensorReadings } from '../lib/repo';
import { SensorReading } from '../lib/types';
import { colors, spacing } from '../theme';

function parseNum(v: string): number | null {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
}

function ReadingRow({ item }: { item: SensorReading }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowDate}>{new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={[styles.badge, item.source === 'iot' ? styles.badgeIot : styles.badgeManual]}>
          {item.source.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.rowValues}>
        pH {item.ph ?? '—'} · EC {item.ec ?? '—'} mS/cm · TDS {item.tds ?? '—'} ppm
      </Text>
      <Text style={styles.rowValues}>
        Water {item.waterTempC ?? '—'}°C · Air {item.ambientTempC ?? '—'}°C · RH{' '}
        {item.ambientHumidityPct ?? '—'}% ·{' '}
        <Text style={{ color: item.waterLevelOk ? colors.primaryDark : colors.danger }}>
          water level {item.waterLevelOk ? 'OK' : 'LOW'}
        </Text>
      </Text>
    </View>
  );
}

export default function SensorsScreen() {
  const { experiment } = useExperiment();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [tds, setTds] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [airTemp, setAirTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [waterLevelOk, setWaterLevelOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!experiment) return;
      const unsub = watchSensorReadings(
        experiment.id,
        50,
        (r) => {
          setError(null);
          setReadings(r);
        },
        (e) => setError(e.message),
      );
      return unsub;
    }, [experiment?.id, refreshKey]),
  );

  if (!experiment) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Create an experiment in the Setup tab first.</Text>
      </View>
    );
  }

  const onSave = async () => {
    const reading: SensorReading = {
      timestamp: Date.now(),
      ph: parseNum(ph),
      ec: parseNum(ec),
      tds: parseNum(tds),
      waterTempC: parseNum(waterTemp),
      ambientTempC: parseNum(airTemp),
      ambientHumidityPct: parseNum(humidity),
      waterLevelOk,
      source: 'manual',
    };
    if (
      reading.ph === null &&
      reading.ec === null &&
      reading.tds === null &&
      reading.waterTempC === null &&
      reading.ambientTempC === null &&
      reading.ambientHumidityPct === null
    ) {
      setStatus({ text: 'Enter at least one sensor value.', error: true });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await addSensorReading(experiment.id, reading);
      setPh(''); setEc(''); setTds(''); setWaterTemp(''); setAirTemp(''); setHumidity('');
      setStatus({ text: 'Reading saved.', error: false });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={readings}
      keyExtractor={(item) => item.id ?? String(item.timestamp)}
      renderItem={({ item }) => <ReadingRow item={item} />}
      ListHeaderComponent={
        <>
          <Card>
            <SectionTitle>Manual reading entry</SectionTitle>
            <Text style={styles.hint}>
              IoT sensors write to the cloud automatically (see README for the ingestion API).
              Use this form as a backup or for calibration checks.
            </Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <NumberField label="pH" value={ph} onChangeText={setPh} />
              </View>
              <View style={styles.gridItem}>
                <NumberField label="EC" value={ec} onChangeText={setEc} unit="mS/cm" />
              </View>
              <View style={styles.gridItem}>
                <NumberField label="TDS" value={tds} onChangeText={setTds} unit="ppm" />
              </View>
              <View style={styles.gridItem}>
                <NumberField label="Water temp" value={waterTemp} onChangeText={setWaterTemp} unit="°C" />
              </View>
              <View style={styles.gridItem}>
                <NumberField label="Ambient temp" value={airTemp} onChangeText={setAirTemp} unit="°C" />
              </View>
              <View style={styles.gridItem}>
                <NumberField label="Humidity" value={humidity} onChangeText={setHumidity} unit="%" />
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Water level OK?</Text>
              <Switch
                value={waterLevelOk}
                onValueChange={setWaterLevelOk}
                trackColor={{ true: colors.primary, false: colors.danger }}
              />
            </View>
            <Button title="Save reading" onPress={onSave} loading={saving} />
            {status && (
              <Text style={[styles.status, status.error ? styles.statusError : styles.statusOk]}>
                {status.text}
              </Text>
            )}
          </Card>
          <SectionTitle>Recent readings</SectionTitle>
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          {readings.length === 0 ? <Text style={styles.hint}>No readings yet.</Text> : null}
        </>
      }
    />
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
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
  },
  gridItem: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  switchLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  status: {
    marginTop: spacing.md,
    fontSize: 13,
  },
  statusOk: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  statusError: {
    color: colors.danger,
    fontWeight: '600',
  },
  row: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rowDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    color: '#fff',
  },
  badgeIot: {
    backgroundColor: colors.navy,
  },
  badgeManual: {
    backgroundColor: colors.primary,
  },
  rowValues: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
});
