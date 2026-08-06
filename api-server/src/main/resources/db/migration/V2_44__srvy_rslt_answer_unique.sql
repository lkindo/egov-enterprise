-- 설문 응답 중복 방지 — 동일 사용자가 같은 문항의 같은 항목을 두 번 담지 못하게 한다.
--
-- [배경 · 그리고 앞선 서술의 정정]
-- #301 에서 응답 제출을 신설하며 "중복 제출 차단이 동시 요청에 취약하다. 근본 해결은
-- (srvy_id, frst_rgtr_id) 유니크 인덱스다" 라고 적었다. **그 서술은 틀렸다.**
--
-- 실측: SurveyResultService.submitResponse 는 제출 1회에 **답변 수만큼 행**을 만들고
-- 그 행들은 전부 같은 srvy_id 와 같은 frst_rgtr_id(@CreatedBy)를 갖는다.
-- 따라서 (srvy_id, frst_rgtr_id) 에 UNIQUE 를 걸면 **정상 제출의 2번째 답변부터 거부**된다.
-- 온라인 투표(V2_4)는 1인 1행이라 그 조합이 통했지만, 설문은 1인 N행이라 같은 방식이 성립하지 않는다.
-- 선례의 형태만 보고 옮겼다면 기능을 깨뜨렸을 것이다.
--
-- [올바른 입도]
--   (srvy_id, srvy_qstn_id, srvy_artcl_id, frst_rgtr_id)
--
--   · 다중선택(SurveyQuestion.maxChcCnt > 1): 같은 문항 + 다른 항목 → 서로 다른 행 → 허용 ✔
--   · 여러 문항에 답하기: 문항이 다르므로 → 허용 ✔
--   · 완전 동일 행 중복 삽입 → 차단 ✔
--   · 동일 답변으로 재제출 → 차단 ✔
--
-- [⚠ 이것으로 닫히지 않는 것 — 정직하게 남긴다]
-- **다른 답변으로 재제출하는 경우는 이 제약이 막지 못한다.** 예: 1차에 '예', 2차에 '아니오'.
-- 비동시 상황은 서비스의 existsBySrvyIdAndFrstRgtrId 검사가 막고 있으나, 두 요청이 동시에
-- 그 검사를 통과하면 서로 다른 항목을 고른 두 벌의 응답이 함께 남는다.
--
-- 완전한 보장은 "이 설문에 이 사용자가 응답했다" 를 담는 **단일 앵커 행**이 필요하다
-- (예: tb_srvy_rspdnt 에 제출 시점의 응답자 행을 만들고 거기에 UNIQUE(srvy_id, frst_rgtr_id)).
-- 그것은 제출 의미론과 응답자 테이블(성별·생년월일·전화번호 PII 보유)의 성격을 함께 정해야
-- 하는 **제품 결정**이라 이 마이그레이션 범위 밖이다. 결정 전까지 이 제약이 방어선을 좁힌다.
--
-- [실측] tb_srvy_rslt 0행 — 기존 중복 정리(V2_4 의 DELETE 단계)가 필요 없다.
-- [멱등성] 제약 존재 여부를 먼저 확인해 재적용 시 통과한다.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_tb_srvy_rslt_answer'
          AND conrelid = 'tb_srvy_rslt'::regclass
    ) THEN
        ALTER TABLE tb_srvy_rslt
            ADD CONSTRAINT uk_tb_srvy_rslt_answer
            UNIQUE (srvy_id, srvy_qstn_id, srvy_artcl_id, frst_rgtr_id);

        COMMENT ON CONSTRAINT uk_tb_srvy_rslt_answer ON tb_srvy_rslt
            IS '응답 중복 방지 — 한 사용자가 같은 문항의 같은 항목을 두 번 담을 수 없다(다중선택은 항목이 달라 허용)';
    END IF;
END $$;
