import { describe, test, expect, vi } from 'vitest';
import { getReportingWeek, toDateKey, loadMeetingDay } from '../services/week';
import { getSetting } from '../services/api';

vi.mock('../services/api', () => ({ getSetting: vi.fn() }));

const range = (meetingDay, today) => {
  const { start, end } = getReportingWeek(meetingDay, new Date(today));
  return [toDateKey(start), toDateKey(end)];
};

describe('getReportingWeek', () => {
  test.each([
    // [meetingDay, today, start, end]
    [3, '2026-10-30T12:00:00', '2026-10-28', '2026-11-03'], // Friday, Wednesday meetings
    [3, '2026-10-28T09:00:00', '2026-10-21', '2026-10-27'], // meeting day reports the week just ended
    [1, '2026-10-30T12:00:00', '2026-10-26', '2026-11-01'], // Monday meetings
    [3, '2026-11-02T12:00:00', '2026-10-28', '2026-11-03'], // week starts in the previous month
    [0, '2027-01-01T12:00:00', '2026-12-27', '2027-01-02'], // crosses a year
  ])('meeting day %i on %s', (day, today, start, end) => {
    expect(range(day, today)).toEqual([start, end]);
  });

  test('start and end are local midnight', () => {
    const { start, end } = getReportingWeek(3, new Date('2026-10-30T23:59:00'));
    expect([start.getHours(), end.getHours()]).toEqual([0, 0]);
  });
});

describe('toDateKey', () => {
  test('pads month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('loadMeetingDay', () => {
  test('reads the setting', async () => {
    getSetting.mockResolvedValue({ success: true, value: '1' });
    expect(await loadMeetingDay()).toBe(1);
  });

  test('falls back to Wednesday when the setting is missing or fails', async () => {
    getSetting.mockResolvedValue({ success: true, value: null });
    expect(await loadMeetingDay()).toBe(3);
    getSetting.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadMeetingDay()).toBe(3);
  });
});
