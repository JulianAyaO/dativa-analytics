CREATE TABLE activity_events (
    id UUID PRIMARY KEY,
    actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_created ON activity_events (created_at DESC);
CREATE INDEX idx_activity_action ON activity_events (action);
