import AsyncStorage from '@react-native-async-storage/async-storage';
import type {SessionSummary} from '../domain/session';

const SESSION_KEY = '@timewatch:sessions:v1';

export type SessionRepository = {
  list(): Promise<SessionSummary[]>;
  save(session: SessionSummary): Promise<void>;
};

export function createSessionRepository(): SessionRepository {
  return {
    async list() {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as SessionSummary[];
      return parsed.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    async save(session) {
      const existing = await this.list();
      const withoutDuplicate = existing.filter(item => item.id !== session.id);
      const next = [session, ...withoutDuplicate].sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      );
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    },
  };
}
