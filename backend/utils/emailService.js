const nodemailer = require('nodemailer'); // Import nodemailer for sending emails

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail as the email service (you can also use other services like SendGrid, Mailgun, or others)
  auth: {
    user: process.env.EMAIL_USERNAME, // Your Gmail address from environment variables
    pass: process.env.EMAIL_PASSWORD // Your Gmail password or app password from environment variables
  }
});

// Function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  // Generate the reset URL (for localhost during development)
  const resetUrl = `http://localhost:3001/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USERNAME, // Sender email address
    to: email, // Recipient email address
    subject: 'Password Reset Request', // Email subject
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset for your Task Manager account.</p>
      <p>Please click the link below to reset your password. This link will expire in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
      <p>If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
    ` // HTML content of the email
  };

  try {
    const info = await transporter.sendMail(mailOptions); // Send the email
    //console.log('Password reset email sent:', info.messageId); // Log the message ID
    console.log('Password reset email sent');
    return true; // Return true if email is sent successfully
  } catch (error) {
    console.error('Error sending password reset email:', error); // Log any errors
    throw error; // Throw the error to be handled by the caller
  }
};

// Function to send verification email
const sendVerificationEmail = async (email, verificationToken) => {
  // Generate the verification URL
  const verificationUrl = `http://localhost:3001/verify-email/${encodeURIComponent(verificationToken)}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USERNAME, // Sender email address
    to: email, // Recipient email address
    subject: 'Verify Your Email Address', // Email subject
    html: `
      <h1>Email Verification</h1>
      <p>Thank you for registering for the Task Manager application.</p>
      <p>Please click the link below to verify your email address. This link will expire in 24 hours.</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a>
      <p>If you did not create an account, please ignore this email.</p>
    ` // HTML content of the email
  };

  try {
    const info = await transporter.sendMail(mailOptions); // Send the email
    console.log('Verification email sent:', info.messageId); // Log the message ID
    return true; // Return true if email is sent successfully
  } catch (error) {
    console.error('Error sending verification email:', error); // Log any errors
    throw error; // Throw the error to be handled by the caller
  }
};

/**
 * Sends due date reminder emails for tasks that are due within 24 hours
 * @param {Object} task - The task object with populated owner and visibleTo fields
 */
const sendDueDateReminders = async (task) => {
  try {
    const dueDate = new Date(task.dueDate);
    const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const formattedTime = dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // If task has an owner, send them an urgent reminder
    if (task.owner && task.owner.email) {
      const ownerSubject = `URGENT: Task "${task.title}" is due tomorrow!`;
      const ownerText = `The task "${task.title}" which was assigned to you is due tomorrow: ${formattedDate}, at ${formattedTime}. If you haven't finished your task, we advise you to go back to work ASAP!`;
      
      await sendEmail(task.owner.email, ownerSubject, ownerText);
    }
    
    // For users who can view the task (but aren't the owner)
    if (task.isPublic || (task.visibleTo && task.visibleTo.length > 0)) {
      // For public tasks, we'd need to get all users from the database
      // Or for tasks with specific visibility, use the visibleTo array
      
     
      // For specifically visible tasks:
      if (!task.isPublic && task.visibleTo && task.visibleTo.length > 0) {
        for (const user of task.visibleTo) {
          // Skip if this user is the owner (already notified with urgent message)
          if (task.owner && user._id.toString() === task.owner._id.toString()) {
            continue;
          }
          
          const viewerSubject = `Task "${task.title}" is due tomorrow`;
          const viewerText = `The task "${task.title}" which is visible to you is due tomorrow: ${formattedDate}, at ${formattedTime}.`;
          
          await sendEmail(user.email, viewerSubject, viewerText);
        }
      }
    }
  } catch (error) {
    console.error('Error sending due date reminders:', error);
  }
};

// General function to send emails
const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: to,
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    //console.log(`Email sent to ${to}:`, info.messageId);
    console.log(`Email sent`);
    return true;
  } catch (error) {
    console.error(`Error sending email`);
    throw error;
  }
};

// Export the new function
module.exports = {
  sendPasswordResetEmail, // Export the sendPasswordResetEmail function
  sendVerificationEmail, // Export the sendVerificationEmail function
  sendDueDateReminders,
  sendEmail
};