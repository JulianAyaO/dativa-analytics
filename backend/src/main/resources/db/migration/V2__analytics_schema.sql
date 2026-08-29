-- Analytical model. Widgets never query these tables directly; the API maps aggregations
-- to the WidgetQuery → WidgetResult contract.

CREATE TABLE regions (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES categories (id),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0)
);

CREATE TABLE sellers (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    dataset VARCHAR(16) NOT NULL CHECK (dataset IN ('sales', 'orders')),
    ordered_at TIMESTAMPTZ NOT NULL,
    region_id UUID NOT NULL REFERENCES regions (id),
    seller_id UUID NOT NULL REFERENCES sellers (id)
);

CREATE TABLE order_lines (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products (id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0)
);

CREATE INDEX idx_orders_dataset_time ON orders (dataset, ordered_at DESC);
CREATE INDEX idx_orders_region ON orders (region_id);
CREATE INDEX idx_orders_seller ON orders (seller_id);
CREATE INDEX idx_order_lines_order ON order_lines (order_id);
CREATE INDEX idx_order_lines_product ON order_lines (product_id);
CREATE INDEX idx_products_category ON products (category_id);
