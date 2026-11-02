// Fabrique un controller Express pour un objet Sellsy à partir de ses fichiers :
//   v2.routes.json  : routes v2 (méthode HTTP, chemin, nom d'opération)
//   v1.methods.json : méthodes v1 autorisées en complément
//   model.create.json / model.update.json : modèles de données pour l'import
const express = require('express');
const v2 = require('../clients/sellsyV2');
const v1 = require('../clients/sellsyV1');
const { validateRow } = require('./validateRow');

function makeController({ v2Routes, v1Methods, models }) {
  const router = express.Router();
  const ops = new Map((v2Routes?.routes || []).map((r) => [r.operation, r]));
  const crud = v2Routes?.crud || {};
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const run = (operation, args) => {
    const r = ops.get(operation);
    return v2.call(r.method, r.path, args);
  };

  // Description de l'objet : routes disponibles et modèles (utile au front pour générer les modèles de fichier)
  router.get('/', (req, res) => {
    res.json({
      object: v2Routes?.object || v1Methods?.object,
      v2: { crud, routes: v2Routes?.routes || [] },
      v1: v1Methods || null,
      models: Object.keys(models),
    });
  });
  router.get('/model/:kind', (req, res) => {
    const m = models[req.params.kind];
    if (!m) return res.status(404).json({ error: `Pas de modèle "${req.params.kind}"` });
    res.json(m);
  });

  // --- CRUD v2 (seulement si la route existe pour cet objet) ---
  if (crud.list) router.get('/items', wrap(async (req, res) => res.json(await run(crud.list, { query: req.query }))));
  if (crud.search) router.post('/search', wrap(async (req, res) => res.json(await run(crud.search, { query: req.query, body: req.body }))));
  if (crud.get) router.get('/items/:id', wrap(async (req, res) => res.json(await run(crud.get, { path: { id: req.params.id }, query: req.query }))));
  if (crud.create) router.post('/items', wrap(async (req, res) => res.status(201).json(await run(crud.create, { body: req.body }))));
  if (crud.update) router.put('/items/:id', wrap(async (req, res) => res.json(await run(crud.update, { path: { id: req.params.id }, body: req.body }))));
  if (crud.delete) router.delete('/items/:id', wrap(async (req, res) => res.json(await run(crud.delete, { path: { id: req.params.id } }))));

  // --- Import de lignes : validation puis envoi ligne par ligne ---
  // Corps : { kind: "create" | "update", rows: [ { colonne: valeur } ], dryRun: true|false }
  // En mode update, chaque ligne doit avoir une colonne "id" (ID Sellsy).
  router.post('/import', wrap(async (req, res) => {
    const { kind = 'create', rows = [], dryRun = true } = req.body || {};
    const model = models[kind];
    const operation = crud[kind];
    if (!model || !operation) return res.status(400).json({ error: `Import "${kind}" non disponible en v2 pour cet objet` });

    const results = [];
    for (const [index, row] of rows.entries()) {
      const { id, ...cells } = row;
      const check = validateRow(cells, model);
      if (kind === 'update' && (id === undefined || String(id).trim() === '')) {
        check.ok = false;
        check.errors.push({ column: 'id', message: 'ID Sellsy obligatoire pour une mise à jour' });
      }
      const result = { line: index + 1, ok: check.ok, errors: check.errors, unknownColumns: check.unknownColumns };
      if (check.ok && !dryRun) {
        try {
          result.response = await run(operation, kind === 'update' ? { path: { id }, body: check.body } : { body: check.body });
        } catch (e) {
          result.ok = false;
          result.errors.push({ column: null, message: e.message, details: e.details });
        }
      } else if (check.ok) {
        result.body = check.body; // aperçu de ce qui serait envoyé
      }
      results.push(result);
    }
    res.json({ dryRun, total: rows.length, ok: results.filter((r) => r.ok).length, results });
  }));

  // --- Accès direct à toute opération v2 listée dans v2.routes.json ---
  // POST /api/<objet>/v2/<operation>  { path: {...}, query: {...}, body: {...} }
  router.post('/v2/:operation', wrap(async (req, res) => {
    if (!ops.has(req.params.operation)) return res.status(404).json({ error: 'Opération v2 inconnue pour cet objet' });
    res.json(await run(req.params.operation, req.body || {}));
  }));

  // --- Complément v1 : seulement les méthodes listées dans v1.methods.json ---
  // POST /api/<objet>/v1/Document.create  { params: {...} }
  router.post('/v1/:method', wrap(async (req, res) => {
    if (!v1Methods?.methods?.includes(req.params.method)) return res.status(404).json({ error: 'Méthode v1 non autorisée pour cet objet' });
    res.json(await v1.call(req.params.method, req.body?.params || {}));
  }));

  return router;
}

module.exports = { makeController };
