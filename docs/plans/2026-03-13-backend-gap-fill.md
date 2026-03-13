# Backend Missing Controllers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement missing backend REST APIs for Administrative Code, Institution Code, and My Page functions to ensure frontend-backend connectivity.

**Architecture:** Use Spring Data JPA, following the existing Hexagonal/Layered architecture (Domain -> Repository -> Service -> Controller).

**Tech Stack:** Spring Boot 3.4+, Spring Data JPA, Hibernate, MapStruct (if needed), JUnit 5, Mockito.

---

### Task 1: Administrative Code Management (행정코드관리)

**Files:**
- Create: `common-core/src/main/java/com/company/project/domain/code/AdministCode.java`
- Create: `common-core/src/main/java/com/company/project/repository/code/AdministCodeRepository.java`
- Create: `common-core/src/main/java/com/company/project/service/code/dto/AdministCodeDto.java`
- Create: `common-core/src/main/java/com/company/project/service/code/AdministCodeService.java`
- Create: `module-system-admin/src/main/java/com/company/project/api/controller/code/AdministCodeApiController.java`

**Step 1: Implement AdministCode Entity**
Implement the JPA entity mapping `CADMINISTCODE` table.

**Step 2: Implement AdministCode Repository**
Create a JpaRepository interface for CRUD operations.

**Step 3: Implement AdministCode DTO and Service**
Create DTO for API response and Service for business logic (paging, searching).

**Step 4: Implement AdministCode Controller**
Create a REST controller with endpoints for list, detail, create, update, delete.
Endpoint: `/api/v1/admin/codes/administ`

---

### Task 2: Institution Code Receipt (기관코드수신)

**Files:**
- Create: `common-core/src/main/java/com/company/project/service/code/dto/InstitutionCodeDto.java`
- Create: `common-core/src/main/java/com/company/project/service/code/InstitutionCodeService.java`
- Create: `module-system-admin/src/main/java/com/company/project/api/controller/code/InstitutionCodeApiController.java`

**Step 1: Implement InstitutionCode DTO and Service**
(Entity `InstitutionCode` already exists)
Implement DTO and Service for listing and receiving institution codes.

**Step 2: Implement InstitutionCode Controller**
Create a REST controller with endpoints.
Endpoint: `/api/v1/admin/codes/institution`

---

### Task 3: My Page Contents Management (마이페이지관리)

**Files:**
- Create: `common-core/src/main/java/com/company/project/domain/workspace/MyPageContent.java`
- Create: `common-core/src/main/java/com/company/project/repository/workspace/MyPageContentRepository.java`
- Create: `common-core/src/main/java/com/company/project/service/workspace/dto/MyPageContentDto.java`
- Create: `common-core/src/main/java/com/company/project/service/workspace/MyPageService.java`
- Create: `module-workspace/src/main/java/com/company/project/api/controller/workspace/MyPageApiController.java`

**Step 1: Implement MyPageContent Entity**
Mapping `NINDVDLPGECNTNTS` table.

**Step 2: Implement MyPageContent Repository and Service**
Implement CRUD logic for my page contents.

**Step 3: Implement MyPage Controller**
Endpoint: `/api/v1/workspace/mypage/contents`

---

### Task 4: Verification

**Step 1: Run Backend Tests**
Execute `./gradlew test` to ensure no regressions.

**Step 2: Verify Endpoints with cURL**
Test the new endpoints manually using `curl` or Swagger.

**Step 3: Final Commit**
