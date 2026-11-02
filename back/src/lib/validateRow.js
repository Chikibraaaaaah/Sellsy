// Valide une ligne de fichier (Excel/CSV) contre un modèle model.create.json / model.update.json
// et construit le corps JSON attendu par l'API v2.
//
// Conventions de colonnes :
//   - champ simple       : title, due_date
//   - objet imbriqué     : discount.type, discount.value
//   - tableau d'objets   : related[0].id, related[0].type, related[1].id ...
//   - tableau de valeurs : assigned_staff_ids  ->  "12;15;18" (séparateur ;)
//
// Cellules vides : une cellule vide (ou seulement des espaces) = champ absent.
//   Si le champ est obligatoire -> erreur. Pour envoyer explicitement null : écrire NULL.

const TRUE_VALUES = ['true', 'vrai', 'oui', 'yes', '1', 'x'];
const FALSE_VALUES = ['false', 'faux', 'non', 'no', '0'];

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

// "31/12/2026" ou "2026-12-31" -> "2026-12-31"
function toDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

// "31/12/2026 14:30", "2026-12-31T14:30:00+01:00", "2026-12-31" -> ISO 8601
function toDateTime(v) {
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
    || s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [y, mo, d] = s.includes('/') ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
  const hh = (m[4] || '00').padStart(2, '0');
  const mm = m[5] || '00';
  const ss = m[6] || '00';
  // Sans fuseau dans la cellule, on considère l'heure comme UTC (à adapter si besoin).
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${hh}:${mm}:${ss}+00:00`;
}

function toNumber(v, integer) {
  if (typeof v === 'number') return integer && !Number.isInteger(v) ? null : v;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return integer && !Number.isInteger(n) ? null : n;
}

// Convertit une cellule selon la définition du champ. Retourne { value } ou { error }.
function convert(field, raw) {
  if (typeof raw === 'string' && raw.trim().toUpperCase() === 'NULL') {
    return field.nullable ? { value: null } : { error: 'NULL non autorisé pour ce champ' };
  }
  const type = field.type || 'string';
  let value;
  switch (type) {
    case 'integer':
    case 'number':
      value = toNumber(raw, type === 'integer');
      if (value === null) return { error: `nombre ${type === 'integer' ? 'entier ' : ''}attendu, reçu "${raw}"` };
      if (field.minimum !== undefined && value < field.minimum) return { error: `minimum ${field.minimum}` };
      if (field.maximum !== undefined && value > field.maximum) return { error: `maximum ${field.maximum}` };
      break;
    case 'boolean': {
      const s = String(raw).trim().toLowerCase();
      if (TRUE_VALUES.includes(s)) value = true;
      else if (FALSE_VALUES.includes(s)) value = false;
      else return { error: `booléen attendu (oui/non, vrai/faux, 1/0), reçu "${raw}"` };
      break;
    }
    case 'array': {
      const parts = Array.isArray(raw) ? raw : String(raw).split(';').map((x) => x.trim()).filter(Boolean);
      const items = [];
      for (const p of parts) {
        const r = convert({ type: field.items || 'string', enum: field.enum }, p);
        if (r.error) return { error: `élément "${p}" : ${r.error}` };
        items.push(r.value);
      }
      value = items;
      break;
    }
    case 'object':
      try {
        value = typeof raw === 'object' ? raw : JSON.parse(raw);
      } catch {
        return { error: 'objet JSON attendu' };
      }
      break;
    default: {
      // string (+ formats)
      if (field.format === 'date') {
        value = toDate(raw);
        if (!value) return { error: `date attendue (JJ/MM/AAAA ou AAAA-MM-JJ), reçu "${raw}"` };
      } else if (field.format === 'date-time') {
        value = toDateTime(raw);
        if (!value) return { error: `date-heure attendue (JJ/MM/AAAA HH:MM ou ISO 8601), reçu "${raw}"` };
      } else {
        value = String(raw).trim();
        if (field.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { error: `e-mail invalide "${value}"` };
        if (field.maxLength !== undefined && value.length > field.maxLength) return { error: `${field.maxLength} caractères maximum` };
        if (field.minLength !== undefined && value.length < field.minLength) return { error: `${field.minLength} caractères minimum` };
        if (field.pattern && !new RegExp(field.pattern).test(value)) return { error: `format attendu ${field.pattern}` };
      }
    }
  }
  if (field.enum && type !== 'array') {
    const match = field.enum.find((e) => String(e).toLowerCase() === String(value).toLowerCase());
    if (match === undefined) return { error: `valeur autorisée : ${field.enum.join(', ')}` };
    value = match;
  }
  return { value };
}

// Écrit value dans obj à partir d'un chemin "related[0].id" ou "discount.type".
function setPath(obj, path, value) {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cur = obj;
  keys.forEach((k, i) => {
    const last = i === keys.length - 1;
    const nextIsIndex = !last && /^\d+$/.test(keys[i + 1]);
    if (last) cur[k] = value;
    else {
      if (cur[k] === undefined) cur[k] = nextIsIndex ? [] : {};
      cur = cur[k];
    }
  });
}

// row : { "title": "Rappeler", "related[0].id": "123", ... } (en-têtes du fichier -> valeurs)
// model : contenu de model.create.json
// Retour : { ok, body, errors: [{ column, message }], unknownColumns }
function validateRow(row, model) {
  const byField = new Map(model.fields.map((f) => [f.field, f]));
  const errors = [];
  const unknownColumns = [];
  const body = {};
  const arrayIndexes = {}; // "related[]" -> Set(0,1)

  for (const [column, raw] of Object.entries(row)) {
    const generic = column.replace(/\[\d+\]/g, '[]');
    const field = byField.get(generic);
    if (!field) {
      unknownColumns.push(column);
      continue;
    }
    if (isEmpty(raw)) continue;
    const r = convert(field, raw);
    if (r.error) errors.push({ column, message: r.error });
    else setPath(body, column, r.value);
    const m = column.match(/^(.*?\[)(\d+)\]/);
    if (m) {
      const key = m[1] + ']';
      (arrayIndexes[key] ||= new Set()).add(m[2]);
    }
  }

  // Champs obligatoires
  for (const f of model.fields) {
    if (!f.required) continue;
    if (f.field.endsWith('[]')) {
      if (!arrayIndexes[f.field]) errors.push({ column: f.field.replace('[]', '[0]'), message: 'au moins un élément obligatoire' });
      continue;
    }
    if (f.field.includes('[].')) {
      const [arr, sub] = f.field.split('[].');
      for (const i of arrayIndexes[arr + '[]'] || []) {
        const col = `${arr}[${i}].${sub}`;
        if (isEmpty(row[col])) errors.push({ column: col, message: 'cellule vide, valeur obligatoire' });
      }
      continue;
    }
    if (isEmpty(row[f.field])) errors.push({ column: f.field, message: 'cellule vide, valeur obligatoire' });
  }

  // Nettoie les trous dans les tableaux (related[0] puis related[2])
  const compact = (o) => {
    if (Array.isArray(o)) return o.filter((x) => x !== undefined).map(compact);
    if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, compact(v)]));
    return o;
  };

  return { ok: errors.length === 0, body: compact(body), errors, unknownColumns };
}

module.exports = { validateRow, convert, toDate, toDateTime };
