-- Create questions table with original structure
CREATE TABLE questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    grade integer NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    options jsonb,
    correct_idx integer,
    explanation text,
    verifier_score real,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading
CREATE POLICY "Anyone can view questions" ON questions FOR SELECT USING (true);

-- Create ENUM type for question variant
CREATE TYPE question_variant AS ENUM ('MULTIPLE_CHOICE','SORT','MATCH','FREETEXT');

-- Add variant column with default
ALTER TABLE questions ADD COLUMN variant question_variant NOT NULL DEFAULT 'MULTIPLE_CHOICE';

-- Add data column with default empty JSON
ALTER TABLE questions ADD COLUMN data jsonb NOT NULL DEFAULT '{}';

-- Migrate existing options and correct_idx data into data column
UPDATE questions SET data = jsonb_build_object('options', options, 'correct_idx', correct_idx) WHERE options IS NOT NULL OR correct_idx IS NOT NULL;

-- Drop old columns
ALTER TABLE questions DROP COLUMN options;
ALTER TABLE questions DROP COLUMN correct_idx;

-- Add comment to data column
COMMENT ON COLUMN questions.data IS 'variant-spezifische Nutzdaten';