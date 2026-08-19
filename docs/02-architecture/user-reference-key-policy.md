# 사용자 참조 키 규약

`tb_user_info`에는 서로 다른 의미의 두 식별자가 있다.

- `esntl_id`: 내부 불변 대리키이자 PK
- `user_id`: 사람이 입력하고 화면에 노출되는 로그인 ID이자 unique 자연키

컬럼 이름만 보고 값을 선택하지 않는다. 참조 목적을 먼저 판정하고 아래 축을 적용한다.

## 키 선택 규칙

| 목적 | 저장 값 | FK | 예시·이유 |
|---|---|---|---|
| 도메인 소유자·수신자·권한 주체 | `esntl_id` | `tb_user_info.esntl_id`로 강제 | 사용자명 변경과 무관한 불변 참조가 필요하다. `scrty_dcsn_trgt_id`, 게시물 소유자 등이 이 축이다. |
| 감사자·로그 행위자 스냅샷 | `user_id`(loginId) | 원칙적으로 두지 않음 | 사용자 삭제 뒤에도 당시 행위자 표기가 남아야 한다. `frst_rgtr_id`, `last_mdfr_id`와 행위 로그가 이 축이다. |
| 로그인 전 정책 조회 | `user_id` | 계약에 따라 unique key FK 가능 | 인증 전에는 `esntl_id`를 아직 모를 수 있다. `tb_login_policy.user_id`가 이 축이다. |
| 인증 후 토큰·세션 소유자 | `esntl_id` | 저장소 계약에 따라 강제 | 발급·재발급·폐기 경로가 동일한 불변 주체를 사용해야 한다. |

레거시 컬럼명이 `user_id`라고 해서 값도 반드시 loginId인 것은 아니다. 기존 스키마의 의미를 바꿀 때는 live 데이터, FK 대상, 서비스 비교 축을 함께 확인한다.

## 애플리케이션 규칙

1. `SecurityUtil.getCurrentEsntlId()`는 소유·참조 축 비교에 사용한다.
2. `SecurityUtil.getCurrentLoginId()`는 감사 컬럼이나 loginId 기반 정책 비교에 사용한다.
3. `SecurityUtil.getCurrentUserId()`는 호환용 deprecated 별칭이며 새 코드에서 사용하지 않는다.
4. `BaseEntity.frstRgtrId`와 `lastMdfrId`에는 `LoginUserAuditorAware`가 loginId를 기록한다. 이 필드를 `esntl_id`와 비교하지 않는다.
5. 신규 사용자 참조는 이름보다 의미를 먼저 정하고, 소유·참조라면 `esntl_id`와 FK를 기본값으로 한다.
6. 로그인 ID 변경 기능을 도입하려면 loginId 기반 정책·로그·외부 계약의 영향 범위를 먼저 정의한다. 자연키 변경을 단순 필드 수정으로 처리하지 않는다.

## 개인정보와 삭제

사용자 삭제 뒤 로그에 loginId를 보존하거나 가명화하는 문제는 참조 무결성과 별개의 보존 정책이다. FK를 제거했다고 개인정보 의무가 사라지지 않으며, 보존·가명화·삭제 기준은 [로그 보존 정책](../04-operations/log-retention-policy.md)과 활성 결정 레지스트리에서 관리한다.

## 변경 검증

- Entity와 Flyway FK가 같은 대상 키를 가리키는지 live metadata로 확인한다.
- 서비스 인가 비교가 저장된 값과 같은 축인지 허용·거부 테스트로 검증한다.
- 사용자 삭제·loginId 변경·토큰 재발급 경로를 함께 확인한다.
- 단순 컬럼 리네임이나 기계적 helper 치환으로 식별자 의미를 바꾸지 않는다.

---
*Verified against `SecurityUtil`, `LoginUserAuditorAware`, and current user/auth mappings: 2026-08-19*
