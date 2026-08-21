const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

/** sessionRole = role for this login (customer, driver, vendor_admin, super_admin). May differ from stored user.role. */
function signAccessToken(user, sessionRole, extra = {}) {
  const role = sessionRole || user.role;
  const mobileNumber = user.mobileNumber || user.phone;
  const payload = {
    sub: user._id.toString(),
    role,
    mobileNumber
  };
  if (extra.driverId) payload.driverId = String(extra.driverId);
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

module.exports = { signAccessToken };
