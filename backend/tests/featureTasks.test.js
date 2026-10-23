'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createFeatureTasksRouter, filterTasks, toCsv } = require('../src/routes/featureTasks.js');
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const auth = (req, res, next) => req.headers.authorization ? (req.user = { id: 1 }, next()) : res.status(401).json({ error: 'unauthorized' });
async function start() {
  const app = express(); app.use(express.json());
  app.use('/api/tasks', createFeatureTasksRouter({ auth }));
  const s = app.listen(0); await new Promise(r => s.once('listening', r));
  return { s, base: `http://127.0.0.1:${s.address().port}/api/tasks`, h: { authorization: 'Bearer t', 'content-type': 'application/json' } };
}
test('tasks require auth, support CRUD, search/filter, export, labelled AI fallback', async () => {
  const { s, base, h } = await start();
  try {
    assert.equal((await fetch(base)).status, 401);
    const c = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify({ title: 'Alpha review', priority: 'high', status: 'todo' }) });
    assert.equal(c.status, 201); const { task } = await c.json(); assert.equal(task.title, 'Alpha review');
    await fetch(base, { method: 'POST', headers: h, body: JSON.stringify({ title: 'Beta check', priority: 'low' }) });
    const filtered = await (await fetch(`${base}?q=alpha&priority=high`, { headers: h })).json();
    assert.equal(filtered.total, 1);
    const upd = await (await fetch(`${base}/${task.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ status: 'done' }) })).json();
    assert.equal(upd.task.status, 'done');
    const csv = await (await fetch(`${base}/export?format=csv`, { headers: h })).text();
    assert.match(csv, /Alpha review/); assert.match(toCsv(filtered.tasks), /title/);
    const doneList = await (await fetch(`${base}?status=done`, { headers: h })).json(); assert.equal(doneList.total, 1); assert.equal(filterTasks(doneList.tasks, { status: 'done' }).length, 1);
    const jsonExp = await (await fetch(`${base}/export?format=json`, { headers: h })).json(); assert.equal(jsonExp.total, 2);
    for (const p of ['workload-summary','at-risk-flags','follow-up-plan']) {
      const ai = await (await fetch(`${base}/ai/${p}`, { method: 'POST', headers: h, body: '{}' })).json();
      assert.equal(ai.aiGenerated, false); assert.ok(ai.sections.label); assert.equal(typeof ai.sections.total, 'number'); assert.ok(Array.isArray(ai.sections.items));
    }
    const empty = await (await fetch(`${base}/ai/workload-summary`, { method: 'POST', headers: h, body: '{}' })).json();
    assert.equal(empty.aiGenerated, false);
  } finally { s.close(); }
});
