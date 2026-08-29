-- Dimension labels must match the frontend filter options.

INSERT INTO regions (id, name) VALUES
    ('11111111-1111-4111-8111-111111111101', 'Norte'),
    ('11111111-1111-4111-8111-111111111102', 'Sur'),
    ('11111111-1111-4111-8111-111111111103', 'Centro'),
    ('11111111-1111-4111-8111-111111111104', 'Costa'),
    ('11111111-1111-4111-8111-111111111105', 'Oriente');

INSERT INTO categories (id, name) VALUES
    ('22222222-2222-4222-8222-222222222201', 'Electrónica'),
    ('22222222-2222-4222-8222-222222222202', 'Hogar'),
    ('22222222-2222-4222-8222-222222222203', 'Moda'),
    ('22222222-2222-4222-8222-222222222204', 'Alimentos'),
    ('22222222-2222-4222-8222-222222222205', 'Accesorios');

INSERT INTO sellers (id, name) VALUES
    ('33333333-3333-4333-8333-333333333301', 'Ana Pérez'),
    ('33333333-3333-4333-8333-333333333302', 'Carlos Ruiz'),
    ('33333333-3333-4333-8333-333333333303', 'Lucía Gómez'),
    ('33333333-3333-4333-8333-333333333304', 'Diego Soto'),
    ('33333333-3333-4333-8333-333333333305', 'Marta Vidal'),
    ('33333333-3333-4333-8333-333333333306', 'Jorge Núñez');

INSERT INTO products (id, sku, name, category_id, unit_price) VALUES
    ('44444444-4444-4444-8444-444444444401', 'MON-27', 'Monitor 27"', '22222222-2222-4222-8222-222222222201', 289.00),
    ('44444444-4444-4444-8444-444444444402', 'LAP-14', 'Portátil 14"', '22222222-2222-4222-8222-222222222201', 799.00),
    ('44444444-4444-4444-8444-444444444403', 'EAR-01', 'Auriculares', '22222222-2222-4222-8222-222222222201', 59.90),
    ('44444444-4444-4444-8444-444444444404', 'SOF-3P', 'Sofá 3 plazas', '22222222-2222-4222-8222-222222222202', 649.00),
    ('44444444-4444-4444-8444-444444444405', 'LMP-LED', 'Lámpara LED', '22222222-2222-4222-8222-222222222202', 39.50),
    ('44444444-4444-4444-8444-444444444406', 'JKT-01', 'Chaqueta', '22222222-2222-4222-8222-222222222203', 89.00),
    ('44444444-4444-4444-8444-444444444407', 'SHOE-01', 'Zapatillas', '22222222-2222-4222-8222-222222222203', 72.00),
    ('44444444-4444-4444-8444-444444444408', 'COF-PR', 'Café premium', '22222222-2222-4222-8222-222222222204', 12.50),
    ('44444444-4444-4444-8444-444444444409', 'OIL-01', 'Aceite de oliva', '22222222-2222-4222-8222-222222222204', 8.90),
    ('44444444-4444-4444-8444-444444444410', 'BAG-UR', 'Mochila urbana', '22222222-2222-4222-8222-222222222205', 45.00);

-- ~26 months of sales, including today. The orders dataset stops 8 days ago so
-- Pedidos + Últimos 7 días sigue siendo el estado vacío del dashboard.
DO $$
DECLARE
    d date;
    n integer;
    i integer;
    ds text;
    orders_per_day integer;
    region_ids uuid[];
    seller_ids uuid[];
    product_ids uuid[];
    oid uuid;
    pid uuid;
    price numeric(12, 2);
    qty integer;
    seed bigint;
    line_count integer;
BEGIN
    SELECT array_agg(id ORDER BY name) INTO region_ids FROM regions;
    SELECT array_agg(id ORDER BY name) INTO seller_ids FROM sellers;
    SELECT array_agg(id ORDER BY name) INTO product_ids FROM products;

    FOREACH ds IN ARRAY ARRAY['sales', 'orders'] LOOP
        FOR d IN SELECT generate_series(CURRENT_DATE - 800, CURRENT_DATE, INTERVAL '1 day')::date LOOP
            IF ds = 'orders' AND d > CURRENT_DATE - 8 THEN
                CONTINUE;
            END IF;

            orders_per_day := 2 + (EXTRACT(ISODOW FROM d)::integer % 3);
            IF EXTRACT(MONTH FROM d) IN (11, 12) THEN
                orders_per_day := orders_per_day + 2;
            END IF;
            IF ds = 'orders' THEN
                orders_per_day := GREATEST(1, orders_per_day - 1);
            END IF;

            FOR n IN 1..orders_per_day LOOP
                seed := abs(hashtext(ds || d::text || n::text)::bigint);
                INSERT INTO orders (id, dataset, ordered_at, region_id, seller_id)
                VALUES (
                    gen_random_uuid(),
                    ds,
                    (d::timestamp + make_interval(hours => (seed % 14)::integer, mins => (seed % 50)::integer)),
                    region_ids[1 + (seed % array_length(region_ids, 1))],
                    seller_ids[1 + ((seed / 11) % array_length(seller_ids, 1))]
                )
                RETURNING id INTO oid;

                line_count := 1 + ((seed / 3) % 2)::integer;
                FOR i IN 1..line_count LOOP
                    pid := product_ids[1 + ((seed / (13 * i)) % array_length(product_ids, 1))];
                    SELECT unit_price INTO price FROM products WHERE id = pid;
                    qty := 1 + ((seed / (5 * i)) % 3)::integer;
                    INSERT INTO order_lines (id, order_id, product_id, quantity, unit_price, amount)
                    VALUES (gen_random_uuid(), oid, pid, qty, price, round(price * qty, 2));
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
