const config = require('./config');

async function request(method, path, { body, query, headers: extraHeaders, auth = true } = {}) {
  const cfg = config.load();
  const baseUrl = process.env.NETLIB_BASE_URL || cfg.baseUrl;
  const apiKey = process.env.NETLIB_API_KEY || cfg.apiKey;

  // Concatenate baseUrl + path directly (URL constructor ignores base path with absolute paths)
  const fullUrl = baseUrl.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
  const url = new URL(fullUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers = { ...extraHeaders };
  if (auth && apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const fetchOpts = { method, headers };

  if (body && typeof body === 'object' && typeof body.append === 'function') {
    // FormData — let fetch set Content-Type with boundary
    fetchOpts.body = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), fetchOpts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Request against a non-v1 API path (e.g., /api/member-registry)
// Strips /v1 from the baseUrl so we hit the app root + path
async function requestRoot(method, path, opts = {}) {
  const cfg = config.load();
  const origBase = process.env.NETLIB_BASE_URL || cfg.baseUrl;
  // Strip trailing /v1 (or /v1/) to get the app root /api
  const rootBase = origBase.replace(/\/v1\/?$/, '');
  const saved = process.env.NETLIB_BASE_URL;
  process.env.NETLIB_BASE_URL = rootBase;
  try {
    return await request(method, path, opts);
  } finally {
    if (saved !== undefined) process.env.NETLIB_BASE_URL = saved;
    else delete process.env.NETLIB_BASE_URL;
  }
}

// Fetch raw text (for CSV downloads)
async function getRaw(path, { auth = true, root = false } = {}) {
  const cfg = config.load();
  let baseUrl = process.env.NETLIB_BASE_URL || cfg.baseUrl;
  if (root) baseUrl = baseUrl.replace(/\/v1\/?$/, '');
  const apiKey = process.env.NETLIB_API_KEY || cfg.apiKey;
  const fullUrl = baseUrl.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
  const headers = {};
  if (auth && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(fullUrl, { headers });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

const get = (path, opts) => request('GET', path, { ...opts });
const post = (path, body, opts) => request('POST', path, { body, ...opts });
const put = (path, body, opts) => request('PUT', path, { body, ...opts });
const patch = (path, body, opts) => request('PATCH', path, { body, ...opts });
const del = (path, body, opts) => request('DELETE', path, { body, ...opts });
const getRoot = (path, opts) => requestRoot('GET', path, opts);
const postRoot = (path, body, opts) => requestRoot('POST', path, { body, ...opts });
const patchRoot = (path, body, opts) => requestRoot('PATCH', path, { body, ...opts });

module.exports = { request, get, post, put, patch, del, getRoot, postRoot, patchRoot, getRaw };
