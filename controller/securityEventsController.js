// Week 8: Correlated incident export

const { getSecurityEvents } = require('../services/securityEvents/securityEventsService');
const { securityEventsToCsv } = require('../services/securityEvents/securityEventsCsvFormatter');

async function exportSecurityEvents(req, res) {
  try {
    const { from, to, format = 'json' } = req.query;

    const toDate = to ? new Date(to) : new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Week 8: service now returns { events, incidents }
    const { events, incidents } = await getSecurityEvents(fromDate, toDate);

    // CSV mode (events only)
    if (format === 'csv') {
      const csv = securityEventsToCsv(events);
      const fileName = `securityevent_${fromDate.toISOString().split('T')[0]}_${toDate
        .toISOString()
        .split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send(csv);
    }

    // Pretty JSON mode (events + incidents)
    const payload = {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      summary: {
        totalEvents: events.length,
        totalIncidents: incidents.length,
      },
      events,
      incidents,
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error('Error exporting security events:', e);
    return res.status(500).json({ error: 'Failed to export security events' });
  }
}

module.exports = {
  exportSecurityEvents,
};
