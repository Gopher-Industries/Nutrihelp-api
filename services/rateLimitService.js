const loginAttempts = new Map();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

function checkLoginRateLimit(ipAddress) {
  const now = Date.now();
  const ip = ipAddress || "unknown";

  const existingAttempts = loginAttempts.get(ip) || [];

  const recentAttempts = existingAttempts.filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  console.log("RATE LIMIT CHECK:", ip, recentAttempts.length);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (WINDOW_MS - (now - recentAttempts[0])) / 1000
      ),
    };
  }

  recentAttempts.push(now);
  loginAttempts.set(ip, recentAttempts);

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - recentAttempts.length,
  };
}

module.exports = {
  checkLoginRateLimit,
};