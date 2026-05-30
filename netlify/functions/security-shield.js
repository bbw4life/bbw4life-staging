/* ════════════════════════════════════════════════════════
   BBW4LIFE — SECURITY SHIELD — Netlify Function
════════════════════════════════════════════════════════ */
'use strict';

const IP_BLACKLIST = [
  '185.220.101.5',
  '45.142.212.100',
  '91.108.4.0'
];

const SUSPICIOUS_UA = [
  'python-requests',
  'curl/',
  'wget/',
  'scrapy',
  'phantomjs',
  'headlesschrome',
  'selenium',
  'puppeteer',
  'playwright',
  'go-http-client',
  'java/',
  'libwww-perl',
  'httpclient',
  'axios/',
  'node-fetch',
  'postman',
  'insomnia'
];

const SECRET_KEY  = process.env.BBW_SECRET_KEY;
const requestLog  = new Map();
const RATE_LIMIT  = 30;
const RATE_WINDOW = 60000;

function getClientIP(event) {
  return (
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['x-real-ip'] ||
    event.headers['client-ip'] ||
    'unknown'
  );
}

function isBot(userAgent) {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  return SUSPICIOUS_UA.some(function(pattern) {
    return ua.includes(pattern.toLowerCase());
  });
}

function isRateLimited(ip) {
  const now     = Date.now();
  const history = (requestLog.get(ip) || []).filter(function(ts) {
    return now - ts < RATE_WINDOW;
  });
  history.push(now);
  requestLog.set(ip, history);
  return history.length > RATE_LIMIT;
}

function validateToken(token) {
  if (!token) return false;
  try {
    const decoded  = atob(token);
    const tsBase36 = decoded.slice(0, 8);
    const ts       = parseInt(tsBase36, 36);
    const age      = Date.now() - ts;
    const MAX_AGE  = 24 * 60 * 60 * 1000;
    return age < MAX_AGE && age > 0;
  } catch (e) {
    return false;
  }
}

function corsHeaders(origin) {
  const allowed = [
    'https://bbw4life.com',
    'https://www.bbw4life.com',
    'http://localhost:8888',
    'http://localhost:3000'
  ];
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-BBW-Token, X-BBW-Secret',
    'Access-Control-Max-Age':       '86400'
  };
}

function respond(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: {
      'Content-Type':           'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options':        'DENY',
      'X-XSS-Protection':       '1; mode=block',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async function(event, context) {

  const origin  = event.headers['origin'] || '';
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const ip        = getClientIP(event);
  const userAgent = event.headers['user-agent'] || '';
  const token     = event.headers['x-bbw-token']  || '';
  const secret    = event.headers['x-bbw-secret'] || '';

  if (IP_BLACKLIST.includes(ip)) {
    return respond(403, { success: false, error: 'ACCESS_DENIED',  message: 'Your IP has been blocked.' }, headers);
  }

  if (isBot(userAgent)) {
    return respond(403, { success: false, error: 'BOT_DETECTED',   message: 'Automated access is not allowed.' }, headers);
  }

  if (isRateLimited(ip)) {
    return respond(429, { success: false, error: 'RATE_LIMITED',   message: 'Too many requests. Please slow down.' }, headers);
  }

  if (!validateToken(token)) {
    return respond(401, { success: false, error: 'INVALID_TOKEN',  message: 'Session token is missing or expired.' }, headers);
  }

  if (!secret || secret.length < 20) {
    return respond(401, { success: false, error: 'INVALID_SECRET', message: 'Unauthorized.' }, headers);
  }

  if (secret !== SECRET_KEY) {
    return respond(401, { success: false, error: 'INVALID_SECRET', message: 'Unauthorized.' }, headers);
  }

  const body   = event.body ? JSON.parse(event.body) : {};
  const action = body.action || 'validate';

  if (action === 'validate') {
    return respond(200, { success: true, validated: true, ip, message: 'Access granted.' }, headers);
  }

  if (action === 'get-products') {
    try {
      const fetch = require('node-fetch');
      const res   = await fetch('https://bbw4life.com/products.data.json');
      const data  = await res.json();

      const sanitized = data.map(function(item) {
        if (item.type === 'settings') {
          const safe = { ...item };
          delete safe.eprolo_viewer_password;
          delete safe.stripe_public_key;
          delete safe.contact_emails;
          return safe;
        }
        return item;
      });

      return respond(200, { success: true, data: sanitized }, headers);

    } catch (err) {
      return respond(500, { success: false, error: 'FETCH_ERROR', message: err.message }, headers);
    }
  }

  return respond(400, { success: false, error: 'UNKNOWN_ACTION' }, headers);
};