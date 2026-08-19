# PITest 점진적 Mutation Testing 연동

본 문서는 **eGov Enterprise 백엔드 헌법 제16조(핵심 서비스 Mutation Score 75% 이상)**를 집행하는 PITest 연동 구조와 실행 방법을 설명합니다. mutation score는 테스트가 주입된 코드 변화를 얼마나 탐지했는지 보여 주는 지표이며, 시스템 정확성 전체의 수학적 증명은 아닙니다.

> **✅ 현재 집행 상태**: 뮤테이션 게이트는 **`STRICT_MUTATION=true` (75% Mutation Score 게이트)로 활성화**되어 있다.
> `ci.yml`이 각 스코프에 `STRICT_MUTATION=true`를 명시적으로 주입하고, `build.gradle`이 이를 75로 변환해 하드 게이트를 적용한다. `CI` 환경변수만으로는 활성화되지 않는다.

---

## 1. 개요 및 헌법 수호 맥락 (Context & Motivation)

* **배경**: 단순 코드 커버리지(Line Coverage)는 코드가 실행되었는지만 측정할 뿐, 검증(Assertion)의 견고함을 증명하지 못합니다.
* **해결책**: PITest는 소스 코드에 의도적으로 **돌연변이(Mutants)**를 주입하고(예: 조건 경계나 산술 연산 변경), 기존 테스트가 이를 잡아내어 실패하는지(**Kill**) 계측합니다. 이를 통해 단순 실행률과 다른 테스트 민감도 신호를 얻습니다.
* **목표**: 백엔드 핵심 비즈니스 로직의 테스트가 의미 있는 결함을 실제로 탐지하는지 계측하고, CI에서 합의된 하한을 강제합니다.

---

## 2. PITest Gradle 통합 아키텍처

루트 `build.gradle`에 Java 21 환경의 PITest 플러그인(`1.19.0`)을 적용하고 하위 멀티 모듈에 공통 설정을 배포한다. Gradle 버전은 문서에 고정하지 않고 wrapper를 기준으로 확인한다.

### 2.1 적용된 Gradle 빌드 명세
* **루트 플러그인 정의**:
  ```groovy
  plugins {
      id 'info.solidsoft.pitest' version '1.19.0' apply false
  }
  ```
* **하위 모듈(subprojects) 공통 설정**:
  ```groovy
  subprojects {
      apply plugin: 'info.solidsoft.pitest'

      pitest {
          junit5PluginVersion = '1.2.1'
          // 증분식(Incremental) 뮤테이션 분석: PIT_TARGET_CLASSES / PIT_TARGET_TESTS 환경변수로
          // 리팩토링 대상 클래스에 한정할 수 있다 (기본값 'nuri.*' = 전체).
          targetClasses = (System.getenv('PIT_TARGET_CLASSES') ?: 'nuri.*').split(',').collect { it.trim() }
          targetTests = (System.getenv('PIT_TARGET_TESTS') ?: 'nuri.*').split(',').collect { it.trim() }
          outputFormats = ['HTML', 'XML']
          threads = 4

          // 도메인 분석과 무관한 설정/예외/DTO 보일러플레이트 제외
          excludedClasses = [
              "nuri.foundation.core.config.*",
              "nuri.foundation.core.exception.*",
              "nuri.api.config.*",
              "nuri.business.support.*",
              "nuri.foundation.support.*",
              "**.*Dto",
              "**.*VO",
              "**.*DAO",
              "**.*Mapper",
              "**.*Request",
              "**.*Response",
              "**.*Entity",
              "**.*Q*.class",
              "**.*Q*Entity.class"
          ]

          // Incremental Mutation Analysis 활성화 (분석 속도 10배 향상)
          historyInputLocation = file("${project.buildDir}/pitest/pitHistory.txt")
          historyOutputLocation = file("${project.buildDir}/pitest/pitHistory.txt")

          // 백엔드 헌법 제16조 (Mutation Score 75% 이상) 임계값 75% 하드 게이트 적용
          // CI는 ci.yml에서 STRICT_MUTATION=true를 명시적으로 주입한다. 로컬 기본값은 리포트 전용이다.
          mutationThreshold = System.getenv('STRICT_MUTATION') == 'true' ? 75 : 0
      }
  }
  ```

---

## 3. 핵심 최적화 기법 (Performance & Speed Optimization)

PITest의 실행 시간 폭증 문제를 해결하기 위해 **두 가지 핵심 최적화**를 기본 탑재했습니다.

1. **점진적 분석 (Incremental Analysis)**:
   * `historyInputLocation` 및 `historyOutputLocation`을 동일 캐시 파일로 두어 이전 분석 결과를 재사용하고, 변경되지 않은 영역의 반복 분석 비용을 줄입니다. 실제 단축 폭은 변경 범위와 캐시 적중률에 따라 달라집니다.
2. **보일러플레이트 배제 (Class Filtering)**:
   * 비즈니스 검증 로직이 존재하지 않는 DTO, VO, Config, QueryDSL Q-Class 등을 `excludedClasses` 패턴으로 완전 격리 배제하여 분석의 노이즈와 리소스 낭비를 원천 차단했습니다.

---

## 4. 실전 가동 가이드 (CLI Operation Guide)

개발자 및 CI/CD 파이프라인에서 PITest를 구동하는 방법은 다음과 같습니다.

### 4.1 전체 프로젝트 돌연변이 검사 구동
```powershell
./gradlew pitest
```

### 4.2 특정 하위 모듈만 타겟 검사 구동
```powershell
./gradlew :foundation:pitest
```

### 4.3 특정 테스트 클래스만 고속 집중 분석 (파워쉘 규격)
```powershell
$env:PIT_TARGET_CLASSES="nuri.foundation.domain.code.CommonCode"
$env:PIT_TARGET_TESTS="nuri.foundation.domain.code.CommonCodeTest"
./gradlew :foundation:pitest
```
> `PIT_TARGET_CLASSES` / `PIT_TARGET_TESTS`는 콤마(,)로 복수 지정할 수 있으며, 변수를 해제하거나 새 셸을 열면 기본값 `nuri.*`(전체)로 복귀합니다.

### 4.4 STRICT_MUTATION 강제 통과 모드 기동 (Mutation Score 75% — 헌법 제16조 기준, CI 파이프라인)
```powershell
$env:STRICT_MUTATION="true"
./gradlew :business-core:pitest
```

---
*Governed by: Enterprise Technology Constitution (Backend Article 16 - Mutation Testing Safeguard)*
*Verified against `build.gradle` and `.github/workflows/ci.yml`: 2026-08-19*
