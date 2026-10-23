'use strict';
const express = require('express');

function createStore(seed = []) {
  const items = new Map(); let seq = 0;
  for (const s of seed) { const t = normalize({ ...s, id: String(++seq) }); items.set(t.id, t); }
  return { items,
    list: () => [...items.values()],
    create(data) { const t = normalize({ ...data, id: String(++seq) }); items.set(t.id, t); return t; },
    update(id, data) { const cur = items.get(String(id)); if (!cur) return null; const t = normalize({ ...cur, ...data, id: cur.id }); items.set(t.id, t); return t; } };
}
function normalize(t) {
  return { id: String(t.id ?? ''), title: String(t.title ?? '').trim(), description: String(t.description ?? ''),
    status: ['todo','in_progress','done'].includes(t.status) ? t.status : 'todo',
    priority: ['low','medium','high'].includes(t.priority) ? t.priority : 'medium',
    assignee: String(t.assignee ?? ''), dueDate: t.dueDate ? String(t.dueDate) : null,
    createdAt: t.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
}
function filterTasks(tasks, q = {}) {
  const needle = String(q.q || q.search || '').toLowerCase();
  return tasks.filter(t =>
    (!needle || `${t.title} ${t.description} ${t.assignee}`.toLowerCase().includes(needle)) &&
    (!q.status || t.status === q.status) && (!q.priority || t.priority === q.priority) &&
    (!q.assignee || t.assignee === q.assignee));
}
function toCsv(tasks) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [['id','title','description','status','priority','assignee','dueDate','createdAt','updatedAt'].join(','),
    ...tasks.map(t => [t.id,t.title,t.description,t.status,t.priority,t.assignee,t.dueDate,t.createdAt,t.updatedAt].map(esc).join(','))].join('\n') + '\n';
}
function counts(tasks) {
  return { total: tasks.length, todo: tasks.filter(t=>t.status==='todo').length,
    inProgress: tasks.filter(t=>t.status==='in_progress').length, done: tasks.filter(t=>t.status==='done').length,
    highPriority: tasks.filter(t=>t.priority==='high').length,
    overdue: tasks.filter(t=>t.dueDate && t.status!=='done' && new Date(t.dueDate) < new Date()).length };
}
function sections(kind, tasks) {
  const c = counts(tasks);
  const open = tasks.filter(t=>t.status!=='done');
  if (kind === 'summary') return { label: 'Classroom workload summary', total: c.total, counts: c, items: tasks.map(t=>t.title) };
  if (kind === 'flags') return { label: 'At-risk task flags', total: c.overdue + c.highPriority,
    counts: c, items: open.filter(t=>t.priority==='high'||(t.dueDate&&new Date(t.dueDate)<new Date())).map(t=>({ title: t.title, priority: t.priority, dueDate: t.dueDate })) };
  return { label: 'Lesson follow-up plan', total: open.length, counts: c,
    items: [...open].sort((a,b)=>({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority])).slice(0,5).map(t=>t.title) };
}
async function aiResult(kind, tasks) {
  const base = { aiGenerated: false, provider: null, sections: sections(kind, tasks) };
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return base;
  try {
    const isOR = Boolean(process.env.OPENROUTER_API_KEY);
    const res = await fetch(isOR ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: isOR ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
        messages: [{ role: 'user', content: `Summarize these tasks as ${kind}: ${JSON.stringify(tasks).slice(0, 2000)}` }] }) });
    if (!res.ok) return base;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) return base;
    return { aiGenerated: true, provider: isOR ? 'openrouter' : 'openai', sections: { ...base.sections, narrative: text } };
  } catch { return base; }
}
function createFeatureTasksRouter({ auth, store = createStore() } = {}) {
  if (typeof auth !== 'function') throw new Error('auth middleware is required');
  const router = express.Router();
  router.use(auth);
  router.get('/', (req, res) => { const tasks = filterTasks(store.list(), req.query); res.json({ tasks, total: tasks.length }); });
  router.post('/', (req, res) => {
    if (!String(req.body?.title || '').trim()) return res.status(400).json({ error: 'title is required' });
    return res.status(201).json({ task: store.create(req.body) }); });
  router.put('/:id', (req, res) => { const t = store.update(req.params.id, req.body || {}); if (!t) return res.status(404).json({ error: 'task not found' }); return res.json({ task: t }); });
  router.patch('/:id', (req, res) => { const t = store.update(req.params.id, req.body || {}); if (!t) return res.status(404).json({ error: 'task not found' }); return res.json({ task: t }); });
  router.get('/export', (req, res) => {
    const tasks = filterTasks(store.list(), req.query);
    if (String(req.query.format || 'json').toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"'); return res.send(toCsv(tasks)); }
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.json"'); return res.json({ tasks, total: tasks.length }); });
  for (const [path, kind] of [['/ai/workload-summary', 'summary'], ['/ai/at-risk-flags', 'flags'], ['/ai/follow-up-plan', 'plan']]) {
    router.post(path, async (req, res) => res.json(await aiResult(kind, store.list()))); }
  return router;
}
module.exports = { createFeatureTasksRouter, createStore, filterTasks, toCsv, sections };
