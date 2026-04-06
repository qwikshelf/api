-- +migrate Up
-- Create audit_logs table for tracking request activity
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    query TEXT,
    body JSONB,
    status_code INTEGER NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    latency_ms BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- +migrate Down
DROP TABLE IF EXISTS audit_logs;
