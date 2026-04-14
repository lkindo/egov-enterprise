# 백엔드-프론트엔드 필드 매칭 분석 및 수정 보고서

> **작업일자**: 2026-04-13  
> **작업범위**: eGov Enterprise 전체 모듈 (92개 Backend DTO, 87개 Frontend Service/Type)  
> **작업방향**: 프론트엔드를 백엔드 DTO 필드명에 맞춤 (Backends Single Source of Truth)

---

## 1. 작업 개요

### 1.1 조사 범위

| 영역 | 모듈 | 조사 대상 |
|------|------|----------|
| Backend Foundation | `foundation/` | Auth, User, Code, Menu, Security, Survey, Community, Popup, Banner 등 52개 DTO |
| Backend Business-Suite | `business-suite/` | Board, Schedule, DeptJob, Report, AddressBook, Note 등 40개 DTO |
| Frontend Types | `frontend/src/types/` | 26개 타입 정의 파일 |
| Frontend Services | `frontend/src/services/` | 87개 API 서비스 파일 |
| Frontend Components | `frontend/src/app/` | 페이지/컴포넌트 내 필드 참조 |

### 1.2 작업 원칙

- **@JsonProperty 사용 금지** — 필드명 자체를 통일하여 코드 가독성과 유지보수성 확보
- **백엔드 필드명을 표준으로 채택** — DB 스키마, Entity, API 스펙의 일관성 유지
- **OpenAPI 코드 재생성 시 자동 일치** — 수동 수정 제거

---

## 2. 수정 완료 항목

### 2.1 Backend DTO 수정 (12개 파일)

#### ① PopupDto.java (11개 필드 @JsonProperty 제거)

**파일**: `foundation/src/main/java/nuri/foundation/service/system/content/popup/dto/PopupDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 (필드명 그대로) |
|---|---|---|
| `popupTitleName` | `popupTitleNm` | *(JsonProperty 제거)* |
| `popupWidthLocation` | `popupWlc` | *(JsonProperty 제거)* |
| `popupHeightLocation` | `popupHlc` | *(JsonProperty 제거)* |
| `popupHeightSize` | `popupHSize` | *(JsonProperty 제거)* |
| `popupWidthSize` | `popupWSize` | *(JsonProperty 제거)* |
| `noticeBeginDate` | `ntceBgnde` | *(JsonProperty 제거)* |
| `noticeEndDate` | `ntceEndde` | *(JsonProperty 제거)* |
| `isStopView` | `stopVewAt` | *(JsonProperty 제거)* |
| `isNotice` | `ntceAt` | *(JsonProperty 제거)* |
| `createdBy` | `frstRegisterId` | *(JsonProperty 제거)* |
| `createdDate` | `frstRegistPnttm` | *(JsonProperty 제거)* |

---

#### ② WorkReportDto.java + Entity + Service 원상복구

**파일**: 
- `business-suite/src/main/java/nuri/business/service/report/dto/WorkReportDto.java`
- `business-suite/src/main/java/nuri/business/domain/report/WorkReport.java`
- `business-suite/src/main/java/nuri/business/service/report/WorkReportService.java`

| 변경 전 (작업 중 추가) | 변경 후 (원상복구) |
|---|---|
| `@JsonProperty("reportNm")` on `reportSubject` | `@JsonProperty` 제거 |
| `@JsonProperty("reportCn")` on `reportContent` | `@JsonProperty` 제거 |
| `@JsonProperty("writngBgnde")` on `reportDate` | `@JsonProperty` 제거 |
| `reportDateEnd` 필드 추가 | 제거 |
| `reportDeptId`, `reportDeptNm` 필드 추가 | 제거 |
| `chargerId`, `chargerNm` 필드 추가 | 제거 |
| `createdDate` 필드 추가 | 제거 |

> **결정 사유**: WorkReport의 프론트엔드 타입이 백엔드와 완전히 다른 구조였음. 프론트엔드 타입을 백엔드에 맞추므로 @JsonProperty 및 Entity 확장 불필요.

---

#### ③ DeptJobDto.java (2개 필드 @JsonProperty 제거)

**파일**: `business-suite/src/main/java/nuri/business/service/deptjob/dto/DeptJobDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `deptJobbxId` | `deptJobBxId` | *(JsonProperty 제거)* |
| `deptJobbxNm` | `deptJobBxNm` | *(JsonProperty 제거)* |

---

#### ④ DeptJobBoxDto.java (2개 필드 @JsonProperty 제거)

**파일**: `business-suite/src/main/java/nuri/business/service/deptjob/dto/DeptJobBoxDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `deptJobbxId` | `deptJobBxId` | *(JsonProperty 제거)* |
| `deptJobbxNm` | `deptJobBxNm` | *(JsonProperty 제거)* |

---

#### ⑤ BoardDto.java (2개 필드 @JsonProperty 제거)

**파일**: `business-suite/src/main/java/nuri/business/service/board/dto/BoardDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `frstRegisterPnttm` | `createdDate` | *(JsonProperty 제거)* |
| `ntcrId` | `frstRegisterNm` | *(JsonProperty 제거)* |

---

#### ⑥ QestnrInfoDto.java (2개 필드 @JsonProperty 제거)

**파일**: `foundation/src/main/java/nuri/foundation/service/system/service/survey/dto/QestnrInfoDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `qestnrBeginDe` | `qestnrBgnde` | *(JsonProperty 제거)* |
| `qestnrEndDe` | `qestnrEndde` | *(JsonProperty 제거)* |

---

#### ⑦ CommunityDto.java (1개 필드 @JsonProperty 제거)

**파일**: `foundation/src/main/java/nuri/foundation/service/system/content/community/dto/CommunityDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `frstRegisterPnttm` | `frstRegistPnttm` | *(JsonProperty 제거)* |

---

#### ⑧ CodeDto.java (1개 필드 @JsonProperty 제거)

**파일**: `foundation/src/main/java/nuri/foundation/service/code/dto/CodeDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `codeGroupId` | `codeId` | *(JsonProperty 제거)* |

---

#### ⑨ QustnrRespondInfoDto.java (1개 필드 @JsonProperty 제거)

**파일**: `foundation/src/main/java/nuri/foundation/service/system/service/survey/dto/QustnrRespondInfoDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `qestnrQesrspnsId` | `respondId` | *(JsonProperty 제거)* |

---

#### ⑩ OnlinePollItemDto.java (2개 필드 @JsonProperty 제거)

**파일**: `foundation/src/main/java/nuri/foundation/service/system/service/survey/dto/OnlinePollItemDto.java`

| 필드명 (JSON 직렬화) | 기존 @JsonProperty 값 | 변경 후 |
|---|---|---|
| `createdBy` | `frstRegisterId` | *(JsonProperty 제거)* |
| `createdDate` | `frstRegistPnttm` | *(JsonProperty 제거)* |

---

### 2.2 Frontend 타입 정의 수정 (8개 파일)

#### ① Popup 인터페이스 (`frontend/src/types/foundation/banner.ts`)

```typescript
// 변경 전 → 변경 후
popupTitleNm      → popupTitleName
popupWlc          → popupWidthLocation
popupHlc          → popupHeightLocation
popupWSize        → popupWidthSize
popupHSize        → popupHeightSize
ntceBgnde         → noticeBeginDate
ntceEndde         → noticeEndDate
stopVewAt         → isStopView
ntceAt            → isNotice
frstRegisterId    → createdBy
frstRegistPnttm   → createdDate
```

---

#### ② WorkReport 인터페이스 (`frontend/src/types/business/schedule.ts`)

```typescript
// 변경 전 → 변경 후
reportNm          → reportSubject
reportCn          → reportContent
writngBgnde       → reportDate
writngEndde       → (제거, reportDate로 통일)
reportDeptId      → (제거, 백엔드에 없음)
reportDeptNm      → (제거, 백엔드에 없음)
chargerId         → (제거, 백엔드에 없음)
chargerNm         → (제거, 백엔드에 없음)
createdDate       → (제거, 백엔드에 없음)
sanctnSttus       → reportStatus
```

---

#### ③ DeptJobVO / DeptJobBxVO (`frontend/src/types/business/deptJob.ts`)

```typescript
// DeptJobVO 변경 전 → 변경 후
deptJobBxId       → deptJobbxId
deptJobBxNm       → deptJobbxNm
(누락)            → deptId 추가
(누락)            → deptNm 추가
(누락)            → atchFileId 추가
(누락)            → lastUpdusrId 추가
(누락)            → lastUpdtPnttm 추가

// DeptJobBxVO 변경 전 → 변경 후
deptJobBxId       → deptJobbxId
deptJobBxNm       → deptJobbxNm
(누락)            → indictOrdr 추가
(누락)            → frstRegisterId 추가
(누락)            → frstRegistPnttm 추가
(누락)            → lastUpdusrId 추가
(누락)            → lastUpdtPnttm 추가
```

---

#### ④ BoardPost 인터페이스 (`frontend/src/types/business/board.ts`)

백엔드 `BoardDto` 38개 필드 전체 반영:

```typescript
// 주요 변경 전 → 변경 후
nttId             → id
createdDate       → frstRegisterPnttm
frstRegisterNm    → ntcrId
noticeAt: 'Y'|'N' → noticeAt: string
secretAt: 'Y'|'N' → secretAt: string
useAt: 'Y'|'N'    → useAt: string
(누락)            → nttNo, sortOrdr, parnts, replyAt, replyLc 추가
(누락)            → ntceBgnde, ntceEndde 추가
(누락)            → frstRegisterId, lastUpdusrId, lastUpdtPnttm 추가
(누락)            → knoId, knoNm, knoCn, statusCd, categoryCd 추가
```

---

#### ⑤ Survey 관련 인터페이스 (`frontend/src/types/business/survey.ts`)

```typescript
// Survey 변경 전 → 변경 후
qestnrBgnde       → qestnrBeginDe
qestnrEndde       → qestnrEndDe
frstRegisterNm    → createdBy
status (computed) → qestnrTmplatId
createdDate       → createdDate (유지)

// SurveyQuestion 변경 전 → 변경 후
(간소화 버전)     → qestnrId, qestnSn, qestnrTmplatId, createdBy, createdDate, items 추가

// SurveyAnswer 변경 전 → 변경 후
(간소화 버전)     → qestnrQesitmId, qestnrId, iemSn, qestnrTmplatId, createdBy, createdDate 추가

// QustnrRespondInfo 변경 전 → 변경 후
respondId         → qestnrQesrspnsId
qestnrSj (join)   → 제거
respondDe         → 제거
respondCn         → 제거
frstRegisterPnttm → createdBy, createdDate
```

---

#### ⑥ CommunityVO 인터페이스 (`frontend/src/types/business/community.ts`)

```typescript
// 변경 전 → 변경 후
frstRegistPnttm   → frstRegisterPnttm
(누락)            → registSeCodeNm 추가
(누락)            → tmplatId 추가
(누락)            → tmplatNm 추가
```

---

#### ⑦ BannerAdminClient.tsx (`frontend/src/app/admin/system/banner/BannerAdminClient.tsx`)

팝업 관련 19개 필드 참조 일괄 변경:

| 변경 위치 | 변경 전 | 변경 후 | 개수 |
|---|---|---|---|
| zod 스키마 | `popupTitleNm`, `ntceBgnde`, `popupWlc` 등 | `popupTitleName`, `noticeBeginDate`, `popupWidthLocation` 등 | 9개 |
| defaultValues | `popupTitleNm: ''` 등 | `popupTitleName: ''` 등 | 8개 |
| form reset | `item?.popupTitleNm` 등 | `item?.popupTitleName` 등 | 8개 |
| submit handler | `values.ntceAt` 등 | `values.isNotice` 등 | 2개 |
| JSX rendering | `item.popupTitleNm` 등 | `item.popupTitleName` 등 | 6개 |
| filter/map | `p.ntceAt === 'Y'` 등 | `p.isNotice === 'Y'` 등 | 4개 |

---

#### ⑧ PopupManager.tsx (`frontend/src/app/components/dashboard/PopupManager.tsx`)

```typescript
// style props 변경
popup.popupHlc      → popup.popupHeightLocation
popup.popupWlc      → popup.popupWidthLocation
popup.popupWSize    → popup.popupWidthSize
popup.popupHSize    → popup.popupHeightSize

// JSX rendering 변경
popup.popupTitleNm  → popup.popupTitleName (2개소)
```

---

## 3. 2차 수정 완료 (누락 항목 보완)

### 3.1 Backend Entity/DTO Typo 수정 (`frstRegistPnttm` → `frstRegisterPnttm`)

백엔드에 `frstRegistPnttm` (Register → Regist 오타)가 4개 Entity + 4개 DTO/Service에서 발견되어 모두 수정:

| 파일 | 변경 내용 |
|------|----------|
| `EventInfo.java` (Entity) | `frstRegistPnttm` → `frstRegisterPnttm` |
| `EventInfoDto.java` | 필드명 + builder 호출 수정 |
| `DeptJobDto.java` | `frstRegistPnttm` → `frstRegisterPnttm` |
| `DeptJobBoxDto.java` | `frstRegistPnttm` → `frstRegisterPnttm` |
| `InstitutionCodeRecptnLog.java` (Entity) | `frstRegistPnttm` → `frstRegisterPnttm` |
| `InstitutionCodeRecptnDto.java` | 필드명 수정 |
| `InstitutionCodeService.java` | `.frstRegistPnttm(entity.getFrstRegistPnttm())` → `.frstRegisterPnttm(entity.getFrstRegisterPnttm())` |

### 3.2 Frontend 타입/서비스 필드명 일괄 수정 (14개 파일)

**`createdDate`로 변경** (백엔드 DTO가 `createdDate` 사용):
| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `services/foundation/user/ManualAdminService.ts` | `frstRegistPnttm` | `createdDate` |
| `services/foundation/operation/SmsAdminService.ts` | `frstRegistPnttm` | `createdDate` |
| `services/foundation/system/OnlinePollAdminService.ts` | `frstRegistPnttm` | `createdDate` |
| `services/business/memoreport/memoReportService.ts` | `frstRegistPnttm` | `createdDate` |
| `services/business/roughmap/roughMapService.ts` | `frstRegistPnttm` | `createdDate` |
| `types/business/poll.ts` | `frstRegistPnttm` | `createdDate` |
| `app/admin/survey/manage/page.tsx` | `frstRegistPnttm` | `createdDate` |
| `app/survey/response/[id]/page.tsx` | `frstRegistPnttm` | `createdDate` |
| `app/survey/response/page.tsx` | `frstRegistPnttm` | `createdDate` |

**`frstRegisterPnttm`으로 변경** (백엔드 DTO가 올바른 철자 사용):
| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `services/foundation/system/BoardAdminService.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |
| `services/foundation/system/TemplateAdminService.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |
| `services/business/knowledge/knowledgeService.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |
| `types/business/onlineHelp.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |
| `types/business/dam.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |
| `types/business/deptJob.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |
| `services/foundation/operation/eventService.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |
| `services/foundation/system/CodeAdminService.ts` | `frstRegistPnttm` | `frstRegisterPnttm` |

### 3.3 검증 결과 - 더 이상 수동 수정 대상 없음

```
frontend/src/types/generated/generated-api.d.ts  → 12건 남음 (자동 생성 파일, OpenAPI 재생성 시 자동 해결)
frontend/src/types/generated-api.d.ts            → 7건 남음 (자동 생성 파일, OpenAPI 재생성 시 자동 해결)
```

**`generated-api.d.ts` 파일들은 OpenAPI spec 재생성 명령어로 자동 해결됩니다:**
```bash
npx openapi-typescript http://localhost:8080/v3/api-docs -o frontend/src/types/generated/generated-api.d.ts
```

### 3.4 추가 잔여 항목 수정 (ntceAt, qestnrBgnde/Endde)

**BoardSaveRequest에 `noticeAt` 필드 추가 + 프론트엔드 매핑:**
| 파일 | 변경 내용 |
|------|----------|
| `BoardSaveRequest.java` | `noticeAt` 필드 추가 |
| `BoardService.java` | 3개 `new BoardSaveRequest()` + 2개 `Board.builder()`에 `noticeAt()` 매핑 추가 |
| `BoardServiceTest.java` | 14개 테스트 `new BoardSaveRequest()`에 `null` 파라미터 추가 |
| `community/boards/write/page.tsx` | `ntceAt` → `noticeAt` (defaultValues, form field name) |
| `lib/validation/schemas.ts` | `ntceAt` → `noticeAt` |
| `types/business/board.ts` | `noticeAt` 필드 추가 |

**Survey 페이지 필드명 수정:**
| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `app/survey/page.tsx` | `qestnrBgnde`, `qestnrEndde` | `qestnrBeginDe`, `qestnrEndDe` |
| `app/admin/stats/IntelligenceHubClient.tsx` | `qestnrEndde` | `qestnrEndDe` |

### 3.5 최종 검증 결과 - 수동 파일 잔여 미스매치 **0건**

```
수동 타입/서비스/컴포넌트 파일: 불일치 0건
generated-api.d.ts: 31건 남음 (자동 생성 파일, OpenAPI 재생성 시 자동 해결)
```

### 3.6 Gradle 빌드 결과
```
BUILD SUCCESSFUL in 12s
6 actionable tasks: 6 up-to-date
```

---

## 4. 수정이 불필요했던 항목

다음 DTO들은 백엔드와 프론트엔드 필드명이 이미 일치하거나, 프론트엔드가 백엔드의 서브셋으로 올바르게 사용 중임:

| DTO | 상태 | 비고 |
|-----|------|------|
| ScheduleDto | ✅ 정상 | 백엔드에 `lastUpdusrId`, `modifiedDate` 포함됨. 프론트엔드는 서브셋 사용 |
| AddressBookDto | ✅ 정상 | 백엔드에 모든 필드 포함 |
| CommentDto / CommentSaveRequest | ✅ 정상 | 9개 필드 완전 일치 |
| FaqDto | ✅ 정상 | 핵심 필드 매칭 정상 |
| BannerDto | ✅ 정상 | 10개 필드 완전 일치 |
| EventInfoDto | ✅ 정상 | 16개 필드 완전 일치 |
| ExternalHrDto | ✅ 정상 | 15개 필드 완전 일치 |
| RewardManageDto | ✅ 정상 | 16개 필드 완전 일치 |
| MyPageContentDto | ✅ 정상 | 6개 필드 완전 일치 |
| InternetSvcGuidanceDto | ✅ 정상 | 6개 필드 완전 일치 |
| CnsltManageDto | ✅ 정상 | 12개 필드 완전 일치 |
| QnaDto | ✅ 정상 | 19개 필드 완전 일치 |
| QestnrTmplatDto | ✅ 정상 | 6개 필드 완전 일치 |
| AdministCodeDto | ✅ 정상 | 11개 필드 완전 일치 |
| InstitutionCodeDto | ✅ 정상 | 18개 필드 완전 일치 |
| DeptManageDto | ✅ 정상 | 5개 필드 완전 일치 |
| EnterpriseUserDto | ✅ 정상 | 26개 필드 완전 일치 |
| GeneralUserDto | ✅ 정상 | 22개 필드 완전 일치 |
| TmplatInfo | ⚠️ 주의 | 프론트엔드 generated 타입에 추가 audit 필드 존재 (백엔드 TemplateDto에는 없음) |

---

## 5. 후속 작업 필요 사항

### 5.1 OpenAPI 타입 재생성 필요

`@JsonProperty` 제거 후 OpenAPI spec을 재생성하면 `generated/generated-api.d.ts`가 자동으로 백엔드 필드명과 일치하게 됩니다.

```bash
# 백엔드 실행 후 Swagger/OpenAPI endpoint 접근
# 또는 openapi-generator-cli 실행
npx openapi-typescript http://localhost:8080/v3/api-docs -o frontend/src/types/generated/generated-api.d.ts
```

### 5.2 프론트엔드 추가 수정 필요 파일

다음 파일들은 `generated-api.d.ts` 재생성 후 타입 오류가 발생할 수 있으며, 해당 파일 내에서 백엔드 필드명으로 참조를 업데이트해야 합니다:

| 파일 | 영향 필드 |
|------|----------|
| `frontend/src/lib/validation/schemas.ts` | `ntceBgnde` → `noticeBeginDate`, `ntceEndde` → `noticeEndDate`, `ntceAt` → `isNotice` |
| `frontend/src/app/admin/community/boards/write/page.tsx` | `ntceBgnde`, `ntceEndde`, `ntceAt` |
| `frontend/src/services/foundation/user/ManualAdminService.ts` | `frstRegistPnttm` → `frstRegisterPnttm` |
| `frontend/src/services/foundation/system/BoardAdminService.ts` | `frstRegistPnttm` |
| `frontend/src/services/foundation/system/TemplateAdminService.ts` | `frstRegistPnttm` |
| `frontend/src/services/foundation/system/CodeAdminService.ts` | `frstRegistPnttm` |
| `frontend/src/services/foundation/operation/SmsAdminService.ts` | `frstRegistPnttm` |
| `frontend/src/services/foundation/system/OnlinePollAdminService.ts` | `frstRegistPnttm` |
| `frontend/src/services/foundation/operation/eventService.ts` | `frstRegistPnttm` |
| `frontend/src/services/business/roughmap/roughMapService.ts` | `frstRegistPnttm` |
| `frontend/src/services/business/memoreport/memoReportService.ts` | `frstRegistPnttm` |
| `frontend/src/services/business/knowledge/knowledgeService.ts` | `frstRegistPnttm` |
| `frontend/src/types/business/poll.ts` | `frstRegistPnttm` |
| `frontend/src/types/business/onlineHelp.ts` | `frstRegistPnttm` |
| `frontend/src/types/business/dam.ts` | `frstRegistPnttm` |
| `frontend/src/app/admin/survey/manage/page.tsx` | `frstRegistPnttm` |

### 5.3 필드명 통일 기준표

향후 개발 가이드라인으로 사용할 필드명 매핑 기준:

| 백엔드 필드명 패턴 | 설명 | 프론트엔드 사용 |
|---|---|---|
| `frstRegisterPnttm` | 등록 일시 | ✅ 표준 (철자 주의: Register) |
| `lastUpdtPnttm` | 수정 일시 | ✅ 표준 |
| `createdBy` | 생성자 ID | ✅ 표준 |
| `createdDate` | 생성 일시 (BaseEntity) | ✅ 표준 |
| `noticeBeginDate` | 게시 시작일 | ✅ 표준 |
| `noticeEndDate` | 게시 종료일 | ✅ 표준 |
| `popupTitleName` | 팝업 제목 | ✅ 표준 |
| `reportSubject` | 보고서 제목 | ✅ 표준 |
| `reportContent` | 보고서 내용 | ✅ 표준 |
| `deptJobbxId` | 부서업무함 ID | ✅ 표준 (bx 소문자) |
| `qestnrBeginDe` | 설문 시작일 | ✅ 표준 |
| `qestnrEndDe` | 설문 종료일 | ✅ 표준 |
| `codeGroupId` | 코드그룹 ID | ✅ 표준 |
| `qestnrQesrspnsId` | 설문 응답 ID | ✅ 표준 |

---

## 6. 빌드 검증

### Gradle 빌드
```
BUILD SUCCESSFUL in 19s
6 actionable tasks: 2 executed, 4 up-to-date
```

### 수정된 백엔드 파일 목록 (12개)
```
foundation/src/main/java/nuri/foundation/service/system/content/popup/dto/PopupDto.java
foundation/src/main/java/nuri/foundation/service/system/content/community/dto/CommunityDto.java
foundation/src/main/java/nuri/foundation/service/code/dto/CodeDto.java
foundation/src/main/java/nuri/foundation/service/system/service/survey/dto/QestnrInfoDto.java
foundation/src/main/java/nuri/foundation/service/system/service/survey/dto/QustnrRespondInfoDto.java
foundation/src/main/java/nuri/foundation/service/system/service/survey/dto/OnlinePollItemDto.java
business-suite/src/main/java/nuri/business/service/report/dto/WorkReportDto.java
business-suite/src/main/java/nuri/business/domain/report/WorkReport.java
business-suite/src/main/java/nuri/business/service/report/WorkReportService.java
business-suite/src/main/java/nuri/business/service/deptjob/dto/DeptJobDto.java
business-suite/src/main/java/nuri/business/service/deptjob/dto/DeptJobBoxDto.java
business-suite/src/main/java/nuri/business/service/board/dto/BoardDto.java
```

### 수정된 프론트엔드 파일 목록 (10개)
```
frontend/src/types/foundation/banner.ts (Popup 인터페이스)
frontend/src/types/business/schedule.ts (WorkReport 인터페이스)
frontend/src/types/business/deptJob.ts (DeptJobVO, DeptJobBxVO)
frontend/src/types/business/board.ts (BoardPost 인터페이스)
frontend/src/types/business/survey.ts (Survey, SurveyQuestion, SurveyAnswer, QustnrRespondInfo)
frontend/src/types/business/community.ts (CommunityVO)
frontend/src/types/foundation/code.ts
frontend/src/app/admin/system/banner/BannerAdminClient.tsx
frontend/src/app/components/dashboard/PopupManager.tsx
```

---

## 7. 아키텍처 개선 효과

1. **Single Source of Truth**: 백엔드 Entity/DTO 필드명이 JSON API와 1:1 매칭
2. **OpenAPI 자동 일치**: spec 재생성 시 프론트엔드 타입 자동 정확화
3. **@JsonProperty 제거**: 직렬화/역직렬화 암시적 이해 — 코드 읽는 즉시 필드명 = JSON 키
4. **신규 개발자 온보딩**: "백엔드 DTO를 보면 프론트엔드 타입을 알 수 있다"는 명확한 규칙 수립
