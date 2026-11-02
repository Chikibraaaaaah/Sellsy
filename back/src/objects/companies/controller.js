// Controller de l'objet "companies".
// Généré à partir de v2.routes.json, v1.methods.json et model.*.json : ajoute ici la logique propre à cet objet
// (ex. recherche d'un ID Sellsy à partir d'un nom, ordre des appels v2 puis v1).
const fs = require('fs');
const path = require('path');
const { makeController } = require('../../lib/makeController');

const read = (f) => (fs.existsSync(path.join(__dirname, f)) ? require(`./${f}`) : null);

module.exports = makeController({
  v2Routes: read('v2.routes.json'),
  v1Methods: read('v1.methods.json'),
  models: Object.fromEntries(
    ['create', 'update'].map((k) => [k, read(`model.${k}.json`)]).filter(([, m]) => m && m.fields.length)
  ),
});
