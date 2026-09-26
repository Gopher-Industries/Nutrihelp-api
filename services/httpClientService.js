async function fetchJson(url, options = {}, customFetch = null) {
  const fetchImpl = customFetch || global.fetch || (await import('node-fetch')).default;
  const response = await fetchImpl(url, options);
  const text = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    data: parsed
  };
}

module.exports = {
  fetchJson
};
