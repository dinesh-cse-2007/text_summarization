/*
# Create summaries table (single-tenant, no auth)

1. New Tables
- `summaries`
  - `id` (uuid, primary key)
  - `title` (text, short label for the summary, derived from first few words of input)
  - `original_text` (text, the full input text the user pasted)
  - `summary_text` (text, the generated summary output)
  - `summary_ratio` (numeric, compression ratio as percentage, e.g. 25 means summary is 25% of original)
  - `word_count_original` (integer, word count of the original text)
  - `word_count_summary` (integer, word count of the summary)
  - `created_at` (timestamptz, when the summary was created)

2. Security
- Enable RLS on `summaries`.
- Grant CRUD to `anon` + `authenticated` so the Data API can reach the table.
- Allow anon + authenticated CRUD because this is a single-tenant app with intentionally shared/public data (no sign-in).
*/

CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  original_text text NOT NULL,
  summary_text text NOT NULL,
  summary_ratio numeric NOT NULL DEFAULT 0,
  word_count_original integer NOT NULL DEFAULT 0,
  word_count_summary integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON summaries TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_summaries" ON summaries;
CREATE POLICY "anon_select_summaries" ON summaries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_summaries" ON summaries;
CREATE POLICY "anon_insert_summaries" ON summaries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_summaries" ON summaries;
CREATE POLICY "anon_update_summaries" ON summaries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_summaries" ON summaries;
CREATE POLICY "anon_delete_summaries" ON summaries FOR DELETE
  TO anon, authenticated USING (true);
