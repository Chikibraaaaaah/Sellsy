# Plateforme d'import Sellsy : back (squelette v0.1)

Back Node.js / Express. Un sous-dossier par objet Sellsy dans `back/src/objects/<objet>/`.
L'API v2 est utilisée en priorité ; l'API v1 complète ce que la v2 ne fait pas.

## Structure

```
back/
  package.json              express uniquement (Node 18+ : fetch et FormData natifs)
  .env.example              clés API v2 et v1
  src/
    server.js               monte /api et sert le front (../front)
    config.js
    clients/
      sellsyV2.js           REST, application/json, Bearer OAuth 2
      sellsyV1.js           POST https://apifeed.sellsy.com/0/ en champs de formulaire request / io_mode / do_in, OAuth 1
    lib/
      makeController.js     routes Express communes à tous les objets
      validateRow.js        contrôle des cellules (vides, types, dates, listes de valeurs) + construction du JSON
    objects/
      index.js              charge chaque sous-dossier automatiquement
      tasks/                (exemple, même schéma pour chaque objet)
        controller.js       point d'entrée de l'objet, à personnaliser
        v2.routes.json      toutes les routes v2 de l'objet (méthode, chemin, opération)
        v1.methods.json     méthodes v1 autorisées en complément
        model.create.json   modèle de données pour l'import en création
        model.update.json   modèle de données pour l'import en modification
  test/                     npm test
docs/objets.md              tableau de couverture v2 / v1 des 36 objets
```

## Routes exposées par chaque objet

| Route | Rôle |
|---|---|
| `GET /api` | catalogue des objets |
| `GET /api/<objet>` | routes v2, méthodes v1 et modèles disponibles |
| `GET /api/<objet>/model/create` | modèle de colonnes (le front s'en servira pour générer le fichier modèle) |
| `GET /api/<objet>/items`, `GET /items/:id`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id`, `POST /search` | CRUD v2, uniquement si la route existe chez Sellsy |
| `POST /api/<objet>/import` | `{ kind: "create" or "update", rows: [...], dryRun: true }` valide chaque ligne, puis l'envoie si `dryRun` vaut false |
| `POST /api/<objet>/v2/<operation>` | n'importe quelle opération v2 de l'objet, `{ path, query, body }` |
| `POST /api/<objet>/v1/<Famille.methode>` | méthode v1 listée dans `v1.methods.json`, `{ params }` |

## Conventions de colonnes (fichier Excel / CSV)

- Champ simple : `title`, `due_date`
- Objet : `discount.type`, `discount.value`
- Tableau d'objets : `related[0].id`, `related[0].type`, `related[1].id`...
- Tableau de valeurs : `assigned_staff_ids` avec `12;15`
- Cellule vide = champ non envoyé (erreur si obligatoire). `NULL` = envoyer null.
- Dates : `JJ/MM/AAAA` ou `AAAA-MM-JJ`. Dates-heures : `JJ/MM/AAAA HH:MM` ou ISO 8601 (sans fuseau, considéré UTC).
- Booléens : oui/non, vrai/faux, 1/0. Nombres : virgule ou point.

## Démarrer

```
cd back
npm install
cp .env.example .env   # remplir les clés, puis charger le fichier (ex. node --env-file=.env src/server.js)
npm test
npm start
```

## Sources

- **API v2, routes et modèles** : la page https://api.sellsy.com/doc/v2/ ne se charge qu'avec JavaScript et le site Sellsy est bloqué depuis mon environnement. J'ai donc utilisé le paquet npm [`@getyetty-sdk/sellsy`](https://www.npmjs.com/package/@getyetty-sdk/sellsy) v2026.9.8, un client généré automatiquement à partir de la spécification OpenAPI de Sellsy (dépôt : https://github.com/GetYetty/yetty-sdks, dossier `packages/sellsy`). C'est une source **tierce** : à recouper avec la doc officielle. Base URL lue dans ce paquet : `https://api.sellsy.com/v2`.
- **API v1** : https://docs.sellsy.com/api/v1/documentation/methods (liste des méthodes, table des matières), https://docs.sellsy.com/api/v1/documentation/intro (adresse de base et champs `request`, `io_mode`, `do_in`), https://docs.sellsy.com/api/v1/documentation/oauth (OAuth 1, URLs `request_token` et `access_token`).

## À vérifier (non sourcé ou supposé)

1. URL du jeton OAuth 2 v2 (`https://login.sellsy.com/oauth2/access-tokens`) : de mémoire, pas trouvée dans les sources.
2. Signature OAuth 1 en `PLAINTEXT` dans l'en-tête `Authorization` pour la v1 : supposée d'après la classe PHP `sellsyConnect_curl`.
3. Rapprochement objet v2 vers famille v1 (`v1.methods.json`) : fait à la main, en particulier tâches vers `Agenda` et la valeur du type de document pour `Document.*`.
4. `taxes` et `rate-categories` : le corps de création n'a pas de schéma nommé dans le paquet, donc pas de modèle d'import pour l'instant.
5. Un champ marqué obligatoire dans le modèle vient de la spécification ; Sellsy peut en exiger d'autres selon le paramétrage du compte.
