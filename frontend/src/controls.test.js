import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import AITools from './pages/AITools';
import LearningPath from './pages/LearningPath';
import Dashboard from './pages/Dashboard';
import SocraticDebate from './pages/SocraticDebate';
import ClassroomSession from './pages/ClassroomSession';
import TeacherDashboard from './pages/TeacherDashboard';
import AIReport from './components/AIReport';
import FormattedAIReport from './components/FormattedAIReport';
import AIWorkspace from './components/AIWorkspace';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('axios');

const mockLogin = jest.fn();
jest.mock('./context/AuthContext', () => ({
  API: '',
  useAuth: () => ({ login: mockLogin, register: jest.fn(), user: null, logout: jest.fn() }),
}));

let host;
let root;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); mockLogin.mockClear(); });
const render = (view) => act(() => root.render(<MemoryRouter>{view}</MemoryRouter>));
const click = (element) => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));

test('demo button fills configured credentials without submitting', () => {
  process.env.REACT_APP_DEMO_EMAIL = 'demo@example.test';
  process.env.REACT_APP_DEMO_PASSWORD = 'local-fixture-only';
  render(<Login />);
  click([...host.querySelectorAll('button')].find((item) => item.textContent === 'Fill demo credentials'));
  expect(host.querySelector('input[type=email]').value).toBe('demo@example.test');
  expect(host.querySelector('input[type=password]').value).toBe('local-fixture-only');
  expect(mockLogin).not.toHaveBeenCalled();
  delete process.env.REACT_APP_DEMO_EMAIL;
  delete process.env.REACT_APP_DEMO_PASSWORD;
});

test('missing demo credentials remain explicit', () => {
  delete process.env.REACT_APP_DEMO_EMAIL;
  delete process.env.REACT_APP_DEMO_PASSWORD;
  render(<Login />);
  expect([...host.querySelectorAll('button')].find((item) => item.textContent === 'Fill demo credentials').disabled).toBe(true);
  expect(host.textContent).toContain('Demo credentials are not configured');
});

test('learning path preset fills both fields without generation', () => {
  render(<LearningPath />);
  click([...host.querySelectorAll('button')].find((item) => item.textContent.includes('Conversational Spanish')));
  expect(host.querySelector('input[required]').value).toBe('Conversational Spanish for travel');
  expect(host.querySelector('select').value).toBe('intermediate');
});

test('new session preset fills required and optional fields without creating a session', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('sessions') ? { data: [], pagination: { totalPages: 1 } } : {} }));
  await act(async () => root.render(<MemoryRouter><Dashboard /></MemoryRouter>));
  click([...host.querySelectorAll('button')].find((item) => item.textContent === 'Fill: Python functions'));
  const form = [...host.querySelectorAll('form')].find((item) => item.textContent.includes('Start Learning'));
  expect([...form.querySelectorAll('input')].map((item) => item.value)).toEqual(['Python functions', 'Computer science']);
  expect(form.querySelector('select').value).toBe('beginner');
  expect(axios.post).not.toHaveBeenCalled();
});

test('debate preset keeps the selected session reference and only fills position', async () => {
  axios.get.mockResolvedValue({ data: { id: 42, topic: 'Civic debate' } });
  await act(async () => root.render(<MemoryRouter initialEntries={['/debate/42']}><Routes><Route path="/debate/:id" element={<SocraticDebate />} /></Routes></MemoryRouter>));
  click([...host.querySelectorAll('button')].find((item) => item.textContent.includes('Hands-on practice')));
  expect(host.querySelector('input[required]').value).toContain('Hands-on practice');
  expect(host.textContent).toContain('Civic debate');
  expect(axios.post).not.toHaveBeenCalled();
});

test('tutor prompt preset fills message without sending it', async () => {
  Element.prototype.scrollIntoView = jest.fn();
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/messages') ? { data: [] } : { id: 42, topic: 'Fractions' } }));
  await act(async () => root.render(<MemoryRouter initialEntries={['/session/42']}><Routes><Route path="/session/:id" element={<ClassroomSession />} /></Routes></MemoryRouter>));
  click([...host.querySelectorAll('button')].find((item) => item.textContent === 'Fill example 1'));
  expect(host.querySelector('textarea').value).toContain('Fractions');
  expect(axios.post).not.toHaveBeenCalled();
});

test('teacher AI example preserves a real student ID', () => {
  render(<TeacherDashboard />);
  const input = host.querySelector('input[data-ai-field=studentId]');
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '42'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  click([...host.querySelectorAll('button')].find((item) => item.textContent === 'Quick brief'));
  expect(input.value).toBe('42');
  expect(host.querySelector('input[data-ai-field=period]').value).toBeTruthy();
  expect(host.querySelector('input[data-ai-field=tone]').value).toBeTruthy();
  expect(axios.post).not.toHaveBeenCalled();
});

test('AI tool preset preserves real record reference and fills optional fields', () => {
  render(<AITools />);
  const record = host.querySelector('input[required]');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(record, '42');
    record.dispatchEvent(new Event('input', { bubbles: true }));
  });
  click([...host.querySelectorAll('button')].find((item) => item.textContent === 'Fill: Detailed analysis'));
  expect(host.querySelector('input[required]').value).toBe('42');
  expect(host.querySelector('input[type=number]').value).toBe('30');
});

test('returned and saved JSON render labels, tables, false, zero and empty string', () => {
  const row = { id: 7, input: { goal: 'Review' }, result_json: { summary: '', approved: false, count: 0, findings: [{ item: 'A', risk: 'Low' }] } };
  for (const Report of [AIReport, FormattedAIReport]) {
    render(<Report response={row} title="Review" />);
    expect(host.textContent).toContain('Summary');
    expect(host.textContent).toContain('Empty string');
    expect(host.textContent).toContain('No');
    expect(host.textContent).toContain('0');
    expect(host.querySelector('table')).not.toBeNull();
    expect(host.querySelector('pre')).toBeNull();
  }
});

test('saved history opens a formatted detail view from a local fixture', async () => {
  const row = {
    id: 7, input: { goal: 'Review classroom feedback' }, created_at: '2026-10-10T12:00:00Z', model: 'fixture',
    result_json: { observations: [{ topic: 'Fractions', count: 0 }], ready: false, notes: '' },
  };
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [row] }) });
  try {
    await act(async () => root.render(<AIWorkspace feature={{ id: 'fixture', title: 'Classroom review', description: 'Fixture' }} token="fixture-token" />));
    click([...host.querySelectorAll('button')].find((item) => item.textContent === 'Scenario'));
    expect([...host.querySelectorAll('.ai-form-grid input, .ai-form-grid textarea, .ai-form-grid select')]).toHaveLength(10);
    expect([...host.querySelectorAll('.ai-form-grid input, .ai-form-grid textarea, .ai-form-grid select')].every((item) => item.value.trim())).toBe(true);
    click([...host.querySelectorAll('button')].find((item) => item.textContent.includes('Open report')));
    expect(document.body.textContent).toContain('Observations');
    expect(document.body.textContent).toContain('Empty string');
    expect(document.body.textContent).toContain('No');
    expect(document.body.querySelector('table')).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  } finally { global.fetch = originalFetch; }
});
