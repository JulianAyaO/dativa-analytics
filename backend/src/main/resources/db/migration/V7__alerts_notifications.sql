CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dataset VARCHAR(16) NOT NULL,
    metric VARCHAR(32) NOT NULL,
    period VARCHAR(32) NOT NULL,
    region VARCHAR(120) NOT NULL DEFAULT '',
    category VARCHAR(120) NOT NULL DEFAULT '',
    product VARCHAR(120) NOT NULL DEFAULT '',
    seller VARCHAR(120) NOT NULL DEFAULT '',
    condition VARCHAR(32) NOT NULL,
    threshold NUMERIC(14, 2) NOT NULL,
    frequency_minutes INTEGER NOT NULL DEFAULT 5,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    dashboard_id UUID REFERENCES dashboards (id) ON DELETE SET NULL,
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    last_fired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID REFERENCES users (id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(500) NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
