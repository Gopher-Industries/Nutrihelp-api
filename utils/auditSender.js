const fetch = require("node-fetch");

async function sendWithRetry(data, retries = 3) {
  try {
    await fetch("http://localhost:8081/audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
  } catch (err) {
    if (retries > 0) {
      return sendWithRetry(data, retries - 1);
    } else {
      console.error("Audit failed permanently", data);
    }
  }
}

module.exports = sendWithRetry;