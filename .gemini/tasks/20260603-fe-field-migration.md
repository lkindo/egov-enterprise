# FE Field Migration Progress (20260603)

eGov v5 표준 용어 규정에 맞춘 프론트엔드 UI 및 타입 파일 마이그레이션 진행 상황을 추적합니다.

## 진행 상황 체크리스트

### 1단계: FE UI 컴포넌트의 레거시 필드 치환
- [ ] `MonitoringHubClient.tsx` (Line 202) 내 `log.createdDate` -> `log.occrrncDe`로 교체
- [ ] `cmy.test.tsx`, `SmsHubClient.tsx`, `SearchClient.tsx`, `survey/response/page.tsx` 내 `createdDate` -> `crtDt`
- [ ] `TemplateAdminClient.tsx` 내 `item.useAt` -> `item.useYn`, `createdDate` -> `crtDt`
- [ ] `NetworkAdminClient.tsx` & `NetworkForm.tsx` 내 `useAt` -> `useYn`
- [ ] `MailHistoryHubClient.tsx` 내 `mail.createdDate` -> `mail.crtDt`
- [ ] 기타 UI 컴포넌트(`.tsx`) 내 `useAt` -> `useYn` 전수 치환

### 2단계: 서비스 명세 및 임포트 DTO 필드 치환
- [ ] `OperationAdminService.ts`, `SmsAdminService.ts`, `eventService.ts`, `OnlinePollAdminService.ts`, `ManualAdminService.ts` 내 `createdDate` -> `crtDt`

### 3단계: generated-api.d.ts 및 generated-zod.ts 타입 수동 수정
- [ ] `frontend/src/types/generated/generated-api.d.ts` 내의 `createdDate`, `useAt`, `inqireCo`, `nttCn`, `ntcrNm` 등을 `crtDt`, `useYn`, `inqCnt`, `pstCn`, `userNm` 등으로 수동 매핑 교체 (또는 codegen 확인)
- [ ] `frontend/src/types/generated-api.d.ts` 및 `generated-zod.ts` 수동 수정

### 4단계: 컴파일 게이트 검증 및 omnibus-field-checker.js 무결성 검증
- [ ] 프론트엔드 타입 체크 `npx tsc --noEmit` 실행하여 에러 없음 확인
- [ ] `omnibus-field-checker.js` 재구동하여 위반 건수가 0건이 되었는지 루프 검증 수행
