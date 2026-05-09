-- 会员在活动详情页查看「已通过审核」的报名名单（仅姓名与报名时间，不含联系方式）

ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

-- 与既有手工脚本一致：已支付记录视为已通过（便于名单与后台一致）
UPDATE event_registrations
SET approval_status = 'approved'
WHERE payment_status = 'paid'
  AND approval_status = 'pending';

CREATE OR REPLACE FUNCTION get_public_event_registration_list(event_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'name', COALESCE(NULLIF(trim(up.full_name), ''), '会员'),
          'registered_at', er.registration_time
        )
        ORDER BY er.registration_time ASC
      )
      FROM event_registrations er
      LEFT JOIN user_profiles up ON up.id = er.user_id
      WHERE er.event_id = event_uuid
        AND er.status = 'registered'
        AND (
          er.approval_status = 'approved'
          OR (
            er.approval_status IS NULL
            AND er.payment_status = 'paid'
          )
        )
    ),
    '[]'::json
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_event_registration_list(UUID) TO authenticated;
