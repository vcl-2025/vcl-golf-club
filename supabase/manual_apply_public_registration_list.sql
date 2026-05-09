-- 在 Supabase SQL Editor 整段执行（与 migrations 对齐）
-- participant_name 已删除时姓名来自 user_profiles；名单含待批记录；头像为 member_photo_url 优先其次 avatar_url

ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

UPDATE event_registrations
SET approval_status = 'approved'
WHERE payment_status = 'paid'
  AND approval_status = 'pending';

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
