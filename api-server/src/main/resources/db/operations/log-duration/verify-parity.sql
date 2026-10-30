-- READ ONLY; expanded schema required. No identifiers or raw log content returned.
-- A single SELECT takes one statement snapshot across both tables.
-- Completion requires BOTH mismatches=0; a SKIP LOCKED batch returning zero is insufficient.
SELECT 'tb_sys_log.prcs_req_msec'::text AS target,
       count(*) AS total_rows,
       count(*) FILTER (WHERE prcs_tm IS NULL) AS legacy_null_rows,
       count(*) FILTER (WHERE prcs_req_msec IS NULL) AS target_null_rows,
       count(*) FILTER (WHERE prcs_req_msec IS NULL AND prcs_tm IS NOT NULL) AS pending_rows,
       count(*) FILTER (WHERE prcs_req_msec IS NOT NULL AND prcs_req_msec IS DISTINCT FROM prcs_tm) AS nonnull_drift_rows,
       count(*) FILTER (WHERE prcs_req_msec IS DISTINCT FROM prcs_tm) AS mismatches
FROM public.tb_sys_log
UNION ALL
SELECT 'tb_web_log.prcs_req_msec'::text AS target,
       count(*) AS total_rows,
       count(*) FILTER (WHERE prcs_tm IS NULL) AS legacy_null_rows,
       count(*) FILTER (WHERE prcs_req_msec IS NULL) AS target_null_rows,
       count(*) FILTER (WHERE prcs_req_msec IS NULL AND prcs_tm IS NOT NULL) AS pending_rows,
       count(*) FILTER (WHERE prcs_req_msec IS NOT NULL AND prcs_req_msec IS DISTINCT FROM prcs_tm) AS nonnull_drift_rows,
       count(*) FILTER (WHERE prcs_req_msec IS DISTINCT FROM prcs_tm) AS mismatches
FROM public.tb_web_log;
