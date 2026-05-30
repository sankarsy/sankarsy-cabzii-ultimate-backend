const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

/** sessionRole = role for this login (customer, vendor_admin, super_admin). May differ from stored user.role. */
function signAccessToken(user, sessionRole) {
  const role = sessionRole || user.role;
  const mobileNumber = user.mobileNumber || user.phone;
  return jwt.sign(
    {
      sub: user._id.toString(),
      role,
      mobileNumber
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

module.exports = { signAccessToken };
