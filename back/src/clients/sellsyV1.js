// Client API Sellsy v1 : un seul point d'entrée, POST en champs de formulaire.
// Source : https://docs.sellsy.com/api/v1/documentation/intro
//   Adresse de base : https://apifeed.sellsy.com/0/
//   Champs : request=1, io_mode=json, do_in={"method":"Client.getList","params":{...}}
// Réponse : { response, status: "success" | "error", error }
const crypto = require('crypto');
const config = require('../config');

// Signature OAuth 1.0 en PLAINTEXT, comme la classe PHP sellsyConnect_curl.
// À VÉRIFIER : https://docs.sellsy.com/api/v1/documentation/oauth
function oauthHeader() {
  const c = config.v1;
  if (!c.consumerToken || !c.consumerSecret || !c.userToken || !c.userSecret) {
    throw new Error('Jetons OAuth v1 manquants (SELLSY_V1_*)');
  }
  const params = {
    oauth_consumer_key: c.consumerToken,
    oauth_token: c.userToken,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: 'PLAINTEXT',
    oauth_version: '1.0',
    oauth_signature: `${encodeURIComponent(c.consumerSecret)}&${encodeURIComponent(c.userSecret)}`,
  };
  return 'OAuth ' + Object.entries(params).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ');
}

async function call(method, params = {}) {
  const form = new FormData();
  form.append('request', '1');
  form.append('io_mode', 'json');
  form.append('do_in', JSON.stringify({ method, params }));

  const res = await fetch(config.v1.endpoint, {
    method: 'POST',
    headers: { Authorization: oauthHeader() },
    body: form,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Les erreurs OAuth reviennent en texte brut, ex. "oauth_problem=signature_invalid".
    throw Object.assign(new Error(`Sellsy v1 ${method} : réponse non JSON`), { status: res.status, details: text });
  }
  if (data.status !== 'success') {
    throw Object.assign(new Error(`Sellsy v1 ${method} : ${data.error?.code || 'erreur'}`), { status: 502, details: data.error });
  }
  return data.response;
}

module.exports = { call };
