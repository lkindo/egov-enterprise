INSERT INTO ecopseq (table_name, next_id) VALUES ('REPRT_STATS_ID', 1) ON CONFLICT (table_name) DO NOTHING;
INSERT INTO ecopseq (table_name, next_id) VALUES ('DTA_USE_STATS_ID', 1) ON CONFLICT (table_name) DO NOTHING;
