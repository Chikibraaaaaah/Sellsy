// Client API Sellsy v2 : REST, corps en application/json, jeton Bearer OAuth 2.
// Routes : voir src/objects/<objet>/v2.routes.json (base https://api.sellsy.com/v2).
const config = require('../config');

let cachedToken = null; // { value, expiresAt }

async function getToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) return cachedToken.value;
  if (!config.v2.clientId || !config.v2.clientSecret) {
    throw new Error('SELLSY_V2_CLIENT_ID / SELLSY_V2_CLIENT_SECRET manquants');
  }
  // Flux client_credentials. URL et format À VÉRIFIER dans la doc v2 (section Authentication).
  const res = await fetch(config.v2.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.v2.clientId,
      client_secret: config.v2.clientSecret,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error('Échec OAuth2 Sellsy'), { status: res.status, details: data });
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

// Remplace /tasks/{id} par /tasks/42 à partir de { id: 42 }.
function buildPath(template, pathParams = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (pathParams[key] === undefined) throw new Error(`Paramètre de chemin manquant : ${key}`);
    return encodeURIComponent(pathParams[key]);
  });
}

async function call(method, pathTemplate, { path = {}, query = {}, body } = {}) {
  const url = new URL(config.v2.baseUrl + buildPath(pathTemplate, path));
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(`${k}[]`, x));
    else if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw Object.assign(new Error(`Sellsy v2 ${method} ${url.pathname} : ${res.status}`), { status: res.status, details: data });
  return data;
}

module.exports = { call, buildPath, getToken };
