const jwt = require('jsonwebtoken'); // Import jsonwebtoken library
const User = require('../models/User'); // Import User model

// Middleware to authenticate user
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    console.log('Processing auth token:', token.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    const user = await User.findOne({ 
      _id: decoded._id, 
      'tokens.token': token 
    });
    
    if (!user) {
      console.log('User not found with token');
      throw new Error();
    }
    
    console.log('User authenticated:', user.email, 'Role:', user.role);
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).send({ error: 'Please authenticate' });
  }
};

// Middleware to authorize admin user
const adminAuth = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send({ error: 'Access denied.' }); // Send 403 error if user is not admin
    }
    next(); // Proceed to next middleware if user is admin
};

module.exports = { auth, adminAuth }; // Export auth and adminAuth middlewares