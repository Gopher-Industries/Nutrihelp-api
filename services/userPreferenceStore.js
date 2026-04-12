const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'user-preferences-store.json');

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({}, null, 2));
  }
}

function readStore() {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function getUserPreferenceState(userId) {
  const store = readStore();
  return store[String(userId)] || {};
}

function saveUserPreferenceState(userId, updater) {
  const store = readStore();
  const key = String(userId);
  const current = store[key] || {};
  const nextValue = typeof updater === 'function' ? updater(current) : updater;

  store[key] = {
    ...nextValue,
    updatedAt: new Date().toISOString()
  };

  writeStore(store);
  return store[key];
}

module.exports = {
  getUserPreferenceState,
  saveUserPreferenceState
};
