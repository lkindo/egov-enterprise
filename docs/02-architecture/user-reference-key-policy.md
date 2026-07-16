# 사용자 참조 키 규약 (User Reference Key Policy)

> **제정**: 2026-07-17 (P2 이행, 사용자 승인) · **지위**: 백엔드 헌법 제8조(권한 재검증)·DB 헌법 제5조(도메인)와 병행 적용되는 이행 규약
> **배경**: `tb_user_info` 는 이중 식별자를 가진다 — **esntl_id**(PK, 불변 대리키, `USRCNFRM_`/`USR_` 접두)와
> **user_id**(loginId, UNIQUE `uk_tb_user_info_user_id`, 화면 노출용 자연키). 2026-07 표준화 감사에서 테이블마다
> 참조 키가 달라 FK 확장이 불가능했던 근본 원인이 "무질서한 혼용"이 아니라 **계층 미구분**임이 실측으로 판명되어,
> 전면 단일화 대신 아래 3계층 규약을 명문화한다.

---

## 계층별 키 규약

| 계층 | 키 | FK | 근거 |
|---|---|---|---|
| **① 소유·참조** (콘텐츠 저자, 매핑, 알림 수신자, 소유권 검사 등 도메인 데이터) | **esntl_id 의무** | **의무** (`→ tb_user_info.esntl_id`) | 불변 대리키만이 참조 무결성을 보장. V2_12·V2_14 로 이행 완료(authrt_map, bbs_item.user_id, comment/adbk.wrter_id, user_noti.rcvr_id, blog_user_map.user_id, user_absn.user_id 등) |
| **② 행위자 표기** (감사컬럼 `frst_rgtr_id`/`last_mdfr_id`, `tb_web_log`/`tb_sys_log` 등 로그) | **loginId (스냅샷)** | **금지** | 감사·로그는 "그 시점의 행위자 표기"다 — 사용자 삭제 후에도 보존돼야 하므로 FK 를 걸지 않으며, 사람이 읽는 용도라 loginId 의 가독성이 자산. JPA Auditing 이 loginId 를 기록하는 현행 거동은 **의도된 설계**로 인정한다 |
| **③ 인증 산출물** | **조회 시점 키** | 선택 | `tb_login_policy` = **loginId** (정책 검증이 로그인 전 — esntl_id 를 알 수 없는 시점 — 에 수행됨. UNIQUE 대상 FK `fk_tb_login_policy_tb_user_info` 로 무결성 확보) / `tb_auth_rfsh_tk` = **esntl_id** (발급 시점엔 인증 완료 — 발급·재발급·로그아웃 전 경로가 esntl_id 키잉임을 2026-07-17 실측 확인, 레거시 loginId 키 행은 V2_18 정리) |

## 파생 규칙

1. **loginId(user_id)는 불변이다** — `User.changeUserId` 는 제거됨(2026-07-17, 프로덕션 호출 0건). 가변 자연키는
   ③계층의 loginId FK 를 파손시킬 수 있다. 로그인 ID 변경이 제품 요구로 필요해지면 Expand-and-Contract +
   loginId 계층 전체 재키잉 설계로 재도입한다.
2. **신규 설계 판단 순서**: "이 컬럼이 사용자를 *참조*하는가(→①), *표기*하는가(→②), 인증 플로우 산출물인가(→③)".
   ①이면 컬럼명에 관계없이 esntl_id 값 + FK 를 강제한다 (컬럼명이 `user_id` 여도 값은 esntl_id — `tb_bbs_item.user_id` 선례).
3. **②계층의 개인정보**: 사용자 삭제 후 로그의 loginId 잔존은 무결성 문제가 아니라 **개인정보 보존 정책** 사안이다
   — 익명화 vs 보존은 별도 제품 결정 대기 항목(감사 로그 삭제 정책과 동일 트랙).
4. `SecurityUtil`/`CustomUserDetails.getUsername()` 은 **esntl_id 를 반환**한다 — ①계층 기록 시 이것을 그대로 쓰면 되고,
   ②계층 표기가 필요하면 loginId 를 명시 조회한다. (재발성 피트폴 — [esntlId vs userId pitfall] 참조)

## 이행 상태 (2026-07-17)

- ①: **완료** — FK 58건 체제에 편입, 고아 정리 완결 (V2_12·V2_14·V2_16)
- ②: **현행 인정** — 변경 없음 (개인정보 정책만 결정 대기)
- ③: login_policy 완료(키 혼용 결함 정정 포함) / rfsh_tk 는 경로 전체 esntl_id 실측 확인, 레거시 행 1건 정리는 V2_18 포함

---
*근거 실측·경위: docs/02-architecture/db-standardization-assessment.md · .gemini/tasks/20260717-fk-batch-expansion-p1.md*
