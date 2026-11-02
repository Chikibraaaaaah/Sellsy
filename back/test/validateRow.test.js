const test = require('node:test');
const assert = require('node:assert');
const { validateRow } = require('../src/lib/validateRow');
const taskModel = require('../src/objects/tasks/model.create.json');
const callModel = require('../src/objects/phone-calls/model.create.json');

test('tâche valide : formats français convertis', () => {
  const r = validateRow({
    title: 'Rappeler le client',
    due_date: '15/11/2026 09:30',
    label_id: '3',
    status: 'TODO',
    is_private: 'non',
    assigned_staff_ids: '12; 15',
    'related[0].id': '6657',
    'related[0].type': 'company',
  }, taskModel);
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.body.due_date, '2026-11-15T09:30:00+00:00');
  assert.strictEqual(r.body.label_id, 3);
  assert.strictEqual(r.body.status, 'todo');
  assert.strictEqual(r.body.is_private, false);
  assert.deepStrictEqual(r.body.assigned_staff_ids, [12, 15]);
  assert.deepStrictEqual(r.body.related, [{ id: 6657, type: 'company' }]);
});

test('cellules vides obligatoires et mauvais formats signalés', () => {
  const r = validateRow({ title: 'x', due_date: '', label_id: 'abc', 'related[0].id': '1', 'related[0].type': '', colonne_inconnue: 'y' }, taskModel);
  const cols = r.errors.map((e) => e.column).sort();
  assert.deepStrictEqual(cols, ['due_date', 'label_id', 'related[0].type']);
  assert.deepStrictEqual(r.unknownColumns, ['colonne_inconnue']);
  assert.strictEqual(r.ok, false);
});

test('appel : enum et tableau obligatoire', () => {
  const r = validateRow({ owner_id: '1', result: 'occupé', source: 'incoming', date: '2026-11-02' }, callModel);
  const cols = r.errors.map((e) => e.column).sort();
  assert.deepStrictEqual(cols, ['related[0]', 'result']);
});
