import {
  getAdDiagnosticLogEntries,
  getAdDiagnosticLogText,
  recordAdDiagnosticLog,
  resetAdDiagnosticLogsForTests,
} from '../adDiagnosticLog';

describe('adDiagnosticLog', () => {
  beforeEach(() => {
    resetAdDiagnosticLogsForTests();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    resetAdDiagnosticLogsForTests();
    jest.restoreAllMocks();
  });

  it('serializes rewarded ad error payloads for in-app diagnostics', () => {
    const entry = recordAdDiagnosticLog(
      'rewarded.load_error',
      {
        code: 'googleMobileAds/no-fill',
        message: '[googleMobileAds/no-fill] No fill',
        userInfo: {code: 'no-fill', message: 'No fill'},
      },
      1_700_000_000_000,
    );

    expect(entry.message).toContain('rewarded.load_error');
    expect(entry.message).toContain('code=googleMobileAds/no-fill');
    expect(entry.message).toContain(
      'message="[googleMobileAds/no-fill] No fill"',
    );
    expect(entry.message).toContain(
      'userInfo={"code":"no-fill","message":"No fill"}',
    );
    expect(console.warn).toHaveBeenCalledWith('[WinkTimerAds]', entry.message);
  });

  it('formats the visible log text in newest-first order', () => {
    recordAdDiagnosticLog('rewarded.load_request', {adUnitId: 'unit-a'}, 1000);
    recordAdDiagnosticLog(
      'rewarded.load_error',
      {code: 'googleMobileAds/no-fill', message: 'No fill'},
      2000,
    );

    expect(getAdDiagnosticLogText(getAdDiagnosticLogEntries())).toBe(
      [
        '[1970-01-01T00:00:02.000Z] rewarded.load_error code=googleMobileAds/no-fill message="No fill"',
        '[1970-01-01T00:00:01.000Z] rewarded.load_request adUnitId=unit-a',
      ].join('\n'),
    );
  });
});
