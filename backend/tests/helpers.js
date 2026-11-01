const jwt = require('jsonwebtoken');
const Zone = require('../models/Zone');
const Unit = require('../models/Unit');
const User = require('../models/User');

// Same claims routes/auth.js puts in a login token
const tokenFor = (user) => jwt.sign({
  username: user.username,
  roles: user.roles || [],
  zoneAccess: user.zoneAccess || [],
  districtAccess: user.districtAccess || [],
  isAntiGravity: user.isAntiGravity || false,
}, process.env.JWT_SECRET, { expiresIn: '1h' });

const users = {
  admin: { username: 'admin1', password: 'pw-admin', roles: ['admin'] },
  zoneAdmin: { username: 'zone1', password: 'pw-zone', roles: ['zone_admin'], zoneAccess: ['Z1'] },
  districtAdmin: { username: 'district1', password: 'pw-district', roles: ['district_admin'], districtAccess: ['D001'] },
  noRole: { username: 'plain1', password: 'pw-plain', roles: [] },
};

const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

// Two zones in one district, two units each
const seedZones = async () => {
  await Zone.create([
    { zoneId: 'Z1', name: 'Zone One', districtId: 'D001' },
    { zoneId: 'Z2', name: 'Zone Two', districtId: 'D001' },
  ]);
  await Unit.create([
    { unitId: 'U1', name: 'Unit A', zoneId: 'Z1' },
    { unitId: 'U2', name: 'Unit B', zoneId: 'Z1' },
    { unitId: 'U3', name: 'Unit C', zoneId: 'Z2' },
    { unitId: 'U4', name: 'Unit D', zoneId: 'Z2' },
  ]);
};

const seedUsers = () => User.create(Object.values(users));

// Minimal valid body for POST /api/meetings
const meetingBody = (overrides = {}) => ({
  zoneName: 'Zone One',
  zoneId: 'Z1',
  date: '2026-10-28',
  startTime: '19:00',
  endTime: '20:00',
  agendas: ['Agenda 1'],
  minutes: ['Decision 1'],
  attendance: [
    { name: 'Person P', role: 'President', status: 'present' },
    { name: 'Person L', role: 'Secretary', status: 'leave', reason: 'Travel' },
  ],
  qhls: [
    { unit: 'Unit A', status: 'nadannu', hasQhls: true },
    { unit: 'Unit B', status: 'nadannittilla', hasQhls: true },
  ],
  ...overrides,
});

module.exports = { tokenFor, users, auth, seedZones, seedUsers, meetingBody };
