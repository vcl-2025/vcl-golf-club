ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_out_of_town boolean NOT NULL DEFAULT false;

UPDATE public.events
SET is_out_of_town = false
WHERE is_out_of_town IS NULL;
