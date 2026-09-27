CREATE TABLE IF NOT EXISTS tracked_products (
    id BIGSERIAL PRIMARY KEY,
    store_product_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    product_url TEXT NOT NULL DEFAULT '',

    interval_minutes INTEGER NOT NULL DEFAULT 60,
    is_tracking BOOLEAN NOT NULL DEFAULT TRUE,

    last_tracked_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scrape_attempts (
    id BIGSERIAL PRIMARY KEY,

    tracked_product_id BIGINT NOT NULL
        REFERENCES tracked_products(id)
        ON DELETE CASCADE,

    selected_option TEXT NOT NULL,

    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    outcome TEXT NOT NULL
        CHECK (outcome IN ('success', 'retried', 'failed')),

    price NUMERIC(12, 2),
    stock TEXT,
    detail TEXT,

    CHECK (
        (outcome = 'failed' AND price IS NULL AND stock IS NULL)
        OR outcome <> 'failed'
    )
);

CREATE INDEX IF NOT EXISTS scrape_attempts_product_time_idx
ON scrape_attempts (tracked_product_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS tracked_products_scheduler_idx
ON tracked_products (is_tracking, next_run_at);