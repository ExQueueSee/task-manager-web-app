require('dotenv').config(); // Load environment variables from .env file
const mongoose = require('mongoose'); // Import mongoose for MongoDB interaction
const User = require('./models/User'); // Import User model

async function createAdminUser() {
  try {
    // Connect to MongoDB using the connection string from environment variables
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Define the admin email to check if the admin user already exists
    const adminEmail = 'admin@example.com'; // You can change this
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      // If admin user already exists, log a message and exit the function
      console.log('Admin user already exists with email:', adminEmail);
      mongoose.disconnect();
      return;
    }

    // Create a new admin user object
    const adminUser = new User({
      name: 'Admin', // Admin user's name
      email: adminEmail, // Admin user's email
      password: 'admin123', // Admin user's password (will be hashed by the pre-save hook)
      role: 'admin' // Admin user's role
    });

    // Save the new admin user to the database
    await adminUser.save();
    console.log('Admin user created successfully!');

  } catch (error) {
    // Log any errors that occur during the process
    console.error('Error creating admin user:', error);
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Call the function to create the admin user
createAdminUser();