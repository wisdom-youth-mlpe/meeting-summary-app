const { connectDB, disconnectDB } = require('./config/mongodb');
const mongoService = require('./services/mongoService');

async function seedSettings() {
  await connectDB();
  try {
    const existing = await mongoService.getSetting('district_meeting_day');
    if (existing === null) {
      console.log('Seeding default district_meeting_day: Wednesday');
      await mongoService.updateSetting('district_meeting_day', 3, 'The day of the week for district meetings (0=Sun, 1=Mon, ..., 3=Wed, ..., 6=Sat)');
    } else {
      console.log('district_meeting_day already exists:', existing);
    }
  } catch (error) {
    console.error('Error seeding settings:', error);
  } finally {
    await disconnectDB();
  }
}

seedSettings();
