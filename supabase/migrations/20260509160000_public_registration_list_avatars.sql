-- 名单返回头像字段与审批状态（待批 / 已通过）

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
          'user_id', er.user_id,
          'name', COALESCE(NULLIF(trim(up.full_name), ''), '会员'),
          'photo_url', NULLIF(
            trim(COALESCE(
              NULLIF(trim(up.member_photo_url), ''),
              NULLIF(trim(up.avatar_url), '')
            )),
            ''
          ),
          'registered_at', er.registration_time,
          'registration_status',
            CASE
              WHEN COALESCE(er.approval_status, 'pending') = 'approved'
                OR (er.approval_status IS NULL AND er.payment_status = 'paid')
                THEN 'approved'
              ELSE 'pending'
            END
        )
        ORDER BY er.registration_time ASC
      )
      FROM event_registrations er
      LEFT JOIN user_profiles up ON up.id = er.user_id
      WHERE er.event_id = event_uuid
        AND er.status = 'registered'
        AND COALESCE(er.approval_status, '') <> 'rejected'
    ),
    '[]'::json
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_event_registration_list(UUID) TO authenticated;
