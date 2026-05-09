-- 可与 manual_apply_public_registration_list.sql 一起执行
-- 使「19/48」中的 19 与名额余量按「驳回不占名额」计算（驳回不计入已报名、余位自动释放）
--
-- ⚠️ 仅执行此 SQL：顶部人数与「已满」等与 get_event_stats 相关的 UI 会与名单对齐。
-- 报名提交时的名额校验在代码里也需排除驳回（本项目已改为 REGISTRATION_OCCUPYING_SLOT_OR_FILTER）；
-- 请发布当前前端后再验收「驳回后其他人可报上」的流程。

CREATE OR REPLACE FUNCTION public.get_event_stats(event_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  result JSON;
  total_reg INTEGER;
  paid_reg INTEGER;
  available_spots INTEGER;
  max_participants INTEGER;
BEGIN
  SELECT events.max_participants INTO max_participants
  FROM events
  WHERE events.id = event_uuid;

  SELECT COUNT(*) INTO total_reg
  FROM event_registrations
  WHERE event_id = event_uuid
    AND status = 'registered'
    AND COALESCE(approval_status, '') <> 'rejected';

  SELECT COUNT(*) INTO paid_reg
  FROM event_registrations
  WHERE event_id = event_uuid
    AND status = 'registered'
    AND payment_status = 'paid'
    AND COALESCE(approval_status, '') <> 'rejected';

  available_spots := max_participants - total_reg;

  SELECT json_build_object(
    'total_registrations', total_reg,
    'paid_registrations', paid_reg,
    'available_spots', available_spots
  ) INTO result;

  RETURN result;
END;
$$;
