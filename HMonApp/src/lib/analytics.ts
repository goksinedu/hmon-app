/**
 * Growth analytics and rule-based AI recommendations for the HAI protocol.
 * Recommendations are derived from phenotyping, IoT sensors and lighting logs
 * using lettuce hydroponics heuristics suitable for school experiments.
 */
import {
  LightingLog,
  PhenotypeRecord,
  PlantIssue,
  SensorReading,
} from './types';

export interface GrowthPoint {
  measurementPoint: number;
  week: number;
  date: string;
  avgHeightCm: number;
  avgStemCm: number;
  avgLeafCount: number;
  avgLeafAreaCm2: number;
  avgShootCount: number;
  plantCount: number;
}

export interface PlantGrowthSummary {
  plantId: string;
  firstHeightCm: number | null;
  lastHeightCm: number | null;
  heightGainCm: number | null;
  lastLeafAreaCm2: number | null;
}

export interface SensorSnapshot {
  latestPh: number | null;
  latestEc: number | null;
  latestTds: number | null;
  avgPh: number | null;
  avgEc: number | null;
  phTrend: 'rising' | 'falling' | 'stable' | 'unknown';
  ecTrend: 'rising' | 'falling' | 'stable' | 'unknown';
  lowWaterEvents: number;
}

export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationCategory = 'nutrition' | 'lighting' | 'growth' | 'general';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  detail: string;
  action: string;
}

export interface GrowthReport {
  points: GrowthPoint[];
  plantSummaries: PlantGrowthSummary[];
  sensor: SensorSnapshot;
  lighting: LightingLog[];
  avgWeeklyHeightGainCm: number | null;
  recommendations: Recommendation[];
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function trendOf(values: number[]): 'rising' | 'falling' | 'stable' | 'unknown' {
  if (values.length < 4) return 'unknown';
  const mid = Math.floor(values.length / 2);
  const first = avg(values.slice(0, mid));
  const second = avg(values.slice(mid));
  if (first === null || second === null) return 'unknown';
  const delta = second - first;
  if (Math.abs(delta) < 0.08) return 'stable';
  return delta > 0 ? 'rising' : 'falling';
}

export function buildGrowthPoints(records: PhenotypeRecord[]): GrowthPoint[] {
  const byPoint = new Map<number, PhenotypeRecord[]>();
  for (const r of records) {
    const list = byPoint.get(r.measurementPoint) ?? [];
    list.push(r);
    byPoint.set(r.measurementPoint, list);
  }
  return [...byPoint.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([measurementPoint, list]) => {
      const heights = list.map((r) => r.plantHeightCm).filter((v): v is number => v !== null);
      const stems = list.map((r) => r.stemLengthCm).filter((v): v is number => v !== null);
      const leaves = list.map((r) => r.leafCount).filter((v): v is number => v !== null);
      const areas = list.map((r) => r.leafAreaCm2).filter((v): v is number => v !== null);
      const shoots = list.map((r) => r.shootCount).filter((v): v is number => v !== null);
      return {
        measurementPoint,
        week: list[0].week,
        date: list[0].date,
        avgHeightCm: round1(avg(heights) ?? 0),
        avgStemCm: round1(avg(stems) ?? 0),
        avgLeafCount: round1(avg(leaves) ?? 0),
        avgLeafAreaCm2: round1(avg(areas) ?? 0),
        avgShootCount: round1(avg(shoots) ?? 0),
        plantCount: list.length,
      };
    });
}

export function buildPlantSummaries(records: PhenotypeRecord[]): PlantGrowthSummary[] {
  const byPlant = new Map<string, PhenotypeRecord[]>();
  for (const r of records) {
    const list = byPlant.get(r.plantId) ?? [];
    list.push(r);
    byPlant.set(r.plantId, list);
  }
  return [...byPlant.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([plantId, list]) => {
      const sorted = [...list].sort((a, b) => a.measurementPoint - b.measurementPoint);
      const first = sorted.find((r) => r.plantHeightCm !== null)?.plantHeightCm ?? null;
      const lastRec = [...sorted].reverse().find((r) => r.plantHeightCm !== null);
      const last = lastRec?.plantHeightCm ?? null;
      const lastArea =
        [...sorted].reverse().find((r) => r.leafAreaCm2 !== null)?.leafAreaCm2 ?? null;
      return {
        plantId,
        firstHeightCm: first,
        lastHeightCm: last,
        heightGainCm: first !== null && last !== null ? round1(last - first) : null,
        lastLeafAreaCm2: lastArea,
      };
    });
}

export function buildSensorSnapshot(readings: SensorReading[]): SensorSnapshot {
  const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp);
  const phs = sorted.map((r) => r.ph).filter((v): v is number => v !== null);
  const ecs = sorted.map((r) => r.ec).filter((v): v is number => v !== null);
  const latest = sorted[sorted.length - 1];
  return {
    latestPh: latest?.ph ?? null,
    latestEc: latest?.ec ?? null,
    latestTds: latest?.tds ?? null,
    avgPh: phs.length ? round1(avg(phs)!) : null,
    avgEc: ecs.length ? round1(avg(ecs)!) : null,
    phTrend: trendOf(phs),
    ecTrend: trendOf(ecs),
    lowWaterEvents: sorted.filter((r) => !r.waterLevelOk).length,
  };
}

function latestIssue(logs: LightingLog[]): PlantIssue | null {
  if (!logs.length) return null;
  const sorted = [...logs].sort((a, b) => b.week - a.week);
  return sorted[0].plantIssue;
}

export function buildRecommendations(
  points: GrowthPoint[],
  sensor: SensorSnapshot,
  lighting: LightingLog[],
): Recommendation[] {
  const recs: Recommendation[] = [];
  const latestLight = [...lighting].sort((a, b) => b.week - a.week)[0];
  const issue = latestIssue(lighting);

  // ---- Nutrition (pH / EC / TDS) ----
  if (sensor.latestPh !== null) {
    if (sensor.latestPh < 5.5) {
      recs.push({
        id: 'ph-low',
        category: 'nutrition',
        priority: 'high',
        title: 'Raise nutrient solution pH',
        detail: `Current pH is ${sensor.latestPh.toFixed(2)} (trend: ${sensor.phTrend}). Lettuce prefers 5.5–6.5.`,
        action: 'Add a small dose of pH-up, mix well, and re-check after 30 minutes. Target 5.8–6.2.',
      });
    } else if (sensor.latestPh > 6.5) {
      recs.push({
        id: 'ph-high',
        category: 'nutrition',
        priority: 'high',
        title: 'Lower nutrient solution pH',
        detail: `Current pH is ${sensor.latestPh.toFixed(2)}. Above 6.5 reduces nutrient availability (esp. Fe, Mn).`,
        action: 'Add pH-down gradually. Recheck EC after adjusting — both should stay in range.',
      });
    } else {
      recs.push({
        id: 'ph-ok',
        category: 'nutrition',
        priority: 'low',
        title: 'pH is in the optimal band',
        detail: `Current pH ${sensor.latestPh.toFixed(2)} is good for Lactuca sativa.`,
        action: 'Keep daily spot-checks. Drift of >0.3 from the weekly average deserves attention.',
      });
    }
  }

  if (sensor.latestEc !== null) {
    if (sensor.latestEc < 1.2) {
      recs.push({
        id: 'ec-low',
        category: 'nutrition',
        priority: 'high',
        title: 'Increase nutrient strength (EC)',
        detail: `EC is ${sensor.latestEc.toFixed(2)} mS/cm — below the typical 1.2–2.0 range for butterhead lettuce.`,
        action: 'Top up with stock nutrient solution (A+B equally). Aim for EC ≈ 1.6–1.8 going into weeks 3–4.',
      });
    } else if (sensor.latestEc > 2.2) {
      recs.push({
        id: 'ec-high',
        category: 'nutrition',
        priority: 'high',
        title: 'Dilute the nutrient solution',
        detail: `EC is ${sensor.latestEc.toFixed(2)} mS/cm (trend: ${sensor.ecTrend}). High salt stress can slow growth or burn leaf tips.`,
        action: 'Add fresh water to lower EC toward 1.6–1.8 mS/cm, then rebalance pH.',
      });
    } else if (sensor.ecTrend === 'rising') {
      recs.push({
        id: 'ec-rising',
        category: 'nutrition',
        priority: 'medium',
        title: 'EC is climbing — watch concentration',
        detail: `Latest EC ${sensor.latestEc.toFixed(2)} mS/cm is still acceptable, but the 2-week trend is rising (plants take up water faster than nutrients).`,
        action: 'When topping up the reservoir, prefer plain water over more concentrate until EC stabilises near 1.6.',
      });
    } else {
      recs.push({
        id: 'ec-ok',
        category: 'nutrition',
        priority: 'low',
        title: 'Nutrient strength looks balanced',
        detail: `EC ${sensor.latestEc.toFixed(2)} mS/cm suits vegetative lettuce growth.`,
        action: 'Maintain current dosing. For weeks 3–6, hold EC around 1.6–1.9 as heads fill out.',
      });
    }
  }

  if (sensor.lowWaterEvents > 0) {
    recs.push({
      id: 'water-level',
      category: 'nutrition',
      priority: 'medium',
      title: 'Prevent reservoir dry-downs',
      detail: `${sensor.lowWaterEvents} low-water reading(s) were logged. Roots exposed to air stress plants and spike EC.`,
      action: 'Refill before the weekly low, and set a mid-week water-level check (Wednesdays).',
    });
  }

  // ---- Lighting ----
  if (issue === 'stretching') {
    recs.push({
      id: 'light-stretch',
      category: 'lighting',
      priority: 'high',
      title: 'Correct stretching with stronger / closer light',
      detail: 'Latest lighting log reports stretching — plants are elongating toward insufficient light.',
      action: latestLight
        ? `Lower the panel from ${latestLight.lightPlantDistanceCm ?? '—'} cm to about ${Math.max(15, (latestLight.lightPlantDistanceCm ?? 22) - 3)} cm, or raise daily photoperiod toward 16 h. Keep left/right zones within 15% of centre lux.`
        : 'Reduce light–plant distance by ~3 cm and ensure 14–16 h photoperiod.',
    });
  } else if (issue === 'leaf_burn') {
    recs.push({
      id: 'light-burn',
      category: 'lighting',
      priority: 'high',
      title: 'Ease light intensity to stop leaf burn',
      detail: 'Leaf burn was logged — tips are scorched by excess PPFD or heat from the fixture.',
      action: 'Raise the light 3–5 cm and/or shorten the photoperiod by 1 hour for one week, then reassess.',
    });
  } else if (issue === 'yellowing') {
    recs.push({
      id: 'light-yellow',
      category: 'lighting',
      priority: 'medium',
      title: 'Yellowing — check light spectrum and nitrogen',
      detail: 'Yellowing can come from low N (nutrition) or an unbalanced spectrum under prolonged weak light.',
      action: 'Verify EC is ≥ 1.4 and pH ≤ 6.3. Keep full-spectrum LED on 14–16 h; avoid dimming the centre zone below ~12 000 lux.',
    });
  } else if (latestLight) {
    recs.push({
      id: 'light-ok',
      category: 'lighting',
      priority: 'low',
      title: 'Lighting schedule is on track',
      detail: `${latestLight.lightType} at ${latestLight.dailyLightHours ?? '—'} h/day, distance ${latestLight.lightPlantDistanceCm ?? '—'} cm.`,
      action: 'For weeks 3–4 keep 14–16 h and distance 18–22 cm. Re-measure left/centre/right lux every Monday.',
    });
  }

  if (latestLight?.zoneLightLevels) {
    const { left, center, right } = latestLight.zoneLightLevels;
    if (left !== null && center !== null && right !== null && center > 0) {
      const imbalance = Math.max(
        Math.abs(left - center) / center,
        Math.abs(right - center) / center,
      );
      if (imbalance > 0.2) {
        recs.push({
          id: 'light-zones',
          category: 'lighting',
          priority: 'medium',
          title: 'Even out zone light levels',
          detail: `Side zones differ from centre by ${(imbalance * 100).toFixed(0)}% (L ${left} / C ${center} / R ${right} lux).`,
          action: 'Centre the fixture or add side reflectors so edge plants (often P1/P10) receive similar PPFD.',
        });
      }
    }
  }

  // ---- Growth ----
  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    const weeks = Math.max(1, last.week - first.week);
    const heightGain = last.avgHeightCm - first.avgHeightCm;
    const weeklyGain = heightGain / weeks;

    if (weeklyGain < 1.0) {
      recs.push({
        id: 'growth-slow',
        category: 'growth',
        priority: 'medium',
        title: 'Growth rate is slower than expected',
        detail: `Average height rose from ${first.avgHeightCm} to ${last.avgHeightCm} cm (~${round1(weeklyGain)} cm/week).`,
        action: 'Confirm EC ≥ 1.4, photoperiod ≥ 14 h, and water temperature 18–22 °C before changing cultivar settings.',
      });
    } else {
      recs.push({
        id: 'growth-good',
        category: 'growth',
        priority: 'low',
        title: 'Steady canopy development',
        detail: `Mean height ${first.avgHeightCm} → ${last.avgHeightCm} cm; leaf area ${first.avgLeafAreaCm2} → ${last.avgLeafAreaCm2} cm² across ${points.length} measurement points.`,
        action: 'Continue Mon/Wed/Fri phenotyping. Expect faster leaf-area gains in weeks 3–4 if nutrition and light stay stable.',
      });
    }

    const stemRatio = last.avgHeightCm > 0 ? last.avgStemCm / last.avgHeightCm : 0;
    if (stemRatio > 0.55) {
      recs.push({
        id: 'growth-leggy',
        category: 'growth',
        priority: 'medium',
        title: 'Plants are becoming leggy',
        detail: `Stem length is ${(stemRatio * 100).toFixed(0)}% of plant height — a sign of shade avoidance.`,
        action: 'Increase light intensity or reduce distance; avoid extending the dark period beyond 8–10 h.',
      });
    }
  }

  recs.push({
    id: 'general-forward',
    category: 'general',
    priority: 'low',
    title: 'Plan for weeks 3–6',
    detail: 'Head formation needs stable EC, consistent photoperiod, and Monday photo sessions for leaf-area AI.',
    action: 'Keep the Mon/Wed/Fri measurement cadence, Monday lighting log + 11 photos, and export the dataset after week 6 for cross-school comparison.',
  });

  const priorityRank: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

export function buildGrowthReport(
  phenotype: PhenotypeRecord[],
  sensors: SensorReading[],
  lighting: LightingLog[],
): GrowthReport {
  const points = buildGrowthPoints(phenotype);
  const plantSummaries = buildPlantSummaries(phenotype);
  const sensor = buildSensorSnapshot(sensors);
  const recommendations = buildRecommendations(points, sensor, lighting);

  let avgWeeklyHeightGainCm: number | null = null;
  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    const weeks = Math.max(1, last.week - first.week);
    avgWeeklyHeightGainCm = round1((last.avgHeightCm - first.avgHeightCm) / weeks);
  }

  return {
    points,
    plantSummaries,
    sensor,
    lighting: [...lighting].sort((a, b) => a.week - b.week),
    avgWeeklyHeightGainCm,
    recommendations,
  };
}
