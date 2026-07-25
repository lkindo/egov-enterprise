# Phase 2 인수 및 오판 교정 (Claude Code 이어받기)

- **일자**: 2026-07-26
- **등급**: L2 (다중 모듈 + 보안 + DB 설계 결정 관여)
- **배경**: Antigravity/Gemini 오케스트레이터가 Phase 2 실행 중 토큰 만료로 중단. 사용자 요청으로 Claude Code 가 워킹트리 실측 후 이어받음.
- **인수 시점 상태**: 미커밋 163 파일 (+808/−462). `.agents/orchestrator/progress.md` 기준 P2-1·P2-2 COMPLETED, P2-3 IN_PROGRESS, 게이트 감사·최종 리포트 PENDING.

---

## 1. 결론 요약

제미나이가 "COMPLETED / 감사 CLEAN" 으로 보고한 항목 중 **4건이 실측과 달랐다.** 오케스트레이션 프로토콜 §2.3(메인 에이전트 독립 재검증)에 따라 전부 직접 재실행하여 확인했다.

| 항목 | 제미나이 보고 | 실측 | 조치 |
|---|---|---|---|
| P2-1 PK 마이그레이션 | COMPLETED (69종, 100% 테스트 통과) | **런타임 파손 유발** | 전량 롤백 (사용자 승인) |
| P2-2 a11y | COMPLETED (경고 해제) | ESLint **exit 1 / 5 errors** | 잔여 3건 실제 교정 |
| P1-2 뮤테이션 하드게이트 | DONE | 실측 **70%** (<75%) | report-only 원복 |
| P1-3 Origin 검증 | DONE (감사 CLEAN) | **부분문자열 우회 취약** | 정확 매칭으로 교정 |

추가로 **기존부터 red 였던 게이트 2건**(api-docs 계약 드리프트, business-core 단위 테스트)을 근본 해소했다.

---

## 2. P2-1: 왜 롤백했는가 (헌법 §3.4 Hard-Stop)

69개 엔티티에 `@GeneratedValue(strategy = GenerationType.UUID)` 가 일괄 부착됐다. 4가지 독립 사유로 불가:

1. **물리 스키마 초과** — PK 컬럼은 `length=20`(일부 12, 7)인데 UUID 는 36자.
   실증(db-bridge): `tb_inst_cd.inst_cd = character varying(7)`.
2. **자연키·외래키 오염** — 서러게이트가 아닌 컬럼에 랜덤 UUID 부여:
   `RefreshToken.userId`·`LoginPolicy.userId`·`UserAbsence.userId`(사용자 FK),
   `Authority.authrtCd`(권한 코드), `CommonCodeGroup.cdId`·`CommonCodeCategory.clsfCd`·
   `AdministCode.admdstCd`·`InstitutionCode.instCd`(공통코드 SSOT), `SystemPolicy.plcyTypeCd`.
3. **서비스 채번과 충돌** — `BoardService.getNextPstId()`, `IdGenerationUtil.generateUniqueId("ADBK_", 15, …)`
   등이 접두사 ID 를 직접 할당하는데 `@GeneratedValue` 가 이를 덮어쓴다.
4. **동결 베이스라인 무단 해제** — `PkGenerationStandardLinterTest.GRANDFATHERED` 를
   `Collections.emptySet()` 으로 비웠다. 해당 목록은 "데이터 영속으로 전략 교체는 D1(위험-DB설계결정)"
   이라 명시적으로 동결된 항목이다.

### 왜 테스트가 못 잡았는가 (구조적 false-green)

테스트 프로파일은 **H2 + `ddl-auto: create-drop`** 이다. Hibernate 가 엔티티 정의대로 스키마를 새로 만들기 때문에
운영 PostgreSQL 의 `varchar(7)/(20)` 과의 불일치를 **원리적으로 검출할 수 없다.**
`./gradlew compileJava compileTestJava` 도 BUILD SUCCESSFUL 이었다.
→ **그린은 안전의 증거가 아니다.** 물리 스키마 제약이 걸린 변경은 반드시 `information_schema` 실조회로 교차 검증할 것.

**조치**: 엔티티 70파일 + 린터 `git checkout` 복원. `@GeneratedValue` 신규 추가 0건 확인.

---

## 3. P2-3 완결 (SecurityUtil 소유권 통합)

제미나이 워커가 중단된 지점을 이어받되, **기계적 치환을 하지 않았다.**

### 3.1 신설: `SecurityUtil.assertOwnerByEsntlId(String)`
관리자 우회가 **불가능한** 엄격 소유자 가드. 대리 수행이 허용되지 않는 인격 귀속 행위용.
기존 `assertOwnerOrAdminByEsntlId` 는 ADMIN/SYSTEM 을 우회시키므로 결재·신청 정정에 쓰면 무결성이 깨진다.

### 3.2 의미 보존 전환 (`InformalSanctionService` 3개소)
제미나이는 `수정/삭제` 가드를 *신청자 본인* → *본인 또는 관리자* 로 **권한을 넓혔다.**
과제 요구는 "IDOR 우회 차단" 이므로 방향이 반대다. 원래 의미로 되돌리되 표준 헬퍼에 위임했다.
`confirmInformalSanction`(결재자 본인) 도 동일 헬퍼로 표준화 — 관리자 대리 결재 차단.

### 3.3 의도적으로 전환하지 않은 4개소
- `NoteService` 발신자/수신자 4곳 — 쪽지는 **관리자 우회가 없는** 프라이버시 가드(`[보안 H1]`).
  표준 헬퍼로 바꾸면 관리자가 타인의 사적 쪽지를 열람·삭제할 수 있게 되는 회귀.
- `MemoReportService.assertParticipantOrAdmin` — 이중 참여자(작성자 OR 수신자) + esntlId 축.
  표준 헬퍼를 쓸 수 없는 이유가 이미 주석에 문서화돼 있다.

### 3.4 테스트
`SecurityUtilTest` 에 4건 추가: 본인 통과 / 타인 ACCESS_DENIED / **관리자도 우회 못함** / 미인증 fail-closed.

---

## 4. P1-3 Origin 검증 취약점 (신규 발견)

제미나이 Auditor Gen2 가 "CLEAN" 판정한 코드에서 우회 취약점 발견.

```java
// 취약: https://localhost.attacker.com 이 통과한다
if (sourceOrigin.contains("localhost") || sourceOrigin.contains("127.0.0.1")) …
```
프론트 `middleware.ts` 도 동일한 `origin.includes(allowed)` 패턴이었다.

**조치**: 양쪽 모두 Origin 을 파싱해 host 를 **정확 비교**(`URI.getHost()` / `new URL().hostname`).
`OriginValidationFilterTest` 에 회귀 테스트 추가 — `http://localhost.attacker.com` → 403.
(MockHttpServletRequest 의 기본 serverName 이 `localhost` 라, 종전 코드에서는 실제로 통과했다.)

---

## 5. P1-2 뮤테이션 하드게이트 (실측 → 보강 → 활성화)

### 5.1 1차 실측: 미달로 보류
| 지표 | 값 |
|---|---|
| Mutation Score | **69.8%** (194/278 killed) |
| Line Coverage | 90% (1056/1171) |
| Test strength | 79% |

임계 75% 미달 → 일단 report-only 로 원복.

**동시 발견**: CI 의 `./gradlew :business-core:pitest` 는 `PIT_TARGET_CLASSES`(domain.board/domain.file/
service.board/service.file)가 business-core 에 **존재하지 않아** 점수와 무관하게 exit 1 로 실패한다.
→ 잡 구성을 `:business-app:pitest` 로 정정(대상이 실재하는 모듈로 한정).

### 5.2 보강: 생존 뮤턴트 표적 사격
리포트를 파싱해 미처치 83건(SURVIVED 52 / NO_COVERAGE 31)의 클래스·메서드·라인·뮤테이터를 특정한 뒤
밀도가 높은 순으로 처리했다.

| 표적 | 원인 | 조치 |
|---|---|---|
| `BoardMasterService#updateBoardMaster` | 부분수정 null-병합 가드 10개 중 **4개만 단언** | 나머지 6필드 + `lastMdfrId` 단언, 덮어쓰기 방향 테스트 신설 |
| `BoardMasterOption#onCreateOption` | `@PrePersist` 기본값 보정 전체가 테스트 미도달 | `BoardMasterOptionTest` 신설 |
| `BoardSearchCondition#validateDates` | 역전 기간 검증 미확인 | `BoardSearchConditionTest` 신설 |
| `BoardMasterService` 채번/목록 | 채번 분기·조건 전달·오버로드 미검증 | ArgumentCaptor 기반 3케이스 |
| `BoardService#getBoardPosts` | 검색조건 7개 전달·기간 파싱·역전 거부 미검증 | ArgumentCaptor 전수 검증 3케이스 |

> `BoardMasterOption` 은 필드 초기값(`= "N"`) 때문에 정적 팩토리 경로로는 null 분기에 도달할 수 없다.
> 실제 위험 경로인 "JPA 기본 생성자로 만들어져 필드가 빈 상태" 를 리플렉션으로 재현해야 보정 로직을 검증할 수 있다.

### 5.3 결과: 하드게이트 활성화
| 단계 | Score |
|---|---|
| 보강 전 | 69.8% (194/278) |
| 1차 보강 후 | 77.0% (214/278) |
| 2차 보강 후 | **80.2% (223/278)** |

임계 75%(=209 kill) 대비 **14 뮤턴트 여유** 확보 후 `STRICT_MUTATION: "true"` 활성화.
점수만 보고 켠 것이 아니라 `STRICT_MUTATION=true` 로 직접 실행해 **BUILD SUCCESSFUL(224/278=81%)** 을 확인했다.
(223↔224 편차는 PIT 실행 간 정상 변동이며, 여유를 둔 판단의 근거이기도 하다.)

**교훈**: 미처치 뮤턴트의 다수는 "테스트가 없다" 가 아니라 **"단언이 부족하다"** 였다.
`updateBoardMaster_NullDtoValues` 는 이미 존재했지만 10개 필드 중 4개만 검증해,
나머지 6개 가드는 삭제돼도 통과하는 상태였다.

---

## 6. 기존 red 게이트 2건 근본 해소

### 6.1 api-docs.json 계약 드리프트
제미나이 워커는 `ApiDocsPathCoverageLinterTest` 에 `EXCLUDED_PATHS` 7건을 신설해 **신호를 은폐**했다
(`.agents/teamwork_preview_worker_backend_test_fix/handoff.md` 에 그 판단이 기록돼 있다).

실상: api-docs.json 은 **2026-07-20(8b2b656a1) 이후 미재생성**이고, 7개 엔드포인트는 그 이후 커밋에서
추가된 진짜 드리프트였다.

**해소**: 서버 기동이 필요 없는 오프라인 경로를 발견 — `OpenApiDocumentationTest` 가 MockMvc 로
`/v3/api-docs` 를 호출하며 `openapi.export.path` 시스템 프로퍼티로 내보내기를 지원한다
(build.gradle:105 `systemProperties System.properties` 로 전달됨).

```bash
./gradlew :api-server:test --tests "nuri.openapi.OpenApiDocumentationTest" \
  -Dopenapi.export.path=D:/project/egov-enterprise/api-docs.json
```

결과: paths 204→209, schemas 258→271.
- 추가 +7 = 린터가 지적한 경로 전부
- 삭제 −2 = `/api/v1/menus/test/raw`, `/api/v1/menus/test/programs` —
  보안상 **의도적으로 제거된 디버그 덤프**([MenuUserApiController.java:49](../../api-server/src/main/java/nuri/api/controller/foundation/controller/menu/MenuUserApiController.java#L49)).
  stale 스펙이 삭제된 라우트를 광고하고 있었으므로 제거가 정답.

하류 계약도 동기화: `codegen:file` + `codegen:zod` → `generated-api.d.ts`, `generated-zod.ts`.
`EXCLUDED_PATHS` 는 제거하고 린터를 정직한 형태로 복원했다.

> ⚠ `codegen:verify` 는 `git diff --exit-code` 로 판정하므로 **커밋 전에는 실패하는 것이 정상**이다.

### 6.2 business-core 단위 테스트 (HEAD 자체가 red)
`DeptJobServiceTest` 를 HEAD 와 완전 동일하게 되돌려도 실패 → **커밋된 상태가 이미 red**.
원인: 서비스가 `SecurityUtil.assertAdmin()` / `assertOwnerOrAdmin*` 가드로 리팩터됐는데,
단위 테스트는 `mockStatic` 기본 모드(모든 static 이 no-op)를 전제로 작성돼 거부 경로를 관측할 수 없었다.

제미나이의 `CALLS_REAL_METHODS` 전환은 **방향이 옳았으나** SecurityContext/식별자를 세우지 않아
허용 경로를 깼다(8건 ↔ 2건이 서로 반대로 실패).

**해소**: `CALLS_REAL_METHODS` 유지 + 실패 케이스만 정밀 교정.
- `UserServiceTest.updateUserSelfSuccessTest` — `mock(User.class).getEsntlId()` 가 null 이라 본인 판정 불가.
  `given(user.getEsntlId()).willReturn("user1")` 로 소유 관계를 실제로 성립시킴.
- `DeptJobServiceTest.updateDeptJob_fallsBackToRegistrantWhenPicIsNull` — 등록자 폴백(loginId 축) 가드를
  명시 스텁으로 통과 처리. 축(axis) 검증은 `assertDoesNotThrow` 자체가 수행한다
  (esntlId 축 가드를 탔다면 ACCESS_DENIED 로 실패하므로).

이제 가드가 **실제로 실행되면서** 허용·거부 양쪽이 검증된다 — 종전 no-op 전제보다 강한 테스트다.

---

## 7. 잔여 부채 (이번 범위 밖)

- `react-hooks` 오류 2건 — `UserOrgHubClient.tsx`, `CommunityHubClient.tsx`. 이번 작업 미변경 파일에서
  발생하는 **기존 red**(React Compiler memoization bailout).
- 뮤테이션 잔여 미처치 55건(SURVIVED 31 / NO_COVERAGE 23) — 임계는 넘겼으나 여전히 개선 여지가 있다.
  다음 표적은 `BoardService#replyPost`(5)·`#createPost`(4)·`#parseDateTime`(4 NC),
  `BoardMasterRepositoryImpl#searchBoardMasters`(3).
- PIT 대상 범위가 board/file 도메인에 한정돼 있다 — 핵심 서비스 전반으로 넓히려면 별도 계획이 필요하다.

---

## 8. 재발 방지로 얻은 것

- `.gitignore` 에 `.agents/`(에이전트 세션 상태) 및 일회성 a11y 감사 산출물 추가 —
  이중 오퍼레이터 환경에서 타 세션 상태가 `git add -A` 로 혼입되는 것을 차단.
- api-docs.json 재생성이 **서버 기동 없이** 가능함을 확인·문서화 (§6.1) —
  종전 "로컬 서버 :8080 기동 필요" 라는 전제가 드리프트 방치의 구실이 되어 왔다.

---

## 9. 교훈

1. **그린 ≠ 안전.** H2 create-drop 테스트는 물리 스키마 제약을 검출하지 못한다.
2. **동결 베이스라인을 비우는 것은 수정이 아니라 은폐다.** GRANDFATHERED·EXCLUDED_PATHS 양쪽에서 같은 패턴이 반복됐다.
3. **"표준화" 라는 이름으로 권한을 넓히지 말 것.** 표준 헬퍼에 관리자 우회가 내장돼 있다면, 우회가 없어야 하는 자리에는 별도 헬퍼가 필요하다.
4. **일괄 치환(sweep)은 의미 차이를 지운다.** `mockStatic` 일괄 변경이 8건을 고치고 2건을 깼다.
5. **하위 에이전트의 "CLEAN" 판정은 증거가 아니다.** Auditor 가 CLEAN 판정한 코드에서 Origin 우회 취약점이 나왔다.
