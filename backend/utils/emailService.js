const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME, // Your Gmail address
    pass: process.env.EMAIL_PASSWORD // Your Gmail password or app password
  }
});

// Function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  // Generate the reset URL (for localhost during development)
  const resetUrl = `http://localhost:3001/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset for your Task Manager account.</p>
      <p>Please click the link below to reset your password. This link will expire in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
      <p>If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail
};