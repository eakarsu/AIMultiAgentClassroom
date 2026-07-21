# Operator runbook

Run `npm ci` explicitly, review/apply `backend/migrations/000_base_schema.sql` then `001_learning_workflow.sql` with `DATABASE_URL=... ./scripts/migrate.sh`, and configure a strong JWT secret. Startup verifies schema without creating it, never seeds or installs, and refuses occupied ports. Experimental multimodal/provider routes stay disabled.

Consent precedes learning activity. Assessments require rubric/evidence/accommodations; feedback approval requires explainability, bias/accessibility checks, and independent teacher review. Appeals, corrections, retention and deletion receipts are durable. LMS/calendar/content/communications/voice/vision providers fail closed without credentials and consent. Educators retain final grading and placement authority.
