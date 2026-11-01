// One in-memory MongoDB for the whole run; nothing touches a real database
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;
  process.env.MONGODB_URI = mongod.getUri('meeting_app_test');
};
