import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ChipRow, SectionTitle, TextField } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import { firebaseReady } from '../lib/firebase';
import { saveExperiment } from '../lib/repo';
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

  const onSave = async () => {
    const chosenCultivar = customCultivar.trim() || cultivar;
    if (!name.trim() || !school.trim() || !country.trim() || !systemId.trim() || !chosenCultivar) {
      Alert.alert('Missing information', 'Please fill in every field, including the cultivar.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      Alert.alert('Invalid date', 'Start date must use the format YYYY-MM-DD.');
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
    try {
      if (firebaseReady()) {
        await saveExperiment(exp);
      }
      await setExperiment(exp);
      Alert.alert(
        'Experiment saved',
        firebaseReady()
          ? 'Metadata stored in the cloud database.'
          : 'Saved locally. Configure Firebase (see README) to sync with the common cloud database.',
      );
    } catch (e) {
      Alert.alert('Cloud error', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!firebaseReady() && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Firebase is not configured yet — data will only be kept on this device. Follow the
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
});
