-- 创建访客成绩表
-- 用于存储非会员选手的比赛成绩，不依赖 user_id

CREATE TABLE IF NOT EXISTS public.guest_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,  -- 选手姓名
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,  -- 活动ID
  total_strokes integer NOT NULL,  -- 总杆数
  net_strokes real,  -- 净杆数
  handicap integer DEFAULT 0,  -- 差点
  rank integer,  -- 排名
  holes_played integer NOT NULL DEFAULT 18,  -- 洞数
  notes text,  -- 备注
  hole_scores integer[] DEFAULT ARRAY[]::integer[],  -- 每洞成绩
  group_number integer,  -- 分组编号（用于团队赛）
  team_name text,  -- 团队名称（用于团队赛）
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.guest_scores ENABLE ROW LEVEL SECURITY;

-- 所有已认证会员可以查看访客成绩（访客成绩只是为了让会员能看到非会员的比赛结果）
CREATE POLICY "Members can view guest scores"
  ON public.guest_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- 管理员可以添加、修改、删除访客成绩
CREATE POLICY "Admins can manage guest scores"
  ON public.guest_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_guest_scores_event_id ON public.guest_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_scores_player_name ON public.guest_scores(player_name);
CREATE INDEX IF NOT EXISTS idx_guest_scores_team_name ON public.guest_scores(team_name);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_guest_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guest_scores_updated_at
  BEFORE UPDATE ON public.guest_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_scores_updated_at();

-- 添加字段注释
COMMENT ON TABLE public.guest_scores IS '访客成绩表，存储非会员选手的比赛成绩。访客本身无法访问系统，此表仅用于让已认证会员查看非会员的比赛结果';
COMMENT ON COLUMN public.guest_scores.player_name IS '选手姓名（非会员）';
COMMENT ON COLUMN public.guest_scores.event_id IS '所属活动ID';

