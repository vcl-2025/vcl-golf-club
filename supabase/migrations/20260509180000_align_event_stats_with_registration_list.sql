-- 顶部「已报名人数」与报名名单对齐：不包含审批为「驳回」的记录（仍可保留表中 registered，但不占展示人数与名额观感）

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
