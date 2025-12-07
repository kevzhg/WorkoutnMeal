// Migration script: Copy workouts from workoutnmeal to homebase
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';

async function migrate() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const oldDb = client.db('workoutnmeal');
    const newDb = client.db('homebase');
    
    // Get old workouts
    const oldWorkouts = await oldDb.collection('workouts').find().toArray();
    console.log(`\nFound ${oldWorkouts.length} workouts in 'workoutnmeal' database`);
    
    if (oldWorkouts.length === 0) {
      console.log('No workouts to migrate');
      return;
    }
    
    // Check existing trainings in homebase
    const existingCount = await newDb.collection('trainings').countDocuments();
    console.log(`Current trainings in 'homebase': ${existingCount}`);
    
    // Copy workouts to trainings
    console.log('\nMigrating workouts -> trainings...');
    const result = await newDb.collection('trainings').insertMany(oldWorkouts);
    console.log(`✓ Copied ${result.insertedCount} workouts to homebase.trainings`);
    
    // Verify
    const finalCount = await newDb.collection('trainings').countDocuments();
    console.log(`\n✓ Migration complete! Total trainings in homebase: ${finalCount}`);
    
  } catch (error) {
    console.error('✗ Migration error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Connection closed');
  }
}

migrate();
