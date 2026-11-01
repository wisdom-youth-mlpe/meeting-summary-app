// Runs before each test file: fixed secret, quiet logs, connected DB, empty collections
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { connectDB } = require('../config/mongodb');

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await connectDB();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map(c => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
