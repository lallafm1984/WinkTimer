import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeAlarms,
  type ScheduledAlarm,
} from '../domain/alarm';

const ALARMS_STORAGE_KEY = '@winktimer:alarms:v1';

export type AlarmRepository = {
  list(): Promise<ScheduledAlarm[]>;
  saveAll(alarms: ScheduledAlarm[]): Promise<void>;
};

function parseStoredJson(raw: string | null) {
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createAlarmRepository(): AlarmRepository {
  return {
    async list() {
      const raw = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      const parsed = parseStoredJson(raw);

      if (raw !== null && parsed === null) {
        await AsyncStorage.removeItem(ALARMS_STORAGE_KEY);
        return [];
      }

      return normalizeAlarms(parsed);
    },

    async saveAll(alarms) {
      const normalized = normalizeAlarms(alarms);

      await AsyncStorage.setItem(
        ALARMS_STORAGE_KEY,
        JSON.stringify(normalized),
      );
    },
  };
}
