-- 在 Supabase SQL Editor 执行一次即可（与 migrations 逻辑一致）。
-- 本脚本不含 DROP：首次部署不会触发「破坏性操作」提示。若策略已存在需重建，请用 migrations 或单独 DROP 后再执行 CREATE POLICY。

CREATE TABLE IF NOT EXISTS public.club_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  registration_requires_approval boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.club_settings (id, registration_requires_approval)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_settings_select_authenticated"
  ON public.club_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "club_settings_update_admin"
  ON public.club_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
