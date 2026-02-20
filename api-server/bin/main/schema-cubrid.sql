CREATE TABLE IF NOT EXISTS ids (
    table_name VARCHAR(16) PRIMARY KEY,
    next_id NUMERIC(30) NOT NULL
);

INSERT INTO ids (table_name, next_id) 
SELECT 'SAMPLE', 1 
WHERE NOT EXISTS (SELECT 1 FROM ids WHERE table_name = 'SAMPLE');
