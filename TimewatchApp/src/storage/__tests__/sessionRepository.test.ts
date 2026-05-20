import AsyncStorage from '@react-native-async-storage/async-storage';
import {createSessionRepository} from '../sessionRepository';
import type {SessionSummary} from '../../domain/session';

const session: SessionSummary = {
  id: 'session-1',
  startedAt: '2026-05-20T00:00:00.000Z',
  endedAt: '2026-05-20T00:25:00.000Z',
  focusDurationMs: 1200000,
  lookPausedDurationMs: 300000,
  lookPauseCount: 3,
  targetEnabled: true,
  targetDurationMs: 1500000,
  targetCompleted: false,
  sensitivity: 'normal',
  normalTimerMode: false,
};

describe('sessionRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and lists sessions newest first', async () => {
    const repository = createSessionRepository();

    await repository.save({...session, id: 'older', startedAt: '2026-05-19T00:00:00.000Z'});
    await repository.save(session);

    const sessions = await repository.list();

    expect(sessions.map(item => item.id)).toEqual(['session-1', 'older']);
  });

  it('returns an empty list when storage is empty', async () => {
    const repository = createSessionRepository();

    await expect(repository.list()).resolves.toEqual([]);
  });
});
