/**
 * Scheduling helpers for the 6-week (42-day) experimental period.
 *
 * Manual phenotyping happens on Mondays, Wednesdays and Fridays
 * (3 x 6 weeks = 18 measurement points). Lighting logs and photo
 * uploads happen on Mondays (6 sessions).
 */

export const EXPERIMENT_WEEKS = 6;
export const EXPERIMENT_DAYS = 42;
export const TOTAL_MEASUREMENT_POINTS = 18;

const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Day of experiment, 1-based. Day 1 == startDate. */
export function dayOfExperiment(startDate: string, date: Date): number {
  const start = parseISODate(startDate);
  return Math.floor((date.getTime() - start.getTime()) / DAY_MS) + 1;
}

/** Week of experiment, 1-based (1..6), or null when outside the period. */
export function weekOfExperiment(startDate: string, date: Date): number | null {
  const day = dayOfExperiment(startDate, date);
  if (day < 1 || day > EXPERIMENT_DAYS) return null;
  return Math.ceil(day / 7);
}

export interface MeasurementDay {
  date: string;
  week: number;
  /** 1..18 for Mon/Wed/Fri phenotyping points. */
  measurementPoint: number;
  weekday: 'Monday' | 'Wednesday' | 'Friday';
}

/**
 * All 18 Mon/Wed/Fri phenotyping days for the experiment.
 * The first Monday on or after the start date anchors the schedule.
 */
export function measurementDays(startDate: string): MeasurementDay[] {
  const start = parseISODate(startDate);
  const firstMonday = new Date(start);
  while (firstMonday.getDay() !== 1) {
    firstMonday.setTime(firstMonday.getTime() + DAY_MS);
  }
  const days: MeasurementDay[] = [];
  const weekdays: Array<{ offset: number; name: MeasurementDay['weekday'] }> = [
    { offset: 0, name: 'Monday' },
    { offset: 2, name: 'Wednesday' },
    { offset: 4, name: 'Friday' },
  ];
  let point = 0;
  for (let week = 0; week < EXPERIMENT_WEEKS; week++) {
    for (const wd of weekdays) {
      point += 1;
      const d = new Date(firstMonday.getTime() + (week * 7 + wd.offset) * DAY_MS);
      days.push({
        date: toISODate(d),
        week: week + 1,
        measurementPoint: point,
        weekday: wd.name,
      });
    }
  }
  return days;
}

/** The 6 Mondays used for lighting logs and photo sessions. */
export function mondaySessions(startDate: string): Array<{ date: string; week: number }> {
  return measurementDays(startDate)
    .filter((d) => d.weekday === 'Monday')
    .map((d) => ({ date: d.date, week: d.week }));
}

/** The scheduled day matching `date` (today by default), if any. */
export function findScheduledDay(
  startDate: string,
  date: Date = new Date(),
): MeasurementDay | undefined {
  const iso = toISODate(date);
  return measurementDays(startDate).find((d) => d.date === iso);
}

/** The next upcoming (or current) scheduled day, if the experiment is not over. */
export function nextScheduledDay(
  startDate: string,
  date: Date = new Date(),
): MeasurementDay | undefined {
  const iso = toISODate(date);
  return measurementDays(startDate).find((d) => d.date >= iso);
}
