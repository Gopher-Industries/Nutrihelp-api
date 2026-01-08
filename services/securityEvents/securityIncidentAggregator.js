/**
 * Week 8: Incident aggregation built on correlationId
 * Groups correlated events into security incidents
 */

function aggregateIncidents(events) {
  const incidentsMap = {};

  for (const ev of events) {
    if (!ev.correlationId) continue;

    if (!incidentsMap[ev.correlationId]) {
      incidentsMap[ev.correlationId] = {
        incidentId: ev.correlationId,
        confidence: ev.confidence,
        firstSeen: ev.occurredAt,
        lastSeen: ev.occurredAt,
        eventCount: 0,
        severity: ev.severity || 'LOW',
        actors: new Set(),
        sources: new Set(),
        events: [],
      };
    }

    const inc = incidentsMap[ev.correlationId];

    inc.eventCount += 1;
    inc.events.push(ev);

    // time range
    if (ev.occurredAt < inc.firstSeen) inc.firstSeen = ev.occurredAt;
    if (ev.occurredAt > inc.lastSeen) inc.lastSeen = ev.occurredAt;

    // severity escalation
    if (ev.severity === 'HIGH') inc.severity = 'HIGH';
    else if (ev.severity === 'MEDIUM' && inc.severity !== 'HIGH') {
      inc.severity = 'MEDIUM';
    }

    // actor + source tracking
    if (ev.actor?.email) inc.actors.add(ev.actor.email);
    if (ev.actor?.userId) inc.actors.add(`user:${ev.actor.userId}`);
    if (ev.source?.table) inc.sources.add(ev.source.table);
  }

  // Convert sets → arrays
  return Object.values(incidentsMap).map((inc) => ({
    ...inc,
    actors: Array.from(inc.actors),
    sources: Array.from(inc.sources),
  }));
}

module.exports = {
  aggregateIncidents,
};
