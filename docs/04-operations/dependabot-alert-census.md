# 의존성 취약점 판정 절차

파일명은 기존 링크 호환을 위해 `dependabot-alert-census.md`로 유지하지만, 이 문서는 특정 날짜의 알림
건수 원장이 아니다. GitHub 알림은 외부 가변 상태이므로 **현재 알림과 실제 해석 버전을 다시 수집해 판정하는
절차**가 정본이다. 과거 조치 건수·실행 시간·PR별 사건 기록은 Git 이력에서 찾는다.

## 1. 증거 우선순위

1. 현재 빌드가 실제로 해석한 Gradle dependency와 `frontend/pnpm-lock.yaml`
2. 현재 코드의 호출 경로·노출 프로파일·배포 classpath
3. GitHub Dependabot advisory의 취약 범위와 패치 버전
4. OWASP Dependency-Check XML의 탐지 근거
5. 문서나 과거 census 수치는 참고만 하며 현재 상태를 대신하지 않는다.

요청 버전과 해석 버전이 다르면 해석 버전으로 판정한다. `first_patched_version`만 비교하지 말고 advisory의
전체 `vulnerable_version_range`에 실제 해석값이 포함되는지 확인한다.

## 2. 현재 실행 경로

| 경로 | 역할 | 강제력 |
|---|---|---|
| [dependency-submission.yml](../../.github/workflows/dependency-submission.yml) | main의 Gradle dependency graph를 GitHub에 제출 | 제출 실패는 보이지만 merge required check는 아님 |
| GitHub Dependabot alerts | GitHub Advisory DB와 제출 graph·lockfile을 대조 | 외부 가변 상태. dismissal이 코드 안전성을 만들지는 않음 |
| [dependency-check.yml](../../.github/workflows/dependency-check.yml) | 주간·수동 NVD 기반 보조 스캔 | report 생성·모듈 범위는 검증하지만 CVE 결과 자체는 advisory |
| `frontend/package.json`의 제한 범위 override | 전이 의존성의 알려진 취약 버전을 최소 상향 | lockfile·codegen·test 검증이 동반돼야 함 |
| [suppressions.xml](../../config/dependency-check/suppressions.xml) | 검토가 끝난 Dependency-Check 예외 | 이유·범위·재검토 조건 없이 추가 금지 |

## 3. 현재 상태 수집

### GitHub 알림

```bash
gh api repos/lkindo/egov-enterprise/dependabot/alerts --paginate \
  -q '.[] | select(.state=="open") |
      [.number, .security_advisory.severity, .dependency.package.ecosystem,
       .dependency.package.name, .security_vulnerability.vulnerable_version_range,
       (.security_vulnerability.first_patched_version.identifier // "-")] | @tsv'
```

실행 시각과 기본 브랜치 SHA를 결과 기록에 남긴다. 알림 수를 이 문서의 상수로 갱신하지 않는다.

### Gradle 해석값

```bash
./gradlew :api-server:dependencies --configuration runtimeClasspath
./gradlew :migration-tool:dependencies --configuration runtimeClasspath
./gradlew :api-server:dependencyInsight --dependency <group-or-name> --configuration runtimeClasspath
```

필요하면 `foundation`, `business-core`, `business-app`도 같은 방식으로 조회한다. 출력의
`requested -> selected`에서 오른쪽이 해석값이다. runtime, compile, test, annotation processor의 노출 의미를
구분한다.

### pnpm 해석값

```bash
pnpm -C frontend why <package-name>
pnpm -C frontend list <package-name> --depth Infinity
```

같은 패키지의 여러 major가 공존할 수 있으므로 override는 영향을 줄 line만 좁혀 쓴다. 직접 의존성은
`dependencies`/`devDependencies` 범위를 갱신하고 `pnpm install --frozen-lockfile`이 아닌 정상 install로
lockfile을 재생성한 뒤 검증한다.

## 4. 알림별 판정

| 판정 | 필요한 증거 | 후속 |
|---|---|---|
| affected | 실제 해석 버전이 취약 범위 안이고 도달·노출 가능 | 최소 안전 버전 상향 또는 노출 경로 제거, 관련 테스트 |
| fixed | 변경 후 모든 해석 경로가 취약 범위 밖 | lockfile/Gradle tree와 회귀 테스트를 같은 변경에 포함 |
| not-affected | 해석 버전이 범위 밖이거나 대상 언어·기능·배포 경로가 명확히 비해당 | 근거와 재검토 조건을 남김 |
| blocked | 패치 부재, BOM·상위 패키지 제약, 외부 호환성 결정 필요 | known gap 또는 명시적 risk acceptance |
| unverified | graph·scanner·NVD·artifact가 불완전 | “취약점 없음”으로 표현하지 않고 재실행 조건 기록 |

코드 검색 0건만으로 `not-affected`를 확정하지 않는다. 리플렉션·ServiceLoader·프레임워크 자동설정·번들된
JavaScript 같은 비정적 소비 경로도 확인한다.

## 5. 수정 원칙과 검증

- BOM 관리 라이브러리는 가능하면 BOM 또는 상위 플랫폼을 올린다. 하위 라이브러리 force pin은 호환성·하향 고정
  위험을 별도 증명해야 한다.
- 유지보수되지 않는 라이브러리는 패치 없는 override보다 사용 경로 제거 또는 유지보수 fork 이관을 검토한다.
- 미사용 의존성 제거 후 드러난 전이 의존은 실제 소비 모듈에 직접 선언한다.
- suppression·dismissal로 red만 없애지 않는다. 예외는 CVE, 적용 범위, 비해당 이유, 재검토 조건을 함께 둔다.

변경 범위에 따라 다음을 조합한다.

```bash
./gradlew compileJava compileTestJava
./gradlew :api-server:harnessTest :api-server:test
pnpm -C frontend install --frozen-lockfile
pnpm -C frontend exec tsc --noEmit
pnpm -C frontend vitest run
pnpm -C frontend run codegen:verify
pnpm -C frontend run codegen:verify:zod
```

직접 API·직렬화·인가·브라우저 빌드에 영향을 주는 상향은 해당 런타임 검증을 추가한다. 컴파일만으로
바이너리 호환성과 실제 기능을 모두 증명했다고 보고하지 않는다.

## 6. OWASP report 판정

`dependency-check.yml`은 NVD 다운로드 실패를 허용할 수 있지만 **애플리케이션 모듈 report 부재는 실패**로
남긴다. 성공 여부는 workflow 결론만 보지 말고 업로드된 XML에서 다음을 확인한다.

- 예상 모듈별 report가 모두 있는가
- 분석한 dependency 수가 0이 아닌가
- CVE가 실제 artifact·언어·버전에 해당하는가
- suppression이 적용됐다면 이유와 범위가 현재도 유효한가

`NVD_API_KEY`나 네트워크가 없어 report가 생성되지 않았으면 상태는 `unverified`다. 로컬에서 완주하지 못한
결과를 CI 통과로 대체하지 않는다. 자세한 상태 표현은 [검증 사각지대 런북](verification-blindspots.md)을 따른다.

## 7. 알림 dismissal

dismissal은 실제 위험을 고치지 않는 외부 상태 변경이다. 다음 조건을 모두 만족할 때만 수행한다.

1. 해석 버전·취약 범위·도달성 근거를 사람 검토가 가능한 길이로 준비한다.
2. `inaccurate`, `not-used`, `tolerable-risk`를 의미에 맞게 선택한다.
3. API 호출 뒤 저장된 `state`, `dismissed_reason`, `dismissed_comment`를 다시 읽어 확인한다.
4. 대량 dismissal은 사용자 승인 범위와 정확히 일치해야 한다.
5. risk acceptance는 기한·소유자·재검토 trigger를 별도 결정 기록에 둔다.

## 8. 종료 조건

- 열린 알림 각각이 `affected`, `not-affected`, `blocked`, `unverified` 중 하나로 근거와 함께 분류됐다.
- 수정한 항목은 모든 실제 dependency 경로에서 취약 범위 밖이다.
- dependency submission과 scanner가 0대상·0report로 vacuous green이 아님을 확인했다.
- 남은 외부·제품 결정은 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md) 또는
  [pending-decisions.md](pending-decisions.md)에 연결했다.

## 9. 관련 프론트엔드 정책

Storybook 채택 여부와 UI 검증 계약의 정본은 [프론트엔드 헌법 제14조](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)다.
