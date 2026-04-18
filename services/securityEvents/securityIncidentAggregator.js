/**
 * Week 8: Incident aggregation built on correlationId
 * Groups correlated events into security incidents
 */

const SEVERITY_RANK = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function getHigherSeverity(current, incoming) {
  const currentRank = SEVERITY_RANK[current] || 0;
  const incomingRank = SEVERITY_RANK[incoming] || 0;
  return incomingRank > currentRank ? incoming : current;
}

function calculateRiskScore(eventCount, severity) {
  const severityWeight = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  return eventCount * (severityWeight[severity] || 1);
}

function getIncidentPriority(riskScore) {
  if (riskScore >= 20) return "CRITICAL";
  if (riskScore >= 10) return "HIGH";
  if (riskScore >= 5) return "MEDIUM";
  return "LOW";
}

function getIncidentStatus(inc) {
  if (inc.eventCount > 5) return "OPEN";
  if (inc.eventCount > 2) return "MONITORING";
  return "RESOLVED";
}

function detectIncidentType(events) {
  const eventTypes = events.map((e) => e.type || '');

  if (eventTypes.some((t) => t.includes('BRUTE_FORCE'))) {
    return 'BRUTE_FORCE_ACTIVITY';
  }

  if (eventTypes.some((t) => t.includes('ACCESS_DENIED') || t.includes('RBAC'))) {
    return 'ACCESS_CONTROL_ACTIVITY';
  }

  if (eventTypes.some((t) => t.includes('TOKEN') || t.includes('SESSION'))) {
    return 'SESSION_OR_TOKEN_ACTIVITY';
  }

  if (eventTypes.some((t) => t.includes('ERROR') || t.includes('EXCEPTION'))) {
    return 'APPLICATION_ERROR_ACTIVITY';
  }

  return 'GENERAL_SECURITY_ACTIVITY';
}

function aggregateIncidents(events) {
  const incidentsMap = {};

  for (const ev of events) {
    const incidentKey =
  ev.correlationId ||
  `${ev.type || 'UNKNOWN'}::${ev.actor?.email || ev.actor?.userId || ev.network?.ip || 'anonymous'}`;

if (!incidentsMap[incidentKey]) {
  incidentsMap[incidentKey] = {
    incidentId: incidentKey,
    confidence: ev.confidence ?? null,
    firstSeen: ev.occurredAt,
    lastSeen: ev.occurredAt,
    durationMs: 0,
    eventCount: 0,
    severity: ev.severity || 'LOW',
    actors: new Set(),
    sources: new Set(),
    eventTypes: new Set(),
    successCount: 0,
    failureCount: 0,
    events: [],
  };
}

const inc = incidentsMap[incidentKey];

  

    inc.eventCount += 1;
    inc.events.push(ev);

    if (ev.occurredAt < inc.firstSeen) inc.firstSeen = ev.occurredAt;
    if (ev.occurredAt > inc.lastSeen) inc.lastSeen = ev.occurredAt;

    inc.severity = getHigherSeverity(inc.severity, ev.severity || 'LOW');

    if (ev.actor?.email) inc.actors.add(ev.actor.email);
    if (ev.actor?.userId) inc.actors.add(`user:${ev.actor.userId}`);
    if (ev.source?.table) inc.sources.add(ev.source.table);
    if (ev.type) inc.eventTypes.add(ev.type);

    if (ev.status === 'SUCCESS') inc.successCount += 1;
    if (ev.status === 'FAILURE') inc.failureCount += 1;
  }

  return Object.values(incidentsMap).map((inc) => {
    const firstSeenMs = new Date(inc.firstSeen).getTime();
    const lastSeenMs = new Date(inc.lastSeen).getTime();

    return {
      ...inc,
      durationMs: lastSeenMs - firstSeenMs,
      incidentType: detectIncidentType(inc.events),
      summary: `${inc.eventCount} event(s) grouped as ${detectIncidentType(inc.events)}`,
      riskScore: calculateRiskScore(inc.eventCount, inc.severity),
      priority: getIncidentPriority(
        calculateRiskScore(inc.eventCount, inc.severity)
      ),
      status: getIncidentStatus(inc),
      actors: Array.from(inc.actors),
      sources: Array.from(inc.sources),
      eventTypes: Array.from(inc.eventTypes),
    };
  });
}

module.exports = {
  aggregateIncidents,
};