DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.table_name, c.column_name, c.character_maximum_length
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND c.data_type = 'character'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                    ' ALTER COLUMN ' || quote_ident(r.column_name) || 
                    ' TYPE varchar(' || r.character_maximum_length || ') USING ' || 
                    quote_ident(r.column_name) || '::varchar(' || r.character_maximum_length || ')';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping column %.% due to error: %', r.table_name, r.column_name, SQLERRM;
        END;
    END LOOP;
END;
$$;
