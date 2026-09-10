# Governance & Harness Atlas 사용·현행화 가이드

[Atlas](../../frontend/public/governance_harness_atlas.html)는 프로젝트 구성·업무 흐름·규칙·검증·운영·원본 문서를 연결하는 설명용 지도다. 규범은 [AGENTS](../../AGENTS.md), [SOP](orchestration-protocol.md), 관련 헌법·Accepted ADR을 따른다. 소스 인벤토리와 운영 실측은 서로 다른 증거다.

## 읽는 순서

| 독자 | 추천 경로 |
|---|---|
| 새 개발자 | 시작 → 전체 지도 → 도메인 → 실제 흐름 → 변경 작업 → 검증 |
| 에이전트 운영자 | 규칙·메모리 → 변경 작업 → 검증 → 결정·위험 |
| QA·리뷰어 | 실제 흐름 → 헌법 조항 → 게이트·runner·CI → 미확인 범위 |
| 운영자 | 전체 지도 → 릴리스·배포·운영·복구 → 데이터 이관 → 위험 |
| 재사용 도입자 | profile·pack → 도메인 → 변경 작업 → 운영 인계 |

화면은 10개 주제로 구성한다. 각 주제에서 개요, 번호가 있는 도식, 성공·실패 분기, 상세 설명, 원본으로 이동한다. 카탈로그는 항목을 펼쳐 ID·상태·근거를 읽으며, 상단 검색은 도메인·규칙·명령·파일 경로를 함께 찾는다. 연결된 Service 같은 파일명도 검색할 수 있다. 결과에 표시한 상태와 원본을 확인하고 해당 상세 항목으로 이동한다. 목록 내 검색은 해당 카탈로그만 좁힌다.

변경 작업의 학습 선택표는 검사 실패 횟수, 운영 근거 미확인, 승인 밖의 새 대상 등 상황별로 필요한 증거와 다음 행동을 설명한다. 같은 원인 3회 실패는 재시도 종료·보고 분기다. 선택 자체가 실제 검사·승인·작업 결과를 만들지는 않는다.

예전 `#onboarding`·`#constitution`·`#migration`·`#harnesses` 등의 주소도 대응하는 주제에 연결된다. 방향키/Home/End로 탐색 메뉴의 초점을 옮기고 Enter로 이동할 수 있다. 인쇄는 현재 주제 또는 전체를 선택하며 상세 항목은 인쇄 중 펼쳐졌다가 복구된다.

## 내용과 생성물의 소유권

| 파일 | 역할 |
|---|---|
| [atlas.template.html](../../frontend/atlas/atlas.template.html) | 사람이 작성하는 설명·도식·의미 경계·문서 링크 |
| [atlas.css](../../frontend/atlas/atlas.css) | 반응형·색상·키보드 초점·인쇄·모션 감소 |
| [atlas-runtime.js](../../frontend/atlas/atlas-runtime.js) | 원본 목록 표시, 검색, 주소 이동, 검증 선택, 테마·인쇄 |
| [atlas-catalog.mjs](../../scripts/atlas-catalog.mjs) | 기존 manifest·문서·코드에서 분류 목록과 사실을 수집 |
| [build-atlas.mjs](../../scripts/build-atlas.mjs) | 데이터·스타일·스크립트를 하나의 정적 HTML로 결합 |
| [governance_harness_atlas.html](../../frontend/public/governance_harness_atlas.html) | 배포·직접 열기용 생성물. 직접 수정하지 않음 |

`npm run atlas:build`로 생성한다. 외부 차트 라이브러리나 실행 중인 API 없이 HTML 자체를 읽을 수 있다. JavaScript를 사용할 수 없는 환경에서도 설명·도식·원본 안내를 읽을 수 있으며 생성 카탈로그의 검색·상세 표시에는 JavaScript가 필요하다. 외부 저장소 원본 링크를 열려면 네트워크가 필요하다.

`sourceDigest`는 정규화한 소스 입력의 묶음을 식별한다. 각 원본의 SHA-256도 표시한다. 생성 시각이나 HEAD 변경만으로 운영 확인일을 갱신하지 않으며 생성물 자신을 해시 입력으로 삼지 않는다. 원본 링크는 현재 기본 브랜치 문서를 가리키므로 로컬 미커밋 변경과 원격의 차이를 고려한다.

## 카탈로그의 증거 경계

- domain 폴더 수는 업무 도메인 수가 아니다. profile과 pack도 별도 분류다.
- route가 있거나 API가 문서화됐다는 사실만으로 기능·메뉴·권한·운영 지원을 확인한 것은 아니다. `UNVERIFIED`는 그대로 남는다.
- 헌법 조항의 존재와 게이트의 집행 범위는 다르다. 조항·정책·테스트·runner·CI 결과를 연결해 판단한다.
- workflow의 트리거·권한·쓰기 명령은 소스 선언이다. 실제 배포나 원격 실행 결과로 표시하지 않는다.
- Accepted DEC의 부분 대체 여부는 원본을 확인한다. 단순 참조 ID를 새 정책 승인으로 해석하지 않는다.
- DB·원격 ruleset·복원·부하 시험의 현재 상태는 해당 대상·확인 시각·실행 근거가 필요하다.

## 수정과 검증

```text
1. 원본 또는 frontend/atlas의 설명·스타일·동작 수정
2. npm run atlas:build
3. npm run atlas:check
4. npm run verify:docs
5. UI 동작 변경 시 실제 브라우저·키보드·모바일·인쇄 확인
```

JS·계약·분류기 변경에는 영향 테스트와 프론트 타입·관련 lint 검증을 함께 수행한다. 새로운 파일·도메인·규칙이 생성기에 발견되지 않으면 입력 목록과 분류 방법을 확인한다. 설명을 숨기거나 집계를 비워 검사를 통과시키지 않는다.

다음 검사는 기존 운영 계약 카탈로그와 Atlas의 로컬·CI 실행 경로에서 소비된다.

| 검사 | 확인하는 내용 |
|---|---|
| [카탈로그 계약](../../scripts/atlas-catalog.test.mjs) | 원본 항목 대응·누락·중복·미확인 유지·결정성 |
| [생성물 계약](../../scripts/atlas-generation.test.mjs) | 입력과 HTML 일치, 데이터 script 경계, 변경 시 재생성, 실행 연결 |
| [Atlas 계약](../../frontend/src/__tests__/cross-stack/governance-atlas-contract.test.ts) | 실제 JS 표시·수치 전수 대조·검색·이전 주소·상태·회귀 |
| [문서 링크 계약](../../scripts/docs-link-integrity.test.mjs) | 소유 문서·헌법 artifact·metadata의 파일·제목·HTML 앵커 |
| [범위 분류 계약](../../scripts/ci-change-scope.test.mjs) | Atlas 원본·생성기 변경의 검사 선택과 기존 소스 검증 유지 |

생성기 검사는 `scripts/*.test.mjs` 운영 카탈로그에 포함된다. required CI가 카탈로그를 실행하므로 로컬 훅을 우회해도 미갱신 생성물이 자동으로 정상이 되지는 않는다. 원본 템플릿·runtime 변경은 문서 전용 fast-pass로 분류하지 않는다.

## 평가 범위

회귀 검사는 원본 대응과 브라우저 동작을 확인한다. 새로운 사람의 이해도·화면낭독기 전체 과업·운영 환경의 복구 성공을 대신하지 않는다. 실제 독자 평가는 [보강안의 과업 기준](governance-atlas-improvement-plan.md#103-독자-과업-평가)에 따라 별도 기록한다.
