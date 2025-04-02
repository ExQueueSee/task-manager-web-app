const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendDueDateReminders } = require('../utils/emailService');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Checks for tasks due within the next 24 hours and sends notifications
 */
const checkUpcomingDueDates = async () => {
  try {
    // Connect to the database if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    console.log('Checking for tasks due within 24 hours...');

    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    // Modified query to only find tasks that:
    // 1. Have a due date that falls between now and 24 hours from now
    // 2. Are in pending or in-progress status
    // 3. Haven't been notified yet (lastDueDateNotification is null) OR were notified more than 24 hours ago
    const tasks = await Task.find({
      dueDate: { 
        $gte: now, 
        $lte: tomorrow 
      },
      status: { 
        $in: ['pending', 'in-progress'] 
      },
      $or: [
        // Either no notification has been sent yet
        { lastDueDateNotification: null },
        // Or the last notification was sent more than 24 hours ago
        // (in case due date was extended after notification)
        { lastDueDateNotification: { $lt: new Date(now - 24 * 60 * 60 * 1000) } }
      ]
    }).populate('owner').populate('visibleTo');

    console.log(`Found ${tasks.length} tasks due within 24 hours that need notifications.`);

    // Send reminders for each task and update the notification timestamp
    for (const task of tasks) {
      await sendDueDateReminders(task);
      
      // Update the task to record that we've sent a notification
      await Task.findByIdAndUpdate(task._id, { 
        lastDueDateNotification: new Date() 
      });
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