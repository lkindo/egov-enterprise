# Frontend Folder Structure Migration Guide

> **Migration Date**: 2026-03-26  
> **Purpose**: Backend 2-Tier Architecture 매핑을 위한 Frontend 구조 리팩토링  
> **Status**: In Progress

---

## 📋 Overview

백엔드의 2-Tier 아키텍처 (**foundation** + **business-suite**) 에 대응하여 프론트엔드의 `services/` 와 `types/` 폴더 구조를 재구성했습니다.

### Migration Summary

| 항목 | 변경 내용 |
|------|----------|
| **Services** | `admin/*`, `user/*` → `foundation/*`, `business/*` |
| **Types** | Flat structure → `foundation/*`, `business/*`, `core/*`, `generated/*` |
| **App Routes** | 유지 (UI 중심 구조) |
| **Import Paths** | `@/services/admin/*` → `@/services/foundation/*` |

---

## 🗺️ AS-IS → TO-BE Mapping

### 1. Services 폴더 구조

#### Foundation Module (시스템 기반)

| AS-IS (Old) | TO-BE (New) | Description |
|-------------|-------------|-------------|
| `services/admin/system/*` | `services/foundation/system/*` | 시스템 관리 서비스 (27 개) |
| `services/admin/user/*` | `services/foundation/user/*` | 사용자 관리 서비스 (4 개) |
| `services/admin/security/*` | `services/foundation/security/*` | 보안/권한 서비스 |
| `services/admin/stats/*` | `services/foundation/stats/*` | 통계 서비스 |
| `services/admin/operation/*` | `services/foundation/operation/*` | 운영지원 서비스 |
| `services/admin/workspace/*` | `services/foundation/workspace/*` | 워크스페이스/마이페이지 |
| `services/admin/survey/*` | `services/foundation/survey/*` | 설문조사 서비스 |
| `services/authService.ts` | `services/foundation/auth/authService.ts` | 인증 서비스 |
| `services/roleService.ts` | `services/foundation/security/roleService.ts` | 역할 서비스 |
| `services/networkService.ts` | `services/foundation/system/networkService.ts` | 네트워크 서비스 |

#### Business Module (비즈니스 도메인)

| AS-IS (Old) | TO-BE (New) | Description |
|-------------|-------------|-------------|
| `services/user/*` | `services/business/user/*` | 사용자 도메인 서비스 (12 개) |
| `services/comment/*` | `services/business/comment/*` | 댓글 서비스 |
| `services/community/*` | `services/business/community/*` | 커뮤니티 서비스 |
| `services/file/*` | `services/business/file/*` | 파일 관리 서비스 |
| `services/help/*` | `services/business/help/*` | 고객센터 서비스 |
| `services/schedule/*` | `services/business/schedule/*` | 일정 관리 서비스 |
| `services/poll/*` | `services/business/poll/*` | 설문/투표 서비스 |
| `services/dam/*` | `services/business/dam/*` | 디지털 자산 서비스 |
| `services/deptJob/*` | `services/business/deptjob/*` | 부서업무 서비스 |
| `services/scrap/*` | `services/business/scrap/*` | 스크랩 서비스 |
| `services/knowledgeService.ts` | `services/business/knowledge/knowledgeService.ts` | 지식관리 서비스 |
| `services/fileMngService.ts` | `services/business/file/fileMngService.ts` | 파일관리 서비스 |
| `services/securityService.ts` | `services/business/security/securityService.ts` | 보안 서비스 |

---

### 2. Types 폴더 구조

#### Foundation Types

| AS-IS (Old) | TO-BE (New) |
|-------------|-------------|
| `types/user.ts` | `types/foundation/user.ts` |
| `types/system.ts` | `types/foundation/system.ts` |
| `types/security.ts` | `types/foundation/security.ts` |
| `types/stats.ts` | `types/foundation/stats.ts` |
| `types/menu.ts` | `types/foundation/menu.ts` |
| `types/program.ts` | `types/foundation/program.ts` |
| `types/common-code.ts` | `types/foundation/code.ts` |
| `types/banner.ts` | `types/foundation/banner.ts` |
| `types/help.ts` | `types/foundation/help.ts` |
| `types/dashboard.ts` | `types/foundation/dashboard.ts` |

#### Business Types

| AS-IS (Old) | TO-BE (New) |
|-------------|-------------|
| `types/board.ts` | `types/business/board.ts` |
| `types/comment.ts` | `types/business/comment.ts` |
| `types/community.ts` | `types/business/community.ts` |
| `types/file.ts` | `types/business/file.ts` |
| `types/addressbook.ts` | `types/business/addressbook.ts` |
| `types/schedule.ts` | `types/business/schedule.ts` |
| `types/survey.ts` | `types/business/survey.ts` |
| `types/poll.ts` | `types/business/poll.ts` |
| `types/deptJob.ts` | `types/business/deptJob.ts` |
| `types/dam.ts` | `types/business/dam.ts` |
| `types/consult.ts` | `types/business/consult.ts` |
| `types/onlineHelp.ts` | `types/business/onlineHelp.ts` |

#### Core & Generated Types

| AS-IS (Old) | TO-BE (New) |
|-------------|-------------|
| `types/api.ts` | `types/core/api.ts` |
| `types/api-utils.ts` | `types/core/api-utils.ts` |
| `types/generated-api.d.ts` | `types/generated/generated-api.d.ts` |

---

## 📁 New Folder Structure

```
frontend/src/
├── services/
│   ├── foundation/           # 시스템 기반 서비스
│   │   ├── auth/
│   │   │   └── authService.ts
│   │   ├── user/
│   │   │   ├── AbsenceAdminService.ts
│   │   │   ├── DeptAdminService.ts
│   │   │   ├── ManualAdminService.ts
│   │   │   └── PolicyAdminService.ts
│   │   ├── security/
│   │   │   └── roleService.ts
│   │   ├── system/           # 27 개 시스템 관리 서비스
│   │   ├── stats/
│   │   ├── operation/
│   │   ├── workspace/
│   │   ├── survey/
│   │   └── __tests__/
│   │
│   ├── business/             # 비즈니스 도메인 서비스
│   │   ├── user/             # 12 개 사용자 도메인 서비스
│   │   ├── board/
│   │   ├── comment/
│   │   ├── community/
│   │   ├── file/
│   │   ├── help/
│   │   ├── schedule/
│   │   ├── poll/
│   │   ├── dam/
│   │   ├── deptjob/
│   │   ├── scrap/
│   │   ├── knowledge/
│   │   ├── security/
│   │   └── collaboration/
│   │
│   └── core/                 # 코어 유틸리티
│       ├── ApiService.ts
│       └── __tests__/
│
├── types/
│   ├── foundation/           # Foundation 모듈 타입
│   │   ├── user.ts
│   │   ├── system.ts
│   │   ├── security.ts
│   │   ├── stats.ts
│   │   ├── code.ts
│   │   └── ...
│   │
│   ├── business/             # Business 모듈 타입
│   │   ├── board.ts
│   │   ├── comment.ts
│   │   ├── community.ts
│   │   ├── file.ts
│   │   └── ...
│   │
│   ├── core/                 # 공통 타입
│   │   ├── api.ts
│   │   └── api-utils.ts
│   │
│   └── generated/            # 자동생성 타입
│       └── generated-api.d.ts
│
└── app/                      # App Router (유지)
    ├── admin/
    │   ├── system/
    │   ├── security/
    │   ├── user/
    │   ├── stats/
    │   ├── community/
    │   ├── collaboration/
    │   └── ...
    └── ...
```

---

## 🔧 Import Path Changes

### Before (AS-IS)

```typescript
// Services
import { UserAdminService } from '@/services/admin/system/UserAdminService';
import { authService } from '@/services/authService';
import { BoardUserService } from '@/services/user/board/BoardUserService';

// Types
import { User } from '@/types/user';
import { Board } from '@/types/board';
import { ApiResponse } from '@/types/api';
```

### After (TO-BE)

```typescript
// Services
import { UserAdminService } from '@/services/foundation/system/UserAdminService';
import { authService } from '@/services/foundation/auth/authService';
import { BoardUserService } from '@/services/business/user/board/BoardUserService';

// Types
import { User } from '@/types/foundation/user';
import { Board } from '@/types/business/board';
import { ApiResponse } from '@/types/core/api';
```

---

## ✅ Migration Checklist

### Completed

- [x] `services/foundation/` 폴더 생성
- [x] `services/business/` 폴더 생성
- [x] `types/foundation/` 폴더 생성
- [x] `types/business/` 폴더 생성
- [x] `types/core/` 폴더 생성
- [x] `types/generated/` 폴더 생성
- [x] Services 파일 마이그레이션 (84 개)
- [x] Types 파일 마이그레이션 (25 개)
- [x] Import 경로 일괄 수정 (53 개 파일)

### In Progress

- [ ] App 폴더 import 경로 수정 (수동)
- [ ] 타입 체크 에러 수정
- [ ] 빌드 검증

### Pending

- [ ] 테스트 실행
- [ ] 문서화 완료

---

## 🐛 Known Issues

### Import Path Errors

일부 파일에서 import 경로 수정 중 중복 따옴표 (`''`) 문제가 발생했습니다. 수동으로 수정 중입니다.

**Example:**
```typescript
// Wrong
import { X } from '@/services/foundation/system''/XService';

// Correct
import { X } from '@/services/foundation/system/XService';
```

### Files Needing Manual Fix

다음 파일들은 수동으로 import 경로를 수정해야 합니다:

1. `src/app/admin/community/[id]/page.tsx`
2. `src/app/admin/community/boards/[id]/page.tsx`
3. `src/app/admin/collaboration/CollaborationHubClient.tsx`
4. ... (약 50 개 파일)

---

## 📊 Migration Statistics

| Category | Files Moved | Import Paths Updated |
|----------|-------------|---------------------|
| **Services** | 84 | 53 |
| **Types** | 25 | - |
| **App Routes** | - | 101 |
| **Total** | 109 | 154 |

---

## 🚀 Next Steps

1. **수동 Import 수정**: 약 50 개 파일의 import 경로 수동 수정
2. **타입 체크**: `pnpm exec tsc --noEmit` 실행 및 에러 수정
3. **빌드 검증**: `pnpm build` 실행
4. **테스트 실행**: 기존 테스트 케이스 실행

---

## 📝 For DB Path Migration

백엔드 DB 경로 수정 시 다음 매핑을 참조하세요:

### Backend Module → Frontend Service

| Backend Module | Frontend Service Path |
|----------------|----------------------|
| `foundation.service.user.*` | `@/services/foundation/user/*` |
| `foundation.service.code.*` | `@/services/foundation/system/CodeAdminService` |
| `foundation.service.menu.*` | `@/services/foundation/system/MenuAdminService` |
| `foundation.service.auth.*` | `@/services/foundation/auth/authService` |
| `business.service.board.*` | `@/services/business/board/*` |
| `business.service.comment.*` | `@/services/business/comment/*` |
| `business.service.file.*` | `@/services/business/file/*` |

---

## 📞 Support

문의사항은 프로젝트 이슈 트래커에 등록해주세요.

---

*Last Updated: 2026-03-26*
