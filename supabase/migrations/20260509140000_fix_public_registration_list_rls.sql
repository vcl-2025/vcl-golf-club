-- 修复：查询 event_registrations 时受 RLS 影响导致 SECURITY DEFINER 函数仍返回空结果
-- （Supabase/Postgres 下需在函数上 SET row_security = off）

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
