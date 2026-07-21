BEGIN;
CREATE TABLE IF NOT EXISTS learning_workflows (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_ref TEXT NOT NULL, learner_ref TEXT NOT NULL,
 role_goal TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planned', consent_reference TEXT,
 retention_until TIMESTAMPTZ NOT NULL, idempotency_key TEXT NOT NULL, created_by TEXT NOT NULL,
 explanation TEXT, correction_reference TEXT, version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,workflow_ref), UNIQUE(tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS learning_assessment_evidence (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_ref TEXT NOT NULL, assessment_ref TEXT NOT NULL,
 rubric_version TEXT NOT NULL, score NUMERIC NOT NULL, max_score NUMERIC NOT NULL, evidence JSONB NOT NULL,
 accommodations JSONB NOT NULL, evaluator_ref TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,workflow_ref,assessment_ref,rubric_version)
);
CREATE TABLE IF NOT EXISTS learning_feedback_approvals (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_ref TEXT NOT NULL, feedback_version TEXT NOT NULL,
 explainability JSONB NOT NULL, bias_evaluation_ref TEXT NOT NULL, accessibility_review_ref TEXT NOT NULL,
 review_status TEXT NOT NULL DEFAULT 'pending', reviewed_by TEXT, appeal_reference TEXT, correction_reference TEXT,
 UNIQUE(tenant_id,workflow_ref,feedback_version)
);
CREATE TABLE IF NOT EXISTS learning_integration_deliveries (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_ref TEXT NOT NULL, system TEXT NOT NULL,
 operation TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload_checksum TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', receipt TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ, last_error TEXT, UNIQUE(tenant_id,system,idempotency_key)
);
CREATE TABLE IF NOT EXISTS learning_outcome_evaluations (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, dataset_version TEXT NOT NULL, cohort_ref TEXT NOT NULL,
 validity_score NUMERIC(8,6) NOT NULL, bias_gap NUMERIC(8,6) NOT NULL, accessibility_passed BOOLEAN NOT NULL,
 progression_score NUMERIC(8,6) NOT NULL, outcome_delta NUMERIC(8,6) NOT NULL,
 edge_case_failures JSONB NOT NULL DEFAULT '[]'::jsonb, UNIQUE(tenant_id,dataset_version,cohort_ref)
);
CREATE TABLE IF NOT EXISTS learning_workflow_audit (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_ref TEXT NOT NULL, from_status TEXT, to_status TEXT NOT NULL,
 actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, reason TEXT NOT NULL, evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
 correlation_id TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_retention ON learning_workflows(retention_until);
CREATE INDEX IF NOT EXISTS idx_learning_delivery_retry ON learning_integration_deliveries(status,next_attempt_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_audit_correlation ON learning_workflow_audit(tenant_id,workflow_ref,correlation_id);
COMMIT;
