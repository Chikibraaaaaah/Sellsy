# Outils de génération

Ces scripts Python ont produit `v2.routes.json`, `model.*.json` et `v1.methods.json`.
Ils lisent le paquet npm `@getyetty-sdk/sellsy` (téléchargé et décompressé, jamais exécuté) :

1. `extract_schemas.py <index.mjs> schemas.json` : convertit les schémas OpenAPI du paquet en JSON.
2. `gen.py <dossier de travail> <back/src/objects>` : routes v2 par objet et modèles de données (attend `schemas.json`, `routes.tsv` et le paquet dans le dossier de travail).
3. `v1map.py <back/src/objects>` : méthodes v1 par objet.

`routes.tsv` : inventaire brut des 421 routes v2 (chemin, méthode, opération, résumé, type de contenu).
