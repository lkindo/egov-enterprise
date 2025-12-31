# 메뉴 및 테이블 관계도

이 문서는 전자정부프레임워크 5.0 (Enterprise) 공통 컴포넌트의 메뉴 구조, 데이터베이스 테이블 관계, 그리고 **현재 마이그레이션(이관) 상태**를 정의합니다.
*테이블명은 `N` 접두어(Legacy 접두어 제거) 정책을 따릅니다.*

### 범례
- ✅ **신규 전환 (Modernized)**: `com.company.project` 패키지로 리팩토링 및 아키텍처 개선 완료
- 🟦 **기존 유지 (Legacy)**: `egovframework.com` 패키지(Enterprise Template) 그대로 사용 (호환성 유지)

---

## 1. 사용자디렉토리/통합인증 (User Directory / Auth)
| 이관 상태 | 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|:---:|---|---|---|---|---|
| ✅ | 로그인정책관리 | selectLoginPolicyList | /uat/uap/selectLoginPolicyList.do | NLOGINPOLICY | LoginPolicyManageController |
| ✅ | 로그인 | egovLoginUsr | /uat/uia/egovLoginUsr.do | NLOGINPOLICY, COMVNUSERMASTER | AuthController |

## 2. 보안 (Security)
| 이관 상태 | 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|:---:|---|---|---|---|---|
| ✅ | 권한관리 | EgovAuthorList | /sec/ram/EgovAuthorList.do | NAUTHORINFO | AuthorManageController |
| ✅ | 권한그룹관리 | EgovAuthorGroupList | /sec/rgm/EgovAuthorGroupList.do | NAUTHORGROUPINFO | AuthorRoleManageController |
| ✅ | 그룹관리 | EgovGroupList | /sec/gmt/EgovGroupList.do | NGROUPINFO | GroupManageController |
| ✅ | 롤관리 | EgovRoleList | /sec/rmt/EgovRoleList.do | NROLEINFO | RoleManageController |
| ✅ | 부서권한관리 | EgovDeptAuthorList | /sec/drm/EgovDeptAuthorList.do | NDEPTAUTHOR | AuthorManageController |

## 3. 통계/리포팅 (Statistics)
| 이관 상태 | 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|:---:|---|---|---|---|---|
| ✅ | 게시물통계 | selectBbsStats | /sts/bst/selectBbsStats.do | NBBS, NSTATISTIC | BbsUserStatsController |
| ✅ | 사용자통계 | selectUserStats | /sts/ust/selectUserStats.do | NUSERSTATS | StatisticsController |
| ✅ | 접속통계 | selectConectStats | /sts/cst/selectConectStats.do | NCONECTSTATS | ConnectStatsController |
| ✅ | 화면통계 | selectScrinStats | /sts/sst/selectScrinStats.do | NSCRINSTATS | StatisticsController |
| ✅ | 보고서통계 | selectReprtStatsListView | /sts/rst/selectReprtStatsListView.do | NREPRTSTATS | StatisticsController |
| ✅ | 자료이용현황통계 | selectDtaUseStatsList | /sts/dst/selectDtaUseStatsList.do | NDTAUSESTATS | StatisticsController |

## 4. 협업 (Collaboration)
| 이관 상태 | 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|:---:|---|---|---|---|---|
| ✅ | 게시판속성관리 | SelectBBSMasterInfs | /cop/bbs/SelectBBSMasterInfs.do | NBBSMASTER | BBSManageController |
| ✅ | 게시판사용정보 | selectBBSUseInfs | /cop/com/selectBBSUseInfs.do | NBBSUSE | BBSManageController |
| 🟦 | 템플릿관리 | selectTemplateInfs | /cop/tpl/selectTemplateInfs.do | NTMPLATINFO | - |
| 🟦 | 스크랩 목록 | selectScrapList | /cop/scp/selectScrapList.do | NSCRAP | - |
| 🟦 | 커뮤니티관리 | selectCmmntyInfs | /cop/cmy/selectCmmntyInfs.do | NCMMNTY | - |
| 🟦 | 문자메시지 | selectSmsList | /cop/sms/selectSmsList.do | NSMS | - |
| 🟦 | 부서일정관리 | EgovDeptSchdulManageList | /cop/smt/dsm/EgovDeptSchdulManageList.do | NSCHDULINFO | - |
| 🟦 | 일정관리 | EgovIndvdlSchdulManageList | /cop/smt/sim/EgovIndvdlSchdulManageList.do | NSCHDULINFO | - |
| 🟦 | 일지관리 | EgovDiaryManageList | /cop/smt/dsm/EgovDiaryManageList.do | NDIARYINFO | - |
| 🟦 | 전체일정관리 | EgovAllSchdulManageList | /cop/smt/sam/EgovAllSchdulManageList.do | NSCHDULINFO | - |
| 🟦 | 메일발송 | insertSndngMailView | /cop/ems/insertSndngMailView.do | NSNDNGMAILREGIST | - |
| 🟦 | 발송메일내역 | selectSndngMailList | /cop/ems/selectSndngMailList.do | NSNDNGMAILREGIST | - |
| 🟦 | 명함관리 | selectNcrdInfs | /cop/ncm/selectNcrdInfs.do | NNCRD | - |
| 🟦 | 주소록관리 | selectAdbkList | /cop/adb/selectAdbkList.do | NADBK | - |
| 🟦 | 간부일정관리 | selectLeaderSchdulList | /cop/smt/lsm/usr/selectLeaderSchdulList.do | NLEADERSCHDUL | - |
| 🟦 | 부서업무함관리 | selectDeptJobBxList | /cop/smt/djm/selectDeptJobBxList.do | NDEPTJOBBX | - |
| 🟦 | 주간/월간보고관리 | selectWikMnthngReprtList | /cop/smt/wmr/selectWikMnthngReprtList.do | NWIKMNTHNGREPRT | - |
| 🟦 | 메모할일관리 | selectMemoTodoList | /cop/smt/mtm/selectMemoTodoList.do | NMEMOTODO | - |
| 🟦 | 메모보고 | selectMemoReprtList | /cop/smt/mrm/selectMemoReprtList.do | NMEMOREPRT | - |

## 5. 사용자지원 (User Support)
| 이관 상태 | 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|:---:|---|---|---|---|---|
| ✅ | 기업회원관리 | EgovEntrprsMberManage | /uss/umt/EgovEntrprsMberManage.do | NENTRPRSMBER | UserManageController |
| ✅ | 업무사용자관리 | EgovUserManage | /uss/umt/EgovUserManage.do | NENTRPRSUSER, GNRL_MBER | UserManageController |
| 🟦 | 부서관리 | selectDeptManageListView | /uss/umt/dpt/selectDeptManageListView.do | NDEPT | - |
| ✅ | 일반회원관리 | EgovMberManage | /uss/umt/EgovMberManage.do | NGNRLMBER | UserManageController |
| 🟦 | 약관관리 | StplatListInqire | /uss/sam/stp/StplatListInqire.do | NSTPLATINFO | - |
| 🟦 | 저작권보호정책 | CpyrhtPrtcPolicyListInqire | /uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do | NCPYRHTPRTCPOLICY | - |
| 🟦 | 개인정보보호정책 | listIndvdlInfoPolicy | /uss/sam/ipm/listIndvdlInfoPolicy.do | NINDVDLINFOPOLICY | - |
| 🟦 | 온라인매뉴얼 | listOnlineManual | /uss/olh/omm/listOnlineManual.do | NONLINEMANUAL | - |
| 🟦 | 설문관리 | EgovQustnrManageList | /uss/olp/qmc/EgovQustnrManageList.do | NQUSTNRMANAGE | - |
| ✅ | 설문조사 | EgovQustnrRespondInfoManageList | /uss/olp/qri/EgovQustnrRespondInfoManageList.do | NQUSTNRRESPONDINFO | QustnrRespondInfoController |

## 6. 시스템관리 (System Management)
| 이관 상태 | 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|:---:|---|---|---|---|---|
| ✅ | 공통분류코드 | EgovCcmCmmnClCodeList | /sym/ccm/ccc/EgovCcmCmmnClCodeList.do | NCMMNCLCODE | CcmManageController |
| ✅ | 공통상세코드 | EgovCcmCmmnDetailCodeList | /sym/ccm/cde/EgovCcmCmmnDetailCodeList.do | NCMMNDETAILCODE | CcmManageController |
| ✅ | 공통코드 | EgovCcmCmmnCodeList | /sym/ccm/cca/EgovCcmCmmnCodeList.do | NCMMNCODE | CcmManageController |
| ✅ | 우편번호관리 | EgovCcmZipList | /sym/ccm/zip/EgovCcmZipList.do | NZIP | ZipManageController |
| ✅ | 행정코드관리 | EgovCcmAdministCodeList | /sym/ccm/adc/EgovCcmAdministCodeList.do | NADMINISTCODE | CcmManageController |
| ✅ | 로그관리 | SelectSysLogList | /sym/log/lgm/SelectSysLogList.do | NSYSLOG | LogManageController |
| ✅ | 사용로그관리 | SelectUserLogList | /sym/log/ulg/SelectUserLogList.do | NUSERLOG | LogManageController |
| ✅ | 시스템이력관리 | SelectSysHistoryList | /sym/log/slg/SelectSysHistoryList.do | NSYSHISTORY | LogManageController |
| ✅ | 메뉴리스트관리 | EgovMenuListSelect | /sym/mnu/mpm/EgovMenuListSelect.do | NMENUINFO | MenuManageController |
| ✅ | 메뉴생성관리 | EgovMenuCreatManageSelect | /sym/mnu/mcm/EgovMenuCreatManageSelect.do | NMENUCREATDTLS | MenuCreateController |
| ✅ | 프로그램관리 | EgovProgramListManageSelect | /sym/prm/EgovProgramListManageSelect.do | NPROGRMLIST | ProgramController |
| 🟦 | 네트워크관리 | selectNtwrkList | /sym/sym/nwk/selectNtwrkList.do | NNTWRKINFO | - |
| 🟦 | 서버정보관리 | selectServerEqpmnList | /sym/sym/srv/selectServerEqpmnList.do | NSERVEREQPMNINFO | - |

## 7. 시스템/서비스연계 (System Connection)
| 이관 상태 | 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|:---:|---|---|---|---|---|
| 🟦 | 시스템연계관리 | getSystemCntcList | /sym/sci/cnt/getSystemCntcList.do | NSYSTEMCNTC | - |
| 🟦 | 연계기관관리 | getCntcInsttList | /sym/sci/cnt/getCntcInsttList.do | NCNTCINSTT | - |

---
**작성일**: 2025-12-31
**작성자**: AntiGravity Agent
