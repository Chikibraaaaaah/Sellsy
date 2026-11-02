const express = require('express');
const path = require('path');
const config = require('./config');
const { loadObjects } = require('./objects');

const app = express();
app.use(express.json({ limit: '20mb' }));

// Front (dossier ../front) servi sur /
app.use(express.static(path.join(__dirname, '..', '..', 'front')));

// GET /api -> catalogue des objets ; /api/<objet>/... -> controller de l'objet
app.use('/api', loadObjects());

app.use((err, req, res, next) => {
  res.status(err.status && err.status < 600 ? err.status : 500).json({ error: err.message, details: err.details });
});

if (require.main === module) {
  app.listen(config.port, () => console.log(`Plateforme d'import Sellsy : http://localhost:${config.port}`));
}

module.exports = app;
