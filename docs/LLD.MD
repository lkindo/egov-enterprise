# 전자정부프레임워크 5.0 공통 모듈 구축 - 상세 설계서 (LLD)

> **최종 업데이트**: 2026-02-25  
> **프로젝트 진행률**: ✅ 90% 완료  
> **문서 버전**: 2.1

## 1. 프로젝트 구조 및 패키지 설계

### 1.1. 백엔드 (Multi-Module)

기본 패키지 접두사: `com.company.project`

#### common-core
```
common-core/
└── src/main/java/com/company/project/
    ├── core/
    │   ├── config/         # 설정 클래스 (Locale, DateTime)
    │   ├── exception/      # 커스텀 예외 (BusinessException, ErrorCode)
    │   ├── response/       # 표준 응답 (ApiResponse)
    │   └── util/           # 유틸리티 (DateUtil, StringUtils)
    └── CoreApplication.java
```

| 클래스 | 역할 |
|--------|------|
| `BusinessException` | 비즈니스 예외 기본 클래스 |
| `ErrorCode` | 에러 코드 enum (HTTP 상태코드 매핑) |
| `ApiResponse<T>` | 표준 응답 래퍼 |
| `GlobalExceptionHandler` | 전역 예외 처리 (@ControllerAdvice) |

#### common-domain
```
common-domain/
└── src/main/java/com/company/project/
    └── domain/
        ├── [module]/           # 69 개 도메인 패키지
        │   ├── entity/         # JPA 엔티티
        │   ├── repository/     # Spring Data JPA Repository
        │   └── dto/            # 도메인 DTO
        ├── common/             # 공통 엔티티 (BaseTimeEntity, BaseEntity)
        └── querydsl/           # QueryDSL Q-Type
```

**주요 도메인 목록** (69 개):
- `auth`, `user`, `group`, `role` - 인증/인가
- `code`, `menu`, `program` - 시스템 설정
- `board`, `comment`, `scrap` - 게시판
- `community`, `addressbook`, `namecard` - 커뮤니티
- `schedule`, `deptjob`, `report` - 일정/보고
- `survey`, `terms`, `faq`, `qna` - 설문/고객지원
- `file`, `image`, `dam` - 파일/자산
- `log`, `syslog`, `securitylog` - 로그
- `monitoring`, `stats` - 모니터링/통계
- `notification`, `note`, `alarm` - 알림/쪽지
- `event`, `campaign`, `vacation`, `reward`, `anniversary`, `ctsnn` - 부가서비스
- [기타 40+ 개 도메인]

#### common-security
```
common-security/
└── src/main/java/com/company/project/
    └── security/
        ├── config/         # SecurityConfig, FilterConfig
        ├── jwt/            # JwtTokenProvider, JwtAuthenticationFilter
        ├── service/        # UserDetailsServiceImpl
        └── handler/        # AuthenticationEntryPoint, AccessDeniedHandler
```

| 클래스 | 역할 |
|--------|------|
| `JwtTokenProvider` | JWT 생성/검증/갱신 |
| `JwtAuthenticationFilter` | JWT 인증 필터 (OncePerRequestFilter) |
| `SecurityConfig` | Spring Security 설정 (SecurityFilterChain) |
| `UserDetailsImpl` | Spring Security 사용자 상세 정보 |

#### common-service
```
common-service/
└── src/main/java/com/company/project/
    └── service/
        ├── [module]/           # 70 개 서비스 패키지
        │   ├── [Module]Service.java
        │   ├── impl/[Module]ServiceImpl.java
        │   ├── dto/            # 요청/응답 DTO
        │   └── mapper/         # MapStruct Mapper
        ├── common/             # 공통 서비스 (FileService, CodeService)
        └── config/             # 서비스 설정
```

**주요 서비스 목록** (70 개):
- `AuthService`, `UserService`, `AuthService` - 인증/사용자
- `BoardService`, `CommentService`, `FileService` - 게시판/파일
- `CommunityService`, `AddressbookService` - 커뮤니티
- `ScheduleService`, `ReportService`, `DeptJobService` - 일정/보고
- `SurveyService`, `TermsService`, `FaqService` - 설문/고객지원
- `StatsService`, `MonitoringService` - 통계/모니터링
- [기타 50+ 개 서비스]

#### api-server
```
api-server/
└── src/main/java/com/company/project/
    ├── api/
    │   ├── controller/         # REST Controller (115+ 개)
    │   │   ├── auth/
    │   │   ├── user/
    │   │   ├── board/
    │   │   └── ...
    │   ├── config/             # API 설정 (Swagger, CORS, Web)
    │   └── dto/                # API 전용 DTO
    ├── security/               # 보안 설정 (SecurityConfig)
    └── web/                    # WebMvc 설정
```

### 1.2. 프론트엔드 (Next.js 15 App Router)

```
frontend/
└── src/
    ├── app/                          # App Router (165+ 페이지)
    │   ├── (auth)/                   # 인증 그룹
    │   │   ├── login/
    │   │   │   ├── page.tsx          # 로그인 페이지
    │   │   │   └── LoginForm.tsx
    │   │   └── register/
    │   ├── (dashboard)/              # 대시보드 그룹
    │   │   ├── page.tsx              # 메인 대시보드
    │   │   └── layout.tsx
    │   ├── admin/                    # 관리자 페이지 (14 개 카테고리)
    │   │   ├── collaboration/        # 협업 관리
    │   │   ├── community/            # 커뮤니티 관리
    │   │   ├── dam/                  # 디지털자산 관리
    │   │   ├── help/                 # 도움말 관리
    │   │   ├── notifications/        # 알림 관리
    │   │   ├── observability/        # 모니터링
    │   │   ├── sanctn/               # 결재 관리
    │   │   ├── security/             # 보안 관리
    │   │   ├── stats/                # 통계
    │   │   ├── survey/               # 설문 관리
    │   │   ├── system/               # 시스템 관리
    │   │   ├── terms/                # 약관 관리
    │   │   ├── user/                 # 사용자 관리
    │   │   └── workflow/             # 워크플로우
    │   ├── approvals/                # 결재 페이지
    │   ├── components/               # 페이지별 컴포넌트
    │   ├── help/                     # 도움말 페이지
    │   ├── login/                    # 로그인 페이지
    │   ├── mypage/                   # 마이페이지
    │   ├── note/                     # 쪽지 페이지
    │   ├── search/                   # 검색 페이지
    │   ├── survey/                   # 설문 페이지
    │   ├── uss/                      # 부가 서비스
    │   ├── layout.tsx                # 루트 레이아웃
    │   ├── page.tsx                  # 메인 페이지
    │   ├── providers.tsx             # 프로바이더 (Query, Theme)
    │   ├── error.tsx                 # 에러 바운더리
    │   └── not-found.tsx             # 404 페이지
    ├── components/
    │   ├── ui/                       # Shadcn/UI (30+ 컴포넌트)
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── form.tsx
    │   │   ├── table.tsx
    │   │   ├── dialog.tsx
    │   │   ├── popover.tsx
    │   │   ├── calendar.tsx
    │   │   └── ...
    │   ├── common/                   # 공통 컴포넌트 (20+ 개)
    │   │   ├── Header.tsx
    │   │   ├── Footer.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── Loading.tsx
    │   │   └── ErrorBoundary.tsx
    │   ├── features/                 # 기능별 컴포넌트 (50+ 개)
    │   │   ├── board/
    │   │   ├── user/
    │   │   ├── stats/
    │   │   └── ...
    │   └── layout/                   # 레이아웃 컴포넌트
    ├── services/                     # API 통신 (Axios 기반)
    │   ├── api.ts                    # Axios 인스턴스 설정
    │   ├── auth.ts                   # 인증 API
    │   ├── user.ts                   # 사용자 API
    │   ├── board.ts                  # 게시판 API
    │   └── ...
    ├── types/                        # TypeScript 타입 정의
    │   ├── index.ts                  # 공통 타입
    │   ├── user.ts                   # 사용자 타입
    │   ├── board.ts                  # 게시판 타입
    │   └── ...
    ├── hooks/                        # 커스텀 React Hooks
    │   ├── useAuth.ts                # 인증 훅
    │   ├── useBoard.ts               # 게시판 훅
    │   ├── useDebounce.ts            # 디바운스 훅
    │   └── ...
    ├── lib/                          # 유틸리티
    │   ├── utils.ts                  # cn() 함수
    │   ├── validators.ts             # Zod 스키마
    │   └── constants.ts              # 상수 정의
    └── stores/                       # Zustand 상태 저장소
        ├── authStore.ts              # 인증 상태
        └── uiStore.ts                # UI 상태
```

## 2. 도메인 상세 설계 (Domain Details)

### 2.1. 주요 모듈 및 엔티티 매핑

| 모듈 그룹 | 주요 도메인 | 관련 테이블 | 엔티티 수 | 설명 |
| :--- | :--- | :--- | :---: | :--- |
| **시스템 (`sym`)** | Code, Menu, Program | NCMMNCODE, NMENUINFO, NPROGRMLIST | 10+ | 시스템 기반 데이터 관리 |
| **보안 (`sec`)** | Role, Author, Group | NAUTHORINFO, NROLEINFO, NGROUPINFO | 8+ | RBAC 권한 제어 도메인 |
| **사용자 (`uss`)** | User, Login | NENTRPRSUSER, NLOGINPOLICY | 5+ | 일반/업무 사용자 및 인증 정보 |
| **협업 (`cop`)** | Board, File, Comment | NBBS, NBBSMASTER, NFILE, NCOMMENT | 15+ | 게시판, 첨부파일 등 협업 기능 |
| **커뮤니티 (`cop/cmy`)** | Community, Addressbook | NCMMNTY, NADBK, NNCRD | 8+ | 동호회, 주소록, 명함 |
| **운영 (`smt`)** | Schedule, Report | NSCHDULINFO, NWIKMNTHNGREPRT | 10+ | 일정 관리 및 업무 보고 도메인 |
| **고객지원 (`uss/olh`)** | FAQ, QnA, Survey | NFAQINFO, NQNAINFO, NQUSTNRINFO | 12+ | FAQ, Q&A, 설문조사 |
| **모니터링 (`utl`)** | Monitoring, Stats | NSERVERRESRCELOGINFO, NUSERSTATS | 15+ | 시스템 모니터링, 통계 |
| **부가서비스 (`uss/ion`)** | Event, Vacation, Reward | NEVENTINFO, NVCATNMANAGE, NRWARDMANAGE | 20+ | 행사, 휴가, 포상 등 |

### 2.2. 데이터베이스 엔티티 설계 원칙

| 원칙 | 설명 | 적용 예시 |
|------|------|-----------|
| **BaseEntity 상속** | 모든 엔티티는 `BaseTimeEntity`(생성/수정일) 를 상속 | `@MappedSuperclass` |
| **복합키 처리** | 복합키 사용 시 `@EmbeddedId` 또는 `@IdClass` 활용 | `@Embeddable` + `@EmbeddedId` |
| **연관관계** | `@ManyToOne` (FetchType.LAZY) 기본 | `@JoinColumn` 명시 |
| **Cascade** | 비즈니스 규칙에 따른 Cascade 설정 | `CascadeType.ALL` 또는 제한적 사용 |
| **Index** | 조회 성능을 위한 인덱스 설정 | `@Index(name = "...", columnList = "...")` |

**엔티티 예시**:
```java
@Entity
@Table(name = "NBBS", indexes = {
    @Index(name = "idx_bbs_master_id", columnList = "bbs_id"),
    @Index(name = "idx_bbs_created_date", columnList = "created_date")
})
public class Board extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 2000)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User author;
    
    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();
    
    // Getters, Setters, Constructors
}
```

### 2.3. Repository 설계

```java
// Spring Data JPA Repository
public interface BoardRepository extends JpaRepository<Board, Long>, 
    QuerydslPredicateExecutor<Board> {
    
    // Derived Query Method
    List<Board> findByBbsId(String bbsId);
    
    // Custom Query with @Query
    @Query("SELECT b FROM Board b JOIN FETCH b.author WHERE b.id = :id")
    Optional<Board> findByIdWithAuthor(@Param("id") Long id);
}

// QueryDSL Repository
public interface BoardRepositoryCustom {
    Page<Board> searchBoards(BoardSearchCondition condition, Pageable pageable);
}

// QueryDSL Implementation
public class BoardRepositoryImpl implements BoardRepositoryCustom {
    private final JPAQueryFactory queryFactory;
    
    @Override
    public Page<Board> searchBoards(BoardSearchCondition condition, Pageable pageable) {
        List<Board> results = queryFactory
            .selectFrom(board)
            .where(
                board.title.contains(condition.getTitle()),
                board.author.eq(condition.getAuthor())
            )
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();
        
        return new PageImpl<>(results, pageable, results.size());
    }
}
```

## 3. 핵심 로직 및 인터페이스 설계

### 3.1. API 응답 표준 (ApiResponse)

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private ApiError error;
    
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .data(data)
            .build();
    }
    
    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return ApiResponse.<T>builder()
            .success(false)
            .error(ApiError.from(errorCode))
            .build();
    }
}

@Data
@Builder
public class ApiError {
    private String code;
    private String message;
    private int status;
    private LocalDateTime timestamp;
}
```

**응답 예시**:
```json
// 성공
{
  "success": true,
  "data": {
    "id": 1,
    "title": "공지사항입니다",
    "content": "내용입니다"
  },
  "error": null
}

// 에러
{
  "success": false,
  "data": null,
  "error": {
    "code": "BOARD_NOT_FOUND",
    "message": "게시판을 찾을 수 없습니다.",
    "status": 404,
    "timestamp": "2026-02-23T10:30:00"
  }
}
```

### 3.2. 프론트엔드 데이터 페칭 가이드라인

| 컴포넌트 유형 | 데이터 페칭 방법 | 사용 사례 |
| :--- | :--- | :--- |
| **Server Component** | `async/await` + 직접 fetch | 초기 데이터 로딩, SEO 필요 페이지 |
| **Client Component** | `useQuery` (TanStack Query) | 사용자 인터랙션, 실시간 데이터 |
| **Server Action** | `action` 함수 | 폼 제출, 뮤테이션 |

**Server Component 예시**:
```tsx
// app/admin/user/page.tsx
export default async function UserManagePage() {
  const users = await fetchUsers(); // 서버에서 직접 호출
  
  return (
    <div>
      <h1>사용자 관리</h1>
      <UserTable users={users} />
    </div>
  );
}
```

**Client Component 예시**:
```tsx
// components/board/BoardList.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { boardApi } from '@/services/board';

export function BoardList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardApi.getList(),
  });
  
  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <ul>
      {data?.map(board => (
        <li key={board.id}>{board.title}</li>
      ))}
    </ul>
  );
}
```

### 3.3. 폼 처리 (React Hook Form + Zod)

```tsx
// schemas/user.ts
import { z } from 'zod';

export const userSchema = z.object({
  userId: z.string().min(6, 'ID 는 6 자 이상'),
  password: z.string().min(8, '비밀번호는 8 자 이상'),
  userNm: z.string().min(2, '이름은 2 자 이상'),
  email: z.string().email('이메일 형식이 아닙니다'),
});

export type UserFormData = z.infer<typeof userSchema>;

// components/user/UserForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema } from '@/schemas/user';

export function UserForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(userSchema),
  });
  
  const onSubmit = async (data: UserFormData) => {
    await userApi.create(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('userId')} />
      {errors.userId && <span>{errors.userId.message}</span>}
      
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <button type="submit">등록</button>
    </form>
  );
}
```

## 4. API 명세 (API Roadmap)

### 4.1. 인증 API

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| POST | `/api/v1/auth/login` | JWT 로그인 | No |
| POST | `/api/v1/auth/logout` | 로그아웃 (토큰 무효화) | Yes |
| POST | `/api/v1/auth/refresh` | 토큰 갱신 | No (Refresh Token) |
| GET | `/api/v1/auth/me` | 현재 사용자 정보 | Yes |

### 4.2. 사용자 API

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| GET | `/api/v1/users` | 사용자 목록 조회 | Yes |
| GET | `/api/v1/users/{id}` | 사용자 상세 조회 | Yes |
| POST | `/api/v1/users` | 사용자 등록 | Yes (Admin) |
| PUT | `/api/v1/users/{id}` | 사용자 수정 | Yes |
| DELETE | `/api/v1/users/{id}` | 사용자 삭제 | Yes (Admin) |

### 4.3. 게시판 API

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| GET | `/api/v1/boards` | 게시판 목록 조회 | Yes |
| GET | `/api/v1/boards/{id}` | 게시글 상세 조회 | Yes |
| POST | `/api/v1/boards` | 게시글 등록 | Yes |
| PUT | `/api/v1/boards/{id}` | 게시글 수정 | Yes (Author) |
| DELETE | `/api/v1/boards/{id}` | 게시글 삭제 | Yes (Author/Admin) |
| POST | `/api/v1/boards/{id}/comments` | 댓글 등록 | Yes |

### 4.4. 파일 API

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| GET | `/api/v1/files` | 파일 목록 조회 | Yes |
| POST | `/api/v1/files/upload` | 파일 업로드 | Yes |
| DELETE | `/api/v1/files/{id}` | 파일 삭제 | Yes |
| GET | `/api/v1/files/{id}/download` | 파일 다운로드 | Yes |

### 4.5. 공통코드 API

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| GET | `/api/v1/codes` | 공통코드 목록 조회 | Yes |
| GET | `/api/v1/codes/{groupCode}` | 그룹별 코드 조회 | Yes |
| POST | `/api/v1/codes` | 공통코드 등록 | Yes (Admin) |
| PUT | `/api/v1/codes/{id}` | 공통코드 수정 | Yes (Admin) |

## 5. 구현 세부 규칙

### 5.1. 백엔드 코딩 컨벤션

| 항목 | 규칙 | 예시 |
|------|------|------|
| **클래스명** | PascalCase, 명사 | `UserService`, `BoardController` |
| **메서드명** | camelCase, 동사 | `getUserById`, `createBoard` |
| **변수명** | camelCase, 명확한 이름 | `userList`, `boardTitle` |
| **상수명** | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE`, `DEFAULT_TIMEOUT` |
| **예외 처리** | 명시적 catch, 로깅 | `log.error("message", e)` |
| **트랜잭션** | Service 레이어에서 관리 | `@Transactional` |

### 5.2. 프론트엔드 코딩 컨벤션

| 항목 | 규칙 | 예시 |
|------|------|------|
| **컴포넌트명** | PascalCase | `UserList`, `BoardForm` |
| **함수명** | camelCase | `handleClick`, `fetchData` |
| **변수명** | camelCase | `userData`, `isLoading` |
| **타입명** | PascalCase | `User`, `BoardProps` |
| **파일명** | kebab-case | `user-list.tsx`, `board-form.tsx` |
| **Export** | named export 우선 | `export function Component()` |

### 5.3. 로깅 가이드라인

```java
// 올바른 예시
log.debug("User found: userId={}", userId);
log.info("Login successful: userId={}", userId);
log.warn("Invalid password attempt: userId={}", userId);
log.error("Database connection failed", e);

// 잘못된 예시
log.debug("User found: " + userId);  // 문자열 연결
log.error("Error occurred");  // 예외 누락
```

### 5.4. 타입 안전성 (TypeScript)

```typescript
// ✅ 올바른 예시
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return api.get(`/users/${id}`);
}

// ❌ 잘못된 예시
async function getUser(id: string): Promise<any> {  // any 사용 금지
  return api.get(`/users/${id}`);
}
```

## 6. 데이터베이스 스키마

### 6.1. 주요 테이블 목록

| 테이블명 | 설명 | 컬럼 수 |
| :--- | :--- | :---: |
| **NUSER** | 사용자 정보 | 20+ |
| **NAUTHORINFO** | 권한 정보 | 5+ |
| **NROLEINFO** | 롤 정보 | 5+ |
| **NGROUPINFO** | 그룹 정보 | 10+ |
| **NCMMNCODE** | 공통코드 | 10+ |
| **NMENUINFO** | 메뉴 정보 | 15+ |
| **NBBS** | 게시판 | 20+ |
| **NBBSMASTER** | 게시판 마스터 | 15+ |
| **NFILE** | 파일 마스터 | 10+ |
| **NFILEDETAIL** | 파일 상세 | 5+ |
| **NCOMMENT** | 댓글 | 10+ |
| **NSCHDULINFO** | 일정 정보 | 15+ |
| **NQUSTNRINFO** | 설문 정보 | 15+ |
| **NSTATS** | 통계 정보 | 10+ |

### 6.2. 테이블 명명 규칙

| 항목 | 규칙 | 예시 |
|------|------|------|
| **테이블명** | 대문자, N 접두사 | `NUSER`, `NBOARD` |
| **컬럼명** | 스네이크케이스 | `user_id`, `created_date` |
| **PK** | `{테이블명}_ID` 또는 `ID` | `USER_ID`, `ID` |
| **FK** | `{참조테이블}_ID` | `USER_ID`, `BOARD_ID` |
| **감사컬럼** | `CREATED_DATE`, `CREATED_BY`, `MODIFIED_DATE`, `MODIFIED_BY` | 표준 |

---

*Last Updated: 2026-02-25*
*Document Version: 2.0*  
*Approved by: Project Architecture Team*
