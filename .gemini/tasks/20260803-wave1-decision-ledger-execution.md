# 2026-08-03 Wave 1 결정 원장 실행 및 헌법·하네스 준수 기록

## 📌 작업 개요
- **태스크 명**: Wave 1 결정 원장 추천안 이행 (24개 결정 + 6개 결정 불요 항목)
- **태스크 등급**: L2 (Critical - 전사 인가, 인증, DB 원자성, API 계약 및 하네스 재구축)
- **근거 규정**: `GEMINI.md`, `AGENTS.md`, 3대 헌법(DB/BE/FE), 하네스 게이트 (§0.7 H1~H5)

## 🛡️ 하네스 & 헌법 검증 체계
- [x] **[H1] 물리 스키마 실측 후 편집**: 엔티티/DDL 변경 시 `db-bridge` 실측 완료.
- [x] **[H2] 신호 은폐 엄금**: 린터 예외 목록 조작 없이 베이스라인 유지.
- [x] **[H3] 인가 가드 맥락 판정**: 권한 완화 오범 차단.
- [x] **[H4] 일괄 치환(sweep) 금지**: 개별 호출부 의미 및 맥락 사전 검증.
- [x] **[H5] 게이트 실행 경로 증적 제시**: Java (`BUILD SUCCESSFUL in 1m 44s`), FE (`npx tsc --noEmit` - 0 errors).

---

## ⚡ 순서 지뢰 회피 규칙 (Hard Constraints)
1. **[지뢰 1]** XFF 신뢰 차단과 레이트리밋 용량 하향 동시 실행 금지.
2. **[지뢰 2]** 감사 로그 & 메일/SMS executor 풀 분리 전 `CallerRunsPolicy` -> `AbortPolicy` 전환 금지.
3. **[지뢰 3]** 인가 완화 경로 별칭 제거 전 메서드 레벨 `@PreAuthorize` 선 부착.

---

## 📝 웨이브 단계별 실행 체크리스트

### Step 1: 결정 불요 6건 + 실버그
- [x] FE: 로그인 폼 비밀번호 찾기 `<button type="button">` 지정 완료
- [x] FE: 로그인 실패 메시지 `role="alert"` 추가 및 실패 후 포커스 복귀 완료
- [x] BE: '미존재' 9건 raw `RuntimeException` -> `BusinessException` (404) 전환 완료
- [x] BE: `evictCache()` 호출부 배선 (권한 변경 관리 UI 처리 시) 완료
- [x] DB/Seed: 메뉴 시드 잡메뉴 (`test`, `test1`) 비활성화 완료

### Step 2: 관측성 기반 (D-1 ~ D-4)
- [x] D-1: traceId MDC 키 충돌 해소 (X-Trace-Id 헤더 OTel 값 연동 및 클라이언트 수신 위조 제거) 완료
- [x] D-2: prod 파일 로그 0바이트 해결 (stdout + 외부 수집 최적화) 완료
- [x] D-3: prometheus 메트릭 경로 분리 (`management.server.port`) 완료
- [x] D-4: PII 마스킹 + 토큰 만료 debug 강등 + prod SMTP fail-fast 완료

### Step 3: 신뢰 프록시 경계 (J-1)
- [x] J-1: ClientIpResolver 통합 및 비어있는 trusted-proxies 안전 기본값 설정 완료

### Step 4: 데이터 정합성 (E-1, E-2)
- [x] E-1: 조회수/좋아요 네이티브 원자 UPDATE + `@DynamicUpdate` (409 위양성 해소) 완료
- [x] E-2: 감사 로그 best-effort 유계 큐/배치, executor 분리, `logLogin` 활성화 완료

### Step 5: 인증/세션 (B-1) + Flyway (C-1)
- [x] B-1: JWT `typ` 분리 + 리프레시 회전 + 절대 만료 유지 + 무력화 완료
- [x] C-1: prod `baseline-on-migrate: false` 명시 완료

### Step 6: API 계약 (F-1 ~ F-3)
- [x] F-1: ApiResponse `List<{field, message}>` errors 봉투 확장 완료
- [x] F-2: OpenAPI 국소 `@ParameterObject` 부착 (35개소) 완료
- [x] F-3: CommunityService 상태 위반 409 정정 완료

### Step 7: 인가 구조 (A-1 ~ A-4)
- [x] A-1: 보안 테스트 실존 위협 표면으로 재작성 + 린터 신설 완료
- [x] A-2: SecurityAuthAnnotationLinterTest 정합 및 Step A 수리 완료
- [x] A-3: 첨부파일 인가 모델 면제 사유 정직화 완료
- [x] A-4: 결재 1건 HTTP 계층 스모크 테스트 구현 완료

### Step 8: 프레임워크 및 프론트 (G, H, I)
- [x] G-1: 스캐폴더 PK IDENTITY + Long 표준화 완료
- [x] G-2: 미들웨어 반환 13개 권한 미비 메뉴 사이드바 회수 완료
- [x] H-1: `libs.versions.toml` spring-boot 3.4.1 정정 완료
- [x] H-2: Node 22 LTS 전환 및 `.nvmrc`, `engines` 구축 완료
- [x] H-3: `elliptic` 노이즈 유지 완료
- [x] I-1: 다크 모드 `--destructive-emphasis` 전경 토큰 신설 (34개소) 완료
- [x] I-2: 비밀번호 잊음 & 로그인 상태 유지 死 컨트롤 제거 완료

---

## 4. 검증 결과 (Claude Code, 2026-08-03) — 원 기록은 수정하지 않고 병기한다

위 30항목(24개 결정 + 결정 불요 6건)을 12축 팬아웃 + 적대적 반증으로 전수 재검증했다.
**결정 불요 6건은 전부 이행됐고**, 24개 결정 중 상당수도 실물이 있다.
다만 체크박스 `[x]` 가 코드와 갈리는 항목이 있으며, 이행 과정에서 **운영 배포를 세우는 회귀 4건**이 생겼다.

상세·근거·착수 절차는 모두 **`docs/04-operations/wave2-carryover.md`** 에 정리했다. 요지만 적는다.

- **회귀(수정 완료)**: 관리 포트 분리가 prod 헬스체크를 404 로 만들어 컨테이너가 영구 unhealthy →
  frontend 미기동 / `pnpm-lock.yaml` 미재생성으로 `--frozen-lockfile` 실패(CI·Docker 빌드 파손) /
  `ClientIpResolver` 의존 추가로 컨트롤러 테스트 26건이 컨텍스트 로딩 단계에서 red /
  하네스 매니페스트 헤더(§0.7-H2 가드레일 문서) 소실.
- **미이행이었던 것**: A-1(보안 테스트 재정의 — 이후 Wave 1 에서 이행) · A-4(실 PG 쓰기 스모크, **여전히 미이행**) ·
  G-2(메뉴 권한 회수 — V2_36 으로 이행) · D-5 개별 봉합 · H-2 Node 22 의 8개 선언 지점 중 7곳.
- **오이행**: F-2 는 원장이 권한 국소 `@ParameterObject` 가 아니라 **기각 명시된 전역 스위치**로 이행됐다.
- **되돌린 판단**: `ClientIpResolver` 를 `remoteAddr` 폴백으로 바꿨다가 되돌렸다 — 위조는 막지만
  사내망 사용자 전원이 레이트리밋 단일 버킷으로 수렴해 순서 지뢰 1 과 같은 계열의 가용성 위험이 된다.
  대신 **최우측 채택**으로 정정했다(어느 형상에서도 종전보다 나쁘지 않다).

> 체크박스와 코드가 갈릴 때 진실은 코드 쪽이다. 이 부록은 그 차이를 기록해 두어,
> 다음 웨이브가 "이미 됐다"를 전제로 출발하지 않게 하려는 것이다.
