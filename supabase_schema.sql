-- =============================================================================
-- Atelier OS — Complete Supabase Schema
-- Run this entire script in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================================

-- ─── 1. ORDERS TABLE ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.orders (
    id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    vtiger_id             TEXT,
    article_code          TEXT,
    client_name           TEXT,
    description           TEXT,

    -- Pipeline
    current_stage         TEXT        NOT NULL DEFAULT 'At Casting',
    is_rush               BOOLEAN     NOT NULL DEFAULT false,

    -- Metal & sizing
    metal                 TEXT,
    ring_size             TEXT,

    -- Stones
    center_stone_received BOOLEAN     NOT NULL DEFAULT false,
    side_stones_received  BOOLEAN     NOT NULL DEFAULT false,

    -- Engraving
    engraving_company     BOOLEAN     NOT NULL DEFAULT false,
    engraving_personal    BOOLEAN     NOT NULL DEFAULT false,
    engraving_font        TEXT,

    -- Settings & finish (array fields)
    setting_central       TEXT[]      DEFAULT '{}',
    setting_small         TEXT[]      DEFAULT '{}',
    finish                TEXT[]      DEFAULT '{}',

    -- Workshop flags
    is_external           BOOLEAN     NOT NULL DEFAULT false,

    -- Timer (active work tracking)
    timer_started_at      TIMESTAMPTZ,
    timer_accumulated     INTEGER     NOT NULL DEFAULT 0,

    -- CAD render URL (from storage bucket)
    cad_url               TEXT,

    -- Deadline
    deadline              DATE,

    -- Timestamps
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update `updated_at` on every row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── 2. PRODUCTION LOGS TABLE ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.production_logs (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id         UUID        REFERENCES public.orders(id) ON DELETE CASCADE,
    staff_name       TEXT,
    action           TEXT,           -- 'STARTED' | 'COMPLETED' | 'REJECTED'
    previous_stage   TEXT,
    new_stage        TEXT,
    redo_reason      TEXT,
    duration_seconds INTEGER     DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by order
CREATE INDEX IF NOT EXISTS idx_production_logs_order_id
    ON public.production_logs(order_id);

-- Index for recent-log queries (admin activity feed)
CREATE INDEX IF NOT EXISTS idx_production_logs_created_at
    ON public.production_logs(created_at DESC);

-- ─── 3. ROW LEVEL SECURITY ──────────────────────────────────────────────────

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on orders"
    ON public.orders FOR SELECT USING (true);

CREATE POLICY "Allow public insert on orders"
    ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on orders"
    ON public.orders FOR UPDATE USING (true) WITH CHECK (true);

-- Production logs
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on production_logs"
    ON public.production_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert on production_logs"
    ON public.production_logs FOR INSERT WITH CHECK (true);

-- ─── 4. STORAGE BUCKET ─────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('cad-renders', 'cad-renders', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Allow public read on cad-renders"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cad-renders');

-- Anonymous upload access
CREATE POLICY "Allow public upload to cad-renders"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'cad-renders');
