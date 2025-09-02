const fs = require("fs-extra");
const crypto = require("crypto");
//To install use this command npm install crypto fs-extra
const path = require("path");
 
const baseline = fs.readJSONSync("tools/integrity/baseline.json");
 
function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}
 
function checkIntegrity() {
  let anomalies = [];
 
  for (const file in baseline) {
    const absPath = path.resolve(file);
 
    if (!fs.existsSync(absPath)) {
      anomalies.push({ file, issue: "Missing file" });
      continue;
    }
 
    const currentStats = fs.statSync(absPath);
    const currentHash = hashFile(absPath);
 
    const original = baseline[file];
 
    // 1. Hash check
    if (currentHash !== original.hash) {
      anomalies.push({ file, issue: "File modified (hash mismatch)" });
    }
 
    // 2. Size anomaly (5 KB threshold)
    const sizeDiff = Math.abs(currentStats.size - original.size);
    if (sizeDiff > 5 * 1024) {
      anomalies.push({ file, issue: `File size anomaly (Δ ${sizeDiff} bytes)` });
    }
 
    // 3. Timestamp anomaly
    if (Math.abs(currentStats.mtimeMs - original.modified) > 10000) { // 10 seconds buffer
      anomalies.push({ file, issue: "File modification time anomaly" });
    }
  }
 
  if (anomalies.length > 0) {
    console.warn("Anomalies detected:");
    console.table(anomalies);
  } else {
    console.log("No anomalies. All files are clean.");
  }
}
 
checkIntegrity();
 
 