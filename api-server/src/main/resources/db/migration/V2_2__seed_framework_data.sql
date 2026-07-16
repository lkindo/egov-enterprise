-- 프레임워크 필수 admin 구조 시드 (OCI 실 데이터, 멱등 ON CONFLICT DO NOTHING)
-- 대상: 공통코드/프로그램/메뉴/역할/권한/권한그룹/메뉴권한. 사용자 계정/프로젝트 콘텐츠는 제외.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: tb_authrt_group_info; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tb_authrt_info; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tb_authrt_info VALUES
	('ROLE_ADMIN', '시스템 관리자', '전체 시스템 관리 권한', '20260518', NULL, NULL, NULL, NULL),
	('ROLE_USER', '일반 사용자', '일반 업무 사용자 권한', '20260518', NULL, NULL, NULL, NULL),
	('ROLE_ANONYMOUS', '익명 사용자', '비로그인 사용자 권한', '20260518', NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: tb_com_cd; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tb_com_cd VALUES
	('EFC', 'Y', '2025-12-28 16:39:40.573', '2025-12-28 16:39:40.573', 'COM001', 'SYSTEM', 'SYSTEM', '등록구분', '게시판, 커뮤니티, 동호회 등록구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.575', '2025-12-28 16:39:40.575', 'COM002', 'SYSTEM', 'SYSTEM', '이력구분', '시스템이력등록구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.576', '2025-12-28 16:39:40.576', 'COM003', 'SYSTEM', 'SYSTEM', '업무구분', '업무구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.577', '2025-12-28 16:39:40.577', 'COM005', 'SYSTEM', 'SYSTEM', '템플릿유형', '템플릿유형구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.577', '2025-12-28 16:39:40.577', 'COM006', 'SYSTEM', 'SYSTEM', '승인유형', '동호회, 커뮤니티 승인 유형'),
	('EFC', 'Y', '2025-12-28 16:39:40.578', '2025-12-28 16:39:40.578', 'COM007', 'SYSTEM', 'SYSTEM', '승인상태', '동호회, 커뮤니티 승인 상태'),
	('EFC', 'Y', '2025-12-28 16:39:40.579', '2025-12-28 16:39:40.579', 'COM008', 'SYSTEM', 'SYSTEM', '처리상태', '송수신 요청의 처리상태'),
	('EFC', 'Y', '2025-12-28 16:39:40.58', '2025-12-28 16:39:40.58', 'COM009', 'SYSTEM', 'SYSTEM', '게시판속성', '게시판 속성'),
	('EFC', 'Y', '2025-12-28 16:39:40.581', '2025-12-28 16:39:40.581', 'COM010', 'SYSTEM', 'SYSTEM', '권한유형', '시스템을 사용하기 위한 권한 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.582', '2025-12-28 16:39:40.582', 'COM011', 'SYSTEM', 'SYSTEM', '롤유형', '시스템의 기능을 사용하기 위한 롤 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.582', '2025-12-28 16:39:40.582', 'COM012', 'SYSTEM', 'SYSTEM', '회원유형', '일반/기업/업무담당자를 구현하기 위한 사용자 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.583', '2025-12-28 16:39:40.583', 'COM013', 'SYSTEM', 'SYSTEM', '회원상태', '회원 가입 신청/승인/삭제를 위한 상태 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.584', '2025-12-28 16:39:40.584', 'COM014', 'SYSTEM', 'SYSTEM', '성별구분', '남녀 성별 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.585', '2025-12-28 16:39:40.585', 'COM015', 'SYSTEM', 'SYSTEM', '인증방식유형', '주민등록번호 인증, Gpin 인증과 같은 사용자 인증 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.586', '2025-12-28 16:39:40.586', 'COM016', 'SYSTEM', 'SYSTEM', '변경요청처리 상태', '프로그램 변경의 요청/처리 등의 변경요청 상태 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.587', '2025-12-28 16:39:40.587', 'COM017', 'SYSTEM', 'SYSTEM', '휴일구분', '휴일의 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.588', '2025-12-28 16:39:40.588', 'COM018', 'SYSTEM', 'SYSTEM', '질문유형', '질문유형 객관식/주관식 상태구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.589', '2025-12-28 16:39:40.589', 'COM019', 'SYSTEM', 'SYSTEM', '일정중요도', '일정중요도 낮음/보통/높음 상태구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.59', '2025-12-28 16:39:40.59', 'COM020', 'SYSTEM', 'SYSTEM', '일정구분', '일정구분 부서일지정보/일지정보 상태구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.591', '2025-12-28 16:39:40.591', 'COM021', 'SYSTEM', 'SYSTEM', '도움말구분', '도움말 설명 구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.591', '2025-12-28 16:39:40.591', 'COM022', 'SYSTEM', 'SYSTEM', '비밀번호 힌트', '비밀번호 힌트 구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.592', '2025-12-28 16:39:40.592', 'COM023', 'SYSTEM', 'SYSTEM', '사이트주제분류', '사이트주제분류 설명 구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.593', '2025-12-28 16:39:40.593', 'COM024', 'SYSTEM', 'SYSTEM', '발송결과구분', '발송메일 수신결과 구분 코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.594', '2025-12-28 16:39:40.594', 'COM025', 'SYSTEM', 'SYSTEM', '소속기관', '소속기관정보를 관리할때 사용하는 구분코드(시스템별로 재정의)'),
	('EFC', 'Y', '2025-12-28 16:39:40.595', '2025-12-28 16:39:40.595', 'COM026', 'SYSTEM', 'SYSTEM', '기업구분', '기업구분정보를 관리할때 사용하는 구분코드(시스템별로 재정의)'),
	('EFC', 'Y', '2025-12-28 16:39:40.595', '2025-12-28 16:39:40.595', 'COM027', 'SYSTEM', 'SYSTEM', '업종', '대표업종코드(시스템별로 재정의)'),
	('EFC', 'Y', '2025-12-28 16:39:40.596', '2025-12-28 16:39:40.596', 'COM028', 'SYSTEM', 'SYSTEM', '질의응답처리상태', 'Q/A 처리상태코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.597', '2025-12-28 16:39:40.597', 'COM029', 'SYSTEM', 'SYSTEM', '롤유형코드', ''),
	('EFC', 'Y', '2025-12-28 16:39:40.598', '2025-12-28 16:39:40.598', 'COM030', 'SYSTEM', 'SYSTEM', '일정구분', '일정구분 코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.599', '2025-12-28 16:39:40.599', 'COM031', 'SYSTEM', 'SYSTEM', '반복구분', '일정 반복구분 코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.6', '2025-12-28 16:39:40.6', 'COM032', 'SYSTEM', 'SYSTEM', '작업유형', '승인이력 작업유형'),
	('EFC', 'Y', '2025-12-28 16:39:40.6', '2025-12-28 16:39:40.6', 'COM033', 'SYSTEM', 'SYSTEM', '시스템로그구분', ''),
	('EFC', 'Y', '2025-12-28 16:39:40.601', '2025-12-28 16:39:40.601', 'COM034', 'SYSTEM', 'SYSTEM', '직업유형', '직업유형코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.602', '2025-12-28 16:39:40.602', 'COM035', 'SYSTEM', 'SYSTEM', '행사유형', '행사/이벤트/캠페인 구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.603', '2025-12-28 16:39:40.603', 'COM036', 'SYSTEM', 'SYSTEM', '보고서 진행상태코드', '보고서의 진행상태를 코드화 하여 관리한다.'),
	('EFC', 'Y', '2025-12-28 16:39:40.604', '2025-12-28 16:39:40.604', 'COM038', 'SYSTEM', 'SYSTEM', '온라인POLL페기유무', '온라인POLL-온라인POLL페기유무'),
	('EFC', 'Y', '2025-12-28 16:39:40.605', '2025-12-28 16:39:40.605', 'COM039', 'SYSTEM', 'SYSTEM', '온라인POLL구분', '온라인POLL-온온라인POLL구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.606', '2025-12-28 16:39:40.606', 'COM040', 'SYSTEM', 'SYSTEM', '보고서 종류코드', '보고서 종류코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.607', '2025-12-28 16:39:40.607', 'COM041', 'SYSTEM', 'SYSTEM', '온라인메뉴얼구분', '온라인메누얼-온라인메뉴얼구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.608', '2025-12-28 16:39:40.608', 'COM042', 'SYSTEM', 'SYSTEM', '보고서통계기간구분', '보고서통계기간구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.608', '2025-12-28 16:39:40.608', 'COM043', 'SYSTEM', 'SYSTEM', '기관코드변경구분', '기관코드변경구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.609', '2025-12-28 16:39:40.609', 'COM044', 'SYSTEM', 'SYSTEM', '기관코드수신처리구분', '기관코드수신처리구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.61', '2025-12-28 16:39:40.61', 'COM045', 'SYSTEM', 'SYSTEM', '사용여부', '사용여부'),
	('EFC', 'Y', '2025-12-28 16:39:40.611', '2025-12-28 16:39:40.611', 'COM046', 'SYSTEM', 'SYSTEM', '모니터링상태구분', '모니터링상태구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.612', '2025-12-28 16:39:40.612', 'COM047', 'SYSTEM', 'SYSTEM', '실행주기구분', '실행주기구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.613', '2025-12-28 16:39:40.613', 'COM048', 'SYSTEM', 'SYSTEM', 'DBMS종류', 'DBMS종류'),
	('EFC', 'Y', '2025-12-28 16:39:40.614', '2025-12-28 16:39:40.614', 'COM049', 'SYSTEM', 'SYSTEM', '압축구분', '압축구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.615', '2025-12-28 16:39:40.615', 'COM050', 'SYSTEM', 'SYSTEM', '수신구분', '쪽지관리'),
	('EFC', 'Y', '2025-12-28 16:39:40.616', '2025-12-28 16:39:40.616', 'COM051', 'SYSTEM', 'SYSTEM', '승인여부', '승인여부구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.617', '2025-12-28 16:39:40.617', 'COM052', 'SYSTEM', 'SYSTEM', '달력구분', '달력구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.618', '2025-12-28 16:39:40.618', 'COM053', 'SYSTEM', 'SYSTEM', '행사구분', '행사구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.619', '2025-12-28 16:39:40.619', 'COM054', 'SYSTEM', 'SYSTEM', '경조구분', '경조구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.62', '2025-12-28 16:39:40.62', 'COM055', 'SYSTEM', 'SYSTEM', '포상구분', '포상구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.621', '2025-12-28 16:39:40.621', 'COM056', 'SYSTEM', 'SYSTEM', '휴가구분', '휴가구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.622', '2025-12-28 16:39:40.622', 'COM057', 'SYSTEM', 'SYSTEM', '일정구분', '일정구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.622', '2025-12-28 16:39:40.622', 'COM058', 'SYSTEM', 'SYSTEM', '반복구분코드', '반복구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.623', '2025-12-28 16:39:40.623', 'COM059', 'SYSTEM', 'SYSTEM', '우선순위', '우선순위'),
	('EFC', 'Y', '2025-12-28 16:39:40.624', '2025-12-28 16:39:40.624', 'COM060', 'SYSTEM', 'SYSTEM', '보고서구분', '보고서구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.625', '2025-12-28 16:39:40.625', 'COM061', 'SYSTEM', 'SYSTEM', '간부상태', '간부상태'),
	('EFC', 'Y', '2025-12-28 16:39:40.626', '2025-12-28 16:39:40.626', 'COM062', 'SYSTEM', 'SYSTEM', ' HTTP상태코드', 'HTTP상태코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.627', '2025-12-28 16:39:40.627', 'COM063', 'SYSTEM', 'SYSTEM', '상태관리', '상태관리'),
	('EFC', 'Y', '2025-12-28 16:39:40.627', '2025-12-28 16:39:40.627', 'COM064', 'SYSTEM', 'SYSTEM', '서버종류코드', '서버종류코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.628', '2025-12-28 16:39:40.628', 'COM065', 'SYSTEM', 'SYSTEM', '장애종류코드', '장애종류코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.629', '2025-12-28 16:39:40.629', 'COM066', 'SYSTEM', 'SYSTEM', '서버자원종류', '서버자원종류'),
	('EFC', 'Y', '2025-12-28 16:39:40.63', '2025-12-28 16:39:40.63', 'COM067', 'SYSTEM', 'SYSTEM', '네트워크관리항목', '네트워크관리항목'),
	('EFC', 'Y', '2025-12-28 16:39:40.631', '2025-12-28 16:39:40.631', 'COM068', 'SYSTEM', 'SYSTEM', '처리상태코드', '처리상태코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.632', '2025-12-28 16:39:40.632', 'COM069', 'SYSTEM', 'SYSTEM', '기념일구분', '기념일구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.633', '2025-12-28 16:39:40.633', 'COM070', 'SYSTEM', 'SYSTEM', '위치구분', '회의실 위치구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.634', '2025-12-28 16:39:40.634', 'COM071', 'SYSTEM', 'SYSTEM', '당직체크구분', '당직체크구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.635', '2025-12-28 16:39:40.635', 'COM072', 'SYSTEM', 'SYSTEM', '서비스상태', '서비스상태'),
	('EFC', 'Y', '2025-12-28 16:39:40.636', '2025-12-28 16:39:40.636', 'COM073', 'SYSTEM', 'SYSTEM', '가족관계', '가족관계'),
	('EFC', 'Y', '2025-12-28 16:39:40.637', '2025-12-28 16:39:40.637', 'COM074', 'SYSTEM', 'SYSTEM', '요일구분', '요일구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.638', '2025-12-28 16:39:40.638', 'COM075', 'SYSTEM', 'SYSTEM', '업무구분코드', '업무구분코드'),
	('EFC', 'Y', '2025-12-28 16:39:40.639', '2025-12-28 16:39:40.639', 'COM076', 'SYSTEM', 'SYSTEM', '실행상태구분', '실행상태구분'),
	('EFC', 'Y', '2025-12-28 16:39:40.64', '2025-12-28 16:39:40.64', 'COM101', 'SYSTEM', 'SYSTEM', '게시판유형', '게시판유형'),
	('EFC', 'Y', '2025-12-28 16:39:40.641', '2025-12-28 16:39:40.641', 'COM102', 'SYSTEM', 'SYSTEM', '단어구분', '단어구분') ON CONFLICT DO NOTHING;


--
-- Data for Name: tb_menu_crt_dtl; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tb_menu_crt_dtl VALUES
	(1020400, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010900, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1000001, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1060000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(800000000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8808554, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8744343, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1010000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020130, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040101, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030110, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030200, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020310, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020311, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020210, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1050100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030130, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020110, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020120, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020220, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010210, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010220, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030600, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1020000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1020200, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1020100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040200, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010400, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040105, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040310, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020312, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1040100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1060100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020230, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2030500, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040102, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040350, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040340, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010210, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2030000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9000000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1000000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2040000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2060000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2030100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2020100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040320, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2030400, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1040200, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1040000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2050000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010700, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010800, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2030200, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010500, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010400, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1030000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1010200, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1050000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040103, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1030100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010500, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1020300, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040106, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030120, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030140, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9020100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1060200, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010100, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2030300, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010300, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9010230, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010600, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030400, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2020000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040104, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2000000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2070000, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(2010300, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9040330, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030300, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(9030700, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8472545, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8281586, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8770511, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8773449, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8496511, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8693630, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8178285, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8300778, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(8655335, 'ROLE_ADMIN', 'webmaster', '2026-05-31 13:11:23.171405', NULL, NULL, NULL),
	(1020400, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010900, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1000001, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1060000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8808554, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8744343, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1010000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1050100, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1020000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1020200, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1020100, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1040100, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1060100, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2030500, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010210, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2030000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1000000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2040000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2060000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2030100, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2020100, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2030400, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1040200, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1040000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2050000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010700, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010800, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2030200, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010400, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1030000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1010200, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1050000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1030100, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010500, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1020300, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(1060200, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2030300, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010600, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2020000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2000000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2070000, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(2010300, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8472545, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8281586, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8770511, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8773449, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8496511, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8693630, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8178285, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8300778, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL),
	(8655335, 'ROLE_USER', 'webmaster', '2026-05-31 13:11:26.093124', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: tb_menu_info; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tb_menu_info VALUES
	(8, '2026-03-30 17:48:47.985', '2026-04-10 12:21:02.909', 1020400, '2', 1020000, 'admin', 'admin', '💌 업무 쪽지함', 'dir', NULL, NULL, '', '/note', 'Y', 'N'),
	(42, '2026-03-30 17:48:47.985', '2026-04-10 12:21:18.139', 2010900, '2', 2000000, 'admin', 'admin', '📝 온라인 설문 참여', 'dir', NULL, NULL, '', '/survey', 'Y', 'N'),
	(19, '2026-03-30 17:48:47.985', '2026-04-10 12:21:07.849', 1000001, '2', 1000000, 'admin', 'admin', '🔍 통합 검색', 'dir', NULL, NULL, '', '/search', 'Y', 'N'),
	(16, '2026-03-30 17:48:47.985', '2026-04-10 12:21:06.51', 1060000, '2', 1000000, 'admin', 'admin', '🛠️ 스마트 툴킷 허브', 'dir', NULL, NULL, '', '', 'Y', 'N'),
	(0, NULL, NULL, 800000000, NULL, 800000000, NULL, NULL, 'ROOT', 'dir', NULL, NULL, NULL, NULL, 'Y', 'N'),
	(23, '2026-03-25 00:50:11.625', '2026-04-11 12:59:16.316', 8808554, '2', 2030000, 'webmaster', 'webmaster', 'test', 'EgovBBSMaster', NULL, NULL, '', '/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000120', 'Y', 'N'),
	(1, '2026-04-11 13:51:53.748', '2026-04-11 13:51:53.748', 8744343, '2', 2000000, 'webmaster', 'webmaster', 'test1', 'EgovBBSMaster', NULL, NULL, 'Auto-generated menu for board test1', '/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000160', 'Y', 'N'),
	(73, NULL, '2026-04-10 12:21:31.78', 9040000, '2', 9000000, NULL, 'admin', '감사 및 통계 모니터링', 'dir', NULL, NULL, '', '', 'Y', 'N'),
	(2, NULL, '2026-04-10 12:21:00.169', 1010000, '2', 1000000, NULL, 'admin', '개인 및 부서 일정', 'dir', NULL, NULL, '', '/admin/work-hub?tab=job', 'Y', 'N'),
	(62, NULL, '2026-04-10 12:21:26.992', 9020130, '2', 9020100, NULL, 'admin', '개인정보보호정책확인', 'listIndvdlInfoPolicy', NULL, NULL, '', '/admin/user/indvdl-info-policy', 'Y', 'N'),
	(78, NULL, '2026-04-10 12:21:34.019', 9040101, '2', 9040000, NULL, 'admin', '게시물통계', 'selectBbsStats', NULL, NULL, '', '/admin/stats/board', 'Y', 'N'),
	(64, NULL, '2026-04-10 12:21:27.848', 9030100, '2', 9030000, NULL, 'admin', '게시판 및 커뮤니티 관리', 'dir', NULL, NULL, '', '/admin/community/boards', 'Y', 'N'),
	(66, NULL, '2026-04-10 12:21:28.702', 9030110, '2', 9030100, NULL, 'admin', '게시판사용정보', 'selectBBSUseInfs', NULL, NULL, '', '/admin/community/boards', 'Y', 'N'),
	(69, NULL, '2026-04-10 12:21:29.989', 9030200, '2', 9030000, NULL, 'admin', '결재 양식 관리', 'SanctnFormManage', NULL, NULL, '', '/admin/sanctn/forms', 'Y', 'N'),
	(52, NULL, '2026-04-10 12:21:22.599', 9020000, '2', 9000000, NULL, 'admin', '계정 및 권한 관리', 'dir', NULL, NULL, '', '', 'Y', 'N'),
	(54, NULL, '2026-04-10 12:21:23.479', 9020310, '2', 9020000, NULL, 'admin', '계정 및 사용자 관리', 'EgovEntrprsMberManage', NULL, NULL, '', '/admin/user/manage', 'Y', 'N'),
	(56, NULL, '2026-04-10 12:21:24.38', 9020311, '2', 9020000, NULL, 'admin', '권한(보안) 정책 관리', 'EgovAuthorList', NULL, NULL, '', '/admin/security/authority', 'Y', 'N'),
	(53, NULL, '2026-04-10 12:21:23.038', 9020210, '2', 9020000, NULL, 'admin', '그룹관리', 'EgovGroupList', NULL, NULL, '', '/admin/security/group', 'Y', 'N'),
	(15, NULL, '2026-04-10 12:21:06.059', 1050100, '2', 1050000, NULL, 'admin', '내 결재함 및 대시보드', 'ApprovalDashboard', NULL, NULL, '', '/approvals', 'Y', 'N'),
	(68, NULL, '2026-04-10 12:21:29.554', 9030130, '2', 9030100, NULL, 'admin', '댓글 및 평가 관리', 'CommentManage', NULL, NULL, '', '/admin/system/comments', 'Y', 'N'),
	(60, NULL, '2026-04-10 12:21:26.141', 9020110, '2', 9020100, NULL, 'admin', '로그인', 'egovLoginUsr', NULL, NULL, '', '/admin/system/monitoring/hub?tab=security', 'Y', 'N'),
	(61, NULL, '2026-04-10 12:21:26.567', 9020120, '2', 9020100, NULL, 'admin', '로그인정책관리', 'selectLoginPolicyList', NULL, NULL, '', '/admin/system/monitoring/hub?tab=policy', 'Y', 'N'),
	(55, NULL, '2026-04-10 12:21:23.929', 9020220, '2', 9020000, NULL, 'admin', '롤관리', 'EgovRoleList', NULL, NULL, '', '/admin/security/role', 'Y', 'N'),
	(49, NULL, '2026-04-10 12:21:21.269', 9010210, '2', 9010000, NULL, 'admin', '메뉴 관리', 'EgovMenuListSelect', NULL, NULL, '', '/admin/system/menus', 'Y', 'N'),
	(50, NULL, '2026-04-10 12:21:21.72', 9010220, '2', 9010000, NULL, 'admin', '메뉴생성관리', 'EgovMenuCreatManageSelect', NULL, NULL, '', '/admin/system/menus/by-authority', 'Y', 'N'),
	(72, NULL, '2026-04-10 12:21:31.329', 9030600, '2', 9030000, NULL, 'admin', '메모보고 관리', 'MemoReportAdminService', NULL, NULL, '', '/admin/operation/memo-reports', 'Y', 'N'),
	(4, NULL, '2026-04-10 12:48:06.355', 1020000, '2', 1000000, NULL, 'admin', '메일 및 통합 메시지 센터', 'dir', NULL, NULL, '', '/admin/collaboration/mail-history', 'Y', 'N'),
	(6, NULL, '2026-04-10 12:21:02.018', 1020200, '2', 1020000, NULL, 'admin', '메일발송', 'insertSndngMailView', NULL, NULL, '', '/admin/collaboration/mail-send', 'Y', 'N'),
	(5, NULL, '2026-04-10 12:48:06.784', 1020100, '2', 1020000, NULL, 'admin', '문자메시지', 'selectSmsList', NULL, NULL, '', '/admin/uss/ion/sms', 'Y', 'N'),
	(74, NULL, '2026-04-10 12:21:32.228', 9040200, '2', 9040000, NULL, 'admin', '발송메일내역', 'selectSndngMailList', NULL, NULL, '', '/admin/collaboration/mail-history', 'Y', 'N'),
	(47, NULL, '2026-04-10 12:21:20.388', 9010400, '2', 9010000, NULL, 'admin', '배너 및 팝업 관리', 'selectBannerMainList', NULL, NULL, '', '/admin/system/banner', 'Y', 'N'),
	(82, NULL, '2026-04-10 12:21:35.809', 9040105, '2', 9040000, NULL, 'admin', '보고서통계', 'selectReprtStatsListView', NULL, NULL, '', '/admin/stats/report', 'Y', 'N'),
	(75, NULL, '2026-04-10 12:21:32.678', 9040310, '2', 9040000, NULL, 'admin', '보안 감사 로그', 'SecurityAudit', NULL, NULL, '', '/admin/system/monitoring/hub?tab=security', 'Y', 'N'),
	(57, NULL, '2026-04-10 12:21:24.829', 9020312, '2', 9020000, NULL, 'admin', '부서 및 조직 관리', 'selectDeptManageListView', NULL, NULL, '', '/admin/user/departments', 'Y', 'N'),
	(12, NULL, '2026-04-10 12:21:04.709', 1040100, '2', 1040000, NULL, 'admin', '부서 업무 관리', 'selectDeptJobBxList', NULL, NULL, '', '/admin/work-hub?tab=report', 'Y', 'N'),
	(17, '2026-03-30 17:48:47.985', '2026-04-10 12:21:06.958', 1060100, '2', 1060000, 'admin', 'admin', '부서 업무 관리 도구', 'dir', NULL, NULL, '', '/smart-toolkit/dept-job', 'Y', 'N'),
	(58, NULL, '2026-04-10 12:21:25.269', 9020230, '2', 9020000, NULL, 'admin', '부서권한관리', 'EgovDeptAuthorList', NULL, NULL, '', '/admin/security/dept-authority', 'Y', 'N'),
	(27, NULL, '2026-04-10 12:21:11.449', 2030500, '2', 2030000, NULL, 'admin', '사용자부재관리', 'selectUserAbsnceListView', NULL, NULL, '', '/admin/user/absences', 'Y', 'N'),
	(79, NULL, '2026-04-10 12:21:34.468', 9040102, '2', 9040000, NULL, 'admin', '사용자통계', 'selectUserStats', NULL, NULL, '', '/admin/stats/user', 'Y', 'N'),
	(85, '2026-03-30 17:48:47.985', '2026-04-10 12:21:37.148', 9040350, '2', 9040000, 'admin', 'admin', '상세 시스템 로그 (System)', 'dir', NULL, NULL, '', '/admin/system/logs/system', 'Y', 'N'),
	(84, '2026-03-30 17:48:47.985', '2026-04-10 12:21:36.7', 9040340, '2', 9040000, 'admin', 'admin', '상세 접속 로그 (Login)', 'dir', NULL, NULL, '', '/admin/system/logs/login', 'Y', 'N'),
	(63, NULL, '2026-04-10 12:21:27.417', 9030000, '2', 9000000, NULL, 'admin', '서비스 운영 관리', 'dir', NULL, NULL, '', '', 'Y', 'N'),
	(34, NULL, '2026-04-10 12:21:14.569', 2010000, '2', 2000000, NULL, 'admin', '설문 및 여론조사 관리', 'dir', NULL, NULL, '', '/admin/survey/hub?tab=manage', 'Y', 'N'),
	(41, NULL, '2026-04-10 12:21:17.698', 2010210, '2', 2010000, NULL, 'admin', '설문 통계 및 결과 분석', 'dir', NULL, NULL, '', '/admin/survey/hub?tab=stats', 'Y', 'N'),
	(21, NULL, '2026-04-11 12:59:15.418', 2030000, '2', 2000000, NULL, 'admin', '사용자지원', 'dir', NULL, NULL, '', '/admin/notifications', 'Y', 'N'),
	(43, NULL, '2026-04-10 12:21:18.588', 9000000, '2', NULL, NULL, 'admin', '⚙️ 시스템 관리 센터', 'dir', NULL, NULL, '', '/admin/user/manage', 'Y', 'N'),
	(1, NULL, '2026-03-31 03:56:38.855', 1000000, '2', NULL, NULL, 'admin', '🏢 워크스페이스', 'dir', NULL, NULL, '', '/admin/work-hub', 'Y', 'N'),
	(30, NULL, '2026-04-10 12:21:12.799', 2040000, '2', 2000000, NULL, 'admin', '엔터프라이즈 위키', 'HpcmListInqire', NULL, NULL, '', '/admin/help/faq?tab=WIKI', 'Y', 'N'),
	(31, NULL, '2026-04-10 12:21:13.238', 2060000, '2', 2000000, NULL, 'admin', '자주 묻는 질문(FAQ)', 'FaqListInqire', NULL, NULL, '', '/admin/help/faq?tab=FAQ', 'Y', 'N'),
	(22, NULL, '2026-04-11 12:59:15.867', 2030100, '2', 2030000, NULL, 'admin', '마이페이지관리', 'EgovIndvdlpgeCntntsList', NULL, NULL, '', '/admin/workspace/my-page', 'Y', 'N'),
	(29, NULL, '2026-04-10 12:21:12.349', 2020100, '2', 2020000, NULL, 'admin', '스크랩 목록', 'selectScrapList', NULL, NULL, '', '/admin/collaboration/scraps', 'Y', 'N'),
	(76, NULL, '2026-04-10 12:21:33.118', 9040320, '2', 9040000, NULL, 'admin', '시스템 감사 로그', 'SystemAudit', NULL, NULL, '', '/admin/system/monitoring/hub?tab=system', 'Y', 'N'),
	(44, NULL, '2026-04-10 12:21:19.038', 9010000, '2', 9000000, NULL, 'admin', '시스템 기반 설정', 'dir', NULL, NULL, '', '', 'Y', 'N'),
	(26, NULL, '2026-04-10 12:21:10.999', 2030400, '2', 2030000, NULL, 'admin', '시스템 알림 설정', 'selectNotificationList', NULL, NULL, '', '/admin/notifications', 'Y', 'N'),
	(13, NULL, '2026-04-10 12:21:05.158', 1040200, '2', 1040000, NULL, 'admin', '업무 보고 관리', 'selectWikMnthngReprtList', NULL, NULL, '', '/admin/work-hub?tab=report', 'Y', 'N'),
	(11, NULL, '2026-04-10 12:21:04.259', 1040000, '2', 1000000, NULL, 'admin', '업무 보고 및 보고함', 'dir', NULL, NULL, '', '/admin/work-hub', 'Y', 'N'),
	(33, NULL, '2026-04-10 12:21:14.129', 2050000, '2', 2000000, NULL, 'admin', '온라인 매뉴얼 관리', 'listOnlineManual', NULL, NULL, '', '/admin/uss/olh/online-manual', 'Y', 'N'),
	(39, NULL, '2026-04-10 12:21:16.809', 2010700, '2', 2010000, NULL, 'admin', '온라인poll관리', 'listOnlinePollManage', NULL, NULL, '', '/admin/survey/hub?tab=templates', 'Y', 'N'),
	(40, NULL, '2026-04-10 12:21:17.258', 2010800, '2', 2010000, NULL, 'admin', '온라인poll참여', 'listOnlinePollPartcptn', NULL, NULL, '', '/admin/survey/polls/participate', 'Y', 'N'),
	(24, NULL, '2026-04-10 12:21:10.099', 2030200, '2', 2030000, NULL, 'admin', '외부인사정보', 'EgovTnextrlHrInfoList', NULL, NULL, '', '/admin/operation/external-hr', 'Y', 'N'),
	(48, NULL, '2026-04-10 12:21:20.829', 9010500, '2', 9010000, NULL, 'admin', '워크플로우 프로세스 설정', 'WorkflowEngineManage', NULL, NULL, '', '/admin/workflow', 'Y', 'N'),
	(36, NULL, '2026-04-10 12:21:15.468', 2010400, '2', 2010000, NULL, 'admin', '응답자관리', 'EgovQustnrRespondManageList', NULL, NULL, '', '/admin/survey/hub?tab=respondents', 'Y', 'N'),
	(9, NULL, '2026-04-10 12:21:03.359', 1030000, '2', 1000000, NULL, 'admin', '인적 자원 및 주소록 관리', 'dir', NULL, NULL, '', '/admin/collaboration/address-book', 'Y', 'N'),
	(3, NULL, '2026-04-10 12:48:05.895', 1010200, '2', 1010000, NULL, 'admin', '일정 관리', 'EgovIndvdlSchdulManageList', NULL, NULL, '', '/admin/work-hub?tab=calendar', 'Y', 'N'),
	(14, NULL, '2026-04-10 12:21:05.608', 1050000, '2', 1000000, NULL, 'admin', '전자결재 및 문서 관리', 'dir', NULL, NULL, '', '/admin/sanctn/forms', 'Y', 'N'),
	(80, NULL, '2026-04-10 12:21:34.909', 9040103, '2', 9040000, NULL, 'admin', '접속통계', 'selectConectStats', NULL, NULL, '', '/admin/stats/user', 'Y', 'N'),
	(10, NULL, '2026-04-10 12:21:03.809', 1030100, '2', 1030000, NULL, 'admin', '주소록관리', 'selectAdbkList', NULL, NULL, '', '/admin/collaboration/address-book', 'Y', 'N'),
	(37, NULL, '2026-04-10 12:21:15.909', 2010500, '2', 2010000, NULL, 'admin', '질문관리', 'EgovQustnrQestnManageList', NULL, NULL, '', '/admin/survey/hub?tab=questions', 'Y', 'N'),
	(7, NULL, '2026-04-10 12:21:02.47', 1020300, '2', 1020000, NULL, 'admin', '쪽지함', 'listNoteTrnsmit', NULL, NULL, '', '/admin/collaboration/mail-history', 'Y', 'N'),
	(83, NULL, '2026-04-10 12:21:36.248', 9040106, '2', 9040000, NULL, 'admin', '콘텐츠 사용량 통계', 'selectDtaUseStatsList', NULL, NULL, '', '/admin/stats/data-usage', 'Y', 'N'),
	(67, NULL, '2026-04-10 12:21:29.127', 9030120, '2', 9030100, NULL, 'admin', '템플릿관리', 'selectTemplateInfs', NULL, NULL, '', '/admin/community/templates', 'Y', 'N'),
	(65, NULL, '2026-04-10 12:21:28.275', 9030140, '2', 9030100, NULL, 'admin', '통합 게시판 마스터 콘솔', 'BoardMasterConsole', NULL, NULL, '', '/admin/community/boards/master', 'Y', 'N'),
	(59, NULL, '2026-04-10 12:21:25.71', 9020100, '2', 9020000, NULL, 'admin', '통합 보안 및 접속 정책', 'dir', NULL, NULL, '', '/admin/system/monitoring/hub?tab=security', 'Y', 'N'),
	(18, '2026-03-30 17:48:47.985', '2026-04-10 12:21:07.399', 1060200, '2', 1060000, 'admin', 'admin', '통합 일정 도구', 'dir', NULL, NULL, '', '/smart-toolkit/schedule', 'Y', 'N'),
	(45, NULL, '2026-04-10 12:21:19.489', 9010100, '2', 9010000, NULL, 'admin', '통합 코드 관리 허브', 'dir', NULL, NULL, '', '/admin/system/common-code', 'Y', 'N'),
	(25, NULL, '2026-04-10 12:21:10.549', 2030300, '2', 2030000, NULL, 'admin', '포상관리', 'selectRwardManageList', NULL, NULL, '', '/admin/operation/rewards', 'Y', 'N'),
	(46, NULL, '2026-04-10 12:21:19.938', 9010300, '2', 9010000, NULL, 'admin', '포털 콘텐츠 및 UI 관리', 'dir', NULL, NULL, '', '/admin/system/layout', 'Y', 'N'),
	(51, NULL, '2026-04-10 12:21:22.158', 9010230, '2', 9010000, NULL, 'admin', '프로그램 관리', 'EgovProgramListManageSelect', NULL, NULL, '', '/admin/system/programs', 'Y', 'N'),
	(38, NULL, '2026-04-10 12:21:16.358', 2010600, '2', 2010000, NULL, 'admin', '항목관리', 'EgovQustnrItemManageList', NULL, NULL, '', '/admin/survey/hub?tab=items', 'Y', 'N'),
	(70, NULL, '2026-04-10 12:21:30.43', 9030400, '2', 9030000, NULL, 'admin', '행사 정보 관리', 'EventAdminService', NULL, NULL, '', '/admin/operation/events', 'Y', 'N'),
	(28, NULL, '2026-04-10 12:21:11.899', 2020000, '2', 2000000, NULL, 'admin', '협업', 'dir', NULL, NULL, '', '/admin/collaboration/mail-history', 'Y', 'N'),
	(81, NULL, '2026-04-10 12:21:35.358', 9040104, '2', 9040000, NULL, 'admin', '화면통계', 'selectScrinStats', NULL, NULL, '', '/admin/stats/screen', 'Y', 'N'),
	(20, NULL, '2026-04-10 12:21:08.299', 2000000, '2', NULL, NULL, 'admin', '💬 커뮤니티 및 콘텐츠', 'dir', NULL, NULL, '', '/admin/community/boards/master', 'Y', 'N'),
	(32, NULL, '2026-04-10 12:21:13.689', 2070000, '2', 2000000, NULL, 'admin', '질의응답(Q&A)', 'CnsltAnswerListInqire', NULL, NULL, '', '/admin/help/faq?tab=QNA', 'Y', 'N'),
	(35, NULL, '2026-04-10 12:21:15.018', 2010300, '2', 2010000, NULL, 'admin', '설문템플릿관리', 'EgovQustnrTmplatManageList', NULL, NULL, '', '/admin/survey/hub?tab=templates', 'Y', 'N'),
	(77, NULL, '2026-04-10 12:21:33.568', 9040330, '2', 9040000, NULL, 'admin', '시스템 상태 모니터링', 'SystemObservability', NULL, NULL, '', '/admin/system/monitoring/hub?tab=observability', 'Y', 'N'),
	(3, '2026-05-01 10:24:07.525967', NULL, 9030300, NULL, 9030000, NULL, NULL, '간부일정관리', 'LeaderScheduleAdmin', NULL, NULL, '간부 일정 및 상태 관리', '/admin/system/lsm', 'Y', 'N'),
	(7, '2026-05-01 10:24:07.525967', NULL, 9030700, NULL, 9030000, NULL, NULL, '도움말 콘텐츠 관리', 'HpcmAdmin', NULL, NULL, '도움말 및 온라인 매뉴얼 통합 관리', '/admin/system/hpcm', 'Y', 'N'),
	(19, '2026-07-11 02:27:51.436964', '2026-07-11 02:27:51.436964', 1060300, '2', 1060000, 'admin', 'admin', '업무 보고 관리 도구', 'dir', NULL, NULL, '', '/smart-toolkit/work-report', 'Y', 'N') ON CONFLICT DO NOTHING;


--
-- Data for Name: tb_prgrm_lst; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tb_role_info; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tb_role_info VALUES
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000001', '로그인롤', 'url', '로그인허용을 위한 롤', '\A/uat/uia/.*\.do.*\Z'),
	(NULL, NULL, 2, NULL, NULL, '2025-12-01', 'web-000002', '좌측메뉴', 'url', '좌측 메뉴에 대한 접근 제한 롤', '/EgovLeft.do'),
	(NULL, NULL, 3, NULL, NULL, '2025-12-01', 'web-000003', '모든접근제한', 'url', '모든자원에 대한 접근 제한 롤', '\A/.*\.do.*\Z'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000004', '회원관리', 'url', '회원관리에 대한 접근 제한 롤', '\A/uss/umt/.*\.do.*\Z'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000005', '실명확인', 'url', '실명확인에 대한 접근 제한 롤', '\A/sec/rnc/.*\.do.*\Z'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000006', '우편번호', 'url', '우편번호관리에 대한 접근 제한 롤', '\A/sym/ccm/zip/.*\.do.*\Z'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000007', '로그인이미지', 'url', '로그인이미지관리에 대한 접근 제한 롤', '\A/uss/ion/lsi/.*\.do.*\Z'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000008', '파일다운로드', 'url', '파일다운로드에 대한 접근 제한 롤', '/cmm/fms/FileDown.do.*'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000009', '상단메뉴', 'url', '상단메뉴에 대한 접근 제한 롤', '/EgovTop.do'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000010', '하단메뉴', 'url', '하단메뉴에 대한 접근 제한 롤', '/EgovBottom.do'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000011', '왼쪽메뉴', 'url', '왼쪽메뉴에 대한 접근 제한 롤', '/EgovLeft.do'),
	(NULL, NULL, 1, NULL, NULL, '2025-12-01', 'web-000012', 'Validator모듈', 'url', 'Validator에 대한 접근 제한 롤', '/validator.do'),
	(NULL, NULL, NULL, NULL, NULL, '2026-07-11', 'ROLE_ADMIN', '시스템 관리자', NULL, '시스템 전반의 모든 권한을 가진 최고 관리자', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.tb_role_info VALUES
	(NULL, NULL, NULL, NULL, NULL, '2026-07-11', 'ROLE_USER', '일반 사용자', NULL, '비즈니스 서비스 접근 권한을 가진 일반 임직원', NULL) ON CONFLICT DO NOTHING;


--
-- PostgreSQL database dump complete
--


