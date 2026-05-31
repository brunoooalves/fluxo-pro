import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const DEFAULT_EXPIRY_DAYS = 7;
const BLOB_STORE = 'calculator-shares';
const SIGNATURE_LENGTH = 16;

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

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const secret = process.env.SHARE_JWT_SECRET;
  if (!secret) {
    return jsonResponse(500, { error: 'Server configuration error' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid request body' });
  }

  const { data } = body || {};
  if (!data || typeof data !== 'string' || data.length === 0) {
    return jsonResponse(400, { error: 'Missing or invalid data field' });
  }

  const expiryDays = parseInt(process.env.SHARE_TOKEN_EXPIRY_DAYS, 10) || DEFAULT_EXPIRY_DAYS;
  const expiresAt = Date.now() + expiryDays * 24 * 60 * 60 * 1000;

  const uuid = crypto.randomUUID().replace(/-/g, '');
  const sig = signId(uuid, secret);
  const shareId = `${uuid}.${sig}`;

  try {
    const store = getStore(BLOB_STORE);
    await store.setJSON(uuid, { d: data, exp: expiresAt });
  } catch (err) {
    console.error('Blob store error:', err);
    return jsonResponse(500, { error: 'Storage error' });
  }

  return jsonResponse(200, { id: shareId });
};

export const config = {
  path: '/api/share/create',
};
