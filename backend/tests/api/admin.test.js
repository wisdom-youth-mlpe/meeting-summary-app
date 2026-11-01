const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Zone = require('../../models/Zone');
const Agenda = require('../../models/Agenda');
const Committee = require('../../models/Committee');
const CommitteeRole = require('../../models/CommitteeRole');
const { users, auth, seedZones, seedUsers } = require('../helpers');

beforeEach(async () => {
  await seedZones();
  await seedUsers();
});

describe('GET /api/zones', () => {
  test('admin gets every zone with its units', async () => {
    const res = await request(app).get('/api/zones').set(auth(users.admin));
    expect(res.body.isAdmin).toBe(true);
    expect(res.body.zones.map(z => z.name)).toEqual(['Zone One', 'Zone Two']);
    expect(res.body.zones[0].units).toEqual(['Unit A', 'Unit B']);
  });

  test('zone admin gets only their zones', async () => {
    const res = await request(app).get('/api/zones').set(auth(users.zoneAdmin));
    expect(res.body.isAdmin).toBe(false);
    expect(res.body.zones.map(z => z.name)).toEqual(['Zone One']);
  });
});

describe('GET /api/attendees/:zoneId', () => {
  test('lists the zone committee with Malayalam roles, treasurer last', async () => {
    await CommitteeRole.create([
      { roleId: 'CR01', name: 'പ്രസിഡന്റ്', englishName: 'President' },
      { roleId: 'CR05', name: 'ട്രഷറർ', englishName: 'Treasurer' },
    ]);
    await Committee.create([
      { committeeId: 'C2', name: 'Treasurer T', roleId: 'CR05', zoneId: 'Z1' },
      { committeeId: 'C1', name: 'President P', roleId: 'CR01', zoneId: 'Z1' },
      { committeeId: 'C3', name: 'Other zone', roleId: 'CR01', zoneId: 'Z2' },
    ]);
    const res = await request(app).get('/api/attendees/Z1').set(auth(users.zoneAdmin));
    expect(res.body.attendees.map(a => [a.name, a.role])).toEqual([
      ['President P', 'പ്രസിഡന്റ്'],
      ['Treasurer T', 'ട്രഷറർ'],
    ]);
  });
});

describe('GET /api/agendas', () => {
  test('returns stored agendas', async () => {
    await Agenda.create({ agendaId: 'A1', name: 'Agenda one', order: 1 });
    const res = await request(app).get('/api/agendas').set(auth(users.zoneAdmin));
    expect(res.body.success).toBe(true);
    expect(JSON.stringify(res.body.agendas)).toContain('Agenda one');
  });
});

describe('/api/users (admin only)', () => {
  test('non-admins are refused', async () => {
    for (const user of [users.zoneAdmin, users.districtAdmin]) {
      expect((await request(app).get('/api/users').set(auth(user))).status).toBe(403);
    }
  });

  test('list never includes passwords', async () => {
    const res = await request(app).get('/api/users').set(auth(users.admin));
    expect(res.body.users).toHaveLength(4);
    expect(res.body.users.some(u => 'password' in u)).toBe(false);
  });

  test('create, update and delete a user', async () => {
    const created = await request(app).post('/api/users').set(auth(users.admin))
      .send({ username: 'New1', password: 'pw', roles: ['zone_admin'], zoneAccess: ['Z2'] });
    expect(created.status).toBe(200);
    expect(await User.findOne({ username: 'new1' })).not.toBeNull();

    const updated = await request(app).put('/api/users/new1').set(auth(users.admin))
      .send({ roles: ['zone_admin'], zoneAccess: ['Z1', 'Z2'] });
    expect(updated.status).toBe(200);
    expect((await User.findOne({ username: 'new1' })).zoneAccess).toEqual(['Z1', 'Z2']);

    const removed = await request(app).delete('/api/users/new1').set(auth(users.admin));
    expect(removed.status).toBe(200);
    expect(await User.findOne({ username: 'new1' })).toBeNull();
  });

  test.each([
    ['no password', { username: 'x', roles: ['admin'] }, 400],
    ['no roles', { username: 'x', password: 'p', roles: [] }, 400],
    ['unknown role', { username: 'x', password: 'p', roles: ['boss'] }, 400],
    ['zone admin without zones', { username: 'x', password: 'p', roles: ['zone_admin'] }, 400],
    ['duplicate username', { username: 'zone1', password: 'p', roles: ['admin'] }, 409],
  ])('create rejects %s', async (_, body, status) => {
    const res = await request(app).post('/api/users').set(auth(users.admin)).send(body);
    expect(res.status).toBe(status);
  });

  test('admin cannot delete themselves', async () => {
    const res = await request(app).delete(`/api/users/${users.admin.username}`).set(auth(users.admin));
    expect(res.status).toBe(400);
  });
});

describe('settings', () => {
  test('anyone signed in reads, only admin writes', async () => {
    const denied = await request(app).post('/api/settings').set(auth(users.zoneAdmin))
      .send({ key: 'district_meeting_day', value: 1 });
    expect(denied.status).toBe(403);

    const saved = await request(app).post('/api/settings').set(auth(users.admin))
      .send({ key: 'district_meeting_day', value: 1 });
    expect(saved.status).toBe(200);

    const read = await request(app).get('/api/settings/district_meeting_day').set(auth(users.zoneAdmin));
    expect(read.body.value).toBe(1);
  });

  test('missing setting reads as null', async () => {
    const res = await request(app).get('/api/settings/nothing').set(auth(users.admin));
    expect(res.body).toEqual({ success: true, value: null });
  });
});

describe('zone and district admin routes', () => {
  test('zone admin cannot create or delete zones', async () => {
    const res = await request(app).post('/api/zones').set(auth(users.zoneAdmin))
      .send({ zoneId: 'Z3', name: 'Zone Three', districtId: 'D001' });
    expect(res.status).toBe(403);
    expect((await request(app).delete('/api/zones/Z1').set(auth(users.zoneAdmin))).status).toBe(403);
    expect(await Zone.countDocuments()).toBe(2);
  });

  test('admin creates, renames and deletes a zone', async () => {
    const created = await request(app).post('/api/zones').set(auth(users.admin))
      .send({ zoneId: 'Z3', name: 'Zone Three', districtId: 'D001' });
    expect(created.status).toBe(200);

    await request(app).put('/api/zones/Z3').set(auth(users.admin)).send({ name: 'Zone 3' });
    expect((await Zone.findOne({ zoneId: 'Z3' })).name).toBe('Zone 3');

    expect((await request(app).delete('/api/zones/Z3').set(auth(users.admin))).status).toBe(200);
    expect((await request(app).delete('/api/zones/Z3').set(auth(users.admin))).status).toBe(404);
  });

  test('create zone requires all fields', async () => {
    const res = await request(app).post('/api/zones').set(auth(users.admin)).send({ zoneId: 'Z3' });
    expect(res.status).toBe(400);
  });
});
