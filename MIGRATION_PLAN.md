# eGovFrame 5.0 레거시 이관 계획서

> **작성일**: 2025-12-21  
> **목적**: 다른 환경에서 작업을 이어갈 수 있도록 현재 상태와 향후 작업 내용을 정리

---

## 1. 현재 프로젝트 상태

### 1.1 기본 환경 ✅ 완료
| 항목 | 버전 | 상태 |
|------|------|------|
| Java | 21 LTS (Adoptium) | ✅ 설정 완료 |
| Gradle | 8.12 | ✅ 설정 완료 |
| Spring Boot | 3.3.7 | ✅ 설정 완료 |
| eGovFrame RTE | 5.0.0 | ✅ 설정 완료 |
| Database | PostgreSQL (Docker) | ✅ 연동 완료 |

### 1.2 멀티 모듈 구조
```
egov-enterprise/
├── common-core/        # eGovFrame 공통 설정, 유틸리티
├── common-domain/      # JPA 엔터티, Repository
├── common-security/    # Spring Security + JWT
├── common-service/     # 비즈니스 로직
├── api-server/         # REST API 서버 (Spring Boot 메인)
└── _legacy_backup/     # eGovFrame 5.0 경량환경 원본 (이관 대상)
```

### 1.3 검증된 기능
- [x] Gradle 빌드 성공
- [x] api-server 실행 (JDK 21)
- [x] 회원가입 API (`POST /api/v1/users/signup`)
- [x] 로그인 API (`POST /api/v1/auth/login`) - JWT 토큰 발급
- [x] Swagger UI (`http://localhost:8080/swagger-ui/index.html`)

---

## 2. 레거시 이관 현황

### 2.1 선택된 전략: 점진적 이행 (옵션 A)
전체 복사 대신 **필요한 기능 모듈만 선별하여 하나씩 추가**하는 방식.

### 2.2 이관 대상 (우선순위)
1. **게시판(BBS)** - 1순위
2. **파일 관리** - 2순위
3. **공통코드 관리** - 3순위
4. **사용자/권한 관리** - 4순위

### 2.3 완료된 인프라 설정
- [x] `api-server/build.gradle`: JSP/MyBATIS/ICU4J/Guava/Commons IO 의존성 추가
- [x] `common-core/build.gradle`: eGovFrame MVC/Security/Excel 패키지 추가
- [x] `application-dev.yml`: JSP View Resolver 및 MyBATIS 매퍼 경로 설정
- [x] `LegacyConfig.java`: DataSource 별칭, MessageSource 설정
- [x] `SecurityConfig.java`: `.do` 확장자 및 정적 리소스 접근 허용

### 2.4 현재 상태
> ⚠️ **중단 지점**: 레거시 코드 전체 복사 후 컴파일 오류 다수 발생으로 인해 롤백됨.
> `api-server/src/main/java/egovframework` 폴더는 삭제된 상태.
> `api-server/src/main/webapp` 및 `api-server/src/main/resources/egovframework`는 복사된 상태.

---

## 3. 다음 작업 (BBS 모듈 이관)

### 3.1 복사할 파일 목록
```
# 공통 VO/유틸리티
_legacy_backup/src/main/java/egovframework/com/cmm/
  ├── ComDefaultVO.java
  ├── LoginVO.java
  ├── EgovMessageSource.java
  └── service/
      ├── EgovFileMngService.java
      ├── EgovFileMngUtil.java
      ├── FileVO.java
      └── impl/
          ├── EgovFileMngServiceImpl.java
          └── FileManageDAO.java

# BBS 서비스
_legacy_backup/src/main/java/egovframework/let/cop/bbs/
  ├── service/
  │   ├── Board.java
  │   ├── BoardMaster.java
  │   ├── BoardVO.java
  │   ├── BoardMasterVO.java
  │   ├── EgovBBSManageService.java
  │   ├── EgovBBSAttributeManageService.java
  │   └── impl/
  │       ├── BBSManageDAO.java
  │       ├── BBSAttributeManageDAO.java
  │       ├── EgovBBSManageServiceImpl.java
  │       └── EgovBBSAttributeManageServiceImpl.java
  └── web/
      └── EgovBBSManageController.java (또는 REST로 변환)
```

### 3.2 복사할 MyBATIS 매퍼
```
_legacy_backup/src/main/resources/egovframework/mapper/let/cop/bbs/
  └── *_cubrid.xml (Cubrid용 SQL 매퍼)
```

### 3.3 작업 순서
1. **디렉토리 생성**
   ```powershell
   New-Item -ItemType Directory -Path "api-server/src/main/java/egovframework/com/cmm/service/impl" -Force
   New-Item -ItemType Directory -Path "api-server/src/main/java/egovframework/let/cop/bbs/service/impl" -Force
   New-Item -ItemType Directory -Path "api-server/src/main/java/egovframework/let/cop/bbs/web" -Force
   ```

2. **공통 클래스 복사**
   ```powershell
   Copy-Item "_legacy_backup/src/main/java/egovframework/com/cmm/ComDefaultVO.java" "api-server/src/main/java/egovframework/com/cmm/"
   Copy-Item "_legacy_backup/src/main/java/egovframework/com/cmm/LoginVO.java" "api-server/src/main/java/egovframework/com/cmm/"
   Copy-Item "_legacy_backup/src/main/java/egovframework/com/cmm/EgovMessageSource.java" "api-server/src/main/java/egovframework/com/cmm/"
   ```

3. **BBS 서비스 복사**
   ```powershell
   Copy-Item "_legacy_backup/src/main/java/egovframework/let/cop/bbs/*" "api-server/src/main/java/egovframework/let/cop/bbs/" -Recurse
   ```

4. **MyBATIS 매퍼 복사**
   ```powershell
   Copy-Item "_legacy_backup/src/main/resources/egovframework/mapper/let/cop/bbs/*_cubrid.xml" "api-server/src/main/resources/mapper/bbs/"
   ```

5. **컴파일 테스트**
   ```powershell
   ./gradlew :api-server:classes
   ```

6. **누락 의존성 해결**: 컴파일 오류 발생 시 필요한 클래스만 추가 복사

---

## 4. 현대적 MyBatis 아키텍처 가이드라인 (TO-BE)

레거시의 `DAO` 기반 방식을 지양하고, Spring Boot 친화적인 인터페이스 기반 아키텍처를 적용합니다.

### 4.1 핵심 원칙
1. **Mapper 인터페이스 사용**: `EgovAbstractMapper`를 상속받는 DAO 대신 `@Mapper` 인터페이스를 사용합니다.
2. **DTO 기반 통신**: 레거시의 `VO`나 `EgovMap` 대신 기능에 맞는 명확한 `DTO`를 정의하여 사용합니다.
3. **Layered Architecture 준수**:
   - **Infrastructure**: `Mapper XML` (SQL)
   - **Persistence**: `@Mapper Interface`
   - **Service**: Business Logic (Mapper 주입)
   - **Web**: REST API Controller

### 4.2 파일 구조 예시
```
common-domain/
  └── src/main/java/com/company/project/domain/[feature]/
      └── [Feature]Mapper.java (인터페이스)
  └── src/main/resources/mapper/[feature]/
      └── [Feature]Mapper.xml (SQL)

common-service/
  └── src/main/java/com/company/project/service/[feature]/
      └── [Feature]Service.java (Business Logic)
```

### 4.3 설정 (application-dev.yml)
- `mybatis.configuration.map-underscore-to-camel-case: true` 설정 권장 (DB Snake Case -> Java Camel Case 자동 매핑)

---

## 5. 단계별 이관 로드맵 (개정)

### 1단계: 인프라 구축 ✅
- [x] MyBatis 종속성 추가 및 기본 설정
- [x] Cubrid DB 연동 확인

### 2단계: 아키텍처 전환 및 샘플 이식 (현재) 🔄
- [ ] 레거시 BBS SQL 분석 및 현대화
- [ ] Mapper 인터페이스 정의 및 XML 이식
- [ ] REST API 변환 (Controller 신규 작성)

### 3단계: 파일/공통코드 모듈 이관 ⏳
- 신규 아키텍처 표준을 적용하여 순차적 이행

---

## 6. 환경 설정 참고

### 4.1 JDK 21 설정 (중요)
Gradle이 자동으로 JDK 21을 다운로드합니다. 수동 설정이 필요한 경우:
```powershell
$env:JAVA_HOME = "C:\Users\<username>\.gradle\jdks\eclipse_adoptium-21-amd64-windows.2\jdk-21.0.5+11"
```

### 4.2 서버 실행
```powershell
./gradlew :api-server:bootRun
```

### 4.3 API 테스트
```powershell
# 회원가입
curl -X POST http://localhost:8080/api/v1/users/signup `
  -H "Content-Type: application/json" `
  -d '{"loginId":"testuser","password":"Test1234!","name":"테스트","email":"test@test.com","passwordHint":"hint","passwordCnsr":"answer","role":"USER"}'

# 로그인
curl -X POST http://localhost:8080/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"loginId":"testuser","password":"Test1234!"}'
```

---

## 5. 주요 파일 위치

| 파일 | 경로 | 설명 |
|------|------|------|
| 루트 빌드 설정 | `build.gradle` | Java 21 Toolchain, 공통 의존성 |
| API 서버 빌드 | `api-server/build.gradle` | JSP/MyBATIS/레거시 의존성 |
| 개발 환경 설정 | `api-server/src/main/resources/application-dev.yml` | DB 연결, JSP, MyBATIS |
| 현대화 플랜 | `implementation_plan.md` | 신규 아키텍처 상세 가이드라인 |
| 보안 설정 | `common-security/.../SecurityConfig.java` | JWT + 레거시 경로 허용 |
| 레거시 빈 설정 | `api-server/.../LegacyConfig.java` | DataSource 별칭, MessageSource |
| 레거시 원본 | `_legacy_backup/` | eGovFrame 5.0 경량환경 전체 |

---

## 6. 알려진 이슈

### 6.1 미해결 Lint 오류
`common-service/BoardService.java`에 `BusinessException`, `ErrorCode` 관련 컴파일 오류 존재.
→ 현재 JPA 기반 Board 엔터티와 레거시 BBS는 별개로 운영 예정.

### 6.2 레거시 코드 의존성
레거시 코드에서 사용하는 외부 라이브러리:
- `com.ibm.icu:icu4j` (음력 변환)
- `commons-io:commons-io` (파일 처리)
- `com.google.guava:guava` (유틸리티)

→ 이미 `api-server/build.gradle`에 추가됨.

---

## 7. 연락처 및 참고자료

- **eGovFrame 공식 문서**: https://www.egovframe.go.kr/
- **Spring Boot 3.3 문서**: https://docs.spring.io/spring-boot/docs/3.3.x/reference/html/
- **Cubrid JDBC**: https://www.cubrid.org/manual/en/11.3/api/jdbc.html

---

> 이 문서를 참고하여 다른 환경에서 작업을 계속할 수 있습니다.
> 질문이 있으면 이 문서와 함께 맥락을 공유해 주세요.
