-- V2_8: 시퀀스 명명 표준화(DB 헌법 제3조 sq_ 접두) — 단순성(simplicity) 강화
-- 배경: 채번 시퀀스가 레거시 _seq 접미(answer_no_seq/ntt_id_seq/pst_id_seq)로 남아 제3조 sq_ 접두를 이탈.
--       실측(db-bridge): 이 3개는 컬럼 DEFAULT(nextval) 의존이 없어(pg_attrdef 조회 0건), 오직 애플리케이션
--       코드 문자열로만 소비된다 → 컬럼 기본값 파손 없이 rename 가능하며, 코드 문자열만 동반 변경하면 된다.
--         · answer_no_seq → Comment.@SequenceGenerator(sequenceName) 로 소비 (동반 변경: Comment.java)
--         · pst_id_seq    → BoardRepository 네이티브 nextval('pst_id_seq') 로 소비 (동반 변경: BoardRepository.java)
--         · ntt_id_seq    → 현행 코드 소비처 0건(legacy, 채번 14회 후 방치). 표준화만 적용(향후 제거 후보).
-- 방식(무중단, DB 헌법 제7조): ALTER SEQUENCE ... RENAME TO — 카탈로그 메타데이터만 변경(값·상태 보존).
--   ⚠ 조율 배포 필수: 본 마이그레이션(rename)은 신(新) 시퀀스명을 참조하는 코드(Comment/BoardRepository)와
--     반드시 동일 릴리스로 배포한다. 구(舊) 코드가 살아있는 롤링 배포 창에서는 채번이 깨질 수 있으므로,
--     단일 배포(앱 기동 시 Flyway 적용 → 신 코드가 신 시퀀스명 사용)로 정합을 보장한다.
-- 멱등: 구명이 있고 신명이 없을 때만 rename → 신규/기적용 DB 양쪽 안전.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='answer_no_seq')
       AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='sq_answer_no') THEN
        ALTER SEQUENCE public.answer_no_seq RENAME TO sq_answer_no;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='pst_id_seq')
       AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='sq_pst_id') THEN
        ALTER SEQUENCE public.pst_id_seq RENAME TO sq_pst_id;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='ntt_id_seq')
       AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='sq_ntt_id') THEN
        ALTER SEQUENCE public.ntt_id_seq RENAME TO sq_ntt_id;
    END IF;
END $$;
