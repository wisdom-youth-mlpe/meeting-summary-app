import { describe, test, expect, vi } from 'vitest';
import { getReportingWeek, toDateKey, loadWeekStart } from '../services/week';
import { getSetting } from '../services/api';

vi.mock('../services/api', () => ({ getSetting: vi.fn() }));

const range = (startDay, today, offset = 0) => {
  const { start, end } = getReportingWeek(startDay, new Date(today), offset);
  return [toDateKey(start), toDateKey(end)];
};

describe('getReportingWeek', () => {
  test.each([
    // [startDay, today, offset, start, end]
    [0, '2026-11-04T12:00:00', 0, '2026-11-01', '2026-11-07'], // Wednesday meeting, Sunday weeks: this week
    [0, '2026-11-04T12:00:00', -1, '2026-10-25', '2026-10-31'], // ...and last week
    [0, '2026-11-01T09:00:00', 0, '2026-11-01', '2026-11-07'], // the start day itself opens a new week
    [0, '2026-10-31T23:00:00', 0, '2026-10-25', '2026-10-31'], // Saturday closes the week
    [1, '2026-11-04T12:00:00', 0, '2026-11-02', '2026-11-08'], // admin set Monday
    [3, '2026-11-04T12:00:00', 0, '2026-11-04', '2026-11-10'], // admin set Wednesday
    [0, '2026-11-02T12:00:00', -1, '2026-10-25', '2026-10-31'], // last week ends in the previous month
    [0, '2027-01-01T12:00:00', 0, '2026-12-27', '2027-01-02'], // crosses a year
  ])('start %i on %s offset %i', (day, today, offset, start, end) => {
    expect(range(day, today, offset)).toEqual([start, end]);
  });

  test('start and end are local midnight', () => {
    const { start, end } = getReportingWeek(0, new Date('2026-11-04T23:59:00'));
    expect([start.getHours(), end.getHours()]).toEqual([0, 0]);
  });
});

describe('toDateKey', () => {
  test('pads month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('loadWeekStart', () => {
  test('reads the admin setting', async () => {
    getSetting.mockResolvedValue({ success: true, value: '1' });
    expect(await loadWeekStart()).toBe(1);
    expect(getSetting).toHaveBeenCalledWith('reporting_week_start');
  });

  test('falls back to Sunday when the setting is missing or fails', async () => {
    getSetting.mockResolvedValue({ success: true, value: null });
    expect(await loadWeekStart()).toBe(0);
    getSetting.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadWeekStart()).toBe(0);
  });
});
