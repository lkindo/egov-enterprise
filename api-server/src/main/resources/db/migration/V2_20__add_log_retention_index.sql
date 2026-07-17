-- V2_20: 로그 보존기간 배치(LogRetentionScheduler)의 만료 삭제 술어 인덱스 보강 (log-privacy)
-- 근거: tb_web_log(실측 20,841행)의 DELETE ... WHERE occr_ymd < :cutoff 가 full scan 이 되지 않도록
--       occr_ymd 단일 인덱스 신설. occr_ymd 는 varchar(8) 균일(전행 length=8 실측)이라 문자열 비교가 sargable.
--       tb_sys_log(12행)·tb_login_log(0행)는 규모상 인덱스 보류(비용>이득 실측).
-- 헌법: 제6조 4항 인덱스 명명(ix_<테이블>_<컬럼>). 비파괴 DDL(제7조 3항 지능형 허용) — ZeroDowntime 린터 비차단.
-- 멱등 3경로: IF NOT EXISTS 로 fresh/재생/재실행 안전. 타입 변경 없어 USING 타입가드 불요.
-- 규모(2만행)상 CONCURRENTLY 불요(Flyway 트랜잭션 내 실행 호환 — CONCURRENTLY 는 tx 밖 요구).
CREATE INDEX IF NOT EXISTS ix_tb_web_log_occr_ymd ON tb_web_log(occr_ymd);
