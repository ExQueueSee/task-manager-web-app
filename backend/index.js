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
const crypto = require('crypto'); // Make sure this is at the top with other imports
const { sendPasswordResetEmail, sendVerificationEmail } = require('./utils/emailService');
const Task = require('./models/Task'); // Import the Task model
const User = require('./models/User'); // Import the User model
const { auth, adminAuth } = require('./middleware/auth'); // Import the auth and adminAuth middleware
const cron = require('node-cron');
const checkUpcomingDueDates = require('./scripts/checkUpcomingDueDates');

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
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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

// THEN define dynamic routes with parameters
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
    
    await task.save();
    res.send(task);
  } catch (error) {
    res.status(400).send(error);
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
        console.error('Login error:', error); // Add this line for debugging
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

// Add this route to update user's own password
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