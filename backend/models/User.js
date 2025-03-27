const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Define the user schema with various fields and validation
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
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpires: {
        type: Date
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }
});

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
    const user = this;
    
    if (user.isModified('password')) {
        try {
            // Hash the password with bcrypt
            user.password = await bcrypt.hash(user.password, 8);
        } catch (err) {
            //console.error('Password hashing error:', err);
            console.error('Password hashing error:');
        }
    }
    
    next();
});

// Generate an auth token for the user
userSchema.methods.generateAuthToken = async function () {
    const user = this;
    // Create a JWT token with user ID and role
    const token = jwt.sign({ _id: user._id.toString(), role: user.role }, process.env.JWT_SECRET);
    // Add the token to the user's tokens array
    user.tokens = user.tokens.concat({ token });
    await user.save(); // Save the token to the database
    return token;
};

// Find user by credentials (email and password)
userSchema.statics.findByCredentials = async (email, password) => {
  try {
    // Log the email being looked up (sanitized for logs)
    //console.log(`Attempting login for: ${email.substring(0, 3)}...@${email.split('@')[1]}`);
    console.log(`Attempting login...`);

    // Find the user by email
    const user = await User.findOne({ email });
    
    // If no user found with this email
    if (!user) {
      //console.log(`No user found with email: ${email}`);
      console.log(`No user found with current email`);
      throw new Error('Unable to login');
    }
    
    // Log that user was found
    //console.log(`User found with email: ${email}`);
    console.log(`User found with current email`);
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    // If password doesn't match
    if (!isMatch) {
      //console.log(`Password mismatch for: ${email}`);
      console.log(`Password mismatch for current email`);
      throw new Error('Unable to login');
    }
    
    // If we get here, credentials are valid
    //console.log(`Authentication successful for: ${email}`);
    console.log(`Authentication successful for current email`);
    
    // Handle missing approvalStatus for old accounts
    if (!user.approvalStatus) {
      //console.log(`Setting default approvalStatus for: ${email}`);
      console.log(`Setting default approvalStatus for current email`);
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

// Control what gets sent to JSON
userSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();
    
    // Include only specific fields in the returned object
    return {
        _id: userObject._id,
        name: userObject.name,
        email: userObject.email,
        role: userObject.role,
        approvalStatus: userObject.approvalStatus
    };
};

// Create the User model from the schema
const User = mongoose.model('User', userSchema);

module.exports = User;