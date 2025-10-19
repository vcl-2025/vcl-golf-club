-- 获取events表的创建SQL指令
SELECT 
    'CREATE TABLE events (' || chr(10) ||
    string_agg(
        '  ' || column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
            WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN data_type = 'double precision' THEN 'DOUBLE PRECISION'
            WHEN data_type = 'boolean' THEN 'BOOLEAN'
            WHEN data_type = 'uuid' THEN 'UUID'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'bigint' THEN 'BIGINT'
            WHEN data_type = 'numeric' THEN 'NUMERIC'
            ELSE data_type
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END ||
        CASE 
            WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
            ELSE ''
        END,
        ',' || chr(10)
    ) || chr(10) || ');' AS create_table_sql
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;
