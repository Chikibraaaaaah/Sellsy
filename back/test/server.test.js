const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/server');

test('catalogue et import à blanc', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const catalog = await (await fetch(base)).json();
    assert.ok(catalog.find((o) => o.object === 'tasks').v2.includes('create'));
    assert.ok(catalog.find((o) => o.object === 'purchases').v1Only);

    const res = await fetch(`${base}/tasks/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'create', dryRun: true, rows: [
        { title: 'A', due_date: '01/12/2026', label_id: '1', 'related[0].id': '9', 'related[0].type': 'contact' },
        { title: 'B' },
      ] }),
    });
    const out = await res.json();
    assert.strictEqual(out.total, 2);
    assert.strictEqual(out.ok, 1);
    assert.strictEqual(out.results[0].body.due_date, '2026-12-01T00:00:00+00:00');

    const v1 = await fetch(`${base}/tasks/v1/Client.create`, { method: 'POST' });
    assert.strictEqual(v1.status, 404); // méthode non listée pour cet objet
  } finally {
    server.close();
  }
});
