# 메뉴 및 테이블 관계도

이 문서는 전자정부프레임워크 5.0 (Enterprise) 공통 컴포넌트의 메뉴 구조, 데이터베이스 테이블 관계, 그리고 **현재 마이그레이션(이관) 상태**를 정의합니다.
*테이블명은 `N` 접두어(Legacy 접두어 제거) 정책을 따릅니다.*

### 범례
- ✅ **신규 전환 (Modernized)**: `com.company.project` 패키지로 리팩토링 및 Next.js 14 UI 구현 완료
- 🟦 **기존 유지 (Legacy)**: `egovframework.com` 패키지(Enterprise Template) 그대로 사용 (호환성 유지)

---

## 1. 관리자 및 시스템 서비스 (Admin & System)

### 1.1. 사용자 및 보안 관리 (`admin/user`, `admin/security`)
| 이관 상태 | 메뉴명 | Modern URL (Next.js) | Legacy URL (.do) | 주요 테이블 |
|:---:|---|---|---|---|
| ✅ | 로그인정책관리 | `/admin/user/manage` | `/uat/uap/selectLoginPolicyList.do` | NLOGINPOLICY |
| ✅ | 권한관리 | `/admin/security/authority` | `/sec/ram/EgovAuthorList.do` | NAUTHORINFO |
| ✅ | 그룹관리 | `/admin/security/group` | `/sec/gmt/EgovGroupList.do` | NGROUPINFO |
| ✅ | 롤관리 | `/admin/security/role` | `/sec/rmt/EgovRoleList.do` | NROLEINFO |
| ✅ | 사용자관리 | `/admin/user/manage` | `/uss/umt/EgovUserManage.do` | NENTRPRSUSER |

### 1.2. 시스템 설정 및 로그 (`admin/system`)
| 이관 상태 | 메뉴명 | Modern URL (Next.js) | Legacy URL (.do) | 주요 테이블 |
|:---:|---|---|---|---|
| ✅ | 공통코드관리 | `/admin/system/common-code` | `/sym/ccm/cca/EgovCcmCmmnCodeList.do` | NCMMNCODE |
| ✅ | 메뉴관리 | `/admin/system/menus` | `/sym/mnu/mpm/EgovMenuListSelect.do` | NMENUINFO |
| ✅ | 프로그램관리 | `/admin/system/programs` | `/sym/prm/EgovProgramListManageSelect.do` | NPROGRMLIST |
| ✅ | 로그관리 | `/admin/system/logs` | `/sym/log/lgm/SelectSysLogList.do` | NSYSLOG |
| ✅ | 파일관리 | `/admin/system/files` | `/cmm/fms/selectFileInfs.do` | NFILE |
| ✅ | 댓글관리 | `/admin/system/comments` | `/cop/cmt/selectCommentList.do` | NCOMMENT |
| ✅ | 네트워크관리 | `/admin/system/network` | `/sym/sym/nwk/selectNtwrkList.do` | NNTWRKINFO |
| ✅ | 서버정보관리 | `/admin/system/server` | `/sym/sym/srv/selectServerList.do` | NSERVERINFO |
| ✅ | 백업작업관리 | `/admin/system/backup` | `/sym/sym/bak/getBackupOpertList.do` | NBACKUPOPERT |
| ✅ | 장애관리 | `/admin/system/trouble` | `/sym/tbm/tbr/selectTroblReqstList.do` | NTROBLINFO |
| ✅ | 서버자원모니터링 | `/admin/system/monitoring/resource` | `/utl/sys/srm/selectServerResrceMntrngList.do` | NSERVERRESRCELOGINFO |
| ✅ | 프로세스모니터링 | `/admin/system/monitoring/process` | `/utl/sys/prm/selectProcessMonList.do` | NPROCESSMON |
| ✅ | 데이터베이스모니터링 | `/admin/system/monitoring/db` | `/utl/sys/dbm/selectDbMntrngList.do` | NDBMNTRNG |
| ✅ | 파일시스템모니터링 | `/admin/system/monitoring/filesys` | `/utl/sys/fsm/selectFileSysMntrngList.do` | NFILESYSMNTRNG |
| ✅ | HTTP모니터링 | `/admin/system/monitoring/http` | `/utl/sys/htm/selectHttpMonList.do` | NHTTPMON |
| ✅ | 네트워크서비스모니터링 | `/admin/system/monitoring/ntwrksvc` | `/utl/sys/nsm/selectNtwrkSvcMntrngList.do` | NNTWRKSVCMNTRNG |
| ✅ | 송수신모니터링 | `/admin/system/monitoring/trsmrcv` | `/utl/sys/trm/selectTrsmrcvMntrngList.do` | NTRSMRCVMNTRNG |
| ✅ | 서버동기화관리 | `/admin/system/sync-server` | `/utl/sys/ssy/selectSynchrnServerList.do` | NSYNCSRVINFO |

## 2. 협업 및 업무 지원 (Collaboration & Operations)

### 2.1. 게시판 및 컨텐츠 서비스 (`cop`)
| 이관 상태 | 메뉴명 | Modern URL (Next.js) | Legacy URL (.do) | 주요 테이블 |
|:---:|---|---|---|---|
| ✅ | 게시판 | `/cop/bbs/selectBoardList` | `/cop/bbs/selectBoardList.do` | NBBS |
| ✅ | 게시판관리 | `/admin/community` | `/cop/bbs/SelectBBSMasterInfs.do` | NBBSMASTER |
| ✅ | 동호회관리 | `/admin/community` | `/cop/cmy/selectCmmntyInfs.do` | NCMMNTY |
| ✅ | 스크랩관리 | `/cop/scp/selectScrapList` | `/cop/scp/selectScrapList.do` | NSCRAP |
| ✅ | 명함/주소록 | `/cop/adb/selectAddressBookList` | `/cop/adb/selectAdbkList.do` | NADBK, NNCRD |
| ✅ | 약식결재관리 | `/admin/system/ism` | `/uss/ion/ism/selectInfrmlSanctnList.do` | NINFRMLSANCTN |
| ✅ | 쪽지관리 | `/note` | `/uss/ion/ntm/selectNoteManageList.do` | NNOTE |

### 2.2. 일정 및 보고 (`cop/smt`)
| 이관 상태 | 메뉴명 | Modern URL (Next.js) | Legacy URL (.do) | 주요 테이블 |
|:---:|---|---|---|---|
| ✅ | 개인일정관리 | `/cop/smt/sim/selectScheduleList` | `/cop/smt/sim/EgovIndvdlSchdulManageList.do` | NSCHDULINFO |
| ✅ | 부서일정관리 | `/cop/smt/dsm/selectDeptScheduleList` | `/cop/smt/dsm/EgovDeptSchdulManageList.do` | NSCHDULINFO |
| ✅ | 부서업무관리 | `/cop/smt/djm/selectDeptJobList` | `/cop/smt/djm/selectDeptJobBxList.do` | NDEPTJOBBX |
| ✅ | 주간/월간보고 | `/cop/smt/wmr/selectReportList` | `/cop/smt/wmr/selectWikMnthngReprtList.do` | NWIKMNTHNGREPRT |

### 2.3. 부가 서비스 (`uss/ion`)
| 이관 상태 | 메뉴명 | Modern URL (Next.js) | Legacy URL (.do) | 주요 테이블 |
|:---:|---|---|---|---|
| ✅ | 행사관리 | `/uss/ion/events` | `/uss/ion/evt/selectEventManageList.do` | NEVENTINFO |
| ✅ | 행사/캠페인관리 | `/uss/ion/event-campaigns` | `/uss/ion/ecc/selectEventCmpgnList.do` | NEVENTCMPGN |
| ✅ | 휴가관리 | `/uss/ion/vacations` | `/uss/ion/vct/selectVcatnManageList.do` | NVCATNMANAGE |
| ✅ | 포상관리 | `/uss/ion/rewards` | `/uss/ion/rwd/selectRwardManageList.do` | NRWARDMANAGE |
| ✅ | 기념일관리 | `/uss/ion/anniversaries` | `/uss/ion/ans/selectAnnvrsryManageList.do` | NANNVRSRYMANAGE |
| ✅ | 경조사관리 | `/uss/ion/ctsnn` | `/uss/ion/ctn/selectCtsnnManageList.do` | NCTSNNMANAGE |
| ✅ | 사용자부재관리 | `/uss/ion/user-absences` | `/uss/ion/uas/selectUserAbsnceList.do` | NUSERABSNCE |

## 3. 통계 및 지원 서비스 (Stats & Help)

### 3.1. 시스템 통계 (`admin/stats`)
| 이관 상태 | 메뉴명 | Modern URL (Next.js) | Legacy URL (.do) | 주요 테이블 |
|:---:|---|---|---|---|
| ✅ | 사용자통계 | `/admin/stats/user` | `/sts/ust/selectUserStats.do` | NUSERSTATS |
| ✅ | 화면통계 | `/admin/stats/screen` | `/sts/sst/selectScrinStats.do` | NSCRINSTATS |

### 3.2. 도움말 및 설문 (`admin/help`, `survey`)
| 이관 상태 | 메뉴명 | Modern URL (Next.js) | Legacy URL (.do) | 주요 테이블 |
|:---:|---|---|---|---|
| ✅ | FAQ | `/admin/help` | `/uss/olh/faq/selectFaqList.do` | NFAQINFO |
| ✅ | Q&A | `/admin/help` | `/uss/olh/qna/selectQnaList.do` | NQNAINFO |
| ✅ | 설문조사 | `/survey` | `/uss/olp/qri/EgovQustnrRespondInfoList.do` | NQUSTNRRESPONDINFO |
| ✅ | 약관관리 | `/admin/terms` | `/uss/sam/stp/StplatListInqire.do` | NSTPLATINFO |

---
**최종 수정일**: 2026-02-08
**수정 내용**: 실물 frontend 라우팅 구조 및 task.md 완료 상태 기반 전면 동기화
