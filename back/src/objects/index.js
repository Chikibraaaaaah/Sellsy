// Charge automatiquement chaque sous-dossier de src/objects/ et monte son controller sur /api/<objet>.
const fs = require('fs');
const path = require('path');
const express = require('express');

function loadObjects() {
  const router = express.Router();
  const catalog = [];
  for (const name of fs.readdirSync(__dirname).sort()) {
    const dir = path.join(__dirname, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    router.use(`/${name}`, require(path.join(dir, 'controller.js')));
    const read = (f) => (fs.existsSync(path.join(dir, f)) ? JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) : null);
    const v2 = read('v2.routes.json');
    const v1 = read('v1.methods.json');
    catalog.push({
      object: name,
      v2: v2 ? Object.keys(v2.crud) : [],
      importable: ['create', 'update'].filter((k) => fs.existsSync(path.join(dir, `model.${k}.json`))),
      v1Methods: v1 ? v1.methods.length : 0,
      v1Only: !!v1?.v1Only,
    });
  }
  router.get('/', (req, res) => res.json(catalog));
  return router;
}

module.exports = { loadObjects };
