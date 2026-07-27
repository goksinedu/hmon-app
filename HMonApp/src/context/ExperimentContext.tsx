import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loadSampleData } from '../lib/sampleData';
import { Experiment } from '../lib/types';

const STORAGE_KEY = 'hmon.activeExperiment';
/** Bump to force-reseeding the 2-week demo dataset for existing visitors. */
const SAMPLE_SEED_KEY = 'hmon.sampleSeeded.v5';

interface ExperimentContextValue {
  experiment: Experiment | null;
  loading: boolean;
  setExperiment: (exp: Experiment | null) => Promise<void>;
}

const ExperimentContext = createContext<ExperimentContextValue>({
  experiment: null,
  loading: true,
  setExperiment: async () => {},
});

export function ExperimentProvider({ children }: { children: React.ReactNode }) {
  const [experiment, setExperimentState] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const seeded = await AsyncStorage.getItem(SAMPLE_SEED_KEY);
        if (!seeded) {
          // First visit (or seed version bump): populate a ready-made 2-week demo.
          const exp = await loadSampleData();
          setExperimentState(exp);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(exp));
          await AsyncStorage.setItem(SAMPLE_SEED_KEY, '1');
          return;
        }
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setExperimentState(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setExperiment = useCallback(async (exp: Experiment | null) => {
    setExperimentState(exp);
    if (exp) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(exp));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({ experiment, loading, setExperiment }),
    [experiment, loading, setExperiment],
  );

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment() {
  return useContext(ExperimentContext);
}
