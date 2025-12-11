function securityEventsToCsv(events) {
  const headers = [
    'id',
    'occurredAt',
    'type',
    'userId',
    'sessionId',
    'ipAddress',
    'userAgent',
    'source',
    'metadataJson',
  ];

  const lines = [];
  lines.push(headers.join(','));

  for (const ev of events) {
    const row = [
      ev.id,
      ev.occurredAt,
      ev.type,
      ev.userId || '',
      ev.sessionId || '',
      ev.ipAddress || '',
      ev.userAgent || '',
      ev.source,
      JSON.stringify(ev.metadata || {}),
    ];

    const esc = row.map((v) => {
      const s = String(v);
      return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
    });

    lines.push(esc.join(','));
  }

  return lines.join('\n');
}

module.exports = {
  securityEventsToCsv,
};
