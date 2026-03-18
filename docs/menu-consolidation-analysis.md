# 메뉴 통폐합 분석 보고서

> 분석 기준: DB `nmenuinfo` 테이블 + 프론트엔드 `modern_route` 라우팅 매핑  
> 작성일: 2026-03-18  
> 총 메뉴: 101개 → **통합 후 약 60개 (약 46% 절감 가능)**

---

## 배경

레거시 전자정부 프레임워크에서 화면 단위(JSP 1개 = 메뉴 1개)로 설계된 메뉴 구조를 Next.js로 마이그레이션하면서, 하나의 현대적 페이지가 여러 레거시 기능을 통합 처리하게 되었습니다. 이로 인해 **동일한 `modern_route`를 가리키는 중복 메뉴**가 다수 발생했습니다.

---

## 중복 메뉴 그룹 (11개 그룹)

---

### 🔴 Group A — 상담 관리 (2개 → 1개)

**대상 경로**: `/admin/help/qna`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 5190000 | 상담답변관리 | CnsltAnswerListInqire | 93 (서비스 운영 관리) |
| 5180000 | 상담관리 | CnsltListInqire | 5030000 (사용자지원) |

**원인**: 레거시에서 "상담목록 조회"와 "상담 답변 등록"이 별개 JSP 화면이었으나, `/admin/help/qna` 페이지에서 **목록 조회 + 답변 등록을 모두 처리**.

**권장 조치**:
- `5180000 상담관리` 삭제
- `5190000` 메뉴명을 **"상담 관리 (Q&A)"** 로 변경
- 상위 메뉴를 93 (서비스 운영 관리) 유지

---

### 🔴 Group B — 배너/팝업/이미지 관리 (5개 → 1개)

**대상 경로**: `/admin/system/banner`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 5370000 | MYPAGE배너관리 | selectBannerMainList | 91 (시스템 기반 설정) |
| 5400000 | 메인이미지관리 | selectMainImageList | 2300 (포털 콘텐츠 및 UI 관리) |
| 5410000 | 메인이미지 반영결과보기 | getMainImageResult | 5000000 (사용자지원) |
| 5340000 | 팝업창관리 | listPopup | 5020000 |
| 5360000 | 배너관리 | selectBannerList | 5020000 |

**원인**: 배너/팝업/메인이미지/반영결과가 모두 `/admin/system/banner` 탭 방식으로 통합됨.

**권장 조치**:
- `5400000`, `5410000`, `5340000`, `5360000` 삭제
- `5370000` 메뉴명을 **"배너 및 팝업 관리"** 로 변경
- 상위 메뉴: 91 (시스템 기반 설정)

---

### 🔴 Group C — 공통코드 관리 (3개 → 1개)

**대상 경로**: `/admin/system/common-code`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 6010000 | 공통분류코드 | EgovCcmCmmnClCodeList | 5100 (기준 정보 및 공통 코드) |
| 6020000 | 공통상세코드 | EgovCcmCmmnDetailCodeList | 5100 |
| 6030000 | 공통코드 | EgovCcmCmmnCodeList | 5100 |

**원인**: 분류코드 → 공통코드 → 상세코드 계층 구조가 레거시에서 별개 화면이었으나, 현재 단일 페이지에서 탭/트리로 통합 관리.

**권장 조치**:
- `6020000`, `6030000` 삭제
- `6010000` 메뉴명을 **"공통코드 관리"** 로 변경

---

### 🔴 Group D — 메뉴 관리 (2개 → 1개)

**대상 경로**: `/admin/system/menus`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 6130000 | 메뉴리스트관리 | EgovMenuListSelect | 5300 (메뉴 구성 및 프로그램 설정) |
| 6160000 | 사이트맵 | EgovSiteMapng | 5300 |

**권장 조치**:
- `6160000` 삭제
- `6130000` 메뉴명을 **"메뉴 관리"** 로 변경

---

### 🔴 Group E — 프로그램 관리 (2개 → 1개)

**대상 경로**: `/admin/system/programs`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 6180000 | 프로그램리스트관리 | EgovProgramListManageSelect | 5300 |
| 6190000 | 프로그램변경요청관리 | EgovProgramChangeRequstSelect | 5300 |

**권장 조치**:
- `6190000` 삭제
- `6180000` 메뉴명을 **"프로그램 관리"** 로 변경

---

### 🔴 Group F — 사용자 유형별 관리 (3개 → 1개)

**대상 경로**: `/admin/user/manage`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 5010000 | 기업회원관리 | EgovEntrprsMberManage | 2100 (임직원 및 부서 관리) |
| 5020000 | 업무사용자관리 | EgovUserManage | 2100 |
| 5040000 | 일반회원관리 | EgovMberManage | 2100 |

**원인**: 레거시에서 기업/업무/일반 회원을 유형별로 다른 화면에서 관리했으나, 현재 단일 사용자 관리 페이지에서 탭으로 구분.

**권장 조치**:
- `5020000`, `5040000` 삭제
- `5010000` 메뉴명을 **"사용자 관리"** 로 변경

---

### 🔴 Group G — 권한 관리 (2개 → 1개)

**대상 경로**: `/admin/security/authority`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 2010000 | 권한관리 | EgovAuthorList | 5010000 |
| 2020000 | 권한그룹관리 | EgovAuthorGroupList | 5010000 |

**권장 조치**:
- `2020000` 삭제
- `2010000` 메뉴명을 **"권한 및 그룹 관리"** 로 변경

---

### 🟡 Group H — 일정 관리 (3개 → 1~2개)

**대상 경로**: `/smart-toolkit/schedule`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 4080000 | 일정관리 | EgovIndvdlSchdulManageList | 1200 (스마트 일정/일지 관리) |
| 4100000 | 전체일정관리 | EgovAllSchdulManageList | 1200 |
| 4160000 | 간부일정관리 | selectLeaderSchdulList | 1200 |

**권장 조치**:
- **단순 통합 시**: `4100000`, `4160000` 삭제, `4080000` → **"일정 관리"**
- **기능 구분 필요 시**: `4080000` → "개인 일정", `4100000` → "전체/부서 일정" (2개 유지, `4160000` 삭제)

---

### 🟡 Group I — 업무 보고 관리 (4개 → 1개)

**대상 경로**: `/smart-toolkit/work-report`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 4090000 | 일지관리 | EgovDiaryManageList | 1200 |
| 4190000 | 주간/월간보고관리 | selectWikMnthngReprtList | 1500 (업무 보고 및 보고함) |
| 4200000 | 메모할일관리 | selectMemoTodoList | 1500 |
| 4210000 | 메모보고 | selectMemoReprtList | 1500 |

**권장 조치**:
- `4090000`, `4200000`, `4210000` 삭제
- `4190000` 메뉴명을 **"업무 보고 관리"** 로 변경

---

### 🟡 Group J — 쪽지함 (3개 → 1개)

**대상 경로**: `/note`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 5500000 | 받은쪽지함관리 | listNoteRecptn | 1300 (통합 커뮤니케이션 센터) |
| 5510000 | 보낸쪽지함관리 | listNoteTrnsmit | 1300 |
| 5490000 | 쪽지관리 | registEgovNoteManage | 1000000 |

**권장 조치**:
- `5500000`, `5490000` 삭제
- `5510000` 메뉴명을 **"쪽지함"** 으로 변경, 상위 메뉴 1300으로 이동

---

### 🟡 Group K — 메일 (2개, 경로 분리 필요)

**현재 경로 혼재**: `/admin/collaboration`

| menu_no | 메뉴명 | progrm_file_nm (레거시) | 상위메뉴 |
|---|---|---|---|
| 4110000 | 메일발송 | insertSndngMailView | 1300 (커뮤니케이션) |
| 4120000 | 발송메일내역 | selectSndngMailList | 94 (감사 및 통계) |

**원인**: 기능이 다름 (발송 vs 내역 조회)에도 동일 경로로 묶여 있고, 상위 메뉴도 다름.

**권장 조치**:
- 메뉴 통합 대신 **경로를 분리**: `/admin/collaboration/mail-send` / `/admin/collaboration/mail-history`
- 각 메뉴의 `modern_route` 업데이트 필요

---

## 전체 요약

| 우선순위 | 그룹 | 현재 메뉴 수 | 통합 후 | 삭제 수 |
|---|---|---|---|---|
| 🔴 HIGH | A. 상담 관리 | 2 | 1 | 1 |
| 🔴 HIGH | B. 배너/팝업/이미지 | 5 | 1 | 4 |
| 🔴 HIGH | C. 공통코드 3종 | 3 | 1 | 2 |
| 🔴 HIGH | D. 메뉴 목록/사이트맵 | 2 | 1 | 1 |
| 🔴 HIGH | E. 프로그램 목록/변경요청 | 2 | 1 | 1 |
| 🔴 HIGH | F. 기업/업무/일반 회원 | 3 | 1 | 2 |
| 🔴 HIGH | G. 권한/권한그룹 | 2 | 1 | 1 |
| 🟡 MED | H. 일정 관리 3종 | 3 | 1~2 | 1~2 |
| 🟡 MED | I. 업무 보고 4종 | 4 | 1 | 3 |
| 🟡 MED | J. 쪽지함 3종 | 3 | 1 | 2 |
| 🟡 MED | K. 메일 (경로 분리) | 2 | 2 | 0 |
| **합계** | | **31개 중복** | **≈ 12개** | **약 19개 삭제** |

> 전체 101개 기준으로는 **약 41개 → 22개 수준** 수렴 예상 (약 46% 절감)

---

## DB 업데이트 SQL (검토 후 실행)

> ⚠️ 실행 전 `nmenucreatdtls` (권한-메뉴 할당) 테이블의 외래키 참조 먼저 정리 필요

```sql
-- =============================
-- 1단계: 권한-메뉴 연결 정리
-- =============================
-- 삭제 대상 menu_no: 5180000, 5400000, 5410000, 5340000, 5360000,
--                    6020000, 6030000, 6160000, 6190000, 5020000,
--                    5040000, 2020000
DELETE FROM nmenucreatdtls
WHERE menu_no IN (
    5180000, 5400000, 5410000, 5340000, 5360000,
    6020000, 6030000, 6160000, 6190000,
    5020000, 5040000, 2020000
);

-- =============================
-- 2단계: 메뉴 삭제
-- =============================
DELETE FROM nmenuinfo
WHERE menu_no IN (
    5180000,                            -- Group A: 상담관리
    5400000, 5410000, 5340000, 5360000, -- Group B: 배너/팝업/이미지
    6020000, 6030000,                   -- Group C: 공통코드
    6160000,                            -- Group D: 사이트맵
    6190000,                            -- Group E: 프로그램변경요청
    5020000, 5040000,                   -- Group F: 업무/일반회원
    2020000                             -- Group G: 권한그룹
);

-- =============================
-- 3단계: 잔존 메뉴 리네임
-- =============================
UPDATE nmenuinfo SET menu_nm = '상담 관리 (Q&A)'    WHERE menu_no = 5190000;
UPDATE nmenuinfo SET menu_nm = '배너 및 팝업 관리'  WHERE menu_no = 5370000;
UPDATE nmenuinfo SET menu_nm = '공통코드 관리'       WHERE menu_no = 6010000;
UPDATE nmenuinfo SET menu_nm = '메뉴 관리'           WHERE menu_no = 6130000;
UPDATE nmenuinfo SET menu_nm = '프로그램 관리'       WHERE menu_no = 6180000;
UPDATE nmenuinfo SET menu_nm = '사용자 관리'         WHERE menu_no = 5010000;
UPDATE nmenuinfo SET menu_nm = '권한 및 그룹 관리'   WHERE menu_no = 2010000;

-- =============================
-- 4단계 (MED): 업무/일정/쪽지 통합
-- =============================
-- I. 업무 보고
DELETE FROM nmenucreatdtls WHERE menu_no IN (4090000, 4200000, 4210000);
DELETE FROM nmenuinfo WHERE menu_no IN (4090000, 4200000, 4210000);
UPDATE nmenuinfo SET menu_nm = '업무 보고 관리' WHERE menu_no = 4190000;

-- J. 쪽지함
DELETE FROM nmenucreatdtls WHERE menu_no IN (5500000, 5490000);
DELETE FROM nmenuinfo WHERE menu_no IN (5500000, 5490000);
UPDATE nmenuinfo SET menu_nm = '쪽지함', upper_menu_no = 1300 WHERE menu_no = 5510000;

-- H. 일정 관리 (간부일정만 삭제 — 개인/전체는 검토 후 결정)
DELETE FROM nmenucreatdtls WHERE menu_no = 4160000;
DELETE FROM nmenuinfo WHERE menu_no = 4160000;
UPDATE nmenuinfo SET menu_nm = '전체 일정 관리' WHERE menu_no = 4100000;

-- K. 메일 경로 분리 (삭제 없이 modern_route만 업데이트)
UPDATE nmenuinfo SET modern_route = '/admin/collaboration/mail-send'
WHERE menu_no = 4110000;
UPDATE nmenuinfo SET modern_route = '/admin/collaboration/mail-history'
WHERE menu_no = 4120000;
```

---

## 적용 후 확인 쿼리

```sql
-- 동일 modern_route를 가진 메뉴가 남아있는지 확인
SELECT modern_route, COUNT(*) as cnt, STRING_AGG(menu_nm, ', ') as menus
FROM nmenuinfo
WHERE modern_route IS NOT NULL
GROUP BY modern_route
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```
