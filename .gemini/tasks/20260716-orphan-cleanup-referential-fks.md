# 20260716 — 고아행 정리 + 사용자/메뉴 참조 FK (P0 CRITICAL 해소)

> **등급**: L2 (운영 데이터 DML + 마이그레이션 + 다중 모듈 코드) · **승인**: 사용자 3결정(2026-07-16)
> **근거**: [db-standardization-assessment.md](../../docs/02-architecture/db-standardization-assessment.md) §3 CRITICAL
> **작업자**: Claude Code

## 1. 사용자 결정 사항

| 결정 | 선택 |
|---|---|
| 고아행 처리 | **백업 덤프 후 DELETE** (V2_9 자가치유 선례) |
| bbs_item placeholder 180건 | **webmaster(USRCNFRM_00000000001) 재귀속** (콘텐츠 보존) |
| 재발 방지 정책 | **NO ACTION FK + 앱 전부 정리** (매핑·알림 삭제, 콘텐츠 재귀속) |

## 2. 실측 → 조치 매트릭스

| 관계 | 고아(실측) | 조치 | FK |
|---|---:|---|---|
| tb_user_authrt_map.scrty_dcsn_trgt_id | 173/197 (88%) | DELETE | fk_tb_user_authrt_map_tb_user_info |
| tb_bbs_item.user_id | 180 (placeholder 2종) | webmaster 재귀속 UPDATE | fk_tb_bbs_item_tb_user_info |
| tb_menu_crt_dtl.menu_sn | 18 | DELETE | fk_tb_menu_crt_dtl_tb_menu_info + _tb_authrt_info |
| tb_user_noti.rcvr_id | 138 | DELETE | fk_tb_user_noti_tb_user_info |
| tb_adbk_manage.wrter_id | 34 | DELETE | fk_tb_adbk_manage_tb_user_info |
| tb_bbs_comment.wrter_id | 25 | DELETE | fk_tb_bbs_comment_tb_user_info |
| tb_auth_rfsh_tk.user_id | 2 | DELETE | FK 보류 (esntl/loginId 혼용 — P2 키 단일화 선행) |

- **백업**: 삭제 390행 + 재귀속 전 상태 180행 전량 JSON 덤프 (세션 scratchpad `orphan-backup-*.json`, 행수 대조 완료)
- **유입원 규명(코드 실증)**: `UserService.deleteUser/deleteUserList` 가 사용자만 삭제하고 종속 데이터 미정리(signup 은 UserAuthority 생성) / `MenuService.deleteMenuManage*` 가 menu_crt_dtl 미정리
- **authrt_map FK 단일 타깃 근거**: 유효행 24건 전부 user-ref, group-ref 0건, GRP 타입 0건 실측 (그룹 인가 도입 시 FK 재설계 필요 — V2_12 주석 명기)
- **placeholder 재생산 경로 없음**: USRCNFRM_99999999999/00000000000 은 어떤 시드/마이그레이션 파일에도 부재 (라이브 잔재)

## 3. 산출물

### DB (V2_12__cleanup_orphan_refs_add_user_fks.sql — 라이브 선적용 완료)
- 자가치유 DELETE 6종 + 재귀속 UPDATE(webmaster 존재 가드) — 멱등
- FK 7건 NOT VALID→VALIDATE (NO ACTION 일관, 헌법 제6조 명명) + 자식 인덱스 7건
- 부수: V2_6 잔여 NOT VALID 5건 VALIDATE 승격(fresh-DB 카탈로그 정합 — 감사 LOW 해소)

### 코드 (재발 방지 — FK와 동일 릴리스 결속)
- `foundation/Constants.User.SYSTEM_ADMIN_ESNTL_ID` 신설 (R__seed_framework 시드와 결속)
- `UserService.deleteUser/deleteUserList`: `cleanupDependentsAndDelete()` — 권한매핑·리프레시토큰(양키) 삭제 → `UserDeletionEvent` **동기** 발행 → 일괄 삭제. webmaster 삭제 금지 가드
- **[버그수정]** `deleteUserList`: 기존 `deleteAllByIdInBatch(loginIds)` 는 PK(esntlId) 불일치로 **침묵 no-op** 이었음 → loginId/esntlId 이중 해석으로 정정 (FE UserOrgHubClient 는 loginId 전송)
- `UserDeletionEvent`(business-core, DomainEvent seam) + `UserDeletionCleanupListener`(business-app): 알림 삭제 + 게시글/댓글/주소록 webmaster 재귀속. **@Async 금지**(동일 tx 필수) — Propagation.MANDATORY 로 강제
- `MenuService.deleteMenuManage/List`: `MenuAuthorityRepository.deleteByIdMenuSn/In` 선정리 추가
- 리포지토리 벌크 메서드 4건: Notification.deleteByRcvrIdIn / Board·Comment·AddressBook.reassign*

### 테스트
- 기존 4개 테스트 클래스 생성자/검증 갱신 + 신규 회귀 4건(정리 체인 검증·webmaster 가드·loginId 해석·멱등 스킵)

## 4. 검증 로그 (Stage 4 증거)

| 게이트 | 결과 |
|---|---|
| 라이브 고아 재실측 (7개 관계) | **전부 0건** |
| 신규 FK 7건 | **전부 convalidated=true** + 인덱스 7건 존재 |
| `./gradlew compileJava compileTestJava` | **exit 0** |
| `:business-core:test` (user.* + menu.*) | **BUILD SUCCESSFUL** |
| `:business-app:test :api-server:test` (full — 이벤트/리스너 교훈 준수) | **BUILD SUCCESSFUL** |
| 증분 pitest (UserService 한정) | 실행 — 결과는 커밋 메시지/후속 기록 참조 |

### 정직 보류 (deferred)
- **런타임 E2E 관통 검증**: 실제 서버 기동 후 사용자 삭제 API → FK 통과 확인은 미실시. 재개 조건: 차기 E2E 파이프라인(사용자 삭제 시나리오 포함 tier)에서 자동 검증됨. 실패 시 본 태스크 파일 참조.
- **Flyway history 등재**: V2_12 는 라이브 선적용 상태(V2_6~V2_11 과 동일 패턴). 차기 bootRun 시 pending 수렴 예정 — 멱등 가드로 재실행 안전.
- **tb_auth_rfsh_tk FK**: P2(사용자 참조 키 esntl_id 단일화) 선행 필요로 보류.

## 5. 주의사항 (후속 운영자)
- **webmaster(USRCNFRM_00000000001) 계정 삭제 금지** — 콘텐츠 재귀속 종착지. 서비스 레벨 가드 있음.
- UserDeletionEvent 리스너를 @Async 로 바꾸면 FK 위반으로 사용자 삭제가 파손된다 (파일 주석 참조).
- 사용자/메뉴 삭제 로직을 새로 만들 때는 반드시 종속 정리 경로(cleanupDependentsAndDelete / deleteByIdMenuSn)를 경유할 것.
