/**
 * Unified Security Event model
 * Week 8: Normalisation & Correlation foundation
 */

const SecurityEvent = {
  // Core identifiers
  id: null,
  occurredAt: null,        // ISO timestamp
  type: null,              // SecurityEventType
  severity: null,          // LOW | MEDIUM | HIGH

  // Correlation (Week 8)
  correlationId: null,
  confidence: null,        // 0.0 – 1.0

  // Actor context
  actor: {
    userId: null,
    email: null,
    role: null,
  },

  // Network context
  network: {
    ip: null,
    userAgent: null,
  },

  // Session / token context
  session: {
    sessionId: null,
    refreshTokenHash: null,
  },

  // Request context (optional)
  request: {
    requestId: null,
    path: null,
    method: null,
  },

  // Source metadata
  source: {
    system: 'supabase',
    table: null,
    recordId: null,
  },

  // Additional event data
  metadata: {},
};

module.exports = {
  SecurityEvent,
};
