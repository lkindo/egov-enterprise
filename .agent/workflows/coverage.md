---
description: 멀티모듈 JaCoCo 통합 리포트와 커버리지 게이트 실행
---

# 통합 테스트 커버리지 워크플로우

현재 Gradle 모듈의 테스트 실행 데이터를 모아 JaCoCo HTML/XML 리포트를 만들고, 저장소의 LINE/BRANCH 래칫을 검증한다. 이 워크플로우는 Java 프로세스 강제 종료, `build/` 재귀 삭제, `settings.gradle` 재작성 같은 환경 파괴 작업을 수행하지 않는다.

## 리포트 생성

```powershell
.\gradlew.bat jacocoRootReport
```

`jacocoRootReport`는 `schemaValidationTest`를 제외한 프로젝트 테스트 태스크를 실행하고 각 모듈의 JaCoCo 실행 데이터를 집계한다. Docker 기반 스키마 검증은 커버리지 집계와 별도다.

생성물:

- HTML: `build/reports/jacoco/aggregated/index.html`
- XML: `build/reports/jacoco/jacocoRootReport/jacocoRootReport.xml`

## 커버리지 래칫 검증

```powershell
.\gradlew.bat jacocoRootCoverageVerification
```

임계값의 정본은 루트 `build.gradle`의 `jacocoRootCoverageVerification`이다. 문서에 수치를 별도 고정하지 않고 실행 시 현재 설정을 따른다. 태스크가 `SKIPPED`되거나 입력 클래스·execution data가 0이면 성공 증거로 취급하지 않는다.

## 병합 전 전체 로컬 게이트

```powershell
.\gradlew.bat localGate
```

`localGate`는 커버리지 외에도 하네스, 실제 PostgreSQL 스키마 검증, 전 모듈 테스트와 프론트 단위 검증을 포함한다. Docker가 필요하며 pre-push 또는 required CI의 완전한 상위집합이라고 가정하지 않는다. 범위별 최소 검증은 `AGENTS.md`와 `.githooks/README.md`를 따른다.

## 실패 시 확인 순서

1. 실패한 테스트나 입력 누락을 먼저 확인한다.
2. `build.gradle`의 집계 대상과 생성된 `.exec` 파일이 같은 실행에서 나온 것인지 확인한다.
3. 필요할 때만 Gradle의 `clean` 태스크를 명시적으로 실행한다. 다른 Java 프로세스 종료나 임의 디렉터리 삭제로 문제를 숨기지 않는다.
