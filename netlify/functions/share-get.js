import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const BLOB_STORE = 'calculator-shares';
const SIGNATURE_LENGTH = 16;
const UUID_HEX_REGEX = /^[0-9a-f]{32}$/;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function signId(id, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(id)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH);
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { valid: false, error: 'invalid' });
  }

  const secret = process.env.SHARE_JWT_SECRET;
  if (!secret) {
    return jsonResponse(500, { valid: false, error: 'Server configuration error' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { valid: false, error: 'invalid' });
  }

  const { id } = body || {};
  if (!id || typeof id !== 'string') {
    return jsonResponse(401, { valid: false, error: 'invalid' });
  }

  const parts = id.split('.');
  if (parts.length !== 2) {
    return jsonResponse(401, { valid: false, error: 'invalid' });
  }

  const [uuid, sig] = parts;
  if (!UUID_HEX_REGEX.test(uuid) || !sig) {
    return jsonResponse(401, { valid: false, error: 'invalid' });
  }

  const expectedSig = signId(uuid, secret);
  if (!safeCompare(sig, expectedSig)) {
    return jsonResponse(401, { valid: false, error: 'invalid' });
  }

  let stored;
  try {
    const store = getStore(BLOB_STORE);
    stored = await store.get(uuid, { type: 'json' });
  } catch (err) {
    console.error('Blob store error:', err);
    return jsonResponse(500, { valid: false, error: 'Storage error' });
  }

  if (!stored) {
    return jsonResponse(401, { valid: false, error: 'invalid' });
  }

  if (!stored.d || typeof stored.d !== 'string' || typeof stored.exp !== 'number') {
    return jsonResponse(401, { valid: false, error: 'invalid' });
  }

  if (Date.now() > stored.exp) {
    try {
      const store = getStore(BLOB_STORE);
      await store.delete(uuid);
    } catch {
      // ignore cleanup errors; TTL check already failed
    }
    return jsonResponse(401, { valid: false, error: 'expired' });
  }

  return jsonResponse(200, { valid: true, data: stored.d });
};

export const config = {
  path: '/api/share/get',
};
