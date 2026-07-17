-- V2_19: DB 표준화 후미 경미 스윕 — TEXT 잔존 정리 + inst_cycl 도메인 정합 + 표준 용어 리네임 2건
-- 근거(헌법 제5조 3단계 SSOT 기계검증, 2026-07-17 실측):
--   * 특이사항(EXCPTN_MTTR)·도움말설명(HLP_EXPLN) → 내용V4000 (meta_standard_terms 등재)
--   * 온라인매뉴얼정의: 용어 미등재이나 *_DFN 등재 3종(사용자정의/용어정의/지표정의) 전원 내용V4000 → 유추 적용
--   * 기관차수(INST_CYCL) → 수N2 = NUMERIC(2)  (tb_inst_cd·tb_inst_cd_rcptn_log 0행 실측 — 무손실)
--   * 보고서명 등재 용어 = RPTP_NM(명V256) → reprt_nm 리네임 (길이 256 이미 정합)
--   * tb_authrt_group_info.group_crt_ymd 는 timestamp 인데 접미사가 _ymd — 타입-접미사 정합 리네임(_dt)
-- 멱등성: 선적용 운용 3경로(fresh/재생/재실행) 대비 — 타입 변환은 원타입 검사 DO 가드,
--          RENAME 은 구컬럼 존재 가드(V2_18 교훈: USING 절은 원타입 전제라 재실행 시 타입 가드 필수).

-- 1) TEXT → varchar(4000)  (text→varchar 암묵 캐스트, 재실행 시 varchar→varchar no-op — 자연 멱등)
ALTER TABLE tb_diary_info    ALTER COLUMN excptn_mttr  TYPE varchar(4000); -- linter:ignore (0행 실측, text→varchar 무손실·즉시 완료)
ALTER TABLE tb_hlp_info      ALTER COLUMN hlp_expln    TYPE varchar(4000); -- linter:ignore (0행 실측, text→varchar 무손실·즉시 완료)
ALTER TABLE tb_onln_mnl_info ALTER COLUMN onln_mnl_dfn TYPE varchar(4000); -- linter:ignore (36행 max14 실측, 무손실·즉시 완료)

-- 2) inst_cycl varchar(2) → numeric(2)  (수N2 도메인 정합, 양 테이블 0행 실측)
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'tb_inst_cd' AND column_name = 'inst_cycl') <> 'numeric' THEN
        ALTER TABLE tb_inst_cd ALTER COLUMN inst_cycl TYPE numeric(2) -- linter:ignore (0행 실측, 수N2 도메인 정합)
            USING NULLIF(btrim(inst_cycl), '')::numeric;
    END IF;
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'tb_inst_cd_rcptn_log' AND column_name = 'inst_cycl') <> 'numeric' THEN
        ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN inst_cycl TYPE numeric(2) -- linter:ignore (0행 실측, 수N2 도메인 정합)
            USING NULLIF(btrim(inst_cycl), '')::numeric;
    END IF;
END $$;

-- 3) 표준 용어 리네임 (구컬럼 존재 가드 — 재실행 멱등)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tb_rptp_stats' AND column_name = 'reprt_nm') THEN
        ALTER TABLE tb_rptp_stats RENAME COLUMN reprt_nm TO rptp_nm; -- linter:ignore (0행·네이티브 SQL 참조 0건 실측, 엔티티 @Column(name) 동시 배포)
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tb_authrt_group_info' AND column_name = 'group_crt_ymd') THEN
        ALTER TABLE tb_authrt_group_info RENAME COLUMN group_crt_ymd TO group_crt_dt; -- linter:ignore (0행 실측[E2E 가비지 정리 직후], 엔티티 리네임 동시 배포)
    END IF;
END $$;

COMMENT ON COLUMN tb_rptp_stats.rptp_nm IS '보고서명';
COMMENT ON COLUMN tb_authrt_group_info.group_crt_dt IS '그룹생성일시';
COMMENT ON COLUMN tb_inst_cd.inst_cycl IS '기관차수';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_cycl IS '기관차수';
