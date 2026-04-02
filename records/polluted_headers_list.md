# Polluted Headers Identification Results

The following files in `frontend/src` have been identified as having "Polluted Headers" (unintended string literals or corrupted comments on the first line).

## 1. Top-Level String Literal Pollution (Directly on Line 1)

These files have a character string literal followed by a semicolon as the very first line, which is syntactically misplaced for React/Next.js files.

| File Path | Polluted Header Content (Raw) |
| :--- | :--- |
| `app/admin/collaboration/scraps/insertScrap/page.tsx` | `'스크랩명을 입력해주세요.';` |
| `app/admin/collaboration/scraps/selectScrapList/page.tsx` | `'삭제하시겠습니까?';` |
| `app/admin/community/boards/write/page.tsx` | `'제목을 입력해 주세요.';` |
| `app/admin/help/KnowledgeHubClient.tsx` | `"위키, FAQ 및 게시판 통합 검색...";` |
| `app/admin/sanctn/WorkflowHubClient.tsx` | `'활성';` |
| `app/admin/stats/AdminStatsClient.tsx` | `'인텔리전스 노드';` |
| `app/admin/stats/GenericStatsClient.tsx` | `"게시물 수";` |
| `app/admin/survey/SurveyHubClient.tsx` | `'2024년 상반기 직원 만족도 조사';` |
| `app/admin/system/common-code/CommonCodeClient.tsx` | `'상세 코드 삭제';` |
| `app/admin/system/common-code/CommonCodeHubClient.tsx` | `"표준코드";` |
| `app/admin/system/ism/IsmClient.tsx` | `'성공적으로 승인';` |
| `app/admin/system/layout/LayoutManagerClient.tsx` | `'테마 설정이 성공적으로 반영되었습니다.';` |
| `app/admin/system/network/NetworkAdminClient.tsx` | `'네트워크 자산 삭제';` |
| `app/admin/system/programs/ProgramAdminClient.tsx` | `'데이터를 불러오는 중 오류가 발생했습니다.';` |
| `app/admin/user/absences/AbsenceAdminClient.tsx` | `'부재';` |
| `app/admin/user/departments/DeptAdminClient.tsx` | `'부서 목록을 불러오지 못했습니다.';` |
| `app/admin/user/indvdl-info-policy/PrivacyPolicyClient.tsx` | `'개인정보 처리 방침이 업데이트되었습니다.';` |
| `app/admin/uss/ion/sms/SmsAdminClient.tsx` | `'발송 내역을 불러오지 못했습니다.';` |
| `app/admin/uss/olh/online-manual/ManualAdminClient.tsx` | `'매뉴얼 목록을 불러오지 못했습니다.';` |
| `app/admin/workspace/mypage/page.tsx` | `'콘텐츠 정보를 불러오지 못했습니다.';` |
| `app/components/dashboard/PopupManager.tsx" | `"오늘 하루 보지 않기";` |
| `app/components/layout/command-palette.tsx` | `'통계 대시보드';` |
| `app/components/ui/confirm-modal.tsx` | `'痍⑥냼';` |
| `app/components/ui/global-command-center.tsx` | `'메뉴';` |
| `app/components/ui/image-lightbox.tsx` | `"확대 이미지";` |
| `app/components/ui/national-distribution-map.tsx` | `'서울/강원';` |
| `app/components/ui/notification-sender.tsx` | `"[알림] 시스템 유지보수 안내..."` |
| `app/components/ui/smart-form-builder.tsx` | `"신규 행정 서식";` |
| `app/components/ui/smart-form-renderer.tsx` | `"필수 동의 항목입니다.";` |
| `app/components/ui/smart-notification-hub.tsx` | `'보안 정책 변경 안내';` |
| `app/components/ui/smart-onboarding-hub.tsx` | `"차세대 공공 행정 표준을..."` |
| `app/components/ui/standard-data-table.tsx` | `"행 선택";` |
| `app/components/ui/standard-date-picker.tsx` | `'?좎쭨 ?좏깮';` (Mojibake!) |
| `app/components/ui/standard-editor.tsx` | `"내용을 입력하세요...";` |
| `app/components/ui/standard-onboarding-tour.tsx` | `"eGov 5.0 현대화 플랫폼에..."` |
| `app/components/ui/standard-search-filter.tsx` | `'필터 접기';` |
| `app/components/ui/user-picker.tsx` | `"사용자 검색 및 선택";` |
| `app/components/ui/visual-audit-timeline.tsx` | `"검색...";` |
| `app/components/ui/visual-organization-chart.tsx` | `'김상무';` |
| `app/search/SearchClient.tsx` | `'공지사항 관리';` |
| `components/admin/system/CommonClCodeForm.tsx` | `"분류코드는 필수입니다.";` |
| `components/admin/system/CommonCodeForm.tsx` | `"코드ID는 필수입니다.";` |
| `components/admin/system/CommonDetailCodeForm.tsx` | `"코드ID는 필수입니다.";` |
| `components/admin/system/MenuForm.tsx` | `"메뉴번호는 필수입니다.";` |
| `components/admin/system/NetworkForm.tsx` | `"관리 항목";` |
| `components/admin/system/ProgramForm.tsx" | `"프로그램파일명은 필수입니다.";` |

## 2. Mojibake-Polluted Header Comments (Logic Context)

These files contain Mojibake in the top-level comments or logic headers.

| File Path | Content Snippet |
| :--- | :--- |
| `middleware.ts` | `// 0. ?덇굅님寃쎈줈 由щ떎?대젆님...` |
| `ssr_debug.ts` | `// ?섎뱶濡?寃€?쒕뱶...` |
| `app/loading.tsx` | `<p>... ?ㅼ떆媛님쒖뒪님臾닿껐님피드</p>` |
| `app/components/ui/app-notification-drawer.tsx` | `<p>... ?ㅼ떆媛님쒖뒪님臾닿껐님피드</p>` |
| `app/components/ui/workflow-canvas.tsx` | `<h4>... ?뚰겕?뚮줈님?명뀛由ъ쟾님</h4>` |

---
**Next Step:** Cleanup "Header Pollution" in Group 1 by removing the first line. Then perform Group 2 and in-code Korean restoration for all files.
