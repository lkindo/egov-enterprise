# 메뉴-경로 전수 조사 결과 보고서

| 조사 일시 | 2026-04-05 |
| :--- | :--- |
| **조사 대상** | DB `nmenuinfo` 테이블 vs `frontend/src/app` 파일 시스템 라우트 |
| **총 메뉴 수** | 90개 |

## 1. 개요
데이터베이스에 정의된 모든 메뉴가 실제 프론트엔드 파일 시스템(`page.tsx`)과 정상적으로 연결되어 있는지 전수 조사를 실시하였습니다.

## 2. 조사 결과 요약
- **정상 연결**: 모든 메뉴가 실제 파일 시스템 상의 유효한 경로를 가리키고 있습니다. (Next.js App Router 기준)
- **파일 누락 (File Missing)**: 없음.
- **의심 항목 (Suspicious)**: 중복 연결, 테스트용 메뉴, 미사용 표기 메뉴 등 **12건** 확인.

## 3. 의심스러운 메뉴 상세 (보고 필요)

| 메뉴 명 | 연결 경로 (Modern Route) | 의심 사유 |
| :--- | :--- | :--- |
| `test` | `/admin/community/boards/selectBoardList?bbsId=BBSMSTR_...120` | 테스트용 데이터로 보임. 실 운영 환경에서 제거 필요. |
| `[미사용] 서베이기능그룹` | `/admin/survey/hub?tab=manage` | '미사용' 표기가 되어 있으나 메뉴 목록에는 존재함. 중복 가능성. |
| `[미사용] 통계 폴더` | `/admin/system/monitoring` | '미사용' 표기된 폴더가 루트 직계로 존재. |
| `부서일정관리` / `일정 관리` | `/admin/work-hub?tab=calendar` | 두 메뉴가 동일한 경로 및 탭을 가리킴. 명칭 조율 또는 통합 필요. |
| `주소록관리` / `인적 자원 및 주소록 관리` | `/admin/collaboration/address-book` | 상위 폴더와 하위 메뉴가 동일한 경로를 가리켜 중복 이동 발생 가능. |
| `설문템플릿관리` | `/admin/survey/hub?tab=manage` | `설문 및 여론조사 관리` 메뉴와 동일한 탭(`manage`)을 가리킴. |
| `게시판사용정보` | `/admin/community/boards` | 상위 메뉴(`게시판 및 커뮤니티 관리`)와 동일한 경로를 가리킴. |
| `로그인` | `/admin/system/monitoring/hub?tab=security` | `통합 보안 및 접속 정책` 메뉴와 동일한 탭을 가리킴. |
| `보안 감사 로그` | `/admin/system/monitoring/hub?tab=security` | 위 메뉴들과 동일한 탭을 가리킴. 보안 탭의 여러 정보 중 하나일 가능성 높음. |

## 4. 전수 조사 데이터 (주요 항목 발췌)

| 메뉴 명 | DB 경로 (modern_route) | 상태 | 비고 |
| :--- | :--- | :--- | :--- |
| 🏢 워크스페이스 | (Link 없음) | OK (Category) | - |
| 🔍 통합 검색 | `/search` | OK | |
| 개인 및 부서 일정 | `/admin/work-hub?tab=job` | OK | |
| 부서일정관리 | `/admin/work-hub?tab=calendar` | OK | **의심 (중복)** |
| 일정 관리 | `/admin/work-hub?tab=calendar` | OK | **의심 (중복)** |
| 문자메시지 | `/admin/uss/ion/sms` | OK | |
| 메일발송 | `/admin/collaboration/mail-send` | OK | |
| 쪽지함 | `/admin/collaboration/mail-history` | OK | |
| 💌 업무 쪽지함 | `/note` | OK | |
| 주소록관리 | `/admin/collaboration/address-book` | OK | **의심 (중복)** |
| 설문 및 여론조사 관리 | `/admin/survey/hub?tab=manage` | OK | |
| 설문템플릿관리 | `/admin/survey/hub?tab=manage` | OK | **의심 (중복)** |
| 📝 온라인 설문 참여 | `/survey` | OK | |
| 도움말 | `/admin/help/faq?tab=WIKI` | OK | |
| FAQ관리 | `/admin/help/faq?tab=FAQ` | OK | |
| 상담 관리 (Q&A) | `/admin/help/faq?tab=QNA` | OK | |

## 5. 결론 및 제언
- **기술적 정합성**: 모든 메뉴 아이템이 실제 구현된 Next.js 페이지와 정확히 매칭되고 있어 링크 단절 오류는 없습니다.
- **관리적 정합성**: `[미사용]` 표기가 된 메뉴 데이터와 테스트용 데이터(`test`)가 운영 DB 메뉴 테이블에 잔존하고 있어 정리가 권장됩니다.
- **사용자 경험(UX)**: 동일한 경로를 다른 이름으로 여러 번 노출하는 경우가 많으므로, 메뉴 통합을 통해 가독성을 높이는 것을 제언드립니다.
