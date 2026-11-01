const request = require('supertest');
const app = require('../../server');
const Meeting = require('../../models/Meeting');
const { users, auth, seedZones, meetingBody } = require('../helpers');

beforeEach(seedZones);

const create = (user, body = meetingBody()) =>
  request(app).post('/api/meetings').set(auth(user)).send(body);

const seedMeeting = (overrides = {}) => Meeting.create({
  meetingId: 'M-Z1', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-28',
  minutes: ['Old'], attendance: [{ name: 'Person P', status: 'present' }],
  ...overrides,
});

describe('POST /api/meetings', () => {
  test('zone admin saves a meeting for their zone with QHLS statuses', async () => {
    const res = await create(users.zoneAdmin);
    expect(res.status).toBe(200);

    const saved = await Meeting.findOne({ meetingId: res.body.data.meetingId }).lean();
    expect(saved.zoneId).toBe('Z1');
    expect(saved.attendance).toHaveLength(2);
    expect(saved.qhls.map(r => [r.unit, r.status])).toEqual([['Unit A', 'nadannu'], ['Unit B', 'nadannittilla']]);
  });

  test('zoneId is looked up from the zone name when missing', async () => {
    const res = await create(users.admin, meetingBody({ zoneId: undefined, zoneName: 'Zone Two' }));
    const saved = await Meeting.findOne({ meetingId: res.body.data.meetingId });
    expect(saved.zoneId).toBe('Z2');
  });

  test('zone admin cannot save for another zone', async () => {
    const res = await create(users.zoneAdmin, meetingBody({ zoneId: 'Z2', zoneName: 'Zone Two' }));
    expect(res.status).toBe(403);
    expect(await Meeting.countDocuments()).toBe(0);
  });

  test('district admin and users without a role cannot save', async () => {
    expect((await create(users.districtAdmin)).status).toBe(403);
    expect((await create(users.noRole)).status).toBe(403);
  });

  test.each([
    ['zoneName', { zoneName: '' }],
    ['date', { date: '' }],
    ['minutes', { minutes: undefined }],
    ['attendance as array', { attendance: 'x' }],
  ])('rejects a meeting without %s', async (_, override) => {
    const res = await create(users.admin, meetingBody(override));
    expect(res.status).toBe(400);
  });

  test('rejects an unknown QHLS status', async () => {
    const res = await create(users.admin, meetingBody({ qhls: [{ unit: 'Unit A', status: 'maybe' }] }));
    expect(res.status).toBe(500);
    expect(await Meeting.countDocuments()).toBe(0);
  });
});

describe('GET /api/meetings/list', () => {
  beforeEach(async () => {
    await Meeting.create([
      { meetingId: 'A', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-21' },
      { meetingId: 'B', zoneId: 'Z1', zoneName: 'Zone One', date: '2026-10-28' },
      { meetingId: 'C', zoneId: 'Z2', zoneName: 'Zone Two', date: '2026-10-28' },
    ]);
  });

  test('admin sees every meeting, newest first', async () => {
    const res = await request(app).get('/api/meetings/list').set(auth(users.admin));
    expect(res.body.meetings.map(m => m.meetingId).sort()).toEqual(['A', 'B', 'C']);
    expect(res.body.meetings[res.body.meetings.length - 1].date).toBe('2026-10-21');
  });

  test('zone admin sees only their zone', async () => {
    const res = await request(app).get('/api/meetings/list').set(auth(users.zoneAdmin));
    expect(res.body.meetings.map(m => m.meetingId).sort()).toEqual(['A', 'B']);
  });

  test('district admin sees zones of their district', async () => {
    const res = await request(app).get('/api/meetings/list').set(auth(users.districtAdmin));
    expect(res.body.meetings).toHaveLength(3);
  });

  test('pagination, search and date filters', async () => {
    const page = await request(app).get('/api/meetings/list?page=1&limit=2').set(auth(users.admin));
    expect(page.body.meetings).toHaveLength(2);
    expect(page.body.pagination).toMatchObject({ total: 3, pages: 2 });

    const search = await request(app).get('/api/meetings/list?search=two').set(auth(users.admin));
    expect(search.body.meetings.map(m => m.meetingId)).toEqual(['C']);

    const date = await request(app).get('/api/meetings/list?date=2026-10-21').set(auth(users.admin));
    expect(date.body.meetings.map(m => m.meetingId)).toEqual(['A']);
  });
});

describe('GET /api/meetings/:id/report', () => {
  test('returns the meeting and its report text', async () => {
    await seedMeeting({ qhls: [{ unit: 'Unit A', status: 'nadannu' }] });
    const res = await request(app).get('/api/meetings/M-Z1/report').set(auth(users.zoneAdmin));
    expect(res.status).toBe(200);
    expect(res.body.meetingData.zoneName).toBe('Zone One');
    expect(res.body.report.qhlsStatus).toContain('Unit A, നടന്നു');
  });

  test('404 for an unknown meeting', async () => {
    const res = await request(app).get('/api/meetings/NOPE/report').set(auth(users.admin));
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/meetings/:id', () => {
  beforeEach(() => seedMeeting());

  test('zone admin updates their own zone\'s meeting', async () => {
    const res = await request(app).put('/api/meetings/M-Z1').set(auth(users.zoneAdmin))
      .send(meetingBody({ minutes: ['New'] }));
    expect(res.status).toBe(200);
    expect((await Meeting.findOne({ meetingId: 'M-Z1' })).minutes).toEqual(['New']);
  });

  test('zone admin of another zone is refused', async () => {
    const other = { ...users.zoneAdmin, zoneAccess: ['Z2'] };
    const res = await request(app).put('/api/meetings/M-Z1').set(auth(other)).send(meetingBody());
    expect(res.status).toBe(403);
  });

  test('missing fields are rejected', async () => {
    const res = await request(app).put('/api/meetings/M-Z1').set(auth(users.admin)).send({ zoneName: 'Zone One' });
    expect(res.status).toBe(400);
  });

  test('404 for an unknown meeting (non-admin)', async () => {
    const res = await request(app).put('/api/meetings/NOPE').set(auth(users.zoneAdmin)).send(meetingBody());
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/meetings/:id', () => {
  beforeEach(() => seedMeeting());

  test('district admin cannot delete', async () => {
    const res = await request(app).delete('/api/meetings/M-Z1').set(auth(users.districtAdmin));
    expect(res.status).toBe(403);
    expect(await Meeting.countDocuments()).toBe(1);
  });

  test('zone admin deletes their own zone\'s meeting', async () => {
    const res = await request(app).delete('/api/meetings/M-Z1').set(auth(users.zoneAdmin));
    expect(res.status).toBe(200);
    expect(await Meeting.countDocuments()).toBe(0);
  });
});
