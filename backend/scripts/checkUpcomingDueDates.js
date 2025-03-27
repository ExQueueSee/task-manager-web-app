const mongoose = require('mongoose');
const Task = require('../models/Task');
const { sendDueDateReminders } = require('../utils/emailService');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Checks for tasks due within the next 24 hours and sends notifications
 */
const checkUpcomingDueDates = async () => {
  try {
    // Connect to the database if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }

    console.log('Checking for tasks due within 24 hours...');

    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    // Find tasks that:
    // 1. Have a due date that falls between now and 24 hours from now
    // 2. Are in pending or in-progress status
    const tasks = await Task.find({
      dueDate: { 
        $gte: now, 
        $lte: tomorrow 
      },
      status: { 
        $in: ['pending', 'in-progress'] 
      }
    }).populate('owner').populate('visibleTo');

    console.log(`Found ${tasks.length} tasks due within 24 hours.`);

    // Send reminders for each task
    for (const task of tasks) {
      await sendDueDateReminders(task);
    }

    console.log('Due date reminders sent successfully.');
    
    // Disconnect if we connected inside this function
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error checking due dates:', error);
  }
};

// Export for use in scheduled jobs
module.exports = checkUpcomingDueDates;

// If run directly from command line, execute the check
if (require.main === module) {
  checkUpcomingDueDates()
    .then(() => {
      console.log('Due date check completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Due date check failed:', error);
      process.exit(1);
    });
}