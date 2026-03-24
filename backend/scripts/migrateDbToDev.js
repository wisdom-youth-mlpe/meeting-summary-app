const mongoose = require('mongoose');

const sourceUri = process.env.SOURCE_DB_URI || 'mongodb://meeting_app:meeting_app@mongo:27017/meeting_app';
const targetUri = process.env.TARGET_DB_URI || 'mongodb://meeting_app_dev:meeting_app_dev@mongo:27017/meeting_app_dev';

async function migrateData() {
  console.log('==============================================');
  console.log('Database Migration script (Prod to Dev)');
  console.log('==============================================');
  console.log(`Connecting to Source DB: ${sourceUri}`);
  console.log(`Connecting to Target DB: ${targetUri}`);

  let sourceConnection, targetConnection;

  try {
    // Create connections without relying on global mongoose default connection
    sourceConnection = await mongoose.createConnection(sourceUri).asPromise();
    targetConnection = await mongoose.createConnection(targetUri).asPromise();
    console.log('Connected to both databases successfully.\n');

    // Access the native MongoDB driver database instances
    const sourceDb = sourceConnection.db;
    const targetDb = targetConnection.db;

    // Get list of all collections in the source database
    const collections = await sourceDb.listCollections().toArray();

    for (let colInfo of collections) {
      const colName = colInfo.name;
      
      // Skip MongoDB system collections
      if (colName.startsWith('system.')) {
        continue;
      }

      console.log(`Processing collection: ${colName}`);
      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      // Fetch all documents from the source collection
      const docs = await sourceCol.find({}).toArray();
      
      // Clear the target collection beforehand
      await targetCol.deleteMany({});
      
      if (docs.length > 0) {
        // Bulk insert documents into the target collection
        await targetCol.insertMany(docs);
        console.log(`  -> Copied ${docs.length} documents.`);
      } else {
        console.log(`  -> Skipped (Empty).`);
      }
    }

    console.log('\n==============================================');
    console.log('Migration completed successfully!');
    console.log('==============================================');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (sourceConnection) await sourceConnection.close();
    if (targetConnection) await targetConnection.close();
    process.exit(0);
  }
}

// Ensure the script executes
migrateData();
