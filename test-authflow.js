require("dotenv").config();
const axios = require("axios");

const BASE_URL = "http://localhost/api/auth";

let accessToken = "";
let refreshToken = "";

// Helper for pretty logs
function log(title, data) {
  console.log(`\n🔵 ${title}...`);
  console.log(JSON.stringify(data, null, 2));
}

// STEP 1 — SIGNUP user if not exists
async function testSignup() {
  try {
    const res = await axios.post("http://localhost/api/signup", {
      email: "test@email.com",
      password: "test123"
    });

    log("Signup Success", res.data);
  } catch (err) {
    console.log("🔸 Signup skipped (user may already exist)");
  }
}

// STEP 2 — LOGIN
async function testLogin() {
  try {
    const res = await axios.post(`${BASE_URL}/login`, {
      email: "john@nutrihep.com",
      password: "SecurePassword123!"
    });

    accessToken = res.data.accessToken;
    refreshToken = res.data.refreshToken;

    log("Login Success", {
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.log("❌ Login failed:", err.response?.data || err.message);
  }
}

// STEP 3 — CALL PROTECTED ROUTE
async function testProtectedRoute() {
  try {
    const res = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    log("Protected Route Success", res.data);
  } catch (err) {
    console.log("❌ Protected route failed:", err.response?.data || err.message);
  }
}

// STEP 4 — REFRESH TOKEN
async function testRefresh() {
  try {
    const res = await axios.post(`${BASE_URL}/refresh`, {
      refreshToken
    });

    accessToken = res.data.accessToken;
    refreshToken = res.data.refreshToken;

    log("Token Refresh Success", {
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.log("❌ Refresh failed:", err.response?.data || err.message);
  }
}

// STEP 5 — LOGOUT
async function testLogout() {
  try {
    const res = await axios.post(`${BASE_URL}/logout`, {
      refreshToken
    });

    log("Logout Success", res.data);
  } catch (err) {
    console.log("❌ Logout failed:", err.response?.data || err.message);
  }
}

// RUN EVERYTHING IN ORDER
(async () => {
  console.log("\n🚀 Starting full Auth Flow Test...\n");

  await testSignup();
  await testLogin();
  await testProtectedRoute();
  await testRefresh();
  await testLogout();

  console.log("\n✨ ALL TESTS COMPLETED\n");
})();


