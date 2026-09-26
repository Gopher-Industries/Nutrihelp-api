function securityEventsToCsv(events) {
  const headers = [
    'id',
    'occurredAt',
    'type',
    'severity',
    'email',
    'userId',
    'sessionId',
    'ipAddress',
    'userAgent',
    'correlationId',
    'confidence',
    'source',
    'metadataJson',
  ];

  const getSeverity = (e) => e?.severity ?? '';
  const getEmail = (e) => e?.actor?.email ?? e?.metadata?.email ?? '';
  const getUserId = (e) => e?.actor?.userId ?? e?.userId ?? '';
  const getSessionId = (e) => e?.session?.sessionId ?? e?.sessionId ?? '';
  const getIp = (e) => e?.network?.ip ?? e?.ipAddress ?? '';
  const getUserAgent = (e) => e?.network?.userAgent ?? e?.userAgent ?? '';
  const getCorrelationId = (e) => e?.correlationId ?? '';
  const getConfidence = (e) =>
    e?.confidence === null || e?.confidence === undefined ? '' : e.confidence;
  const getSource = (e) => e?.source?.table ?? e?.source ?? '';

  const lines = [];
  lines.push(headers.join(','));

  for (const ev of events) {
    const row = [
      ev?.id ?? '',
      ev?.occurredAt ?? '',
      ev?.type ?? '',
      getSeverity(ev),
      getEmail(ev),
      getUserId(ev),
      getSessionId(ev),
      getIp(ev),
      getUserAgent(ev),
      getCorrelationId(ev),
      getConfidence(ev),
      getSource(ev),
      JSON.stringify(ev?.metadata || {}),
    ];

    const esc = row.map((v) => {
      const s = v === null || v === undefined ? '' : String(v);
      const mustQuote = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return mustQuote ? `"${escaped}"` : escaped;
    });

    lines.push(esc.join(','));
  }

  return lines.join('\n');
}

module.exports = {
  securityEventsToCsv,
};