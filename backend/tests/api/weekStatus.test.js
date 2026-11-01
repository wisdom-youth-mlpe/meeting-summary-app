const request = require('supertest');
const app = require('../../server');
const Meeting = require('../../models/Meeting');
const Settings = require('../../models/Settings');
const { users, auth, seedZones } = require('../helpers');

// Friday 30 Oct 2026; with Wednesday meetings the week is 28 Oct - 3 Nov
beforeEach(async () => {
  jest.useFakeTimers({ now: new Date('2026-10-30T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  await seedZones();
});

afterEach(() => jest.useRealTimers());

const weekStatus = (user, offset = 0) =>
  request(app).get(`/api/qhls/week-status?weekOffset=${offset}`).set(auth(user));

describe('GET /api/qhls/week-status', () => {
  beforeEach(async () => {
    await Meeting.create({
      meetingId: 'M1', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-28',
      qhls: [
        { unit: 'Unit A', status: 'nadannu' },
        { unit: 'Unit B', status: 'illa', hasQhls: false },
        { unit: 'Extra Unit', status: 'nadannittilla' },
      ],
    });
  });

  test('groups every unit of every zone by status', async () => {
    const { body } = await weekStatus(users.admin);
    expect(body.data).toMatchObject({ weekStart: '2026-10-28', weekEnd: '2026-11-03' });

    const [one, two] = body.data.zones;
    expect(one).toMatchObject({
      zone: 'Zone One', meetingDate: '2026-10-28',
      held: ['Unit A'], notHeld: ['Extra Unit'], noQhls: ['Unit B'], notReported: [],
    });
    expect(two).toMatchObject({ zone: 'Zone Two', meetingDate: null, notReported: ['Unit C', 'Unit D'] });
    expect(body.data.totals).toEqual({ held: 1, notHeld: 1, noQhls: 1, notReported: 2, units: 5 });
  });

  test('a zone admin sees only their zone', async () => {
    const { body } = await weekStatus(users.zoneAdmin);
    expect(body.data.zones.map(z => z.zone)).toEqual(['Zone One']);
  });

  test('the newest meeting of the week wins for each unit', async () => {
    await Meeting.create({
      meetingId: 'M2', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-31',
      qhls: [{ unit: 'Unit B', status: 'nadannu' }],
    });
    const { body } = await weekStatus(users.admin);
    expect(body.data.zones[0]).toMatchObject({
      meetingDate: '2026-10-31', held: ['Unit A', 'Unit B'], noQhls: [],
    });
  });

  test('older rows without a status are read from their fields', async () => {
    await Meeting.create({
      meetingId: 'M3', zoneId: 'Z2', zoneName: 'Zone Two', date: '2026-10-29',
      qhls: [{ unit: 'Unit C', hasQhls: true, male: 4 }, { unit: 'Unit D', hasQhls: false }],
    });
    const { body } = await weekStatus(users.admin);
    expect(body.data.zones[1]).toMatchObject({ held: ['Unit C'], noQhls: ['Unit D'] });
  });

  test('previous week and the meeting-day setting move the window', async () => {
    const last = await weekStatus(users.admin, -1);
    expect(last.body.data).toMatchObject({ weekStart: '2026-10-21', weekEnd: '2026-10-27' });
    expect(last.body.data.totals.notReported).toBe(4);

    await Settings.create({ key: 'district_meeting_day', value: 1 });
    const monday = await weekStatus(users.admin);
    expect(monday.body.data).toMatchObject({ weekStart: '2026-10-26', weekEnd: '2026-11-01' });
  });
});
