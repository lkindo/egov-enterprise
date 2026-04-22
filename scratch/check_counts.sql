SELECT 
    table_schema, 
    table_name, 
    (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) as c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::int as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
