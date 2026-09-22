-- =====================================================================
-- V2_103: tb_user_info.sbscrb_ymd 의 기본값을 컬럼 계약(yyyyMMdd, varchar(8))에 맞춘다
-- =====================================================================
-- V2_0 baseline 은 가입일자 컬럼을 `character varying(8) DEFAULT CURRENT_TIMESTAMP` 로 만들었다.
-- CURRENT_TIMESTAMP 의 문자열은 8자를 넘으므로 이 컬럼을 생략한 INSERT 는 기본값 적용 순간
-- "value too long for type character varying(8)" 으로 죽는다(postgres:17 · OCI live 모두 실측).
-- 앱은 Hibernate 가 모든 컬럼을 실어 보내 이 결함을 만나지 않았지만, 값을 채우는 코드가 없어
-- 가입일자는 NULL 로만 저장됐고, 컬럼을 생략하는 경로(직접 SQL·이관·시드)는 언제나 실패했다.
--
-- 이 마이그레이션은 기본값을 컬럼 계약대로 Asia/Seoul 오늘(yyyyMMdd)로 바꾼다. 같은 변경의
-- UserService 는 등록·가입 시 가입일자를 명시적으로 채운다(앱 경로는 기본값에 기대지 않는다).
-- 기존 NULL 행은 손대지 않는다 — 실제 가입 시점을 저장소가 알 수 없고, OCI 는 NULL 0 행이다.
-- 메타데이터 변경만 있고 잠금·재작성이 없어 무중단(Expand) 이다.

ALTER TABLE tb_user_info
    ALTER COLUMN sbscrb_ymd SET DEFAULT to_char((now() AT TIME ZONE 'Asia/Seoul'), 'YYYYMMDD');

COMMENT ON COLUMN public.tb_user_info.sbscrb_ymd IS '가입일자 (sbscrb_ymd) — yyyyMMdd, 기본값은 Asia/Seoul 오늘(V2_103)';
