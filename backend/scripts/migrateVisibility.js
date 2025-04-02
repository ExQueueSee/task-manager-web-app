require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Task = require('../models/Task');

// Connect to MongoDB - remove deprecated options
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const migrateVisibility = async () => {
  try {
    console.log('Starting visibility migration...');
    
    // Get all tasks
    const tasks = await Task.find({});
    
    console.log(`Found ${tasks.length} tasks to migrate`);
    let migratedCount = 0;
    
    for (const task of tasks) {
      // Convert old visibility format to new format
      if (task.visibility === 'public') {
        task.isPublic = true;
        task.visibleTo = [];
      } else if (task.visibility === 'private' || task.visibility === 'team') {
        task.isPublic = false;
        task.visibleTo = task.owner ? [task.owner] : [];
      }
      
      // Remove old visibility field
      task.visibility = undefined;
      
      // Save the updated task
      await task.save();
      migratedCount++;
      
      // Log progress
      console.log(`Migrated ${migratedCount}/${tasks.length} tasks`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit();
  }
};

// Run the migration
migrateVisibility();