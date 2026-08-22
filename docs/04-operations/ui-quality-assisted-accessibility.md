# UI 품질 자동 보조 접근성 증거

이 도구는 reference baseline의 수동 접근성 평가를 대체하지 않고, 같은 격리 synthetic build에서 반복 가능한 브라우저 신호를 추가로 관측한다. 결과 종류는 항상 `automation-assisted-simulation`이며 `manualEvidenceSatisfied=false`, baseline 승격 자격도 항상 false다.

## 자동 관측과 수동 경계

| 수동 절차 | 자동 보조 관측 | 자동화로 닫을 수 없는 것 |
|---|---|---|
| keyboard-only | bounded Tab smoke, 양의 `tabindex`, focus가 viewport 안에 들어오는지 | 논리적 순서, focus 가시성의 사람 인지, trap·overlay 복귀, 전체 과업 완료 |
| NVDA+Chrome | 없음 | 실제 NVDA 발화·browse/focus mode·table 관계·live region 품질은 자동화로 대체하지 않는다. |
| 200% text | 1280px의 절반인 640px viewport simulation | 실제 browser zoom, 글자 확대·반올림·overlay와 전체 과업은 대체하지 않는다. |
| 400% zoom/reflow | 320px viewport simulation과 page overflow | 실제 browser zoom과 저시력 사용자의 탐색 비용은 대체하지 않는다. |
| forced colors | Playwright `forced-colors: active` emulation | 실제 Windows High Contrast의 system color·경계·focus 인지는 대체하지 않는다. |
| reduced motion | `prefers-reduced-motion: reduce` emulation과 반복 실행 animation census | 실제 OS 설정에서 상태 feedback이 충분한지와 전정·인지 영향은 대체하지 않는다. |

따라서 현재 8개 scenario의 전문가 수동 40건과 실제 NVDA/Chrome 8건은 이 명령이 green이어도 `not-run`/`blocked-external` 상태를 유지한다.

## 실행 계약

기존 r9 격리 stack처럼 이미 기동된 loopback synthetic frontend와 같은 stack에서 생성된 private Playwright storage state가 필요하다. 도구는 setup, teardown, mutation, cleanup 또는 baseline을 실행하지 않으며 인증 파일의 내용을 직접 읽거나 출력하지 않는다. 브라우저가 storage state를 소비할 뿐이고 결과는 경로·텍스트·locator 없는 aggregate JSON 한 줄만 stdout에 출력하며 파일을 생성하지 않는다.

```powershell
$env:UI_A11Y_ASSISTED_WEB_URL='http://127.0.0.1:<isolated-port>'
$env:UI_A11Y_ASSISTED_STACK_CLASSIFICATION='isolated-synthetic'
$env:UI_A11Y_ASSISTED_BUILD_ID='<64-hex-build-or-image-id>'
pnpm -C frontend run ui-quality:assisted-a11y
```

preflight는 loopback origin, exact stack classification, 64-hex build ID가 아니면 browser launch 전에 실패한다. 관측 모집단은 [UI quality scenario manifest](../../config/ui-quality-scenarios.json)의 exact 8개 scenario이며, 각 scenario마다 5개 자동 보조 관측을 수행해 40개 aggregate를 만든다. raw URL/path/query, DOM text/HTML, selector/locator, console/network payload, screenshot·trace·video·HAR는 수집하지 않는다.

이 로그는 해당 build의 자동 보조 신호일 뿐 durable reference baseline이 아니다. [ADR-0005](../02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md)는 `versioned-compact-summary` 정책을 승인했지만 이 stdout aggregate 자체는 승인된 summary 입력이나 수동 평가가 아니다. 출력물을 임의로 Git에 복제하거나 `measured` 승격 근거로 사용하지 않는다. durable evidence가 되려면 closed canonical summary, 사람 redaction review, digest-derived tracked 경로와 index, canonical SHA-256·committed Git blob identity의 clean-checkout readback을 모두 통과해야 한다.
