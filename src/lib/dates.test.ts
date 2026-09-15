import { describe, expect, it } from 'vitest';
import { formatUptime } from './dates';

describe('formatUptime', () => {
  it('is all zeros at the epoch', () => {
    const epoch = new Date('2023-08-01T00:00:00+05:30');
    expect(formatUptime(epoch, epoch)).toBe('0000:00:00:00');
  });

  it('formats days/hours/minutes/seconds elapsed', () => {
    const epoch = new Date('2023-08-01T00:00:00Z');
    const now = new Date(epoch.getTime() + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
    expect(formatUptime(epoch, now)).toBe('0002:03:04:05');
  });

  it('clamps to zero if now precedes epoch', () => {
    const epoch = new Date('2023-08-01T00:00:00Z');
    const now = new Date('2020-01-01T00:00:00Z');
    expect(formatUptime(epoch, now)).toBe('0000:00:00:00');
  });
});
