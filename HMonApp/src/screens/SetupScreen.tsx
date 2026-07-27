import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ChipRow, SectionTitle, TextField } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import { firebaseReady } from '../lib/firebase';
import { saveExperiment } from '../lib/repo';
import { loadSampleData } from '../lib/sampleData';
import { toISODate } from '../lib/schedule';
import { CULTIVARS, Experiment } from '../lib/types';
import { colors, spacing } from '../theme';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function SetupScreen() {
  const { experiment, setExperiment } = useExperiment();

  const [name, setName] = useState(experiment?.name ?? '');
  const [school, setSchool] = useState(experiment?.school ?? '');
  const [country, setCountry] = useState(experiment?.country ?? '');
  const [systemId, setSystemId] = useState(experiment?.systemId ?? '');
  const [cultivar, setCultivar] = useState<string | null>(experiment?.cultivar ?? null);
  const [customCultivar, setCustomCultivar] = useState('');
  const [startDate, setStartDate] = useState(experiment?.startDate ?? toISODate(new Date()));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!experiment) return;
    setName(experiment.name);
    setSchool(experiment.school);
    setCountry(experiment.country);
    setSystemId(experiment.systemId);
    setCultivar(experiment.cultivar);
    setCustomCultivar('');
    setStartDate(experiment.startDate);
  }, [experiment?.id]);

  const onSave = async () => {
    const chosenCultivar = customCultivar.trim() || cultivar;
    if (!name.trim() || !school.trim() || !country.trim() || !systemId.trim() || !chosenCultivar) {
      setStatus({ text: 'Please fill in every field, including the cultivar.', error: true });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      setStatus({ text: 'Start date must use the format YYYY-MM-DD.', error: true });
      return;
    }
    const exp: Experiment = {
      id: experiment?.id ?? `${slugify(country)}-${slugify(school)}-${slugify(systemId)}-${Date.now()}`,
      name: name.trim(),
      school: school.trim(),
      country: country.trim(),
      systemId: systemId.trim(),
      cultivar: chosenCultivar,
      startDate: startDate.trim(),
      createdAt: experiment?.createdAt ?? Date.now(),
    };
    setSaving(true);
    setStatus(null);
    try {
      await saveExperiment(exp);
      await setExperiment(exp);
      setStatus({
        text: firebaseReady()
          ? 'Experiment saved to the cloud database.'
          : 'Experiment saved on this device. Configure Firebase (see README) to sync with the shared cloud database.',
        error: false,
      });
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setSaving(false);
    }
  };

  const onLoadSample = async () => {
    setSeeding(true);
    setSeedStatus(null);
    try {
      const exp = await loadSampleData();
      await setExperiment(exp);
      setSeedStatus(
        'Sample dataset loaded: 2 weeks of IoT sensor readings, P1–P10 phenotyping (6 measurement points) and 2 lighting logs. Explore it from the Dashboard.',
      );
    } catch (e) {
      setSeedStatus(`Failed to load sample data: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!firebaseReady() && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Firebase is not configured yet — data is kept on this device (demo mode). Follow the
            README to connect the app to the shared cloud database.
          </Text>
        </View>
      )}

      <Card>
        <SectionTitle>Experiment metadata</SectionTitle>
        <TextField label="Experiment name" value={name} onChangeText={setName} placeholder="e.g. Spring 2026 lettuce trial" />
        <TextField label="School" value={school} onChangeText={setSchool} placeholder="e.g. Bahçeşehir University" />
        <TextField label="Country" value={country} onChangeText={setCountry} placeholder="e.g. Türkiye" />
        <TextField label="Hydroponic system ID" value={systemId} onChangeText={setSystemId} placeholder="e.g. SYS-1" />
        <TextField
          label="Start date (day 1 of the 42-day period)"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
        />
      </Card>

      <Card>
        <SectionTitle>Plant cultivar</SectionTitle>
        <ChipRow options={CULTIVARS} selected={cultivar as (typeof CULTIVARS)[number] | null} onSelect={(v) => { setCultivar(v); setCustomCultivar(''); }} />
        <View style={{ height: spacing.md }} />
        <TextField
          label="Or enter another cultivar"
          value={customCultivar}
          onChangeText={setCustomCultivar}
          placeholder="Scientific name of the cultivar"
        />
      </Card>

      <Button title={experiment ? 'Update experiment' : 'Create experiment'} onPress={onSave} loading={saving} />
      {status && (
        <Text style={[styles.status, status.error ? styles.statusError : styles.statusOk]}>
          {status.text}
        </Text>
      )}

      <Card style={{ marginTop: spacing.xl }}>
        <SectionTitle>Demo / training mode</SectionTitle>
        <Text style={styles.demoText}>
          Loads a ready-made experiment with two weeks of realistic data: IoT sensor readings
          every 3 hours, phenotyping for plants P1–P10 on all 6 Mon/Wed/Fri measurement points,
          both weekly lighting logs, and 22 placeholder photos (11 per Monday session).
        </Text>
        <Button
          title="Load 2-week sample dataset"
          onPress={onLoadSample}
          loading={seeding}
          variant="secondary"
        />
        {seedStatus && <Text style={[styles.status, styles.statusOk]}>{seedStatus}</Text>}
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
  banner: {
    backgroundColor: '#fff6e5',
    borderColor: '#f4c26f',
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: {
    color: '#8a5a00',
    fontSize: 13,
  },
  status: {
    marginTop: spacing.md,
    fontSize: 13,
    lineHeight: 19,
  },
  statusOk: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  statusError: {
    color: colors.danger,
    fontWeight: '600',
  },
  demoText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
});
