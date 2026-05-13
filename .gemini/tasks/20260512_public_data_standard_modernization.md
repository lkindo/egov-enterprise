# 📋 전사 DB 현대화 마스터 태스크 트래커

이 문서는 `egov-enterprise` 프로젝트의 모든 DB 오브젝트(132개)에 대한 현대화 진척도를 관리합니다.

---

## 🛠️ 현대화 프로세스
1. **P1 (Mapping)**: 표준 용어 매핑
2. **P2 (VIEW)**: 표준 VIEW (`std_`) 생성
3. **P3 (Normalization)**: 데이터 타입 보정
4. **P4 (Physical)**: 물리 컬럼/테이블 RENAME (Big Bang)

---

## 📋 도메인별 진척도 (전수 리스트)

### 1. 권한 및 보안 (Auth & Security)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nuserinfo` | ✅ | ✅ | ✅ | ⏳ | 사용자정보 |
| `nauthorinfo` | ✅ | ✅ | ✅ | ✅ | 권한정보 |
| `nroleinfo` | ✅ | ✅ | ✅ | ✅ | 롤정보 |
| `nemplyrscrtyestbs` | ✅ | ✅ | ✅ | ✅ | 사용자-권한 매핑 |
| `nauthorrolerelate` | ✅ | ✅ | ✅ | ✅ | 권한-롤 매핑 |
| `nroles_hierarchy` | ✅ | ✅ | ✅ | ✅ | 롤 계층구조 |
| `nloginpolicy` | ✅ | ✅ | ✅ | ✅ | 로그인정책 |
| `nauthorgroupinfo` | ✅ | ✅ | ✅ | ✅ | 권한그룹정보 |
| `nloginlog` | ✅ | ✅ | ✅ | ✅ | 로그인로그 |

### 2. 게시판 및 커뮤니티 (BBS & Community)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nbbs` | ✅ | ✅ | ✅ | ✅ | 게시물 |
| `nbbsmaster` | ✅ | ✅ | ✅ | ✅ | 게시판 마스터 |
| `nbbsmasteroptn` | ✅ | ✅ | ✅ | ✅ | 옵션 |
| `nbbsuse` | ✅ | ✅ | ✅ | ✅ | 활용정보 |
| `nbbsstats` | ✅ | ✅ | ✅ | ✅ | 통계 |
| `nclub` | ✅ | ✅ | ✅ | ✅ | 동호회 |
| `nclubuser` | ✅ | ✅ | ✅ | ✅ | 동호회사용자 |
| `ncmmnty` | ✅ | ✅ | ✅ | ✅ | 커뮤니티 |
| `ncmmntyuser` | ✅ | ✅ | ✅ | ✅ | 커뮤니티사용자 |
| `ncomment` | ✅ | ✅ | ✅ | ✅ | 댓글 |
| `nscrap` | ✅ | ✅ | ✅ | ✅ | 스크랩 |
| `nblog` | ✅ | ✅ | ✅ | ✅ | 블로그 |
| `nbloguser` | ✅ | ✅ | ✅ | ✅ | 블로그사용자 |

### 3. 공통코드 및 기초정보 (Common Code & Base)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `ccmmncode` | ✅ | ✅ | ✅ | ✅ | 공통코드 |
| `ccmmnclcode` | ✅ | ✅ | ✅ | ✅ | 분류코드 |
| `ccmmndetailcode` | ✅ | ✅ | ✅ | ✅ | 상세코드 |
| `cadministcode` | ✅ | ✅ | ✅ | ✅ | 행정코드 |
| `ninsttcode` | ✅ | ✅ | ✅ | ✅ | 기관코드 |
| `zip` | ❌ | ❌ | ❌ | ⏳ | 우편번호(Deleted) |
| `norgnztinfo` | ✅ | ✅ | ✅ | ✅ | 조직정보 |
| `ndeptjob` | ✅ | ✅ | ✅ | ✅ | 부서업무 |
| `nfile` | ✅ | ✅ | ✅ | ✅ | 파일 마스터 |
| `nfiledetail` | ✅ | ✅ | ✅ | ✅ | 파일 상세 |
| `ntmplatinfo` | ✅ | ✅ | ✅ | ✅ | 템플릿정보 |

### 4. 일정 및 설문 (Schedule & Survey)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nschdulinfo` | ✅ | ✅ | ✅ | ✅ | 일정정보 |
| `neventinfo` | ✅ | ✅ | ✅ | ✅ | 행사정보 |
| `nqustnrinfo` | ✅ | ✅ | ✅ | ✅ | 설문지 |
| `nqustnriem` | ✅ | ✅ | ✅ | ✅ | 항목 |
| `nqustnrqesitm` | ✅ | ✅ | ✅ | ✅ | 문항 |
| `nqustnrtmplat` | ✅ | ✅ | ✅ | ✅ | 템플릿 |
| `nqustnrrespondinfo` | ✅ | ✅ | ✅ | ✅ | 설문응답자 |
| `nqustnrrspnsresult` | ✅ | ✅ | ✅ | ✅ | 설문응답결과 |
| `nleaderschdul` | ✅ | ✅ | ✅ | ✅ | 간부일정 |
| `nleaderschdulde` | ✅ | ✅ | ✅ | ✅ | 간부일정일자 |
| `nleadersttus` | ✅ | ✅ | ✅ | ✅ | 간부상태 |

### 5. 포털 및 콘텐츠 관리 (Portal & CMS)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nbanner` | ✅ | ✅ | ✅ | ✅ | 배너관리 |
| `npopupmanage` | ✅ | ✅ | ✅ | ✅ | 팝업창관리 |
| `nmainimage` | ✅ | ✅ | ✅ | ✅ | 메인이미지 |
| `nntfcinfo` | ✅ | ✅ | ✅ | ✅ | 알림정보 |
| `nfaqinfo` | ✅ | ✅ | ✅ | ✅ | FAQ정보 |
| `nqainfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (게시판 통합) |
| `nroughmap` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (메뉴 및 소스 제거) |
| `nsitemap` | ✅ | ✅ | ✅ | ✅ | 사이트맵 |
| `nstsfdg` | ✅ | ✅ | ✅ | ✅ | 만족도조사 |
| `nonlinemanual` | ✅ | ✅ | ✅ | ✅ | 온라인매뉴얼 |
| `nonlinepollmanage` | ✅ | ✅ | ✅ | ✅ | 온라인폴관리 |
| `nonlinepolliem` | ✅ | ✅ | ✅ | ✅ | 온라인폴항목 |
| `nonlinepollresult` | ✅ | ✅ | ✅ | ✅ | 온라인폴결과 |

### 6. 협업 및 워크플로우 (Collaboration)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nadbk` | ✅ | ✅ | ✅ | ✅ | 주소록 |
| `nadbkmanage` | ✅ | ✅ | ✅ | ✅ | 주소록관리 |
| `nwikmnthngreprt` | ✅ | ✅ | ✅ | ✅ | 주간/월간보고 |
| `nmemoreprt` | ✅ | ✅ | ✅ | ✅ | 메모보고 |
| `nmemotodo` | ✅ | ✅ | ✅ | ✅ | 메모할일 |
| `nnote` | ✅ | ✅ | ✅ | ✅ | 쪽지 |
| `nnoterecptn` | ✅ | ✅ | ✅ | ✅ | 쪽지수신 |
| `nnotetrnsmit` | ✅ | ✅ | ✅ | ✅ | 쪽지송신 |
| `nsms` | ✅ | ✅ | ✅ | ✅ | SMS |
| `nsmsrecptn` | ✅ | ✅ | ✅ | ✅ | SMS수신 |
| `ndiaryinfo` | ✅ | ✅ | ✅ | ✅ | 일기정보 |
| `ninfrmlsanctn` | ✅ | ✅ | ✅ | ✅ | 비정형결재 |

### 7. 시스템 모니터링 및 이력 (History & Monitoring)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nsyslog` | ✅ | ✅ | ✅ | ✅ | 시스템로그 |
| `nweblog` | ✅ | ✅ | ✅ | ✅ | 웹로그 |
| `nuserlog` | ✅ | ✅ | ✅ | ✅ | 사용자로그 |
| `nprivacylog` | ✅ | ✅ | ✅ | ✅ | 개인정보로그 |
| `ntrsmrcvlog` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `hconfmhistory` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `hdbmntrngloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `hhttpmonloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nprocessmonloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nfilesysmntrngloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `ntrsmrcvmntrng` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |

### 8. IT 자원 및 도구 (IT Resources & Tools)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nserverinfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nservereqpmninfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nserverresrceloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nntwrkinfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nproxyinfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nproxyloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nfxtrsmanage` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nmtgplacefxtrs` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `nbackupschduldfk` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |
| `ntroblinfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 대상 (미사용) |

### 9. 메뉴 및 인프라 관리 (Menu & Infrastructure)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `nmenuinfo` | ✅ | ✅ | ✅ | ✅ | 메뉴정보 |
| `nprogrmlist` | ✅ | ✅ | ✅ | ✅ | 프로그램목록 |
| `nmenucreatdtls` | ✅ | ✅ | ✅ | ✅ | 메뉴생성내역 |
| `ninsttcoderecptnlog` | ✅ | ✅ | ✅ | ✅ | 기관코드수신로그 |
| `cadministcoderecptnlog` | ✅ | ✅ | ✅ | ✅ | 행정코드수신로그 |
| `nindvdlpge` | ✅ | ✅ | ✅ | ✅ | 마이페이지 |
| `nindvdlpgecntnts` | ✅ | ✅ | ✅ | ✅ | 마이페이지콘텐츠 |
| `nindvdlpgeestbs" | ✅ | ✅ | ✅ | ✅ | 마이페이지설정 |
| `nindvidlinfopolicy" | ✅ | ✅ | ✅ | ✅ | 개인정보정책 |
| `nuserabsence" | ✅ | ✅ | ✅ | ✅ | 사용자부재정보 |
| `hemplyrinfochangedtls" | ✅ | ✅ | ✅ | ✅ | 사용자정보변경내역 |
| `hemaildsptchmanage" | ✅ | ✅ | ✅ | ✅ | 메일발송관리 |
| `nintnetsvc" | ✅ | ✅ | ✅ | ✅ | 인터넷서비스관리 |
| `npolicy" | ✅ | ✅ | ✅ | ✅ | 정책관리 |
| `nrwardmanage" | ✅ | ✅ | ✅ | ✅ | 포상관리 |
| `nextrlhrinfo" | ✅ | ✅ | ✅ | ✅ | 외부인사정보 |
| `ncnsltmanage" | ✅ | ✅ | ✅ | ✅ | 상담관리 |
| `ncnsltlist" | ✅ | ✅ | ✅ | ✅ | 상담목록 |


### 10. 기타 및 추가 발굴 (Others & Discovery)
| 테이블명 | P1 | P2 | P3 | P4 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `htrsmrcvmntrngloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `n_user_notification` | ✅ | ✅ | ✅ | ✅ | 사용자 알림 (Active) |
| `nanswer` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `nbkmkmenumanageresult` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `ncalrestde` | ✅ | ✅ | ✅ | ✅ | 휴일/기념일 관리 |
| `ncntcmessage` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `ncntcmessageitem` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `ncntcservice` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `ncntntslist` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `ndeptjobbx` | ✅ | ✅ | ✅ | ✅ | 부서 업무함 관리 |
| `ndtausestats` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `nhpcminfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `nindvdlinfopolicy` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `nntwrksvcmntrngloginfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `nrefresh_token` | ✅ | ✅ | ✅ | ✅ | JWT 리프레시 토큰 (Active) |
| `nreprtstats` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `nsynchrnserverinfo` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |
| `nuserinfo_aud` | 🗑️ | 🗑️ | 🗑️ | 🗑️ | 삭제 (미사용) |

---
*Total: 150+ Objects Tracking (Updated via Deep Inspection)*
