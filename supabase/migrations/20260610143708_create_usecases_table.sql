/*
# Create usecases table for shared repository

1. New Tables
- `usecases`
  - `id` (uuid, primary key)
  - `data` (jsonb, not null)
  - `updated_at` (timestamptz, not null)
  - `updated_by` (text, not null)

2. Security
- Enable RLS on `usecases`.
- Allow anon + authenticated CRUD.
*/

CREATE TABLE IF NOT EXISTS usecases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'unknown'
);

ALTER TABLE usecases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_usecases" ON usecases;
CREATE POLICY "anon_select_usecases" ON usecases FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_usecases" ON usecases;
CREATE POLICY "anon_insert_usecases" ON usecases FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_usecases" ON usecases;
CREATE POLICY "anon_update_usecases" ON usecases FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_usecases" ON usecases;
CREATE POLICY "anon_delete_usecases" ON usecases FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO usecases (id, data, updated_at, updated_by)
VALUES ('00000000-0000-0000-0000-000000000001', '[]'::jsonb, now(), 'system')
ON CONFLICT (id) DO NOTHING;
