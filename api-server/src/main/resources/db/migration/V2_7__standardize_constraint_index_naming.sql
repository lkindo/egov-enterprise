-- linter:disable-file
-- ↑ 무중단 린터 예외(선례: V1.10__fix_constraint_naming.sql 동일). 사유: ZeroDowntimeMigrationLinterTest 의
--   FORBIDDEN_RENAME 규칙(정규식 `ALTER TABLE \S+ RENAME`)은 RENAME COLUMN 을 겨냥하나 RENAME CONSTRAINT 까지
--   오매치(false positive)한다. 본 파일의 모든 DDL 은 카탈로그 메타데이터 rename(비파괴·무중단)뿐이라 안전하다.
-- V2_7: 제약·인덱스 명명 표준 정합(DB 헌법 제6조) — 단순성(simplicity) 강화
-- 배경: 베이스라인 잔존 비표준 명명 — PK 제약 *_pkey(ecopseq/ids/revinfo), 인덱스 idx_(tb_menu_info).
--       헌법 제6조는 PK=pk_[테이블], 인덱스=ix_[테이블]_[컬럼] 를 규정한다. 표준 tb_ 객체(tb_menu_info)의
--       인덱스와, 프레임워크 예약 테이블의 PK 제약명을 pk_/ix_ 로 통일해 제약·인덱스 명명 계층을 일관화한다.
-- 방식(무중단, DB 헌법 제7조): RENAME CONSTRAINT / ALTER INDEX RENAME — 카탈로그 메타데이터만 변경한다.
--   테이블/인덱스 재작성(rewrite) 없음. 순간 ACCESS EXCLUSIVE 락만 잡고 반환 → 읽기/쓰기 사실상 무중단.
--   제약·인덱스 명은 Hibernate/Envers 가 런타임에 이름으로 참조하지 않으므로(스키마 검증도 validate 프로파일 한정)
--   애플리케이션 코드 변경 없이 안전하다.
-- 예외(의도적 미변경):
--   - meta_standard_domains_pkey / meta_standard_terms_pkey 는 meta_ 예외 체계(헌법 제3조 2항)라 그대로 둔다.
--   - 시퀀스 명(answer_no_seq/ntt_id_seq/pst_id_seq)의 sq_ 표준화는 JPA @SequenceGenerator·nextval 문자열
--     결속이 있어 코드 동기화+런타임 검증이 필요하므로 본 파일 범위에서 제외한다(별도 Expand-Contract 예정).
--   - 프레임워크 예약 테이블명 ecopseq/ids/revinfo 자체는 eGov ID채번·Hibernate Envers 소유라 tb_ 미적용 예외로 유지.
--     (docs/02-architecture/db-naming-exceptions.md 에 명시 등재)
-- 멱등: 구(舊) 이름이 존재할 때만 rename → 신규/기적용 DB 양쪽 안전.

DO $$
BEGIN
    -- 프레임워크 예약 테이블 PK 제약명 → pk_[테이블]
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ecopseq_pkey') THEN
        ALTER TABLE public.ecopseq RENAME CONSTRAINT ecopseq_pkey TO pk_ecopseq;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ids_pkey') THEN
        ALTER TABLE public.ids RENAME CONSTRAINT ids_pkey TO pk_ids;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revinfo_pkey') THEN
        ALTER TABLE public.revinfo RENAME CONSTRAINT revinfo_pkey TO pk_revinfo;
    END IF;

    -- 표준 테이블 인덱스 idx_ → ix_ (제6조 인덱스 접두)
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'idx_tb_menu_info_del_yn') THEN
        ALTER INDEX public.idx_tb_menu_info_del_yn RENAME TO ix_tb_menu_info_del_yn;
    END IF;
END $$;
