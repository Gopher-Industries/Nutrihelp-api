const fs = require("fs-extra");
const crypto = require("crypto");
const path = require("path");
 
const filesToMonitor = [
  "server.js",
  "package.json",
  "routes/routes.js",
  "controller/loginController.js",
  "controller/newFake.js",
];
 
function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}
 
function checkFileIntegrity() {
  const baseline = fs.readJSONSync("tools/integrity/baseline.json");
  let anomalies = [];
 
  for (const file in baseline) {
    const absPath = path.resolve(file);
 
    if (!fs.existsSync(absPath)) {
      anomalies.push({ file, issue: "Missing file" });
      continue;
    }
 
    const stats = fs.statSync(absPath);
    const currentHash = hashFile(absPath);
    const original = baseline[file];
 
    if (currentHash !== original.hash) {
      anomalies.push({ file, issue: "File modified (hash mismatch)" });
    }
 
    const sizeDiff = Math.abs(stats.size - original.size);
    if (sizeDiff > 5 * 1024) {
      anomalies.push({ file, issue: `File size anomaly (Δ ${sizeDiff} bytes)` });
    }
 
    if (Math.abs(stats.mtimeMs - original.modified) > 10000) {
      anomalies.push({ file, issue: "File modification time anomaly" });
    }
  }
 
  return anomalies;
}
 
function generateBaseline() {
  const baseline = {};
  filesToMonitor.forEach(file => {
    const absPath = path.resolve(file);
    const stats = fs.statSync(absPath);
 
    baseline[file] = {
      hash: hashFile(absPath),
      size: stats.size,
      modified: stats.mtimeMs
    };
  });
 
  fs.writeJSONSync("tools/integrity/baseline.json", baseline, { spaces: 2 });
 
  return { message: "Baseline regenerated successfully", fileCount: filesToMonitor.length };
}
 
module.exports = {
  checkFileIntegrity,
  generateBaseline
};
 