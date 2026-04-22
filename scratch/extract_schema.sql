SELECT c.table_name, c.column_name, c.data_type, c.character_maximum_length, c.numeric_precision, c.numeric_scale 
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY c.table_name, c.ordinal_position;
