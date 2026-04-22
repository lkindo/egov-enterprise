SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;
