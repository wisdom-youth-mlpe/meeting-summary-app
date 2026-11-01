const request = require('supertest');
const app = require('../../server');
const Meeting = require('../../models/Meeting');
const { users, auth, seedZones } = require('../helpers');

const attend = (name, status, reason = '') => ({ name, status, reason });

beforeEach(async () => {
  await seedZones();
  await Meeting.create([
    { meetingId: 'W1', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-14',
      attendance: [attend('Ali', 'leave'), attend('Banu', 'present')] },
    { meetingId: 'W2', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-21',
      attendance: [attend('Ali', 'leave'), attend('Banu', 'present')] },
    { meetingId: 'W3', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-28',
      attendance: [attend('Ali', 'leave', 'Work'), attend('Banu', 'leave', 'Sick')] },
  ]);
});

const stats = (user, query = '') =>
  request(app).get(`/api/dashboard/stats?startDate=2026-10-01&endDate=2026-10-31${query}`).set(auth(user));

describe('GET /api/dashboard/stats', () => {
  test('counts meetings and zones with and without reports', async () => {
    const { body } = await stats(users.admin);
    expect(body.data).toMatchObject({ totalMeetings: 3, totalZones: 2, missingReports: 1 });
    expect(body.data.zonesWithMeetings).toEqual([{ zoneName: 'Zone One', meetingCount: 3, lastMeetingDate: '2026-10-28' }]);
    expect(body.data.noMeetingZones.map(z => z.zoneName)).toEqual(['Zone Two']);
  });

  test('attendance register and three-in-a-row leave list', async () => {
    const { body } = await stats(users.admin);
    const banu = body.data.attendanceRegister.find(p => p.name === 'Banu');
    expect(banu).toMatchObject({ total: 3, present: 2, leave: 1, percentage: '66.7' });

    expect(body.data.consecutiveAbsence).toEqual([
      expect.objectContaining({ name: 'Ali', zone: 'Zone One', consecutiveLeaves: 3 }),
    ]);
  });

  test('latest leaves come from the newest meeting', async () => {
    const { body } = await stats(users.admin);
    expect(body.data.latestLeaves.map(l => [l.name, l.reason])).toEqual([['Ali', 'Work'], ['Banu', 'Sick']]);
  });

  test('date range limits meetings', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats?startDate=2026-10-25&endDate=2026-10-31').set(auth(users.admin));
    expect(res.body.data.totalMeetings).toBe(1);
  });

  test('zone admin "All" view covers only their zones', async () => {
    const other = { ...users.zoneAdmin, zoneAccess: ['Z2'] };
    const { body } = await stats(other);
    expect(body.data.totalZones).toBe(1);
    expect(body.data.totalMeetings).toBe(0);
  });
});

describe('QHLS endpoints', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-10-30T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
    await Meeting.updateOne({ meetingId: 'W3' }, {
      qhls: [{ unit: 'Unit A', status: 'nadannu', hasQhls: true, male: 2, female: 5 }],
    });
  });

  afterEach(() => jest.useRealTimers());

  test('/qhls/week/:offset returns rows and totals', async () => {
    const res = await request(app).get('/api/qhls/week/0').set(auth(users.admin));
    expect(res.body.responses.map(r => r.unit)).toEqual(['Unit A']);
    expect(res.body.stats.totalParticipants).toBe(7);
  });

  test('/qhls/missing/:offset lists units with no row', async () => {
    const res = await request(app).get('/api/qhls/missing/0').set(auth(users.admin));
    expect(res.body.missing.totalMissing).toBe(3);
  });

  test('/qhls/dashboard includes the week and grouped rows', async () => {
    const res = await request(app).get('/api/qhls/dashboard?weekOffset=0').set(auth(users.admin));
    expect(res.body.data).toMatchObject({ weekStart: '2026-10-28', weekEnd: '2026-11-03' });
    expect(Object.keys(res.body.data.groupedResponses)).toEqual(['Zone One']);
  });
});

describe('dashboard access and per-zone people', () => {
  test('a zone admin asking for another zone gets 403; own zone and All work', async () => {
    expect((await stats(users.zoneAdmin, '&zoneId=Zone Two')).status).toBe(403);
    expect((await stats(users.zoneAdmin, '&zoneId=Zone One')).status).toBe(200);
    expect((await stats(users.zoneAdmin, '&zoneId=All')).status).toBe(200);
  });

  test('admin can pick any zone', async () => {
    const res = await stats(users.admin, '&zoneId=Zone Two');
    expect(res.status).toBe(200);
    expect(res.body.data.totalMeetings).toBe(0);
  });

  test('the same name in two zones stays two people', async () => {
    await Meeting.create({
      meetingId: 'Z2-1', zoneId: 'Z2', zoneName: 'Zone Two', date: '2026-10-28',
      attendance: [attend('Banu', 'present')],
    });
    const { body } = await stats(users.admin);
    const banus = body.data.attendanceRegister.filter(p => p.name === 'Banu');
    expect(banus.map(p => [p.zone, p.total])).toEqual(
      expect.arrayContaining([['Zone One', 3], ['Zone Two', 1]])
    );
    expect(new Set(banus.map(p => p.zoneKey)).size).toBe(2);
  });

  test('register lists the lowest attendance first', async () => {
    const { body } = await stats(users.admin);
    const pct = body.data.attendanceRegister.map(p => parseFloat(p.percentage));
    expect(pct).toEqual([...pct].sort((a, b) => a - b));
    expect(body.data.attendanceRegister[0].name).toBe('Ali');
  });
});

describe('consecutive leaves look past the date filter', () => {
  test('a one-week view still finds a three-meeting streak', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats?startDate=2026-10-25&endDate=2026-10-31').set(auth(users.admin));
    expect(res.body.data.totalMeetings).toBe(1);
    expect(res.body.data.consecutiveAbsence).toEqual([
      expect.objectContaining({ name: 'Ali', zone: 'Zone One', consecutiveLeaves: 3 }),
    ]);
  });

  test('meetings after the end date are ignored', async () => {
    await Meeting.create({
      meetingId: 'W4', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-11-04',
      attendance: [attend('Ali', 'present')],
    });
    const { body } = await stats(users.admin);
    expect(body.data.consecutiveAbsence.map(p => p.name)).toEqual(['Ali']);
  });

  test('attending the latest meeting ends the streak', async () => {
    await Meeting.create({
      meetingId: 'W4', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-30',
      attendance: [attend('Ali', 'present')],
    });
    const { body } = await stats(users.admin);
    expect(body.data.consecutiveAbsence).toEqual([]);
  });
});

describe('QHLS not held', () => {
  test('lists നടന്നിട്ടില്ല units from each zone\'s latest meeting in range', async () => {
    await Meeting.updateOne({ meetingId: 'W2' }, { qhls: [{ unit: 'Unit A', status: 'nadannittilla' }] });
    await Meeting.updateOne({ meetingId: 'W3' }, {
      qhls: [
        { unit: 'Unit B', status: 'nadannittilla' },
        { unit: 'Unit A', status: 'nadannu' },
      ],
    });
    const { body } = await stats(users.admin);
    expect(body.data.qhlsMissingBranches).toEqual([{ branch: 'Unit B', zone: 'Zone One' }]);
  });

  test('older meetings without statuses report nothing', async () => {
    await Meeting.updateOne({ meetingId: 'W3' }, { qhls: [{ unit: 'Unit A', hasQhls: true }] });
    const { body } = await stats(users.admin);
    expect(body.data.qhlsMissingBranches).toEqual([]);
  });
});
