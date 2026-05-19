-- 全站俱乐部设置（单行 id=1）
CREATE TABLE IF NOT EXISTS public.club_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  registration_requires_approval boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.club_settings (id, registration_requires_approval)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

-- 已登录用户可读（报名提交前需读取开关）
CREATE POLICY "club_settings_select_authenticated"
  ON public.club_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 仅管理员可改
CREATE POLICY "club_settings_update_admin"
  ON public.club_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.club_settings IS '俱乐部全局设置，仅允许一行 id=1';
COMMENT ON COLUMN public.club_settings.registration_requires_approval IS 'true：会员报名需管理员审批；false：提交后自动通过';
