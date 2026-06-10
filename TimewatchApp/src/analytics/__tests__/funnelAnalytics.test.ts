import analytics from '@react-native-firebase/analytics';
import {
  recordFunnelEvent,
  resetFunnelEventSessionForTests,
} from '../funnelAnalytics';

describe('funnelAnalytics', () => {
  const mockedAnalytics = analytics as unknown as jest.Mock;
  let logEvent: jest.Mock<Promise<void>, [string, Record<string, unknown>]>;

  beforeEach(() => {
    logEvent = jest
      .fn<Promise<void>, [string, Record<string, unknown>]>()
      .mockResolvedValue(undefined);
    mockedAnalytics.mockReturnValue({logEvent});
    resetFunnelEventSessionForTests();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    resetFunnelEventSessionForTests();
    jest.restoreAllMocks();
  });

  it('sends normalized funnel events to Firebase Analytics', async () => {
    await recordFunnelEvent('wt_mode_select_attempt', {
      mode_id: 'lookPause',
      requires_reward: true,
      ignored: undefined,
    });

    expect(logEvent).toHaveBeenCalledWith('wt_mode_select_attempt', {
      mode_id: 'lookPause',
      requires_reward: 1,
    });
  });

  it('records each once-per-session key once', async () => {
    await recordFunnelEvent(
      'wt_camera_mode_start',
      {mode_id: 'lookPause'},
      {oncePerSessionKey: 'start:lookPause:1000'},
    );
    await recordFunnelEvent(
      'wt_camera_mode_start',
      {mode_id: 'lookPause'},
      {oncePerSessionKey: 'start:lookPause:1000'},
    );

    expect(logEvent).toHaveBeenCalledTimes(1);
  });
});
