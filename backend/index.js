const express = require('express');
const bodyParser = require('body-parser'); 
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 
const { sendPasswordResetEmail, sendVerificationEmail } = require('./utils/emailService');
const Task = require('./models/Task'); 
const User = require('./models/User'); 
const { auth, adminAuth } = require('./middleware/auth');
const cron = require('node-cron');
const checkUpcomingDueDates = require('./scripts/checkUpcomingDueDates');
const { generateTasksExcel } = require('./utils/excelExport');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

// Swagger setup
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Task Manager API',
            version: '1.0.0',
            description: 'API documentation for the Task Manager Web App',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
            },
        ],
    },
    apis: ['./index.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Basic route
app.get('/', (req, res) => {
    res.send('Task Manager Web App');
});

// TASK ROUTES
// First define the static routes
/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Bad request
 */
app.post('/tasks', auth, async (req, res) => {
  try {
    const taskData = { ...req.body };

    // Handle visibility
    if (taskData.visibleTo) {
      // visibleTo should be an array of user IDs
      taskData.isPublic = false;
    } else {
      // No specific users selected, make it public
      taskData.isPublic = true;
      taskData.visibleTo = [];
    }

    // Remove owner if it's null, let MongoDB use the default value
    if (taskData.owner === null) {
      delete taskData.owner;
    }

    // Check if the task is meant to be unassigned (no owner)
    const isUnassigned = taskData.owner === null || taskData.owner === undefined;
    
    // Set owner to current user if not explicitly omitted
    if (!isUnassigned && !taskData.hasOwnProperty('owner')) {
      taskData.owner = req.user._id;
    }

    const task = new Task(taskData);
    await task.save();
    res.status(201).send(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).send(error);
  }
});

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: List of all tasks
 *       500:
 *         description: Internal server error
 */
app.get('/tasks', auth, async (req, res) => {
    try {
        // Build query based on visibility and ownership
        const query = {
            $or: [
                // Tasks created by this user
                { owner: req.user._id },
                // Public tasks visible to all
                { isPublic: true },
                // Tasks where current user is in visibleTo array
                { visibleTo: req.user._id }
            ]
        };
        
        // Admin can see all tasks
        if (req.user.role === 'admin') {
            // Remove the query restrictions for admins
            const tasks = await Task.find({}).populate('owner', 'name email');
            return res.status(200).send(tasks);
        }
        
        const tasks = await Task.find(query).populate('owner', 'name email');
        res.status(200).send(tasks);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get all tasks (admin only)
app.get('/tasks/all', auth, adminAuth, async (req, res) => {
  try {
    console.log('Admin fetching all tasks'); // Add this log
    const tasks = await Task.find({}).populate('owner', 'name email');
    console.log(`Found ${tasks.length} tasks`); // Add this log
    res.send(tasks);
  } catch (error) {
    console.error('Error fetching all tasks:', error); // Add this log
    res.status(500).send(error);
  }
});

app.get('/tasks/export', auth, async (req, res) => {
  try {
    console.log('Export request received with filter:', req.query.filter);
    const filterType = req.query.filter || 'all';
    let query = {};
    
    // Build query based on filter type
    switch (filterType) {
      case 'my':
        query.owner = req.user._id;
        break;
      case 'available':
        query.status = 'pending';
        query.owner = null;
        break;
      case 'in-progress':
        query.status = 'in-progress';
        break;
      case 'completed':
        query.status = 'completed';
        break;
      case 'cancelled':
        query.status = 'cancelled';
        break;
      case 'behind-schedule':
        query.status = 'behind-schedule';
        break;
      // 'all' doesn't need additional filters
    }
    
    console.log('Query:', JSON.stringify(query));
    
    // For non-admin users, apply visibility filters
    if (req.user.role !== 'admin') {
      query = {
        $and: [
          query,
          {
            $or: [
              { owner: req.user._id },
              { isPublic: true },
              { visibleTo: req.user._id }
            ]
          }
        ]
      };
    }
    
    // Find tasks
    const tasks = await Task.find(query).populate('owner', 'name email');
    console.log(`Found ${tasks.length} tasks`);
    
    // Import the utility function
    const { generateTasksExcel } = require('./utils/excelExport');
    
    // Generate Excel file
    const buffer = await generateTasksExcel(tasks);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tasks_${filterType}_${Date.now()}.xlsx"`);
    
    // Send the buffer directly
    res.send(buffer);
  } catch (error) {
    console.error('Export error details:', error);
    res.status(500).send({ error: 'Failed to export tasks: ' + error.message });
  }
});

// Test endpoint
app.get('/test-excel', auth, async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');
    
    worksheet.columns = [
      { header: 'Test Column', key: 'test', width: 20 }
    ];
    
    worksheet.addRow({ test: 'Test Data' });
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="test.xlsx"');
    
    res.send(buffer);
  } catch (error) {
    console.error('Test Excel error:', error);
    res.status(500).send({ error: 'Test failed: ' + error.message });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The task ID
 *     responses:
 *       200:
 *         description: Task found
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
app.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;
    try {
        const task = await Task.findOne({ _id, owner: req.user._id });
        if (!task) {
            return res.status(404).send();
        }
        res.status(200).send(task);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Update task route - ensure admins can update any task
app.patch('/tasks/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'description', 'status', 'dueDate', 'priority', 'visibleTo', 'isPublic'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates!' });
    }
    
    // Different query based on role
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).send({ error: 'Task not found' });
    }
    
    // Only admins or task owners can update tasks
    if (req.user.role !== 'admin' && (!task.owner || !task.owner.equals(req.user._id))) {
      return res.status(403).send({ error: 'Not authorized to update this task' });
    }
    
    // Check if task is behind schedule
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    const isBehindSchedule = task.status === 'behind-schedule';
    
    // Handle status change restrictions for behind schedule tasks
    if (isBehindSchedule || isOverdue) {
      // If task is behind schedule and user is trying to change status
      if (updates.includes('status')) {
        if (req.user.role !== 'admin') {
          // Non-admin users can't change status at all
          return res.status(403).send({ 
            error: 'Task is behind schedule. Status can only be modified by an admin.' 
          });
        } else {
          // Admin users can only set status to completed or cancelled
          const allowedStatuses = ['completed', 'cancelled', 'behind-schedule'];
          if (!allowedStatuses.includes(req.body.status)) {
            return res.status(400).send({ 
              error: 'Behind schedule tasks can only be set to completed or cancelled' 
            });
          }
        }
      }
      
      // If due date is being updated for behind schedule task
      if (updates.includes('dueDate')) {
        if (req.user.role !== 'admin') {
          return res.status(403).send({ 
            error: 'Only admins can extend the due date for behind schedule tasks' 
          });
        }
        
        // If admin is extending due date, reset the status based on ownership
        const newDueDate = new Date(req.body.dueDate);
        if (newDueDate > new Date()) {
          // Reset status based on whether task has an owner
          if (task.status === 'behind-schedule') {
            if (task.owner) {
              task.status = 'in-progress';
            } else {
              task.status = 'pending'; // No owner = available for assignment
            }
          }
        }
      } else if (isOverdue && !isBehindSchedule) {
        // If task is overdue but not marked as behind-schedule, update it
        task.status = 'behind-schedule';
      }
    }
    
    // Check if status is being updated to "completed"
    if (updates.includes('status') && req.body.status === 'completed' && task.status !== 'completed') {
      // Task is being completed now
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          let creditChange = 0;
          const now = new Date();
          
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            // If completing before due date
            if (now < dueDate) {
              // Calculate days before deadline
              const daysEarly = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
              
              if (daysEarly >= 2) {
                // Completed well before deadline
                creditChange = 2; // ++Credit
              } else {
                // Completed shortly before deadline
                creditChange = 1; // +Credit
              }
            }
          }
          
          if (creditChange > 0) {
            console.log(`BEFORE: User ${owner.name} had ${owner.credits} credits`);
            owner.credits += creditChange;
            console.log(`AFTER: User ${owner.name} now has ${owner.credits} credits`);
            await owner.save();
          }
        }
      }
    }
    
    // Check if status is changing to "behind-schedule"
    if (updates.includes('status') && req.body.status === 'behind-schedule' && 
        task.status !== 'behind-schedule' && task.status !== 'completed' && 
        task.status !== 'cancelled') {
      // Task is becoming overdue
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          // Check if task was assigned by admin or self-assigned
          const taskHistory = task.history || [];
          const assignmentRecord = taskHistory.find(h => h.action === 'assigned');
          
          if (assignmentRecord && assignmentRecord.performedBy.toString() !== task.owner.toString()) {
            // Admin-assigned task overdue
            owner.credits -= 2; // --Credit
          } else {
            // Self-assigned task overdue
            owner.credits -= 1; // -Credit
          }
          
          await owner.save();
        }
      }
    }
    
    // Check if a late task is being cancelled
    if (updates.includes('status') && req.body.status === 'cancelled' && 
        task.status === 'behind-schedule') {
      // Late task being cancelled
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          // Refund one credit for cancelling overdue task
          owner.credits += 1; // +Credit refund
          await owner.save();
        }
      }
    }
    
    // Apply updates
    updates.forEach(update => task[update] = req.body[update]);
    
    // Special handling for visibility
    if (updates.includes('visibleTo') && req.body.visibleTo.length > 0) {
      task.isPublic = false;
    } else if (updates.includes('isPublic') && req.body.isPublic) {
      task.visibleTo = [];
    }
    
    // Clear owner if status changed to pending
    if (req.body.status === 'pending') {
      task.owner = null;
    }
    
    // Add task history tracking for credit purposes
    if (!task.history) {
      task.history = [];
    }
    
    if (updates.includes('owner') && req.body.owner) {
      task.history.push({
        action: 'assigned',
        date: new Date(),
        performedBy: req.user._id,
        assignedTo: req.body.owner
      });
    }
    
    await task.save();
    res.send(task);
  } catch (error) { 
    res.status(400).send(error);
  }
});

app.patch('/tasks/:id', auth, async (req, res) => {
  try {    
    const task = await Task.findOne({ _id: req.params.id });
    
    if (!task) {
      return res.status(404).send({ error: 'Task not found' });
    }
    
    // Track the previous status to detect changes
    const previousStatus = task.status;
    
    // Gather the updates being applied
    const updates = Object.keys(req.body);
    
    // Apply updates to task object
    updates.forEach(update => task[update] = req.body[update]);
    
    // CREDIT SYSTEM LOGIC
    // 1. Check for task completion
    if (updates.includes('status') && req.body.status === 'completed' && previousStatus !== 'completed') {
      // Task is being completed now
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          let creditChange = 0;
          const now = new Date();
          
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            // If completing before due date
            if (now < dueDate) {
              // Calculate days before deadline
              const daysEarly = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
              
              if (daysEarly >= 2) {
                // Completed well before deadline
                creditChange = 2; // ++Credit
              } else {
                // Completed shortly before deadline
                creditChange = 1; // +Credit
              }
            }
          }
          
          if (creditChange > 0) {
            console.log(`BEFORE: User ${owner.name} had ${owner.credits} credits`);
            owner.credits += creditChange;
            console.log(`AFTER: User ${owner.name} now has ${owner.credits} credits`);
            await owner.save();
          }
        }
      }
    }
    
    // 2. Check if status is changing to "behind-schedule"
    if (updates.includes('status') && req.body.status === 'behind-schedule' && 
        previousStatus !== 'behind-schedule' && previousStatus !== 'completed' && 
        previousStatus !== 'cancelled') {
      // Task is becoming overdue
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          // Check if task was assigned by admin or self-assigned
          const taskHistory = task.history || [];
          const assignmentRecord = taskHistory.find(h => h.action === 'assigned');
          
          let creditDeduction = 1; // Default: -1 credit
          
          if (assignmentRecord && assignmentRecord.performedBy.toString() !== task.owner.toString()) {
            // Admin-assigned task overdue = bigger penalty
            creditDeduction = 2; // --Credit
            console.log(`User ${owner.name} lost 2 credits for missing admin-assigned deadline`);
          } else {
            console.log(`User ${owner.name} lost 1 credit for missing self-assigned deadline`);
          }
          
          owner.credits -= creditDeduction;
          await owner.save();
        }
      }
    }
    
    // 3. Check if a late task is being cancelled
    if (updates.includes('status') && req.body.status === 'cancelled' && 
        previousStatus === 'behind-schedule') {
      // Late task being cancelled
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          // Refund one credit for cancelling overdue task
          owner.credits += 1; // +Credit refund
          console.log(`User ${owner.name} received 1 credit refund for cancelled late task`);
          await owner.save();
        }
      }
    }
    
    // Update task history
    if (!task.history) {
      task.history = [];
    }
    
    // Track assignment changes
    if (updates.includes('owner') && req.body.owner) {
      task.history.push({
        action: 'assigned',
        date: new Date(),
        performedBy: req.user._id,
        assignedTo: req.body.owner
      });
    }
    
    // Track status changes
    if (updates.includes('status') && req.body.status !== previousStatus) {
      task.history.push({
        action: req.body.status === 'completed' ? 'completed' : 'updated',
        date: new Date(),
        performedBy: req.user._id
      });
    }
    
    // Save the updated task
    await task.save();
    res.send(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).send({ error: error.message });
  }
});

app.patch('/tasks/:id', auth, async (req, res) => {
  try {
    
    const task = await Task.findOne({ _id: req.params.id });
    
    if (!task) {
      return res.status(404).send({ error: 'Task not found' });
    }
    
    // Track the previous status to detect changes
    const previousStatus = task.status;
    
    // Gather the updates being applied
    const updates = Object.keys(req.body);
    
    // Apply updates to task object
    updates.forEach(update => task[update] = req.body[update]);
    
    // CREDIT SYSTEM LOGIC
    // 1. Check for task completion
    if (updates.includes('status') && req.body.status === 'completed' && previousStatus !== 'completed') {
      // Task is being completed now
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          let creditChange = 0;
          const now = new Date();
          
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            // If completing before due date
            if (now < dueDate) {
              // Calculate days early
              const daysEarly = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
              
              if (daysEarly >= 2) {
                // Completed well before deadline (++Credit)
                creditChange = 2;
                console.log(`User ${owner.name} earned 2 credits for completing task well before deadline`);
              } else {
                // Completed shortly before deadline (+Credit)
                creditChange = 1;
                console.log(`User ${owner.name} earned 1 credit for completing task before deadline`);
              }
            }
          }
          
          if (creditChange > 0) {
            // Make sure owner.credits exists, initialize if needed
            if (typeof owner.credits !== 'number') {
              owner.credits = 0;
            }
            console.log(`BEFORE: User ${owner.name} had ${owner.credits} credits`);
            owner.credits += creditChange;
            console.log(`AFTER: User ${owner.name} now has ${owner.credits} credits`);
            await owner.save();
            console.log(`User ${owner.name} now has ${owner.credits} credits`);
          }
        }
      }
    }
    
    // 2. Check if status is changing to "behind-schedule"
    if (updates.includes('status') && req.body.status === 'behind-schedule' && 
        previousStatus !== 'behind-schedule' && previousStatus !== 'completed' && 
        previousStatus !== 'cancelled') {
      // Task is becoming overdue
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          // Check if task was assigned by admin or self-assigned
          const taskHistory = task.history || [];
          const assignmentRecord = taskHistory.find(h => h.action === 'assigned');
          
          let creditDeduction = 1; // Default: -1 credit
          
          if (assignmentRecord && assignmentRecord.performedBy.toString() !== task.owner.toString()) {
            // Admin-assigned task overdue = bigger penalty
            creditDeduction = 2; // --Credit
            console.log(`User ${owner.name} lost 2 credits for missing admin-assigned deadline`);
          } else {
            console.log(`User ${owner.name} lost 1 credit for missing self-assigned deadline`);
          }
          
          owner.credits -= creditDeduction;
          await owner.save();
        }
      }
    }
    
    // 3. Check if a late task is being cancelled
    if (updates.includes('status') && req.body.status === 'cancelled' && 
        previousStatus === 'behind-schedule') {
      // Late task being cancelled
      if (task.owner) {
        const owner = await User.findById(task.owner);
        if (owner) {
          // Refund one credit for cancelling overdue task
          owner.credits += 1; // +Credit refund
          console.log(`User ${owner.name} received 1 credit refund for cancelled late task`);
          await owner.save();
        }
      }
    }
    
    // Update task history
    if (!task.history) {
      task.history = [];
    }
    
    // Track assignment changes
    if (updates.includes('owner') && req.body.owner) {
      task.history.push({
        action: 'assigned',
        date: new Date(),
        performedBy: req.user._id,
        assignedTo: req.body.owner
      });
    }
    
    // Track status changes
    if (updates.includes('status') && req.body.status !== previousStatus) {
      task.history.push({
        action: req.body.status === 'completed' ? 'completed' : 'updated',
        date: new Date(),
        performedBy: req.user._id
      });
    }
    
    // Save the updated task
    await task.save();
    res.send(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).send({ error: error.message });
  }
});

// Delete task route - ensure admins can delete any task
app.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).send({ error: 'Task not found' });
    }
    
    // Only admins or task owners can delete tasks
    if (req.user.role !== 'admin' && (!task.owner || !task.owner.equals(req.user._id))) {
      return res.status(403).send({ error: 'Not authorized to delete this task' });
    }
    
    await Task.findByIdAndDelete(req.params.id);
    res.send({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Assign task to user
app.patch('/tasks/:id/assign', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).send({ error: 'Task not found' });
    }
    
    // If task already has an owner (that's not the current user), prevent reassignment
    if (task.owner && !task.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).send({ error: 'This task is already assigned to someone else' });
    }
    
    task.owner = req.body.userId;
    task.status = 'in-progress'; // Update status when assigned
    await task.save();
    res.send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Change task visibility
app.patch('/tasks/:id/visibility', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).send();
    }
    
    // Only task owner or admin can change visibility
    if (!task.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).send({ error: 'Not authorized to change visibility' });
    }
    
    task.visibility = req.body.visibility;
    await task.save();
    res.send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Then define all your parameterized routes like /tasks/:id

// USER ROUTES
// Registration and login first
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
app.post('/users', async (req, res) => {
    try {
        // Email validation (keep your existing validation)
        const email = req.body.email;
        
        const companyEmailRegex = /^[a-zA-Z0-9.]+@icterra\.com$/;
        
        if (!companyEmailRegex.test(email)) {
            return res.status(400).send({ error: 'Only @icterra.com email addresses are allowed.' });
        }
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        
        // Create new user with pending approval and email verification token
        const user = new User({
            ...req.body,
            approvalStatus: 'pending',
            emailVerified: false,
            verificationToken: verificationToken,
            verificationTokenExpires: Date.now() + 86400000 // 24 hours
        });
        
        await user.save();
        
        // Send verification email
        await sendVerificationEmail(email, verificationToken);
        
        res.status(201).send({ 
            message: 'Registration initiated! Please check your email to verify your account.'
        });
    } catch (error) {
        res.status(400).send(error);
    }
});

// New endpoint to verify email

app.get('/users/verify-email/:token', async (req, res) => {
  try {
    console.log("Received verification request with token:", req.params.token);
    
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now()}
    });
    
    // If the user isn't found, return early
    if (!user) {
      console.log("No user found with this verification token");
      return res.status(400).send({ error: 'Verification token is invalid or has expired' }); 
    }
    
    //console.log("User found:", user.email);
    console.log("User found");

    // If already verified, just return success
    if (user.emailVerified) {
      return res.send({
        message: 'Email is already verified. Your account is now pending admin approval.',
        email: user.email
      });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    
    res.send({ 
      message: 'Email verified successfully! Your account is now pending admin approval.',
      email: user.email
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).send({ error: 'Error verifying email' });
  }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Unable to login
 */

app.post('/users/login', async (req, res) => {
    try {
        // This gets the user if credentials are correct
        const user = await User.findByCredentials(req.body.email, req.body.password);
        
        //console.log('User trying to login:', user.email, 'Status:', user.approvalStatus);
        console.log('User trying to login: {REDACTED} ', 'Status:', user.approvalStatus);
        
        // Check email verification
        if (!user.emailVerified) {
            return res.status(401).send({ 
                error: 'Please verify your email address before logging in.',
                emailVerified: false
            });
        }
        
        // Check approval status
        if (user.approvalStatus === 'pending') {
            return res.status(401).send({ 
                error: 'Your account is pending approval by an admin.',
                approvalStatus: 'pending'
            });
        }
        
        // If we get here, user is approved - generate token and continue
        const token = await user.generateAuthToken();
        res.send({ user, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).send({ error: 'Unable to login' });
    }
});

// User profile routes
/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Please authenticate
 */
app.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

// Route to update user's own profile (name only)
app.patch('/users/me', auth, async (req, res) => {
  try {
    //console.log("Received profile update:", req.body);
    console.log("Received profile update");
    // Only allow 'name' to be updated
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates' });
    }
    
    // Get a fresh copy of the user from the database
    const user = await User.findById(req.user._id);
    
    // Update only the 'name' field
    updates.forEach(update => {
      user[update] = req.body[update];
    });

    // Invalidate current token
    user.tokens = user.tokens.filter(token => token.token !== req.token);
    
    // Generate new token but don't save yet
    const token = jwt.sign({ _id: user._id.toString(), role: user.role }, process.env.JWT_SECRET);
    user.tokens = user.tokens.concat({ token: token });

    // Save everything in one operation
    await user.save();

    // Send back the updated user
    res.send({ 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: token
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).send({ error: error.message || 'Failed to update profile' });
  }
});

// Route to update user's own password
app.patch('/users/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).send({ error: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    
    // Remove the current token (optional - forces other sessions to re-login)
    user.tokens = user.tokens.filter(token => token.token !== req.token);
    
    // Generate new token
    const newToken = await user.generateAuthToken();
    
    // Save changes
    await user.save();
    
    res.send({ 
      message: 'Password updated successfully',
      token: newToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(400).send({ error: 'Failed to update password' });
  }
});

/**
 * @swagger
 * /users/reset-password-request:
 *   post:
 *     summary: Request password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: Email not found
 */
app.post('/users/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format (icterra.com domain)
    const companyEmailRegex = /^[a-zA-Z0-9.]+@icterra\.com$/;
    if (!companyEmailRegex.test(email)) {
      return res.status(400).send({ error: 'Invalid email format' });
    }
    
    // Find user with this email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: 'No account with that email address exists' });
    }
    
    // Generate random token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token and expiration on user model
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();
    
    // Send the password reset email
    await sendPasswordResetEmail(email, resetToken);
    
    res.send({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).send({ error: 'Error processing password reset request' });
  }
});

/**
 * @swagger
 * /users/verify-reset-token/{token}:
 *   get:
 *     summary: Verify reset token
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Invalid or expired token
 */
app.get('/users/verify-reset-token/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).send({ error: 'Password reset token is invalid or has expired' });
    }
    
    res.send({ email: user.email });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).send({ error: 'Error verifying reset token' });
  }
});

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password has been reset
 *       400:
 *         description: Invalid or expired token
 */
app.post('/users/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Validate password
    if (!password || password.length < 7) {
      return res.status(400).send({ error: 'Password must be at least 7 characters long' });
    }
    
    // Find user with this token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).send({ error: 'Password reset token is invalid or has expired' });
    }
    
    // Update user password
    user.password = password; // Your model should hash this in a pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.send({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).send({ error: 'Error resetting password' });
  }
});

// Admin user management routes
app.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({}).select('name email role approvalStatus');
        res.send(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Update user (admin only)
app.patch('/users/:id', auth, adminAuth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'role']; // Password is not in allowed updates
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      return res.status(400).send({ error: 'Invalid updates!' });
    }
    
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).send();
      }
      
      updates.forEach(update => user[update] = req.body[update]);
      await user.save();
      res.send(user);
    } catch (error) {
      res.status(400).send(error);
    }
  });
  
// Update user approval status (admin only)
app.patch('/users/:id/approval', auth, adminAuth, async (req, res) => {
    try {
        const { approvalStatus } = req.body;
        
        if (!['pending', 'approved', 'declined'].includes(approvalStatus)) {
            return res.status(400).send({ error: 'Invalid approval status' });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        
        user.approvalStatus = approvalStatus;
        await user.save();
        
        res.send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Delete user (admin only)
app.delete('/users/:id', auth, adminAuth, async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).send();
      }
      res.send(user);
    } catch (error) {
      res.status(500).send(error);
    }
});



// Get leaderboard (all users sorted by credits)
app.get('/users/leaderboard', auth, async (req, res) => {
  try {
    // Get users with their credits and names, sorted by credits (descending)
    const leaderboard = await User.find({})
      .select('name email credits')
      .sort({ credits: -1 });
    
    res.send(leaderboard);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch leaderboard' });
  }
});

// Get current user's ranking
app.get('/users/me/rank', auth, async (req, res) => {
  try {
    // Count users with more credits than current user
    const higherRanked = await User.countDocuments({
      credits: { $gt: req.user.credits }
    });
    
    // User's rank is the number of users with more credits + 1
    const rank = higherRanked + 1;
    
    res.send({ 
      rank,
      credits: req.user.credits
    });
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch ranking' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).send({ error: err.message });
    }
    res.status(500).send({ error: 'Internal Server Error' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

cron.schedule('0 * * * *', () => {
  console.log('Running scheduled due date check...');
  checkUpcomingDueDates();
});