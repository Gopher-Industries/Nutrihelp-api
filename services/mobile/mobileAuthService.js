const authService = require("../authService");

async function registerMobileUser(payload) {
  return authService.register(payload);
}

async function loginMobileUser(credentials, deviceInfo) {
  return authService.login(credentials, deviceInfo);
}

async function refreshMobileSession(refreshToken, deviceInfo) {
  return authService.refreshAccessToken(refreshToken, deviceInfo);
}

async function logoutMobileSession(refreshToken) {
  return authService.logout(refreshToken);
}

module.exports = {
  loginMobileUser,
  logoutMobileSession,
  refreshMobileSession,
  registerMobileUser,
};
