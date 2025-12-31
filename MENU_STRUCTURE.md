# 메뉴 및 테이블 관계도

이 문서는 전자정부프레임워크 5.0 (Enterprise) 공통 컴포넌트의 메뉴 구조와 각 메뉴가 사용하는 주요 데이터베이스 테이블의 관계를 정의합니다.
*테이블명은 `com` 패키지 마이그레이션 및 접두어(`COMT`/`LETT`) 제거 정책(`N` 접두어 사용)을 따릅니다.*

## 1. 사용자디렉토리/통합인증 (User Directory / Auth)
| 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|---|---|---|---|---|
| 로그인정책관리 | selectLoginPolicyList | /uat/uap/selectLoginPolicyList.do | NLOGINPOLICY | 로그인 정책 |
| 로그인 | egovLoginUsr | /uat/uia/egovLoginUsr.do | NLOGINPOLICY, COMVNUSERMASTER | 로그인 처리 |

## 2. 보안 (Security)
| 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|---|---|---|---|---|
| 권한관리 | EgovAuthorList | /sec/ram/EgovAuthorList.do | NAUTHORINFO | 권한 정보 |
| 권한그룹관리 | EgovAuthorGroupList | /sec/rgm/EgovAuthorGroupList.do | NAUTHORGROUPINFO | 권한-롤 매핑 |
| 그룹관리 | EgovGroupList | /sec/gmt/EgovGroupList.do | NGROUPINFO | 사용자 그룹 |
| 롤관리 | EgovRoleList | /sec/rmt/EgovRoleList.do | NROLEINFO | 롤(Role) 정보 |
| 부서권한관리 | EgovDeptAuthorList | /sec/drm/EgovDeptAuthorList.do | NDEPTAUTHOR | 부서별 권한 |

## 3. 통계/리포팅 (Statistics)
| 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|---|---|---|---|---|
| 게시물통계 | selectBbsStats | /sts/bst/selectBbsStats.do | NBBS, NSTATISTIC (추론) | 게시물 생성 통계 |
| 사용자통계 | selectUserStats | /sts/ust/selectUserStats.do | NUSERSTATS | 사용자 가입 통계 |
| 접속통계 | selectConectStats | /sts/cst/selectConectStats.do | NCONECTSTATS | 접속 로그 통계 |
| 화면통계 | selectScrinStats | /sts/sst/selectScrinStats.do | NSCRINSTATS | 화면 조회 통계 |
| 보고서통계 | selectReprtStatsListView | /sts/rst/selectReprtStatsListView.do | NREPRTSTATS | 보고서 작성 통계 |
| 자료이용현황통계 | selectDtaUseStatsList | /sts/dst/selectDtaUseStatsList.do | NDTAUSESTATS | 자료 다운로드 통계 |

## 4. 협업 (Collaboration)
| 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|---|---|---|---|---|
| 게시판속성관리 | SelectBBSMasterInfs | /cop/bbs/SelectBBSMasterInfs.do | NBBSMASTER | 게시판 마스터 |
| 게시판사용정보 | selectBBSUseInfs | /cop/com/selectBBSUseInfs.do | NBBSUSE | 게시판 사용여부 |
| 템플릿관리 | selectTemplateInfs | /cop/tpl/selectTemplateInfs.do | NTMPLATINFO | 디자인 템플릿 |
| 스크랩 목록 | selectScrapList | /cop/scp/selectScrapList.do | NSCRAP | 게시물 스크랩 |
| 커뮤니티관리 | selectCmmntyInfs | /cop/cmy/selectCmmntyInfs.do | NCMMNTY | 커뮤니티 정보 |
| 문자메시지 | selectSmsList | /cop/sms/selectSmsList.do | NSMS | SMS 전송 내역 |
| 부서일정관리 | EgovDeptSchdulManageList | /cop/smt/dsm/EgovDeptSchdulManageList.do | NSCHDULINFO | 부서 일정 |
| 일정관리 | EgovIndvdlSchdulManageList | /cop/smt/sim/EgovIndvdlSchdulManageList.do | NSCHDULINFO | 개인 일정 |
| 일지관리 | EgovDiaryManageList | /cop/smt/dsm/EgovDiaryManageList.do | NDIARYINFO | 업무 일지 |
| 전체일정관리 | EgovAllSchdulManageList | /cop/smt/sam/EgovAllSchdulManageList.do | NSCHDULINFO | 전체 일정 통합 |
| 메일발송 | insertSndngMailView | /cop/ems/insertSndngMailView.do | NSNDNGMAILREGIST | 메일 발송 |
| 발송메일내역 | selectSndngMailList | /cop/ems/selectSndngMailList.do | NSNDNGMAILREGIST | 메일 발송 이력 |
| 명함관리 | selectNcrdInfs | /cop/ncm/selectNcrdInfs.do | NNCRD | 명함 정보 |
| 주소록관리 | selectAdbkList | /cop/adb/selectAdbkList.do | NADBK | 주소록 |
| 간부일정관리 | selectLeaderSchdulList | /cop/smt/lsm/usr/selectLeaderSchdulList.do | NLEADERSCHDUL | 간부 일정 |
| 부서업무함관리 | selectDeptJobBxList | /cop/smt/djm/selectDeptJobBxList.do | NDEPTJOBBX | 부서 업무함 |
| 주간/월간보고관리 | selectWikMnthngReprtList | /cop/smt/wmr/selectWikMnthngReprtList.do | NWIKMNTHNGREPRT | 주간/월간 보고 |
| 메모할일관리 | selectMemoTodoList | /cop/smt/mtm/selectMemoTodoList.do | NMEMOTODO | 메모/할일 |
| 메모보고 | selectMemoReprtList | /cop/smt/mrm/selectMemoReprtList.do | NMEMOREPRT | 메모 보고 |

## 5. 사용자지원 (User Support)
| 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|---|---|---|---|---|
| 기업회원관리 | EgovEntrprsMberManage | /uss/umt/EgovEntrprsMberManage.do | NENTRPRSMBER | 기업 회원 |
| 업무사용자관리 | EgovUserManage | /uss/umt/EgovUserManage.do | NENTRPRSUSER, GNRL_MBER | 업무 사용자 |
| 부서관리 | selectDeptManageListView | /uss/umt/dpt/selectDeptManageListView.do | NDEPT | 부서 코드 |
| 일반회원관리 | EgovMberManage | /uss/umt/EgovMberManage.do | NGNRLMBER | 일반 회원 |
| 약관관리 | StplatListInqire | /uss/sam/stp/StplatListInqire.do | NSTPLATINFO | 약관 정보 |
| 저작권보호정책 | CpyrhtPrtcPolicyListInqire | /uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do | NCPYRHTPRTCPOLICY | 저작권 정책 |
| 개인정보보호정책 | listIndvdlInfoPolicy | /uss/sam/ipm/listIndvdlInfoPolicy.do | NINDVDLINFOPOLICY | 개인정보 정책 |
| 온라인매뉴얼 | listOnlineManual | /uss/olh/omm/listOnlineManual.do | NONLINEMANUAL | 온라인 매뉴얼 |
| 설문관리 | EgovQustnrManageList | /uss/olp/qmc/EgovQustnrManageList.do | NQUSTNRMANAGE | 설문지 마스터 |
| 설문조사 | EgovQustnrRespondInfoManageList | /uss/olp/qri/EgovQustnrRespondInfoManageList.do | NQUSTNRRESPONDINFO | 설문 참여 결과 |

## 6. 시스템관리 (System Management)
| 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|---|---|---|---|---|
| 공통분류코드 | EgovCcmCmmnClCodeList | /sym/ccm/ccc/EgovCcmCmmnClCodeList.do | NCMMNCLCODE | 공통 분류 코드 |
| 공통상세코드 | EgovCcmCmmnDetailCodeList | /sym/ccm/cde/EgovCcmCmmnDetailCodeList.do | NCMMNDETAILCODE | 공통 상세 코드 |
| 공통코드 | EgovCcmCmmnCodeList | /sym/ccm/cca/EgovCcmCmmnCodeList.do | NCMMNCODE | 공통 코드 |
| 우편번호관리 | EgovCcmZipList | /sym/ccm/zip/EgovCcmZipList.do | NZIP | 우편번호 |
| 행정코드관리 | EgovCcmAdministCodeList | /sym/ccm/adc/EgovCcmAdministCodeList.do | NADMINISTCODE | 행정 코드 |
| 로그관리 | SelectSysLogList | /sym/log/lgm/SelectSysLogList.do | NSYSLOG | 시스템 로그 |
| 사용로그관리 | SelectUserLogList | /sym/log/ulg/SelectUserLogList.do | NUSERLOG | 사용자 로그 |
| 시스템이력관리 | SelectSysHistoryList | /sym/log/slg/SelectSysHistoryList.do | NSYSHISTORY | 시스템 변경 이력 |
| 메뉴리스트관리 | EgovMenuListSelect | /sym/mnu/mpm/EgovMenuListSelect.do | NMENUINFO | 메뉴 마스터 |
| 메뉴생성관리 | EgovMenuCreatManageSelect | /sym/mnu/mcm/EgovMenuCreatManageSelect.do | NMENUCREATDTLS | 권한별 메뉴 생성 |
| 프로그램관리 | EgovProgramListManageSelect | /sym/prm/EgovProgramListManageSelect.do | NPROGRMLIST | 프로그램 정보 |
| 네트워크관리 | selectNtwrkList | /sym/sym/nwk/selectNtwrkList.do | NNTWRKINFO | 네트워크 정보 |
| 서버정보관리 | selectServerEqpmnList | /sym/sym/srv/selectServerEqpmnList.do | NSERVEREQPMNINFO | 서버 H/W 정보 |

## 7. 시스템/서비스연계 (System Connection)
| 메뉴명 (중/소) | 프로그램 파일명 | URL | 주요 연결 테이블 | 비고 |
|---|---|---|---|---|
| 시스템연계관리 | getSystemCntcList | /sym/sci/cnt/getSystemCntcList.do | NSYSTEMCNTC | 타 시스템 연계 |
| 연계기관관리 | getCntcInsttList | /sym/sci/cnt/getCntcInsttList.do | NCNTCINSTT | 연계 기관 정보 |

---
**작성일**: 2025-12-31
**작성자**: AntiGravity Agent
