# 20260720 — 미완결 작업 전수 감사 + 안전 배치 1차

**등급**: L2 (다중 모듈 · 읽기전용 감사 + 저위험 구현)
**오퍼레이터**: Claude Code
**요청**: "이전 세션에서 마무리짓지 못한 부분 있어?" → "에이전트가 지금 코드로 끝낼 수 있는 것 먼저 작업"

---

## 1. 감사 (읽기 전용)

7개 각도로 병렬 스윕 후, 후보 하나하나에 **반증(refute) 우선** 검증 에이전트를 붙였다.
반증에 실패한 것만 미결로 인정했다.

| 항목 | 값 |
|---|---|
| 후보 수집 | 94건 |
| 검증 후 미결 | **80건** |
| 기각(이미 해소됨) | 14건 |
| 소요 | 에이전트 101개 / 608만 토큰 / 약 50분 |

스윕 각도: `.gemini/tasks` 잔여 · docs 로드맵 미체크 · 코드 마커(TODO/FIXME) ·
비활성 테스트(@Disabled/test.fixme/skip) · git 잔여물(stash·브랜치 발산·커밋 본문) ·
UI 수리 스트릭이 남긴 형제 화면 부채 · 기존 미결 기록의 실증 대조.

### 분포

| | 에이전트 처리 가능 | 결정·인프라 대기 |
|---|---:|---:|
| high | 0 | **3** |
| medium | 21 | 15 |
| low | 19 | 22 |

### 🚨 최우선 — RSA 개인키가 지금도 추적 중

기존 기록의 "언트랙 완료"는 **사실과 다르다.** 메인 에이전트가 직접 실측:

```
git ls-files             → ssh-key-2026-01-18.key
git cat-file -p HEAD^{tree} → 100644 blob 9a6c923d ssh-key-2026-01-18.key
head -1                  → -----BEGIN RSA PRIVATE KEY-----   (27줄)
git branch -r --contains 11366ca48
                         → origin/main, origin/template/reusable-base
```

원격 두 브랜치에서 도달 가능. **키 로테이션 + history 퍼지(force-push)는 사용자 실행 영역**이라
에이전트 단독 조치 불가. `git rm --cached` + `.gitignore` 등재는 지시 시 즉시 가능하나,
그것만으로 히스토리의 키는 사라지지 않는다 — 로테이션이 실질적 해결.

### 결정 대기가 몰린 3개 원인

1. **CI 빌링 차단** — 통합 verify 게이트·VT 부하테스트가 한 번도 못 돎
2. **서버 미기동** — E2E 런타임 검증 다수가 "정직한 보류"(SOP §4.1)
3. **제품 결정** — fe-auth Phase4(admin 경로 범위) · CSP nonce vs PPR 트레이드오프 ·
   계정잠금 정책 · 담당자 UI(조직 인명부 노출)

### 새로 드러난 것

- `InsightBanner.tsx:31` — 관리자 대시보드가 하드코딩 가짜 보안 경보를 실제 탐지처럼 표시
- 死버튼 군집 — 권한별 메뉴 관리 새로고침/권한 인벤토리, 커뮤니티 허브 좌측 필터 3개, 푸터 약관 `href="#"`
- 설문 허브 4개 탭이 `PlaceholderCard` 스텁인데 메뉴는 실기능처럼 노출, '항목관리'는 없는 `tab=items` → 빈 화면
- 최신 UI 수리 13커밋에 E2E 회귀 방어도 태스크 기록도 없음 ← **본 문서가 그 기록 부채를 해소**

---

## 2. 안전 배치 1차 (구현)

"에이전트 처리 가능" 40건 중, 메인 에이전트가 **재분류하여 15건만** 착수했다.
자동 판정이 actionable 로 표시한 것 중 6건은 실제로는 처리 불가로 판단해 제외:

| 제외 항목 | 사유 |
|---|---|
| `template/reusable-base` 33커밋 미반영 | 타 브랜치 갱신·푸시 = 외부 영향 |
| docker-compose JWT_SECRET 부재 | 시크릿 취급 + 운영 구성 변경 |
| 담당자 선택 UI | HEAD 커밋이 "조직 인명부 노출 보안 결정 선행"으로 의도적 보류 선언 |
| `tb_auth_rfsh_tk` FK | DB 스키마 변경(L2) |
| `tb_event_info` 가비지 83행 | 공유 라이브 DB DML |
| EtlExecutor·MigrationVerifier SKELETON | 대형 미구현, 제품 판단 |
| route-group 격리 | 과거 라우트 오삭제로 런타임 404 사고 전례 |

5개 비중첩 파일 클러스터로 병렬 구현. 에이전트에는 빌드·git 쓰기·DML 금지를 걸었고,
게이트는 메인 에이전트가 일괄 재실행했다(SOP §2.3).

### 변경 (16파일, +568/−103)

- **테스트 무결성** ← 가장 값이 큼
  - `standard-modal.test.tsx` — `expect(true).toBe(true)` false-green → 실계약 검증(+205줄)
  - `vitest.setup.ts` — 글로벌 Dialog 모킹이 `open` 을 존중하도록 수정
  - `LayoutComponents.test.tsx` — 고아 `it.skip`(컴포넌트는 살아 있었음) 복원
- **문서 정정** — db-standardization-assessment(stale 잔여 4건) · db-naming-exceptions(팬텀 화이트리스트) ·
  framework-reusability · a-group(deptjob 소생 결판)
- **가이드 오지시** — 실존하지 않는 `BaseCrud*` 상속 지시 → 실측 발췌 예제로 교체 (getting-started, README)
- **E2E 설정** — tier-3 Playwright project 누락 보완 · XSS 하드코딩 게시글 ID `1108` 제거
- **백엔드 정리** — 死도메인 secure-path 제거(main + test 설정) · SchemaDumper 동기화 주석 · 주석 시체 테스트

### 검증 (전부 메인 에이전트 직접 실행)

```
./gradlew compileJava compileTestJava   → exit 0
npx tsc --noEmit                        → exit 0
npx vitest run                          → 51 files / 196 tests passed (종전 183 passed + 1 skipped)
```

**Dialog 모킹 수정이 실제로 작동함을 증명**: `standard-modal.test.tsx:57-59` 가
닫힘 상태에서 `queryByRole('dialog')).not.toBeInTheDocument()` 를 단언하며 통과한다.
종전 모킹(open 무시, 항상 렌더)이었다면 반드시 실패했을 단언이다.

### 하네스 보안 경고 — 오탐 판정

`application.yml` 에서 `/api/v1/leader-schedules` 제거를 "접근제어 약화"로 경고했으나,
메인 에이전트 실측 결과 **보호 대상 자체가 존재하지 않는다**:

- `find -name "*Leader*"` → 0건 (컨트롤러·서비스·엔티티 부재)
- `V2_23__drop_leader_domain.sql` 이 테이블 2개 + 인가 행(`ADMIN_LSM_ALL`/`ADMIN_LSM_ALIAS`) + 메뉴 삭제 완료
- 프론트 참조 0건

경고 자체는 타당한 문제 제기였고(삭제 근거가 대화에 없었음), 확인은 메인 에이전트 책임이었다.

### 에이전트가 정직하게 보류한 것 (19건 중 주요)

- **SchemaDumper 중복 삭제** — testFixtures 구성이 없어 삭제 시 컴파일 파손. 동기화 주석만 남김
- **RBAC 하드코딩 '해소' 표기** — 개수만 83→12로 줄었을 뿐 데이터주도 RBAC 미실현이라 병목 유지
- **브랜딩 토큰 '해소' 표기** — 917→182건으로 줄었으나 0이 아니고 재유입 방지 ESLint 규칙 부재
- **헌법 제7조3항 정합** — CLAUDE.md §5 불가침, 사용자 승인 필요

---

## 3. 잔여 · 다음

- **미커밋**: 본 배치 16파일은 워킹트리에 있음. 커밋은 사용자 지시 대기.
  공유 트리이므로 `git commit --only -- <경로>` 로 이 배치분만 담을 것.
- **2차 배치 후보**: 死버튼 3종 · InsightBanner 가짜 경보 · 설문 '항목관리' 빈 화면 ·
  WorkHubClient 낡은 주석 · pending-decisions 3-E stale · UI 스트릭 E2E 회귀 방어
- **사용자 조치 필요**: SSH 키 로테이션 + history 퍼지 · CI 빌링 복구 ·
  fe-auth Phase4 / CSP Phase4 제품 결정 · 담당자 UI 인명부 노출 결정
- **후속 권고**(에이전트 지적): db-naming-exceptions 의 린터 화이트리스트 대조를 수기가 아닌
  테스트로 기계화해야 팬텀 가드 재발을 막는다.
- **⚠ 마이그레이션 번호**: a-group 문서 §1.2 의 V2_20~V2_24 예약표는 무효(전량 소진).
  신규 마이그레이션은 `flyway_schema_history` 실측 후 V2_30 이상 배정.

---
*작성: Claude Code / 2026-07-20*
