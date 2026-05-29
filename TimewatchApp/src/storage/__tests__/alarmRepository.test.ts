import AsyncStorage from '@react-native-async-storage/async-storage';
import {createDefaultAlarm} from '../../domain/alarm';
import {createAlarmRepository} from '../alarmRepository';

describe('alarmRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and lists alarms in creation order', async () => {
    const repository = createAlarmRepository();
    const morning = {
      ...createDefaultAlarm(1000),
      id: 'morning',
      label: 'MORNING',
      hour: 7,
    };
    const evening = {
      ...createDefaultAlarm(2000),
      id: 'evening',
      label: 'EVENING',
      hour: 21,
    };

    await repository.saveAll([evening, morning]);

    await expect(repository.list()).resolves.toEqual([morning, evening]);
  });

  it('normalizes corrupt storage back to an empty list', async () => {
    await AsyncStorage.setItem('@winktimer:alarms:v1', '{bad json');

    await expect(createAlarmRepository().list()).resolves.toEqual([]);
    await expect(
      AsyncStorage.getItem('@winktimer:alarms:v1'),
    ).resolves.toBeNull();
  });
});
