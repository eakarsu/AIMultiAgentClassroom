# Audit Note — AIMultiAgentClassroom

Source audit: `_AUDIT/reports/batch_05.md` § 28 (verdict: template-clone, 6 AI endpoints)

## Original audit recommendations

### Missing AI endpoints
- `/misconception-detection`
- `/difficulty-adapt`

### Missing non-AI features
- Teacher dashboard
- Assignments & submission system
- Curriculum management
- Grade reporting
- Parent communication

### Custom feature suggestions
- Agentic tutor (multi-modal)
- Real-time misconception detection
- Socratic dialogue agent (already covered by `/socratic-debate`)
- Personalized learning paths (already covered by `/learning-path`)
- Voice-enabled learning

## Implemented in this pass
1. **POST `/api/ai/misconception-detection`** — DIAGNOSTICIAN agent reads recent session messages, returns misconceptions with quoted evidence, correction, remediation activity.
2. **POST `/api/ai/difficulty-adapt`** — ADAPTIVE COACH reads mastery + quiz history, recommends easier / same / harder difficulty adjustment.

Both follow the existing `routes/ai.js` patterns (in-file `callOpenRouter` via `https`, `parseJSON`, `pool.query` for `classroom_sessions` / `session_messages` / `student_progress` / `quiz_attempts`). Persists `misconception-detection` output as a session message. Syntax checked.

## Backlog (priority order)

### Mechanical
- None high-value remaining from audit list — both audit-recommended endpoints are now implemented.

### Needs creds / external SDK
- Voice-enabled learning (ASR / TTS)
- Multi-modal tutoring (vision)

### Needs product decision
- Teacher dashboard (multi-tenant role model — currently single-user)
- Assignments & submission system (data model)
- Curriculum management (CRUD over modules)
- Grade reporting (export formats, parent visibility)
- Parent communication (consent + minor account model)

## Apply pass 5 (all backlog)

Implemented all five remaining "needs product decision" backlog items as
additive features. PRODUCT-DECISION: tenant model remains single-user; the
authenticated user can play either teacher or student role on a given
record. All new tables use `CREATE TABLE IF NOT EXISTS` (additive only).

- BE schema (`backend/src/db.js`): added `curriculum_modules`, `assignments`,
  `assignment_submissions`, `grade_reports`, `parent_links` tables (all
  additive, all idempotent).
- BE routes:
  - New `backend/src/routes/teacher.js` mounted at `/api/teacher` (added in
    `backend/src/server.js`) with: dashboard summary, curriculum CRUD,
    assignment CRUD + submission + grading, grade reports list, parent-link
    register.
  - New AI endpoints in `backend/src/routes/ai.js`:
    `POST /api/ai/parent-communication` (parent-friendly progress message)
    and `POST /api/ai/grade-summary` (auto grade report → also persists into
    `grade_reports`). Both gate on `OPENROUTER_API_KEY` (503 + `missing`).
- FE: new `frontend/src/pages/TeacherDashboard.js` routed at `/teacher` from
  `App.js`. Surfaces module + assignment CRUD, dashboard stat cards
  (modules / assignments / submissions / ungraded), and inline AI calls for
  parent communication and grade summary, with explicit 503 + `missing`
  display.

Smoke test: backend lacks `node_modules` and the constraint disallows
`npm install`. Syntax check via `node --check` passes for `db.js`,
`routes/ai.js`, `routes/teacher.js`, and `server.js`.

## Apply pass 3 (frontend)

Verified `frontend/src/pages/AITools.js` already explicitly calls the two pass-2
endpoints (`/api/ai/misconception-detection`, `/api/ai/difficulty-adapt`) via
axios. The remaining AI endpoints are surfaced through `ClassroomSession.js`,
`LearningPath.js`, `SocraticDebate.js`, `Progress.js`, and `Dashboard.js`.
**Action: LEFT-AS-IS — FE already wired.** No files modified in pass 3.
