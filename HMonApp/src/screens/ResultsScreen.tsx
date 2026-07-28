import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart } from '../components/Charts';
import { Card, SectionTitle } from '../components/UI';
import { useExperiment } from '../context/ExperimentContext';
import {
  GrowthReport,
  Recommendation,
  RecommendationPriority,
  buildGrowthReport,
} from '../lib/analytics';
import {
  listAllSensorReadings,
  listLightingLogs,
  listPhenotypeRecords,
} from '../lib/repo';
import { colors, radius, spacing } from '../theme';

function priorityColor(p: RecommendationPriority): string {
  if (p === 'high') return colors.danger;
  if (p === 'medium') return colors.warning;
  return colors.primaryDark;
}

function categoryLabel(c: Recommendation['category']): string {
  switch (c) {
    case 'nutrition':
      return 'Nutrition';
    case 'lighting':
      return 'Lighting';
    case 'growth':
      return 'Growth';
    default:
      return 'General';
  }
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <View style={styles.recCard}>
      <View style={styles.recHeader}>
        <View style={[styles.priorityPill, { backgroundColor: priorityColor(rec.priority) }]}>
          <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
        </View>
        <Text style={styles.categoryText}>{categoryLabel(rec.category)}</Text>
      </View>
      <Text style={styles.recTitle}>{rec.title}</Text>
      <Text style={styles.recDetail}>{rec.detail}</Text>
      <View style={styles.actionBox}>
        <Text style={styles.actionLabel}>Recommended action</Text>
        <Text style={styles.actionText}>{rec.action}</Text>
      </View>
    </View>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ResultsScreen() {
  const { experiment } = useExperiment();
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!experiment) return;
    setLoading(true);
    setError(null);
    try {
      const [phenotype, sensors, lighting] = await Promise.all([
        listPhenotypeRecords(experiment.id),
        listAllSensorReadings(experiment.id),
        listLightingLogs(experiment.id),
      ]);
      setReport(buildGrowthReport(phenotype, sensors, lighting));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [experiment?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!experiment) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Results & AI</Text>
        <Text style={styles.emptyText}>
          Create or load an experiment first. Growth graphs and recommendations appear once
          phenotyping and sensor data are available.
        </Text>
      </View>
    );
  }

  if (loading && !report) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.emptyText, { marginTop: spacing.md }]}>Building growth report…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.danger }]}>{error}</Text>
      </View>
    );
  }

  if (!report || report.points.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Not enough data yet</Text>
        <Text style={styles.emptyText}>
          Record phenotyping on Mon/Wed/Fri (or load the 2-week sample dataset) to unlock growth
          charts and AI recommendations.
        </Text>
      </View>
    );
  }

  const heightSeries = report.points.map((p) => ({
    label: `#${p.measurementPoint}`,
    value: p.avgHeightCm,
  }));
  const leafAreaSeries = report.points.map((p) => ({
    label: `#${p.measurementPoint}`,
    value: p.avgLeafAreaCm2,
  }));
  const leafCountSeries = report.points.map((p) => ({
    label: `#${p.measurementPoint}`,
    value: p.avgLeafCount,
  }));
  const plantGainSeries = report.plantSummaries
    .filter((p) => p.heightGainCm !== null)
    .map((p) => ({ label: p.plantId, value: p.heightGainCm! }));

  const nutritionRecs = report.recommendations.filter((r) => r.category === 'nutrition');
  const lightingRecs = report.recommendations.filter((r) => r.category === 'lighting');
  const otherRecs = report.recommendations.filter(
    (r) => r.category !== 'nutrition' && r.category !== 'lighting',
  );

  const last = report.points[report.points.length - 1];
  const first = report.points[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <SectionTitle>Growth report</SectionTitle>
        <Text style={styles.subtitle}>
          {experiment.name} · {experiment.cultivar}
        </Text>
        <Text style={styles.hint}>
          Based on {report.points.length} measurement points (weeks {first.week}–{last.week}),{' '}
          {report.plantSummaries.length} plants, {report.sensor.avgPh !== null ? 'IoT sensors' : 'no sensors'}{' '}
          and {report.lighting.length} lighting log(s). AI recommendations update as you add data.
        </Text>
        <View style={styles.statsRow}>
          <Stat label="Latest avg height" value={String(last.avgHeightCm)} unit="cm" />
          <Stat
            label="Weekly height gain"
            value={report.avgWeeklyHeightGainCm !== null ? String(report.avgWeeklyHeightGainCm) : '—'}
            unit="cm/wk"
          />
          <Stat label="Latest avg leaf area" value={String(last.avgLeafAreaCm2)} unit="cm²" />
        </View>
        <View style={styles.statsRow}>
          <Stat
            label="Latest pH"
            value={report.sensor.latestPh !== null ? report.sensor.latestPh.toFixed(2) : '—'}
          />
          <Stat
            label="Latest EC"
            value={report.sensor.latestEc !== null ? report.sensor.latestEc.toFixed(2) : '—'}
            unit="mS/cm"
          />
          <Stat
            label="EC trend"
            value={report.sensor.ecTrend === 'unknown' ? '—' : report.sensor.ecTrend}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle>Growth graphs</SectionTitle>
        <BarChart
          title="Average plant height by measurement point"
          unit="cm"
          data={heightSeries}
          color={colors.primary}
        />
        <BarChart
          title="Average leaf area by measurement point"
          unit="cm²"
          data={leafAreaSeries}
          color={colors.navy}
        />
        <BarChart
          title="Average leaf number by measurement point"
          unit="count"
          data={leafCountSeries}
          color={colors.water}
        />
        {plantGainSeries.length > 0 && (
          <BarChart
            title="Height gain per plant (first → latest sample)"
            unit="cm"
            data={plantGainSeries}
            color={colors.primaryDark}
            height={120}
          />
        )}
      </Card>

      <Card>
        <SectionTitle>AI recommendations — nutrition</SectionTitle>
        <Text style={styles.hint}>
          Rule-based advice from pH, EC/TDS and reservoir status for the weeks ahead.
        </Text>
        {nutritionRecs.map((r) => (
          <RecommendationCard key={r.id} rec={r} />
        ))}
      </Card>

      <Card>
        <SectionTitle>AI recommendations — lighting</SectionTitle>
        <Text style={styles.hint}>
          Derived from Monday lighting logs, zone lux balance and observed plant issues
          (stretching, burn, yellowing).
        </Text>
        {lightingRecs.map((r) => (
          <RecommendationCard key={r.id} rec={r} />
        ))}
      </Card>

      <Card>
        <SectionTitle>Growth outlook</SectionTitle>
        {otherRecs.map((r) => (
          <RecommendationCard key={r.id} rec={r} />
        ))}
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textMuted,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  recCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#fff',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  recDetail: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  actionBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  actionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
});
