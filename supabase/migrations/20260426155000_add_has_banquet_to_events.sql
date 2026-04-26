ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS has_banquet boolean NOT NULL DEFAULT false;

UPDATE public.events
SET has_banquet = false
WHERE has_banquet IS NULL;
