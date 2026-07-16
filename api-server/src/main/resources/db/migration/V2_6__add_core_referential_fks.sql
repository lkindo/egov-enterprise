-- V2_6: 핵심 부모-자식 참조 무결성(FK) 무중단 선언 — 연결부(referential seam) 강화
-- 배경: 베이스라인 V2_0 은 CREATE TABLE 101 / FK 8 로, *_id 참조는 코드(JPA @ManyToOne)에만 있고
--       DB 에는 권위 있게 선언돼 있지 않아 고아행(orphan)을 물리적으로 허용했다. 아래 7쌍은 자식 컬럼이
--       전부 varchar(20) NOT NULL 이고 부모 참조 대상이 PK/UNIQUE 로 확인된, 의미상 무모호한 핵심 관계다.
-- 방식(무중단, DB 헌법 제7조): ADD CONSTRAINT ... NOT VALID.
--   - NOT VALID 는 기존 행 전수검사를 생략하므로 레거시 고아행이 있어도 마이그레이션이 실패하지 않는다.
--   - 그럼에도 이 시점 이후의 모든 신규/수정 행에는 FK 가 즉시 강제된다(정합성 유입 차단).
--   - 락: 자식 테이블 SHARE ROW EXCLUSIVE 를 순간만 잡고 반환 → 읽기 무중단.
-- VALIDATE(기존 행 소급 검증) 는 별도 후속 마이그레이션으로 분리한다:
--   라이브 DB 가용 시 db-bridge 로 각 관계의 고아행을 선(先)감사·격리한 뒤 VALIDATE CONSTRAINT 를 수행한다.
--   (고아행 DELETE 는 운영 데이터 파괴이므로 데이터 실측·승인 없이 이 파일에 포함하지 않는다.)
-- 멱등: 각 제약을 pg_constraint 존재검사로 감싸 재적용을 안전하게 건너뛴다(신규/기적용 DB 양쪽 안전).
-- 명명: DB 헌법 제6조 fk_[기준테이블]_[참조테이블].
-- 제외 항목(의도적):
--   - fk_tb_file_detail_tb_file_master, fk_tb_onln_poll_artcl_tb_onln_poll_manage 는 베이스라인에 이미 존재.
--   - tb_cmnty_user_map.user_id → tb_user_info 는 user_id(loginId) vs esntl_id 식별자 규약이 미확정이라
--     (기존 FK 는 dmnd_user_id→esntl_id 를 참조) DB 실측으로 컬럼 의미를 확정한 뒤 별도 처리.

DO $$
DECLARE
    -- child_table, constraint_name, ddl_tail(FK 정의)
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT * FROM (VALUES
            ('tb_bbs_item',       'fk_tb_bbs_item_tb_bbs_master',            'FOREIGN KEY (bbs_id) REFERENCES public.tb_bbs_master(bbs_id)'),
            ('tb_srvy_qstn',      'fk_tb_srvy_qstn_tb_srvy_info',            'FOREIGN KEY (srvy_id) REFERENCES public.tb_srvy_info(srvy_id)'),
            ('tb_srvy_artcl',     'fk_tb_srvy_artcl_tb_srvy_qstn',           'FOREIGN KEY (srvy_qstn_id) REFERENCES public.tb_srvy_qstn(srvy_qstn_id)'),
            ('tb_srvy_rslt',      'fk_tb_srvy_rslt_tb_srvy_artcl',           'FOREIGN KEY (srvy_artcl_id) REFERENCES public.tb_srvy_artcl(srvy_artcl_id)'),
            ('tb_onln_poll_rslt', 'fk_tb_onln_poll_rslt_tb_onln_poll_manage','FOREIGN KEY (poll_id) REFERENCES public.tb_onln_poll_manage(poll_id)'),
            ('tb_onln_poll_rslt', 'fk_tb_onln_poll_rslt_tb_onln_poll_artcl', 'FOREIGN KEY (poll_artcl_id) REFERENCES public.tb_onln_poll_artcl(poll_artcl_id)'),
            ('tb_cmnty_user_map', 'fk_tb_cmnty_user_map_tb_cmnty_info',      'FOREIGN KEY (cmnty_id) REFERENCES public.tb_cmnty_info(cmnty_id)')
        ) AS t(child_table, constraint_name, ddl_tail)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = fk.constraint_name
              AND conrelid = ('public.' || fk.child_table)::regclass
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ADD CONSTRAINT %I %s NOT VALID',
                fk.child_table, fk.constraint_name, fk.ddl_tail
            );
        END IF;
    END LOOP;
END $$;
