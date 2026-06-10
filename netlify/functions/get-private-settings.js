exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const body = JSON.parse(event.body || '{}');
  const ok   = body.password === process.env.EPROLO_PASSWORD;
  return {
    statusCode: ok ? 200 : 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok })
  };
};