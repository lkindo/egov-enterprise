WITH physical AS MATERIALIZED (
    SELECT table_name, column_name, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name LIKE 'tb_%'
      AND data_type = 'character varying'
)
SELECT c.table_name, c.column_name, c.character_maximum_length AS physical_length,
       t.term_name, t.domain_name, d.data_length AS standard_length
FROM physical c
JOIN public.meta_standard_terms t ON lower(t.eng_abbr) = c.column_name
JOIN public.meta_standard_domains d ON d.domain_name = t.domain_name
WHERE upper(d.data_type) IN ('VARCHAR', 'CHARACTER VARYING')
  AND c.character_maximum_length IS DISTINCT FROM d.data_length
ORDER BY c.table_name, c.column_name, t.term_name
