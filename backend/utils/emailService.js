const nodemailer = require('nodemailer'); // Import nodemailer for sending emails

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail as the email service
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
    console.log('Password reset email sent:', info.messageId); // Log the message ID
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

module.exports = {
  sendPasswordResetEmail, // Export the sendPasswordResetEmail function
  sendVerificationEmail // Export the sendVerificationEmail function
};