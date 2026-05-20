const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = {
      name: decoded.name || null,
      role: decoded.role || null,
      userId: decoded.userId || decoded.teamleaderId || null,
    };
  } catch (err) {
    // Token invalid or expired — proceed without req.user
  }

  next();
};

module.exports = auth;
