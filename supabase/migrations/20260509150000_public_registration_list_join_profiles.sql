-- 线上若已删除 event_registrations.participant_name，应从 user_profiles.full_name 取姓名

CREATE OR REPLACE FUNCTION public.get_public_event_registration_list(event_uuid UUID)
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

GRANT EXECUTE ON FUNCTION public.get_public_event_registration_list(UUID) TO authenticated;
