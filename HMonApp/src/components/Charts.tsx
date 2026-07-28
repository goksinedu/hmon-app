import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

export interface ChartSeries {
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  unit?: string;
  data: ChartSeries[];
  color?: string;
  height?: number;
}

/** Simple horizontal-labelled column chart (no extra chart library). */
export function BarChart({ title, unit, data, color = colors.primary, height = 140 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 0.0001);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.chartRow, { height }]}>
        {data.map((d) => {
          const barH = Math.max(4, (d.value / max) * (height - 28));
          return (
            <View key={d.label} style={styles.col}>
              <Text style={styles.valueLabel}>
                {Number.isInteger(d.value) ? d.value : d.value.toFixed(1)}
              </Text>
              <View style={[styles.barTrack, { height: height - 28 }]}>
                <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
              </View>
              <Text style={styles.xLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>
      {unit ? <Text style={styles.unit}>Unit: {unit}</Text> : null}
    </View>
  );
}

interface LineChartProps {
  title: string;
  unit?: string;
  data: ChartSeries[];
  color?: string;
  height?: number;
}

/**
 * Lightweight line chart drawn with absolutely positioned segments
 * (works on native + web without react-native-svg).
 */
export function LineChart({ title, unit, data, color = colors.navy, height = 160 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>No data yet</Text>
      </View>
    );
  }
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.0001);
  const pad = 8;
  const plotH = height - 36;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
    const y = pad + (1 - (d.value - min) / span) * (plotH - pad * 2);
    return { x, y, ...d };
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.linePlot, { height: plotH }]}>
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          // Approximate length in % of width; angle in deg.
          const angle = (Math.atan2(dy, dx * 3.2) * 180) / Math.PI;
          return (
            <View
              key={`seg-${i}`}
              style={[
                styles.segment,
                {
                  left: `${prev.x}%`,
                  top: prev.y,
                  width: `${Math.max(len * 0.92, 2)}%`,
                  backgroundColor: color,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
        {points.map((p) => (
          <View
            key={p.label}
            style={[
              styles.dot,
              {
                left: `${p.x}%`,
                top: p.y - 5,
                marginLeft: -5,
                backgroundColor: color,
                borderColor: '#fff',
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.lineLabels}>
        {data.map((d) => (
          <Text key={d.label} style={styles.xLabel}>
            {d.label}
          </Text>
        ))}
      </View>
      <Text style={styles.unit}>
        {unit ? `Unit: ${unit} · ` : ''}
        range {min.toFixed(1)}–{max.toFixed(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    maxWidth: 28,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    minHeight: 4,
  },
  xLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  unit: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  linePlot: {
    position: 'relative',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
