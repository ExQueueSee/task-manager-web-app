const jwt = require('jsonwebtoken'); // Import jsonwebtoken library
const User = require('../models/User'); // Import User model

// Middleware to authenticate user
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ 
      _id: decoded._id, 
      'tokens.token': token 
    });
    
    if (!user) {
      throw new Error();
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: 'Please authenticate.' });
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