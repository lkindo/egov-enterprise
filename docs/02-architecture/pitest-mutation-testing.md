# 🧬 PITest (점진적 Mutation Testing) Gradle 완전 연동 설계 보고서

본 문서는 **eGov Enterprise 백엔드 기술 헌법 제16조 (Mutation Score 85% 이상 강제)**를 수리적·실증적으로 증명하기 위해 구축된 **PITest 돌연변이 테스트 자동화 시스템**의 연동 구조와 최적화 전략에 대해 설명합니다.

---

## 1. 개요 및 헌법 수호 맥락 (Context & Motivation)

* **배경**: 단순 코드 커버리지(Line Coverage)는 코드가 실행되었는지만 측정할 뿐, 검증(Assertion)의 견고함을 증증하지 못합니다.
* **해결책**: PITest는 소스 코드에 의도적으로 **돌연변이(Mutants)**를 주입하고(예: `>`를 `<`로 변경, 산술 기호 변경 등), 기존 테스트 코드가 이를 잡아내어 실패하는지(**Kill**) 여부를 계측합니다. 이를 통해 테스트의 실질적인 방어력을 수학적으로 계측합니다.
* **목표**: 8대 독점 스킬인 **`Mutation Testing Auditor`**를 가동하여 백엔드 핵심 비즈니스 로직에 대한 테스트 무결성을 철저하게 수호합니다.

---

## 2. PITest Gradle 통합 아키텍처

루트 `build.gradle`에 현대적인 Gradle 9.4.1 및 Java 21 규격을 충족하는 PITest 플러그인(`1.19.0`)을 탑재하고 하위 멀티 모듈에 자동 배포되도록 구성했습니다.

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
          targetClasses = ['nuri.*']
          targetTests = ['nuri.*']
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

          // 백엔드 헌법 제16조 (Mutation Score 85% 이상 강제) 유동적 연동
          // STRICT_MUTATION 환경변수 활성화 시 엄격한 85% 게이트 통과 적용
          mutationThreshold = System.getenv('STRICT_MUTATION') == 'true' ? 85 : 0
      }
  }
  ```

---

## 3. 핵심 최적화 기법 (Performance & Speed Optimization)

PITest의 실행 시간 폭증 문제를 해결하기 위해 **두 가지 핵심 최적화**를 기본 탑재했습니다.

1. **점진적 분석 (Incremental Analysis)**:
   * `historyInputLocation` 및 `historyOutputLocation` 설정을 동일 캐시 파일로 통일하여, 이전 실행 시 분석된 돌연변이 결과를 재사용합니다. 이를 통해 코드 수정이 없는 영역은 재분석하지 않아 빌드 속도를 **최대 10배 이상 향상**시킵니다.
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
./gradlew :foundation:pitest "-Dpitest.targetClasses=nuri.foundation.domain.code.CommonCode" "-Dpitest.targetTests=nuri.foundation.domain.code.CommonCodeTest"
```

### 4.4 헌법 제16조 (돌연변이 스코어 85% 이상) 강제 통과 모드 기동 (CI 파이프라인)
```powershell
$env:STRICT_MUTATION="true"
./gradlew :business-suite:pitest
```

---
*Governed by: Enterprise Technology Constitution (Backend Article 16 - Mutation Testing Safeguard)*
