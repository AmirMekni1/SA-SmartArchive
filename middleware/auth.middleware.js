const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token is missing' });
  }

  try {
    let tokenValue = token;
    if (tokenValue.startsWith('Bearer ')) {
      tokenValue = tokenValue.slice(7);
    }

    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    let user = await User.findById(decoded.user_id);
    if (!user) {
      const admin = await Admin.findById(decoded.user_id);
      if (!admin) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      req.user = admin;
      req.admin = admin;
    } else {
      req.user = user;
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token has expired' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

module.exports = { verifyToken };