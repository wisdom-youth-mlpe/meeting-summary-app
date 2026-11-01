const qhlsService = require('../../services/qhlsService');
const Meeting = require('../../models/Meeting');
const { seedZones } = require('../helpers');

describe('getWeekBoundaries (Wednesday to Tuesday)', () => {
  test.each([
    ['2026-10-28', '2026-10-28', '2026-11-03'], // Wednesday
    ['2026-11-03', '2026-10-28', '2026-11-03'], // Tuesday
    ['2026-11-01', '2026-10-28', '2026-11-03'], // Sunday
    ['2026-10-01', '2026-09-30', '2026-10-06'], // crosses a month
  ])('%s', (date, weekStart, weekEnd) => {
    expect(qhlsService.getWeekBoundaries(date)).toEqual({ weekStart, weekEnd });
  });
});

describe('week queries', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-10-30T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
    await seedZones();
    await Meeting.create({
      meetingId: 'M1', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-28',
      qhls: [
        { unit: 'Unit A', status: 'nadannu', hasQhls: true, male: 4, female: 3 },
        { unit: 'Unit B', status: 'illa', hasQhls: false },
      ],
    });
    // Previous week, must not count
    await Meeting.create({
      meetingId: 'M0', zoneId: 'Z2', zoneName: 'Zone Two', date: '2026-10-21',
      qhls: [{ unit: 'Unit C', hasQhls: true, male: 1, female: 1 }],
    });
  });

  afterEach(() => jest.useRealTimers());

  test('getQHLSByWeek returns this week\'s rows only', async () => {
    const rows = await qhlsService.getQHLSByWeek(0);
    expect(rows.map(r => r.unit)).toEqual(['Unit A', 'Unit B']);
    expect(rows[1].hasQhls).toBe(false);

    const last = await qhlsService.getQHLSByWeek(-1);
    expect(last.map(r => r.unit)).toEqual(['Unit C']);
  });

  test('getQHLSStats counts only units that have QHLS', async () => {
    expect(await qhlsService.getQHLSStats(0)).toEqual({
      totalResponses: 1, totalMales: 4, totalFemales: 3, totalParticipants: 7,
    });
  });

  test('getMissingUnits lists units with no row this week', async () => {
    const missing = await qhlsService.getMissingUnits(0);
    expect(missing.totalUnits).toBe(4);
    expect(missing.byZone).toEqual({ 'Zone Two': ['Unit C', 'Unit D'] });
    expect(missing.totalMissing).toBe(2);
  });
});

describe('getReportingWeek (weeks start on the meeting day)', () => {
  afterEach(() => jest.useRealTimers());

  const at = (iso) => jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate'] });

  test.each([
    // [today, meetingDay, offset, weekStart, weekEnd]
    ['2026-10-30T10:00:00Z', 3, 0, '2026-10-28', '2026-11-03'], // Friday, Wednesday meetings
    ['2026-10-28T10:00:00Z', 3, 0, '2026-10-21', '2026-10-27'], // meeting day reports the week just ended
    ['2026-10-30T10:00:00Z', 1, 0, '2026-10-26', '2026-11-01'], // Monday meetings
    ['2026-10-30T10:00:00Z', 3, -1, '2026-10-21', '2026-10-27'], // last week
    ['2026-11-02T10:00:00Z', 3, 0, '2026-10-28', '2026-11-03'], // spans two months
  ])('%s day %i offset %i', (now, day, offset, weekStart, weekEnd) => {
    at(now);
    expect(qhlsService.getReportingWeek(day, offset)).toEqual({ weekStart, weekEnd });
  });
});
