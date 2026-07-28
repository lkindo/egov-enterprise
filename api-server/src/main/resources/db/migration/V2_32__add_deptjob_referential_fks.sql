-- =====================================================================
-- V2_32: 부서업무(deptjob) 참조 무결성 FK 2건 + 자식 인덱스 2건
-- =====================================================================
-- 근거: docs/02-architecture/a-group-decision-recommendations.md §3-6 Phase2(FK 위생) 잔여분.
--   해당 문서가 V2_20 을 예약했으나 그 번호는 log-retention 인덱스로 소진됐다(문서 §5 실측 노트).
--   착수 시점(2026-07-29) flyway_schema_history 최신 = V2_30 → V2_31(미적용 대기) 다음인 V2_32 로 배정.
--
-- [배경 — 왜 지금인가]
-- tb_dept_task_info 는 업무함 id(dept_task_box_id)와 담당자 id(pic_id)를 '값'으로만 들고 있었다.
-- 엔티티에 연관관계 매핑이 없고 DB 에 FK 도 없어, 업무함을 지워도 아무 오류 없이 **고아 업무**가
-- 남는 구조였다. 부서업무는 2026-07-19~20 에 죽은 표면에서 사용자 대면 기능으로 소생했으므로
-- (문서 §3-6 결판) 데이터가 쌓이기 시작한다. 지금은 두 테이블 모두 0행이라 FK 부착 비용이 0 이다.
--
-- [실측 — 2026-07-29 information_schema / pg_constraint]
--   · tb_dept_task_info.dept_task_box_id  varchar(20) NULL   ← 자식
--   · tb_dept_job_bx.dept_task_box_id     varchar(20) NOT NULL (pk_tb_dept_job_bx)  ← 부모
--   · tb_dept_task_info.pic_id            varchar(20) NULL   ← 자식
--   · tb_user_info.esntl_id               varchar(20) NOT NULL (pk_tb_user_info)    ← 부모
--   · 기존 FK: fk_tb_dept_task_info_tb_file_master 1건뿐
--   · 행 수: tb_dept_job_bx 0행 · tb_dept_task_info 0행 → 고아 0, VALIDATE 즉시 안전
--   자식 컬럼이 둘 다 nullable 이므로 미지정 업무(NULL)는 FK 를 그대로 통과한다.
--
-- [동반 코드 변경 — 동일 릴리스 결속]
-- FK(NO ACTION)는 부모를 지우기 전에 자식 참조를 끊을 것을 요구한다. V2_14 선례와 동일하게 결속한다:
--   · DeptJobBoxService.deleteDeptJobBox — 산하 업무 존재 시 409(RESOURCE_IN_USE) 선검사.
--       제약 위반을 500(DataIntegrityViolation)이 아니라 의미 있는 409 로 표면화한다.
--   · UserService.cleanupDependentsAndDelete — 담당자 참조 해제(pic_id→NULL). 업무는 부서 자산이라
--       삭제하지 않는다. 담당자 공석은 이미 정상 상태이며 그 경우 인가는 등록자 기준으로 판정된다
--       (DeptJobService.assertPicOrAdmin). 즉 공석화는 권한 완화가 아니다.
--
-- 패턴: V2_12/V2_14 선례 — 존재검사 멱등 가드 + NOT VALID → 즉시 VALIDATE(0행) + NO ACTION 일관.
-- Zero-Downtime 린터: ADD CONSTRAINT·CREATE INDEX 는 부가적(additive) 변경이라 비대상(DB 헌법 제6조).

-- ---------------------------------------------------------------
-- 1) FK 추가 (멱등 가드)
-- ---------------------------------------------------------------
DO $$
BEGIN
  -- [업무 → 업무함] 고아 업무 방지. 업무함 삭제는 서비스가 409 로 선차단한다.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_dept_task_info_tb_dept_job_bx') THEN
    ALTER TABLE tb_dept_task_info ADD CONSTRAINT fk_tb_dept_task_info_tb_dept_job_bx
      FOREIGN KEY (dept_task_box_id) REFERENCES tb_dept_job_bx (dept_task_box_id) NOT VALID;
  END IF;

  -- [업무 → 담당자] pic_id 에는 esntl_id 가 저장된다(DeptJobService 담당자 축 = esntlId).
  --   사용자 삭제 시 UserService 가 pic_id 를 NULL 로 해제한 뒤 사용자 행을 지운다.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_dept_task_info_tb_user_info') THEN
    ALTER TABLE tb_dept_task_info ADD CONSTRAINT fk_tb_dept_task_info_tb_user_info
      FOREIGN KEY (pic_id) REFERENCES tb_user_info (esntl_id) NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 2) 즉시 VALIDATE (양 테이블 0행 — 기존 데이터 검증 비용 없음)
-- ---------------------------------------------------------------
ALTER TABLE tb_dept_task_info VALIDATE CONSTRAINT fk_tb_dept_task_info_tb_dept_job_bx;
ALTER TABLE tb_dept_task_info VALIDATE CONSTRAINT fk_tb_dept_task_info_tb_user_info;

-- ---------------------------------------------------------------
-- 3) 자식 인덱스 (FK 컬럼 — 부모 삭제 시 자식 스캔·업무함별 조회 경로)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_tb_dept_task_info_dept_task_box_id ON tb_dept_task_info (dept_task_box_id);
CREATE INDEX IF NOT EXISTS ix_tb_dept_task_info_pic_id           ON tb_dept_task_info (pic_id);
