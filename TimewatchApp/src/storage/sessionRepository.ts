import AsyncStorage from '@react-native-async-storage/async-storage';
import type {SessionSummary} from '../domain/session';

const SESSION_KEY = '@winktimer:sessions:v1';

export type SessionRepository = {
  list(): Promise<SessionSummary[]>;
  save(session: SessionSummary): Promise<void>;
};

async function readSessions(): Promise<SessionSummary[]> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return [];
    }

    return parsed.sort((a, b) => b.startedAt.localeCompare(a.startedAt)) as SessionSummary[];
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return [];
  }
}

export function createSessionRepository(): SessionRepository {
  return {
    async list() {
      return readSessions();
    },

    async save(session) {
      const existing = await readSessions();
      const withoutDuplicate = existing.filter(item => item.id !== session.id);
      const next = [session, ...withoutDuplicate].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      );
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    },
  };
}
