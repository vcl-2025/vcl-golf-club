-- 查看当前 event_registrations 表的实际结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public' AND table_name = 'event_registrations'
ORDER BY
    ordinal_position;




