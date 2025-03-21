const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(value) {
                // Regex for company email validation - alphanumeric chars and dots before @icterra.com
                const companyEmailRegex = /^[a-zA-Z0-9.]+@icterra\.com$/;
                return companyEmailRegex.test(value);
            },
            message: props => `${props.value} is not a valid company email. Only @icterra.com emails are allowed.`
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'declined'],
        default: 'pending'
    }
});

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
    const user = this;
    
    if (user.isModified('password')) {
        try {
            user.password = await bcrypt.hash(user.password, 8);
        } catch (err) {
            console.error('Password hashing error:', err);
        }
    }
    
    next();
});

// Generate an auth token for the user
userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString(), role: user.role }, process.env.JWT_SECRET);
    user.tokens = user.tokens.concat({ token });
    await user.save(); // Add this line to save the token to the database
    return token;
};

// Update the findByCredentials method (around line 79)
userSchema.statics.findByCredentials = async (email, password) => {
  try {
    // Log the email being looked up (sanitized for logs)
    console.log(`Attempting login for: ${email.substring(0, 3)}...@${email.split('@')[1]}`);
    
    // Find the user
    const user = await User.findOne({ email });
    
    // If no user found with this email
    if (!user) {
      console.log(`No user found with email: ${email}`);
      throw new Error('Unable to login');
    }
    
    // Log that user was found
    console.log(`User found with email: ${email}`);
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    // If password doesn't match
    if (!isMatch) {
      console.log(`Password mismatch for: ${email}`);
      throw new Error('Unable to login');
    }
    
    // If we get here, credentials are valid
    console.log(`Authentication successful for: ${email}`);
    
    // Handle missing approvalStatus for old accounts
    if (!user.approvalStatus) {
      console.log(`Setting default approvalStatus for: ${email}`);
      user.approvalStatus = 'approved'; // Set default for old accounts
      await user.save();
    }
    
    return user;
  } catch (error) {
    // Log the specific error but throw a generic one for security
    console.error('Authentication error:', error.message);
    throw new Error('Unable to login');
  }
};

// Add this method to your User schema to control what gets sent to JSON
userSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();
    
    // Include approvalStatus in the returned object
    return {
        _id: userObject._id,
        name: userObject.name,
        email: userObject.email,
        role: userObject.role,
        approvalStatus: userObject.approvalStatus
    };
};

const User = mongoose.model('User', userSchema);

module.exports = User;