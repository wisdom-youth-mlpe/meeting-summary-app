const jwt = require('jsonwebtoken');
const { authenticate } = require('../../middleware/auth');
const { requireRole, requireAnyRole, requireZoneAccess } = require('../../middleware/authorize');
const { hasZoneAccess, checkZoneAccess, getAccessibleZones } = require('../../middleware/checkZoneAccess');
const { isAntiGravityUser } = require('../../utils/antiGravity');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const run = (middleware, req) => {
  const res = mockRes();
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next };
};

describe('authenticate', () => {
  const sign = (opts) => jwt.sign({ username: 'u', roles: ['admin'] }, process.env.JWT_SECRET, opts);

  test('rejects a request with no token', () => {
    const { res, next } = run(authenticate, { headers: {} });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a token signed with another secret', () => {
    const token = jwt.sign({ username: 'u' }, 'other-secret');
    const { res } = run(authenticate, { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error).toBe('Invalid token');
  });

  test('rejects an expired token', () => {
    const token = sign({ expiresIn: -10 });
    const { res } = run(authenticate, { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error).toBe('Token expired');
  });

  test('accepts a valid token with or without the Bearer prefix', () => {
    const token = sign({ expiresIn: '1h' });
    for (const header of [`Bearer ${token}`, token]) {
      const req = { headers: { authorization: header } };
      const { next } = run(authenticate, req);
      expect(next).toHaveBeenCalled();
      expect(req.user.username).toBe('u');
    }
  });
});

describe('requireRole / requireAnyRole', () => {
  test('401 without a user', () => {
    expect(run(requireRole('admin'), {}).res.status).toHaveBeenCalledWith(401);
  });

  test('403 when the role is missing, next when present', () => {
    expect(run(requireRole('admin'), { user: { roles: ['zone_admin'] } }).res.status).toHaveBeenCalledWith(403);
    expect(run(requireRole('admin'), { user: { roles: ['admin'] } }).next).toHaveBeenCalled();
  });

  test('any of several roles is enough', () => {
    const mw = requireAnyRole(['admin', 'zone_admin']);
    expect(run(mw, { user: { roles: ['zone_admin'] } }).next).toHaveBeenCalled();
    expect(run(mw, { user: { roles: ['district_admin'] } }).res.status).toHaveBeenCalledWith(403);
  });

  test('anti-gravity users pass every role check', () => {
    const req = { user: { isAntiGravity: true, roles: [] } };
    expect(run(requireRole('admin'), req).next).toHaveBeenCalled();
    expect(req.isAntiGravity).toBe(true);
  });
});

describe('requireZoneAccess', () => {
  const mw = requireZoneAccess();

  test('admin and district admin reach any zone', () => {
    expect(run(mw, { user: { roles: ['admin'] }, params: { zoneId: 'Z9' }, body: {}, query: {} }).next).toHaveBeenCalled();
    expect(run(mw, { user: { roles: ['district_admin'] }, params: { zoneId: 'Z9' }, body: {}, query: {} }).next).toHaveBeenCalled();
  });

  test('zone admin reaches only their zones', () => {
    const user = { roles: ['zone_admin'], zoneAccess: ['Z1'] };
    expect(run(mw, { user, params: { zoneId: 'Z1' }, body: {}, query: {} }).next).toHaveBeenCalled();
    expect(run(mw, { user, params: { zoneId: 'Z2' }, body: {}, query: {} }).res.status).toHaveBeenCalledWith(403);
    expect(run(mw, { user, params: {}, body: {}, query: {} }).res.status).toHaveBeenCalledWith(400);
  });
});

describe('checkZoneAccess helpers', () => {
  const zoneAdmin = { roles: ['zone_admin'], zoneAccess: ['Z1'] };

  test('hasZoneAccess', () => {
    expect(hasZoneAccess({ roles: ['admin'] }, 'Z9')).toBe(true);
    expect(hasZoneAccess(zoneAdmin, 'Z1')).toBe(true);
    expect(hasZoneAccess(zoneAdmin, 'Z2')).toBe(false);
    expect(hasZoneAccess({ roles: ['district_admin'] }, 'Z1')).toBe(false);
  });

  test('getAccessibleZones', () => {
    expect(getAccessibleZones({ roles: ['admin'] })).toBe('all');
    expect(getAccessibleZones(zoneAdmin)).toEqual(['Z1']);
    expect(getAccessibleZones({ roles: [] })).toEqual([]);
  });

  test('checkZoneAccess middleware reads zoneId from body, params or query', () => {
    const base = { user: zoneAdmin, body: {}, params: {}, query: {} };
    expect(run(checkZoneAccess, { ...base, body: { zoneId: 'Z1' } }).next).toHaveBeenCalled();
    expect(run(checkZoneAccess, { ...base, query: { zoneId: 'Z2' } }).res.status).toHaveBeenCalledWith(403);
    expect(run(checkZoneAccess, base).res.status).toHaveBeenCalledWith(400);
  });
});

describe('isAntiGravityUser', () => {
  test.each([
    [{ isAntiGravity: true }, true],
    [{ roles: ['admin', 'district_admin', 'zone_admin'] }, true],
    [{ roles: ['zone_admin'], zoneAccess: ['ALL'] }, true],
    [{ roles: ['admin'] }, false],
    [null, false],
  ])('%j -> %s', (user, expected) => {
    expect(isAntiGravityUser(user)).toBe(expected);
  });
});
