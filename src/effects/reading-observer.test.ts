import { describe, expect, it } from 'vitest';
import { activeIndex, formatClock, formatDuration, readProgress } from './reading-observer';

describe('formatClock', () => {
  it('shows minutes and seconds, then hours', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(252_400)).toBe('4:12');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });
});

describe('formatDuration', () => {
  it('spells out the time for the closing line', () => {
    expect(formatDuration(462_000)).toBe('7 minutes and 42 seconds');
    expect(formatDuration(60_000)).toBe('1 minute');
    expect(formatDuration(1_000)).toBe('1 second');
    expect(formatDuration(0)).toBe('1 second');
  });
});

describe('readProgress', () => {
  it('runs from the article entering the screen to its end coming into view', () => {
    expect(readProgress(900, 3000, 900)).toBe(0);
    expect(readProgress(-600, 3000, 900)).toBeCloseTo(0.5);
    expect(readProgress(-5000, 3000, 900)).toBe(1);
    expect(readProgress(0, 0, 900)).toBe(0);
  });
});

describe('activeIndex', () => {
  it('picks the last heading above the reading line', () => {
    expect(activeIndex([400, 900], 270)).toBe(-1);
    expect(activeIndex([-200, 100, 900], 270)).toBe(1);
  });
});
