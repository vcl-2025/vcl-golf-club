/*
  # 抽奖配置云端库（Supabase Storage + 元数据表）

  - bucket: lottery-configs（私有）
  - table: lottery_configs（名称、路径、更新时间）
  - 仅管理员可读写删除（使用 is_admin()）
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lottery-configs',
  'lottery-configs',
  false,
  52428800,
  ARRAY['application/json', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lottery_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lottery_configs_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS lottery_configs_updated_at_idx
  ON public.lottery_configs (updated_at DESC);

ALTER TABLE public.lottery_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lottery_configs'
      AND policyname = 'Admins can select lottery configs'
  ) THEN
    CREATE POLICY "Admins can select lottery configs"
      ON public.lottery_configs FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lottery_configs'
      AND policyname = 'Admins can insert lottery configs'
  ) THEN
    CREATE POLICY "Admins can insert lottery configs"
      ON public.lottery_configs FOR INSERT
      TO authenticated
      WITH CHECK (is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lottery_configs'
      AND policyname = 'Admins can update lottery configs'
  ) THEN
    CREATE POLICY "Admins can update lottery configs"
      ON public.lottery_configs FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lottery_configs'
      AND policyname = 'Admins can delete lottery configs'
  ) THEN
    CREATE POLICY "Admins can delete lottery configs"
      ON public.lottery_configs FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can read lottery config files'
  ) THEN
    CREATE POLICY "Admins can read lottery config files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'lottery-configs' AND is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload lottery config files'
  ) THEN
    CREATE POLICY "Admins can upload lottery config files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'lottery-configs' AND is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update lottery config files'
  ) THEN
    CREATE POLICY "Admins can update lottery config files"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'lottery-configs' AND is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete lottery config files'
  ) THEN
    CREATE POLICY "Admins can delete lottery config files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'lottery-configs' AND is_admin());
  END IF;
END $$;
