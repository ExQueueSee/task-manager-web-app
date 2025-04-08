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

    // Query to only find tasks that:
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

// Background job to check for overdue tasks
async function checkOverdueTasks() {
  try {
    const now = new Date();
    
    // Find tasks that are:
    // 1. Not already marked as behind-schedule, completed, or cancelled
    // 2. Have a due date that's in the past
    const overdueTasks = await Task.find({
      status: { $nin: ['behind-schedule', 'completed', 'cancelled'] },
      dueDate: { $lt: now }
    }).populate('owner');
    
    console.log(`Found ${overdueTasks.length} overdue tasks to update`);
    
    for (const task of overdueTasks) {
      // Mark task as behind schedule
      task.status = 'behind-schedule';
      
      // Apply credit penalty if there's an owner
      if (task.owner) {
        const owner = await User.findById(task.owner._id);
        if (owner) {
          // Check task history to determine assignment type
          const taskHistory = task.history || [];
          const assignmentRecord = taskHistory.find(h => h.action === 'assigned');
          
          let creditDeduction = 1; // Default for self-assigned
          
          if (assignmentRecord && assignmentRecord.performedBy.toString() !== task.owner._id.toString()) {
            // Admin-assigned = bigger penalty
            creditDeduction = 2;
            console.log(`User ${owner.name} lost 2 credits for missing admin-assigned deadline`);
          } else {
            console.log(`User ${owner.name} lost 1 credit for missing self-assigned deadline`);
          }
          
          owner.credits -= creditDeduction;
          await owner.save();
        }
      }
      
      if (!task.history) task.history = [];
      task.history.push({
        action: 'updated',
        date: now,
        // Removed performedBy field since we can't set it to "system" string
        details: 'Automatically marked as behind schedule'
      });
      
      await task.save();
    }
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
}

// Run the checker periodically (every 15 minutes)
setInterval(checkOverdueTasks, 15 * 60 * 1000);

// Also run it once when the server starts
checkOverdueTasks();