-- Stableford：团体总分手填（如 GolfLive PK 结果）
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_scoring_mode_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_scoring_mode_check
  CHECK (scoring_mode IN ('ryder_cup', 'total_strokes', 'stableford'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS team_manual_scores jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.events.scoring_mode IS '比赛计算方式：ryder_cup、total_strokes、stableford（稳定分手填团体分）';
COMMENT ON COLUMN public.events.team_manual_scores IS '手填团体总分，键为队伍名（与成绩表 team_name 一致），值为 Stableford 等积分';
