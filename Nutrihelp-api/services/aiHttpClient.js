const https = require("https");

const fetch = (...args) =>
  import("node-fetch").then(({ default: nodeFetch }) => nodeFetch(...args));

const rejectUnauthorized = process.env.AI_TLS_REJECT_UNAUTHORIZED !== "false";

const tls13Agent = new https.Agent({
  minVersion: "TLSv1.3",
  maxVersion: "TLSv1.3",
  rejectUnauthorized,
});

function assertHttpsUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid AI URL: ${url}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`AI URL must use HTTPS: ${url}`);
  }

  return parsed;
}

async function fetchAi(url, options = {}) {
  assertHttpsUrl(url);
  return fetch(url, {
    ...options,
    agent: () => tls13Agent,
  });
}

module.exports = {
  fetchAi,
};
