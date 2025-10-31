-- 批量获取所有活动统计信息的函数
-- 用于优化EventList组件的性能，避免N+1查询问题

CREATE OR REPLACE FUNCTION get_batch_event_stats()
RETURNS TABLE (
  event_id UUID,
  total_registrations BIGINT,
  paid_registrations BIGINT,
  available_spots BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    COALESCE(COUNT(er.id), 0) as total_registrations,
    COALESCE(COUNT(CASE WHEN er.payment_status = 'paid' THEN 1 END), 0) as paid_registrations,
    e.max_participants - COALESCE(COUNT(er.id), 0) as available_spots
  FROM events e
  LEFT JOIN event_registrations er ON e.id = er.event_id AND er.status = 'registered'
  WHERE e.status = 'active'  -- 只获取活跃活动
  GROUP BY e.id, e.max_participants
  ORDER BY e.created_at DESC;
END;
$$;

-- 授权认证用户执行此函数
GRANT EXECUTE ON FUNCTION get_batch_event_stats() TO authenticated;

-- 添加函数注释
COMMENT ON FUNCTION get_batch_event_stats() IS
'批量获取所有活动的统计信息，用于优化EventList组件性能';






