const mongoose = require("mongoose");

const AuditSchema = new mongoose.Schema({
  status: String,
  errorType: String,
  fields: [String],
  correlationId: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AuditLog", AuditSchema);