-- V2_10: tb_cmnty_user_map → tb_user_info FK 추가 (V2_6 에서 보류했던 FK #8) — 연결부 완결
-- 배경: V2_6 은 tb_cmnty_user_map.user_id 의 FK 를, user_id 컬럼이 loginId(→tb_user_info.user_id UNIQUE)인지
--       esntlId(→tb_user_info.esntl_id PK)인지 식별자 규약이 미확정이라 보류했다(이 저장소의 정체성 footgun).
-- 확정(코드 실측): CommunityUserApiController.joinCommunity 가 communityService.joinCommunity(cmntyId,
--       userDetails.getUsername()) 로 호출하고, SecurityUtil.getCurrentEsntlId() 구현이 보이듯
--       getUsername() = esntlId 다. 즉 tb_cmnty_user_map.user_id 에는 esntlId 가 저장된다.
--       → FK 는 tb_user_info.esntl_id(PK) 를 참조한다(기존 fk_tb_user_log_tb_user_info: dmnd_user_id→esntl_id 관례와 정합).
--       컬럼 길이도 varchar(20)=varchar(20) 로 호환.
-- 방식(무중단, DB 헌법 제7조): tb_cmnty_user_map 은 현재 0행이므로 즉시 VALIDATED 로 추가해도 락/검증 부담이 없다.
--       (비어있지 않은 환경 대비) 존재검사로 감싸 멱등 처리.
-- 명명: DB 헌법 제6조 fk_[기준테이블]_[참조테이블].

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_tb_cmnty_user_map_tb_user_info'
          AND conrelid = 'public.tb_cmnty_user_map'::regclass
    ) THEN
        ALTER TABLE public.tb_cmnty_user_map
            ADD CONSTRAINT fk_tb_cmnty_user_map_tb_user_info
            FOREIGN KEY (user_id) REFERENCES public.tb_user_info(esntl_id);
    END IF;
END $$;
