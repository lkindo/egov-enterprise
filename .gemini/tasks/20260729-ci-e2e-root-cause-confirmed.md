# CI E2E 인증 전량 실패 — 원인 확정 및 수정 (Edge realm × Node 20 Web Crypto)

- **일자**: 2026-07-29
- **등급**: L2 (프론트 보안 미들웨어 · CI 워크플로 · 진단 인프라)
- **오퍼레이터**: Claude Code
- **선행 기록**: [20260728-ci-e2e-token-expiry-root-cause.md](20260728-ci-e2e-token-expiry-root-cause.md) — 가설 11건 기각, **원인 미확정**으로 종료
- **확정 커밋**: `c52699a1a`(진단 채널) · `6dfcae938`(근본 원인)

---

## 1. 결론 — 한 줄

**Next.js Edge 런타임이 만든 ArrayBuffer 를 Node 20 의 Web Crypto 가 cross-realm 이라 거부해
`crypto.subtle.verify` 가 TypeError 를 던졌고, `catch { return null }` 이 그것을 삼켜
모든 요청이 미인증(307 /login)이 됐다.**

시크릿도, 쿠키도, 토큰도, 백엔드도 전부 정상이었다. 검증 코드가 예외로 죽었을 뿐이다.

## 2. 왜 로컬에서는 재현되지 않았는가 — 교차 조건

| 조합 | 결과 |
|---|---|
| 순수 Node 20 / 22 (Edge 아님) | `valid=true` — **Node 자체는 무관** |
| Node 22 + Edge (로컬 개발) | `v=ok` — **그래서 로컬은 늘 통과** |
| **Node 20 + Edge (= CI, `ci.yml:24`)** | **`v=throw-TypeError@verify`** |

**Node 메이저 × Edge realm 의 교차 조건**이라 어느 한 축만 맞추면 재현되지 않는다.
이것이 선행 조사가 가설 11건을 기각하고도 막힌 구조적 이유다 — 로컬은 Node 22 였고,
순수 Node 로 검증하면 20 에서도 통과하니 **양쪽 다 무죄로 보였다.**

## 3. 수정

```diff
- function utf8ToArrayBuffer(input: string): ArrayBuffer {
-   const u = new TextEncoder().encode(input);
-   return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
- }
+ function utf8ToBytes(input: string): Uint8Array<ArrayBuffer> {
+   return new TextEncoder().encode(input) as Uint8Array<ArrayBuffer>;
+ }
```

Web Crypto 는 `BufferSource`(ArrayBuffer **또는** ArrayBufferView)를 받으므로 TypedArray 를
그대로 넘기는 것이 표준이고, 불필요한 복사(`.slice`)도 사라진다. `base64UrlToBytes` 도 동일.

⚠ **`.buffer` 로 되돌리면 재발한다.** 근거를 코드 주석에 못박았다.
반환 타입을 `Uint8Array<ArrayBuffer>` 로 좁힌 것은 TS 5.7+ 에서 `Uint8Array` 가 제네릭이 되어
`TextEncoder().encode()` 가 `ArrayBufferLike` 로 추론되기 때문이다(빌드 실패). 런타임 의미는 불변.

## 4. 확정을 가능하게 한 것 — 진단 채널 수리가 선행이었다

원인 확정보다 **관측 수단 복구가 먼저**였다. `x-mw-auth` 헤더에 3가지 결함이 있었다:

| # | 결함 | 결과 |
|:--:|---|---|
| 1 | `ok` 인데 거부되는 경로 미구분 | role 부재 시 "검증 성공"이라 보고하며 307 |
| 2 | 모듈 스코프 전역(`lastVerifyOutcome`) | 동시 요청 시 다른 요청의 값이 헤더에 실림 |
| 3 | 성공 응답에 헤더 미부착 | 그린 기준선을 몰라 red 해석 불가 |

여기에 **예외 발생 단계 라벨**(`throw-TypeError@verify`)을 추가한 것이 결정적이었다.
`throw-TypeError` 만으로는 디코딩·키생성·검증 중 어디인지 알 수 없어 회차가 한 번 더 들었다.

## 5. 선행 기록의 결론 2건 정정

### 5.1 "Edge console 은 next start stdout 에 도달하지 않는다" → **틀렸다**

`81f6b88f6` 이 실증했다며 코드에 못박은 결론인데, 수정 후 CI 에서 이 로그가 정상 출력됐다:

```
[Middleware] JWT 검증 성공. 미들웨어가 쓰는 시크릿 출처=환경변수 JWT_SECRET, 지문=dfbc83f2
```

로그가 없던 진짜 이유는 채널이 아니라 **도달하지 못했기 때문**이다 —
`logSecretFingerprintOnce` 는 `verify` **직후** 호출인데 그 verify 가 죽었다.
"무조건 실행되는 위치"라는 전제 자체가 깨져 있었다.

> **교훈**: "신호가 없다"는 (a) 채널 불통 (b) 코드 미도달 (c) 조건 미충족 을 구분하지 못한다.
> 부재에서 원인을 추론하지 마라. 2026-07-28 에 그 부재를 근거로 "실패는 서명 비교 이전"이라
> 추론했고 실제로 틀렸다. (다만 `x-mw-auth` 는 주 관측 채널로 유지한다 — console 보다 확실하다.)

### 5.2 진단 스텝의 307 단정 메시지 정정

`ci.yml` 의 307 분기가 **"미들웨어가 쥔 JWT_SECRET 이 다르다"** 고 단정하고 있었다.
이번 실측에서 지문은 **대칭**이었고 원인은 예외였다. 이 단정이 조사를 여러 회차 엉뚱한 방향으로
끌었으므로, `x-mw-auth` 의 `v=` 값으로 판정하도록 문구를 교체했다.

## 6. 검증 증적

**로컬 재현 (CI 와 동일 조합을 Docker 로 격리 구성)**

```
docker run node:20 + 프로덕션 빌드 + Edge 미들웨어 (포트 3003)
```

| 케이스 | 수정 전 | 수정 후 |
|---|---|---|
| 정상 토큰 | 307 `throw-TypeError@verify` | **200 `v=ok`** |
| 시크릿 불일치 | 307 `throw-TypeError@verify` | 307 `v=sig-mismatch` |
| role 부재 | (구분 불가) | 307 `v=ok-no-role` |
| 만료 | (구분 불가) | 307 `v=expired` |
| 쿠키 없음 | 307 `v=no-cookie` | 307 `v=no-cookie` |

수정 전에는 **모든 토큰이 무조건 TypeError** 로 떨어져 정상·위조·만료가 구분조차 되지 않았다.

**CI 실측 (run 30417048669)**

```
판정: 대칭 — 시크릿 비대칭은 원인이 아니다
미들웨어 진단 헤더: x-mw-auth: cookie=1;v=ok
미들웨어가 백엔드 토큰을 수락함(200) — 정상
```

`npx tsc --noEmit` → EXIT=0.

## 7. 잔여 — 인증과 무관

**Visual Regression Baseline** 1건. 커밋된 기준선이 `-win32.png` 2개뿐이라 CI(리눅스)가 찾는
`dashboard-baseline-full-suite-linux.png` 가 없다.

⚠ **순서가 중요하다.** 인증이 깨진 상태에서 기준선을 생성하면 **로그인 폼이 정답으로 굳어**
인증이 고쳐진 뒤 오히려 red 가 된다(선행 기록 §9.3.1 이 경고했고 실제로 커밋하지 않았다).
인증이 green 임을 확인한 **지금이 생성 적기**다 — `update-visual-baseline.yml`(workflow_dispatch,
`commit=true`)로 리눅스 기준선을 만들어 커밋한다.

## 8. 이번 조사에서 내가 낸 사고 1건

`d333f7ed7`(deptjob FK)이 `UserService` 생성자에 파라미터를 추가하며 `required()` 가드를 넣었는데,
`@InjectMocks` 를 쓰는 테스트 3클래스에 해당 `@Mock` 이 없어 **null 주입 → 생성자에서 즉사**했다.
backend-build 가 실패해 **e2e 잡이 skipped 되어 조사 자체가 한 회차 막혔다**(`61d5ab1fe` 로 수정).

원인은 두 가지다:
1. 생성자 사용처를 `new UserService(` **문자열로만** grep 했다. Mockito 는 생성자를 소스에
   드러내지 않으므로 `@InjectMocks` 사용처가 전부 누락됐다. → 시그니처 변경 시에는 호출 문자열이
   아니라 **타입 사용처**(DI 컨테이너 포함)를 찾아야 한다.
2. `--tests` 로 대상 2클래스만 돌리고 "21 tests 0 failed" 를 증적으로 커밋했다. pre-push 는
   business 모듈 테스트를 제외하므로(localGate 로 분리) 이 변경은 **어떤 자동 게이트에도 걸리지
   않는 사각지대**였는데 SOP §4.1 의 `localGate` 를 돌리지 않았다. → 좁은 범위로 검증했다면
   그 사실을 증적에 밝혀야 한다. 무엇을 안 돌렸는지 숨긴 "통과"는 그 자체로 거짓 신호다.

---
*Last Updated: 2026-07-29 (원인 확정 · 수정 검증 · 선행 기록 결론 2건 정정)*
