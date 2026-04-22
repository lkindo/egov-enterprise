SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'nemplyrinfo' AND table_schema = 'public';
