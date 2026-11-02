# Objets Sellsy : couverture v2 et complément v1

Généré à partir de `back/src/objects/*/`. C = créer, L = lister, S = rechercher, G = lire un, U = modifier, D = supprimer.

| Objet | CRUD v2 | Routes v2 | Champs import (création) | Méthodes v1 | Remarque |
|---|---|---|---|---|---|
| `accounting-codes` | CLSD | 4 | 3 | Accounting (6) |  |
| `addresses` | L | 1 | - | Addresses (5) | v2 : lecture GET /addresses ; écriture via /companies/{id}/addresses etc. |
| `bank-accounts` | L | 1 | - | BankAccounts (7) | v2 : lecture seule (GET /bank-accounts). |
| `briefcase` | - | 0 | - | Briefcase (4) | **v1 uniquement.** Fichiers : v1. |
| `calendar-events` | CLSGUD | 7 | 17 | Agenda (13) |  |
| `comments` | CLSGUD | 6 | 9 | Annotations (6) |  |
| `companies` | CLSGUD | 25 | 41 | Client, Prospects, Supplier (56) | En v1, sociétés clientes, prospects et fournisseurs sont trois familles distinctes. |
| `contacts` | CLSGUD | 20 | 74 | Peoples (10) |  |
| `credit-notes` | CLSGU | 24 | 30 | Document (28) | v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1. |
| `custom-activities` | CLSGUD | 6 | 5 | - (0) | Aucune famille v1 rapprochée pour l'instant. |
| `custom-activity-types` | CLGU | 4 | 1 | - (0) | Aucune famille v1 rapprochée pour l'instant. |
| `custom-fields` | LSG | 3 | - | CustomFields (10) | v2 ne permet que la lecture des champs personnalisés : création via v1. |
| `deliveries` | LSG | 3 | - | Document (28) | v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1. |
| `deposit-invoices` | CLSGU | 19 | 43 | Document (28) | v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1. |
| `directories` | CGUD | 6 | 4 | - (0) | Aucune famille v1 rapprochée pour l'instant. |
| `discount-incl-taxes` | CLGUD | 5 | 6 | - (0) | Aucune famille v1 rapprochée pour l'instant. |
| `estimates` | CLSGU | 25 | 72 | Document (28) | v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1. |
| `expenses` | - | 0 | - | Expense (7) | **v1 uniquement.** Notes de frais : v1 uniquement. |
| `individuals` | CLSGUD | 21 | 33 | Client, Prospects (42) | En v1 un particulier est un tiers de type personne (à vérifier dans Client.create). |
| `invoices` | CLSGU | 25 | 75 | Document (28) | v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1. |
| `items` | CLSGUD | 13 | 16 | Catalogue, Stock (48) | Stock.* n'a pas d'équivalent v2 dans l'inventaire. |
| `opportunities` | CLSGUD | 26 | 18 | Opportunities (20) |  |
| `orders` | CLSGU | 23 | 71 | Document (28) | v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1. |
| `payments` | LSGD | 7 | - | Document, Payments (31) | v2 n'a pas de POST /payments : création via Document.createPayment (v1) ou les routes de paiement des documents en v2. |
| `phone-calls` | CLSGUD | 6 | 14 | - (0) | Aucune famille v1 rapprochée pour l'instant. |
| `progress-invoices` | CU | 3 | 70 | Document (28) | v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1. |
| `purchases` | - | 0 | - | Purchase (12) | **v1 uniquement.** Achats fournisseurs : pas de ressource v2 dans l'inventaire (seulement l'OCR). |
| `rate-categories` | CLGUD | 5 | - | Accountdatas (17) |  |
| `smart-tags` | D | 2 | - | SmartTags (3) |  |
| `staffs` | CLSGU | 7 | 16 | Staffs (2) |  |
| `subscriptions` | CLSGUD | 11 | 28 | - (0) | Aucune famille v1 rapprochée pour l'instant. |
| `support` | - | 0 | - | Support (11) | **v1 uniquement.** Tickets support : v1 uniquement. |
| `tasks` | CLSGUD | 7 | 16 | Agenda (13) | Rapprochement tâches v2 <-> Agenda v1 non confirmé. |
| `taxes` | CLSGUD | 9 | - | Accountdatas (17) |  |
| `timetracking` | - | 0 | - | Timetracking (6) | **v1 uniquement.** Temps passés : v1 uniquement. |
| `units` | L | 1 | - | Accountdatas (17) | v2 : lecture seule (GET /units). |
