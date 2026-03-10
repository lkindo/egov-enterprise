# 표준 테스트 셋업 가이드 (Standard Test Setup Guide)

이 문서는 로컬의 **Windows 환경**과 CI 파이프라인(주로 **Linux 컨테이너**) 간에 의존성 꼬임 없이 원활하고 일관된 테스팅과 빌드를 돕기 위한 **표준 도구 및 제약조건 가이드**입니다. 

---

## 1. 개요 (Background)
로컬 Windows 11 환경에서와 CI 환경 간에는 다음 항목들로 인해 테스트 스크립트 실행 시 미묘한 오류가 자주 발생합니다:
- **인코딩 문제** (UTF-8 vs MS949/EUC-KR 로 인한 커버리지 파일 및 결과문자열 깨짐)
- **개행문자 차이** (`CRLF` vs `LF`)
- **타임존 종속성** (로컬 시점과 CI 서버 시간 차이로 인한 시간 테스팅 오류)
- **명령어 경로 및 구조 차이** (`./gradlew` vs `.\gradlew.bat`)

이를 근본적으로 방지하기 위해 **OS 진단 매크로가 포함된 표준 `Makefile`**를 도입했습니다.

---

## 2. 표준 명령어 (Makefile 기반)
프로젝트루트에 있는 `Makefile`을 통해 모든 명령어는 **OS 호환성과 인코딩 옵션(-Dfile.encoding, -Duser.timezone)**이 자동 주입됩니다. **향후 빌드/테스트/커버리지 명령은 직접 Gradle을 호출하기보다 가급적 `make` 타겟을 거쳐 실행하는 것을 권장합니다.**

Windows 사용자의 경우 **Git Bash(MinGW)** 혹은 **WSL**을 통해 `make` 사용이 가능하며, 없는 경우 하단의 npm 환경설정 부분을 참고하세요.

### 주요 명령어
- **빌드전용:** 
  ```bash
  make build
  ```
  *(테스트 스크립트를 무시하고 빠르게 바이너리를 컴파일합니다)*

- **일반 테스트:** 
  ```bash
  make test
  ```
  *(에러 발생 시 즉시 중단합니다. 로컬 개발, 코드 수정 후 단위검증에 적합합니다)*

- **CI 테스트 모드:** 
  ```bash
  make test-ci
  ```
  *(하나가 실패해도 모든 테스트를 마저 수행하여 결과를 모읍니다)*

- **커버리지 리포트 생성:** 
  ```bash
  make coverage
  ```
  *(테스트를 수행하고 Jacoco 통합 커버리지를 함께 생성합니다)*
  *출력위치:* `./coverage-report/*`

---

## 3. (옵션) npm 기반의 대안 스크립트 
Windows 파워쉘(PowerShell) 등지에서 `make` 설치가 불필요한 프론트엔드 작업 병행자를 위해, **package.json** 에 Cross-env 를 이용한 스크립트 등록도 활용할 수 있습니다. 

루트 `package.json`의 `scripts` 에 다음과 같이 구문 추가가 추천됩니다.
*(Windows 사용 시 `cross-env` 패키지 설치 필요)*
```json
"scripts": {
  "test:coverage": "cross-env TZ=Asia/Seoul gradlew test jacocoRootReport -Dfile.encoding=UTF-8 --continue"
}
```

---

## 4. 환경 변수 및 JVM 인자 튜닝 (CI 환경)
만약 **GitHub Actions, Jenkins** 등의 CI 플랫폼에서 직접 설정 파일을 구성해야 할 경우, 다음 인자를 **반드시** 주입해 주세요:

```bash
# 기본 CI Test Step에 포함할 인자 (Encoding & Timezone 고정)
-Dfile.encoding=UTF-8 -Duser.timezone=Asia/Seoul
```

## 5. IDE(VSCode / IntelliJ) 개행 문자 및 인코딩 (Pre-Commit)
Git Clone 및 커밋 과정에서의 CRLF/LF 변환 문제로 인한 테스트 파싱 오류를 막기 위해:
1. `.editorconfig` 상에서 항상 `end_of_line = lf` , `charset = utf-8` 상태를 유지해주세요.
2. Windows 개발자는 Git Global 설정에 다음을 적용하세요:
   ```bash
   git config --global core.autocrlf true
   ```
   이 설정은 Clone 시 로컬에서는 CRLF를 사용하더라도 Push 할 때 안전하게 LF로 자동 전환해 줍니다.
