import {createMockGazeDetector} from '../GazeDetector';

describe('GazeDetector', () => {
  it('emits the configured mock status', () => {
    const detector = createMockGazeDetector('notLooking');
    const readings = detector.getLatestReading(1000);

    expect(readings).toEqual({status: 'notLooking', confidence: 1, atMs: 1000});
  });

  it('can switch mock status', () => {
    const detector = createMockGazeDetector('unknown');

    detector.setMockStatus('looking');

    expect(detector.getLatestReading(2000).status).toBe('looking');
  });
});
