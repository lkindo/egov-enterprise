# eGovFrame 5.0 → JPA 현대화 완료 가이드

이 문서는 레거시 전자정부프레임워크 5.0 프로젝트를 Spring Boot 3.3 및 JPA 기반의 현대적 아키텍처로 완전히 이관한 결과를 설명합니다.

---

## 1. 아키텍처 개요

| 레이어 | 기술 | 역할 |
|---|---|---|
| **Persistence** | Spring Data JPA | 데이터 접근 (JpaRepository) |
| **Domain** | JPA Entity | 레거시 테이블 매핑 |
| **Service** | Spring Service | 비즈니스 로직 |
| **API** | Spring REST Controller | RESTful API 엔드포인트 |
| **Security** | Spring Security + JWT | 인증/인가, 비밀번호 암호화 |

---

## 2. 모듈별 완료 현황

### ✅ 게시판 (Board)
- **엔티티**: `Board`, `BoardMaster`, `BoardId`
- **저장소**: `BoardRepository`, `BoardMasterRepository`
- **서비스**: `BoardService` (CRUD, 조회수 증가)
- **컨트롤러**: `BoardApiController` (`/api/v1/board`)
- **테스트**: `BoardRepositoryTest`, `BoardServiceTest`

### Menu Functionality & Visibility
- [x] **Full Depth Rendering**: All 3 levels of menus are correctly rendered in the "전체메뉴" popup and side menus.
- [x] **Dynamic URL Mapping**: Links now fetch correct URLs from `NPROGRMLIST` via the `Program` entity, fixing broken `#` links.
- [x] **Active Menu Identification**: `GlobalMenuAdvice` dynamically identifies the active root menu by URI, ensuring the correct side menu is displayed.
- [x] **Session Syncing**: Identified `rootMenuId` is synced with `baseMenuNo` in the session, fixing the submenu expansion issue.
- [x] **Legacy Fix**: Redundant model population in `EgovMainController` was disabled to prevent overwriting global menu data.
- [x] **UI Polishing**: Fixed "내무서비스관리" typo and improved GNB link robustness in `EgovIncHeader.jsp` and `EgovMainView.jsp`.

## Verification Results
- **Main Page**: Verified that all 6 root menus are visible in GNB and "전체메뉴" popup with working links.
- **Side Menu**: Verified that clicking a root menu correctly expands its submenus and highlights the active section via `baseMenuNo`.
- **Admin Section**: Verified that "내부시스템관리" remains visible in the header even when navigating deep into administrative pages.
- **Log Validation**: Confirmed `GlobalMenuAdvice` traces showing successful mapping of URIs to `rootMenuId` (e.g., `1000000` for notice, `6000000` for admin).

### ✅ 파일 관리 (File)
- **엔티티**: `FileMaster`, `FileDetail`, `FileDetailId`
- **저장소**: `FileMasterRepository`, `FileDetailRepository`
- **서비스**: `FileService` (업로드, 다운로드, 목록)
- **컨트롤러**: `FileApiController` (`/api/v1/files`)
- **테스트**: `FileServiceTest`

### ✅ 공통 코드 (Code)
- **엔티티**: `CommonCode`, `CommonCodeId`
- **저장소**: `CommonCodeRepository`
- **서비스**: `CodeService`
- **컨트롤러**: `CodeApiController` (`/api/v1/codes`)

### ✅ 사용자/권한 (User/Auth)
- **엔티티**: `User`, `Role`
- **저장소**: `UserRepository`
- **서비스**: `UserService` (BCrypt 비밀번호 암호화 적용)
- **컨트롤러**: `UserApiController` (`/api/v1/users`)
- **테스트**: `UserServiceTest`
- **보안**: 중복 사용자 체크, 비밀번호 검증 기능 추가

### ✅ 로그/통계 (Log/Stats)
- **엔티티**: `LoginLog`
- **저장소**: `LoginLogRepository`
- **서비스**: `LogService`
- **컨트롤러**: `LogApiController` (`/api/v1/logs`)

---

## 3. 보안 강화 사항

| 항목 | 적용 내용 |
|---|---|
| **비밀번호 암호화** | `BCryptPasswordEncoder` 사용 |
| **중복 사용자 방지** | 회원가입 시 `existsById()` 체크 |
| **JWT 토큰 인증** | `JwtTokenProvider` 및 `JwtAuthenticationFilter` 적용 |
| **세션리스** | `SessionCreationPolicy.STATELESS` 설정 |

---

## 4. 테스트 코드 현황

| 테스트 클래스 | 테스트 내용 |
|---|---|
| `BoardRepositoryTest` | 게시판 마스터/게시물 저장 및 조회 |
| `BoardServiceTest` | 목록 조회, 상세 조회, 조회수 증가, 예외 처리 |
| `FileServiceTest` | 파일 목록 조회, 예외 처리 |
| `UserServiceTest` | 사용자 목록/상세 조회, 예외 처리 |

---

## 5. 주요 API 엔드포인트

| 메소드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/v1/board/{bbsId}` | 게시판별 목록 조회 |
| `GET` | `/api/v1/board/detail/{id}` | 게시물 상세 조회 |
| `POST` | `/api/v1/board/{bbsId}` | 게시물 등록 |
| `PUT` | `/api/v1/board/{id}` | 게시물 수정 |
| `DELETE` | `/api/v1/board/{id}` | 게시물 삭제 |
| `POST` | `/api/v1/files` | 파일 업로드 |
| `GET` | `/api/v1/files/{atchFileId}` | 첨부파일 목록 조회 |
| `GET` | `/api/v1/files/{atchFileId}/{fileSn}` | 파일 다운로드 |
| `GET` | `/api/v1/codes/{codeGroupId}` | 상세 코드 목록 조회 |
| `GET` | `/api/v1/users` | 사용자 목록 조회 |
| `GET` | `/api/v1/users/{userId}` | 사용자 상세 조회 |
| `POST` | `/api/v1/users/signup` | 회원가입 |
| `GET` | `/api/v1/logs/login` | 로그인 로그 목록 조회 |

---

## 6. 빌드 및 테스트 결과

```bash
# 빌드 검증
./gradlew :api-server:compileJava
# Exit code: 0 ✅

# 테스트 실행
./gradlew :common-service:test --tests "*ServiceTest"
# Exit code: 0 ✅
```

---

## 7. 삭제된 파일 (MyBatis 관련)

| 접두어 | 삭제된 파일 수 | 대표 파일 |
|---|---|---|
| `BBS*` | 30+ 파일 | `BBSMapper.xml`, `BBSBoard.java`, `BBSFileService.java` 등 |

---

## 8. 향후 개선 사항

- [ ] QueryDSL 복잡 쿼리 최적화 (동적 검색 조건)
- [ ] 통합 테스트 작성 (`@SpringBootTest`)
- [ ] API 문서화 개선 (Swagger 상세 설명 및 예시)
- [ ] 캐싱 전략 적용 (공통 코드 등)
- [ ] 감사(Audit) 로깅 자동화 (JPA Auditing)
