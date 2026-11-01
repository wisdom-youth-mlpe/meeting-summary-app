const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const { users, seedUsers, auth } = require('../helpers');

beforeEach(seedUsers);

describe('POST /api/auth/login', () => {
  test('returns a token carrying the user\'s roles and zones', async () => {
    const { zoneAdmin } = users;
    const res = await request(app).post('/api/auth/login')
      .send({ username: zoneAdmin.username, password: zoneAdmin.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ username: 'zone1', roles: ['zone_admin'], zoneAccess: ['Z1'] });
    const claims = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
    expect(claims.zoneAccess).toEqual(['Z1']);
  });

  test('username is case-insensitive', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'ZONE1', password: users.zoneAdmin.password });
    expect(res.status).toBe(200);
  });

  test('never returns the password', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: users.admin.username, password: users.admin.password });
    expect(JSON.stringify(res.body)).not.toContain(users.admin.password);
  });

  test.each([
    ['wrong password', { username: 'zone1', password: 'nope' }, 401],
    ['unknown user', { username: 'ghost', password: 'x' }, 401],
    ['missing fields', { username: 'zone1' }, 400],
  ])('%s', async (_, body, status) => {
    const res = await request(app).post('/api/auth/login').send(body);
    expect(res.status).toBe(status);
    expect(res.body.success).toBe(false);
  });
});

describe('protected routes', () => {
  test('reject requests without a token', async () => {
    for (const path of ['/api/zones', '/api/meetings/list', '/api/users', '/api/dashboard/stats']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    }
  });

  test('accept a valid token', async () => {
    const res = await request(app).get('/api/agendas').set(auth(users.zoneAdmin));
    expect(res.status).toBe(200);
  });
});

describe('GET /health', () => {
  test('reports the database connection', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toMatchObject({ status: 'ok', mongodb: 'connected' });
  });
});
