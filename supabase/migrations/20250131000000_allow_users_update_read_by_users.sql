-- 允许普通用户更新 information_items 的 read_by_users 字段
-- 用于记录用户阅读状态

-- 创建策略：允许用户更新 read_by_users 字段
-- 注意：read_by_users 可能是 jsonb 或 uuid[] 类型，策略只检查是否可以更新，不检查内容
CREATE POLICY "Users can update read_by_users"
  ON information_items
  FOR UPDATE
  TO authenticated
  USING (
    -- 允许更新已发布的信息
    status = 'published' AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    -- 只检查是否可以更新，不检查 read_by_users 的具体内容
    -- 内容验证由应用层代码处理
    status = 'published' AND (expires_at IS NULL OR expires_at > now())
  );

