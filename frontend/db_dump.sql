-- EGOV Enterprise DB Dump (Full with Comments) Created at 2026-03-20T01:19:58.085Z


-- Table: public.cadministcode
CREATE TABLE IF NOT EXISTS public."cadministcode" (
  "administ_zone_se" character(1) NOT NULL,
  "administ_zone_code" character varying(10) NOT NULL,
  "use_at" character(1) NOT NULL,
  "administ_zone_nm" character varying(60),
  "upper_administ_zone_code" character varying(10),
  "creat_de" character(20),
  "abl_de" character(20),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."cadministcode" IS 'CADMINISTCODE';
COMMENT ON COLUMN public."cadministcode"."administ_zone_se" IS 'ADMINIST구역구분';
COMMENT ON COLUMN public."cadministcode"."administ_zone_code" IS 'ADMINIST구역코드';
COMMENT ON COLUMN public."cadministcode"."use_at" IS '사용여부';
COMMENT ON COLUMN public."cadministcode"."administ_zone_nm" IS 'ADMINIST구역명';
COMMENT ON COLUMN public."cadministcode"."upper_administ_zone_code" IS 'UPPERADMINIST구역코드';
COMMENT ON COLUMN public."cadministcode"."creat_de" IS 'CREAT일자';
COMMENT ON COLUMN public."cadministcode"."abl_de" IS '폐지일자';
COMMENT ON COLUMN public."cadministcode"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."cadministcode"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."cadministcode"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."cadministcode"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.cadministcoderecptnlog
CREATE TABLE IF NOT EXISTS public."cadministcoderecptnlog" (
  "occrrnc_de" character(20) NOT NULL,
  "administ_zone_se" character(1) NOT NULL,
  "administ_zone_code" character varying(10) NOT NULL,
  "opert_sn" numeric NOT NULL,
  "change_se_code" character varying(2),
  "process_se" character varying(2),
  "administ_zone_nm" character varying(60),
  "lowest_administ_zone_nm" character varying(60),
  "ctprvn_code" character varying(2),
  "signgu_code" character varying(3),
  "emd_code" character varying(3),
  "li_code" character varying(2),
  "creat_de" character(20),
  "abl_de" character(20),
  "abl_ennc" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."cadministcoderecptnlog" IS 'CADMINISTCODERECPTNLOG';
COMMENT ON COLUMN public."cadministcoderecptnlog"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."cadministcoderecptnlog"."administ_zone_se" IS 'ADMINIST구역구분';
COMMENT ON COLUMN public."cadministcoderecptnlog"."administ_zone_code" IS 'ADMINIST구역코드';
COMMENT ON COLUMN public."cadministcoderecptnlog"."opert_sn" IS 'OPERT일련번호';
COMMENT ON COLUMN public."cadministcoderecptnlog"."change_se_code" IS 'CHANGE구분코드';
COMMENT ON COLUMN public."cadministcoderecptnlog"."process_se" IS 'PROCESS구분';
COMMENT ON COLUMN public."cadministcoderecptnlog"."administ_zone_nm" IS 'ADMINIST구역명';
COMMENT ON COLUMN public."cadministcoderecptnlog"."lowest_administ_zone_nm" IS 'LOWESTADMINIST구역명';
COMMENT ON COLUMN public."cadministcoderecptnlog"."ctprvn_code" IS '법원방지코드';
COMMENT ON COLUMN public."cadministcoderecptnlog"."signgu_code" IS 'SIGNGU코드';
COMMENT ON COLUMN public."cadministcoderecptnlog"."emd_code" IS '읍면동코드';
COMMENT ON COLUMN public."cadministcoderecptnlog"."li_code" IS '리코드';
COMMENT ON COLUMN public."cadministcoderecptnlog"."creat_de" IS 'CREAT일자';
COMMENT ON COLUMN public."cadministcoderecptnlog"."abl_de" IS '폐지일자';
COMMENT ON COLUMN public."cadministcoderecptnlog"."abl_ennc" IS '폐지ENNC';
COMMENT ON COLUMN public."cadministcoderecptnlog"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."cadministcoderecptnlog"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."cadministcoderecptnlog"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."cadministcoderecptnlog"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ccmmnclcode
CREATE TABLE IF NOT EXISTS public."ccmmnclcode" (
  "cl_code" character(3) NOT NULL,
  "cl_code_nm" character varying(60),
  "cl_code_dc" character varying(200),
  "use_at" character(1),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."ccmmnclcode" IS 'CCMMNCLCODE';
COMMENT ON COLUMN public."ccmmnclcode"."cl_code" IS 'CL코드';
COMMENT ON COLUMN public."ccmmnclcode"."cl_code_nm" IS 'CL코드명';
COMMENT ON COLUMN public."ccmmnclcode"."cl_code_dc" IS 'CL코드설명';
COMMENT ON COLUMN public."ccmmnclcode"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ccmmnclcode"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ccmmnclcode"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ccmmnclcode"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ccmmnclcode"."last_updusr_id" IS '최종수정자아이디';

INSERT INTO public."ccmmnclcode" ("cl_code", "cl_code_nm", "cl_code_dc", "use_at", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id") VALUES
  ('EFC', '전자정부 프레임워크 공통서비스', '전자정부 프레임워크 공통서비스', 'Y', '2025-12-28T16:39:40.572Z', 'SYSTEM', '2025-12-28T16:39:40.572Z', 'SYSTEM');

-- --------------------------------------------------------

-- Table: public.ccmmncode
CREATE TABLE IF NOT EXISTS public."ccmmncode" (
  "code_id" character varying(6) NOT NULL,
  "code_id_nm" character varying(60),
  "code_id_dc" character varying(200),
  "use_at" character(1),
  "cl_code" character(3),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."ccmmncode" IS 'CCMMNCODE';
COMMENT ON COLUMN public."ccmmncode"."code_id" IS '코드아이디';
COMMENT ON COLUMN public."ccmmncode"."code_id_nm" IS '코드아이디명';
COMMENT ON COLUMN public."ccmmncode"."code_id_dc" IS '코드아이디설명';
COMMENT ON COLUMN public."ccmmncode"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ccmmncode"."cl_code" IS 'CL코드';
COMMENT ON COLUMN public."ccmmncode"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ccmmncode"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ccmmncode"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ccmmncode"."last_updusr_id" IS '최종수정자아이디';

INSERT INTO public."ccmmncode" ("code_id", "code_id_nm", "code_id_dc", "use_at", "cl_code", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id") VALUES
  ('COM001', '등록구분', '게시판, 커뮤니티, 동호회 등록구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.573Z', 'SYSTEM', '2025-12-28T16:39:40.573Z', 'SYSTEM'),
  ('COM002', '이력구분', '시스템이력등록구분', 'Y', 'EFC', '2025-12-28T16:39:40.575Z', 'SYSTEM', '2025-12-28T16:39:40.575Z', 'SYSTEM'),
  ('COM003', '업무구분', '업무구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.576Z', 'SYSTEM', '2025-12-28T16:39:40.576Z', 'SYSTEM'),
  ('COM005', '템플릿유형', '템플릿유형구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.577Z', 'SYSTEM', '2025-12-28T16:39:40.577Z', 'SYSTEM'),
  ('COM006', '승인유형', '동호회, 커뮤니티 승인 유형', 'Y', 'EFC', '2025-12-28T16:39:40.577Z', 'SYSTEM', '2025-12-28T16:39:40.577Z', 'SYSTEM'),
  ('COM007', '승인상태', '동호회, 커뮤니티 승인 상태', 'Y', 'EFC', '2025-12-28T16:39:40.578Z', 'SYSTEM', '2025-12-28T16:39:40.578Z', 'SYSTEM'),
  ('COM008', '처리상태', '송수신 요청의 처리상태', 'Y', 'EFC', '2025-12-28T16:39:40.579Z', 'SYSTEM', '2025-12-28T16:39:40.579Z', 'SYSTEM'),
  ('COM009', '게시판속성', '게시판 속성', 'Y', 'EFC', '2025-12-28T16:39:40.580Z', 'SYSTEM', '2025-12-28T16:39:40.580Z', 'SYSTEM'),
  ('COM010', '권한유형', '시스템을 사용하기 위한 권한 구분', 'Y', 'EFC', '2025-12-28T16:39:40.581Z', 'SYSTEM', '2025-12-28T16:39:40.581Z', 'SYSTEM'),
  ('COM011', '롤유형', '시스템의 기능을 사용하기 위한 롤 구분', 'Y', 'EFC', '2025-12-28T16:39:40.582Z', 'SYSTEM', '2025-12-28T16:39:40.582Z', 'SYSTEM'),
  ('COM012', '회원유형', '일반/기업/업무담당자를 구현하기 위한 사용자 구분', 'Y', 'EFC', '2025-12-28T16:39:40.582Z', 'SYSTEM', '2025-12-28T16:39:40.582Z', 'SYSTEM'),
  ('COM013', '회원상태', '회원 가입 신청/승인/삭제를 위한 상태 구분', 'Y', 'EFC', '2025-12-28T16:39:40.583Z', 'SYSTEM', '2025-12-28T16:39:40.583Z', 'SYSTEM'),
  ('COM014', '성별구분', '남녀 성별 구분', 'Y', 'EFC', '2025-12-28T16:39:40.584Z', 'SYSTEM', '2025-12-28T16:39:40.584Z', 'SYSTEM'),
  ('COM015', '인증방식유형', '주민등록번호 인증, Gpin 인증과 같은 사용자 인증 구분', 'Y', 'EFC', '2025-12-28T16:39:40.585Z', 'SYSTEM', '2025-12-28T16:39:40.585Z', 'SYSTEM'),
  ('COM016', '변경요청처리 상태', '프로그램 변경의 요청/처리 등의 변경요청 상태 구분', 'Y', 'EFC', '2025-12-28T16:39:40.586Z', 'SYSTEM', '2025-12-28T16:39:40.586Z', 'SYSTEM'),
  ('COM017', '휴일구분', '휴일의 구분', 'Y', 'EFC', '2025-12-28T16:39:40.587Z', 'SYSTEM', '2025-12-28T16:39:40.587Z', 'SYSTEM'),
  ('COM018', '질문유형', '질문유형 객관식/주관식 상태구분', 'Y', 'EFC', '2025-12-28T16:39:40.588Z', 'SYSTEM', '2025-12-28T16:39:40.588Z', 'SYSTEM'),
  ('COM019', '일정중요도', '일정중요도 낮음/보통/높음 상태구분', 'Y', 'EFC', '2025-12-28T16:39:40.589Z', 'SYSTEM', '2025-12-28T16:39:40.589Z', 'SYSTEM'),
  ('COM020', '일정구분', '일정구분 부서일지정보/일지정보 상태구분', 'Y', 'EFC', '2025-12-28T16:39:40.590Z', 'SYSTEM', '2025-12-28T16:39:40.590Z', 'SYSTEM'),
  ('COM021', '도움말구분', '도움말 설명 구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.591Z', 'SYSTEM', '2025-12-28T16:39:40.591Z', 'SYSTEM'),
  ('COM022', '비밀번호 힌트', '비밀번호 힌트 구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.591Z', 'SYSTEM', '2025-12-28T16:39:40.591Z', 'SYSTEM'),
  ('COM023', '사이트주제분류', '사이트주제분류 설명 구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.592Z', 'SYSTEM', '2025-12-28T16:39:40.592Z', 'SYSTEM'),
  ('COM024', '발송결과구분', '발송메일 수신결과 구분 코드', 'Y', 'EFC', '2025-12-28T16:39:40.593Z', 'SYSTEM', '2025-12-28T16:39:40.593Z', 'SYSTEM'),
  ('COM025', '소속기관', '소속기관정보를 관리할때 사용하는 구분코드(시스템별로 재정의)', 'Y', 'EFC', '2025-12-28T16:39:40.594Z', 'SYSTEM', '2025-12-28T16:39:40.594Z', 'SYSTEM'),
  ('COM026', '기업구분', '기업구분정보를 관리할때 사용하는 구분코드(시스템별로 재정의)', 'Y', 'EFC', '2025-12-28T16:39:40.595Z', 'SYSTEM', '2025-12-28T16:39:40.595Z', 'SYSTEM'),
  ('COM027', '업종', '대표업종코드(시스템별로 재정의)', 'Y', 'EFC', '2025-12-28T16:39:40.595Z', 'SYSTEM', '2025-12-28T16:39:40.595Z', 'SYSTEM'),
  ('COM028', '질의응답처리상태', 'Q/A 처리상태코드', 'Y', 'EFC', '2025-12-28T16:39:40.596Z', 'SYSTEM', '2025-12-28T16:39:40.596Z', 'SYSTEM'),
  ('COM029', '롤유형코드', '', 'Y', 'EFC', '2025-12-28T16:39:40.597Z', 'SYSTEM', '2025-12-28T16:39:40.597Z', 'SYSTEM'),
  ('COM030', '일정구분', '일정구분 코드', 'Y', 'EFC', '2025-12-28T16:39:40.598Z', 'SYSTEM', '2025-12-28T16:39:40.598Z', 'SYSTEM'),
  ('COM031', '반복구분', '일정 반복구분 코드', 'Y', 'EFC', '2025-12-28T16:39:40.599Z', 'SYSTEM', '2025-12-28T16:39:40.599Z', 'SYSTEM'),
  ('COM032', '작업유형', '승인이력 작업유형', 'Y', 'EFC', '2025-12-28T16:39:40.600Z', 'SYSTEM', '2025-12-28T16:39:40.600Z', 'SYSTEM'),
  ('COM033', '시스템로그구분', '', 'Y', 'EFC', '2025-12-28T16:39:40.600Z', 'SYSTEM', '2025-12-28T16:39:40.600Z', 'SYSTEM'),
  ('COM034', '직업유형', '직업유형코드', 'Y', 'EFC', '2025-12-28T16:39:40.601Z', 'SYSTEM', '2025-12-28T16:39:40.601Z', 'SYSTEM'),
  ('COM035', '행사유형', '행사/이벤트/캠페인 구분', 'Y', 'EFC', '2025-12-28T16:39:40.602Z', 'SYSTEM', '2025-12-28T16:39:40.602Z', 'SYSTEM'),
  ('COM036', '보고서 진행상태코드', '보고서의 진행상태를 코드화 하여 관리한다.', 'Y', 'EFC', '2025-12-28T16:39:40.603Z', 'SYSTEM', '2025-12-28T16:39:40.603Z', 'SYSTEM'),
  ('COM038', '온라인POLL페기유무', '온라인POLL-온라인POLL페기유무', 'Y', 'EFC', '2025-12-28T16:39:40.604Z', 'SYSTEM', '2025-12-28T16:39:40.604Z', 'SYSTEM'),
  ('COM039', '온라인POLL구분', '온라인POLL-온온라인POLL구분', 'Y', 'EFC', '2025-12-28T16:39:40.605Z', 'SYSTEM', '2025-12-28T16:39:40.605Z', 'SYSTEM'),
  ('COM040', '보고서 종류코드', '보고서 종류코드', 'Y', 'EFC', '2025-12-28T16:39:40.606Z', 'SYSTEM', '2025-12-28T16:39:40.606Z', 'SYSTEM'),
  ('COM041', '온라인메뉴얼구분', '온라인메누얼-온라인메뉴얼구분', 'Y', 'EFC', '2025-12-28T16:39:40.607Z', 'SYSTEM', '2025-12-28T16:39:40.607Z', 'SYSTEM'),
  ('COM042', '보고서통계기간구분', '보고서통계기간구분', 'Y', 'EFC', '2025-12-28T16:39:40.608Z', 'SYSTEM', '2025-12-28T16:39:40.608Z', 'SYSTEM'),
  ('COM043', '기관코드변경구분', '기관코드변경구분', 'Y', 'EFC', '2025-12-28T16:39:40.608Z', 'SYSTEM', '2025-12-28T16:39:40.608Z', 'SYSTEM'),
  ('COM044', '기관코드수신처리구분', '기관코드수신처리구분', 'Y', 'EFC', '2025-12-28T16:39:40.609Z', 'SYSTEM', '2025-12-28T16:39:40.609Z', 'SYSTEM'),
  ('COM045', '사용여부', '사용여부', 'Y', 'EFC', '2025-12-28T16:39:40.610Z', 'SYSTEM', '2025-12-28T16:39:40.610Z', 'SYSTEM'),
  ('COM046', '모니터링상태구분', '모니터링상태구분', 'Y', 'EFC', '2025-12-28T16:39:40.611Z', 'SYSTEM', '2025-12-28T16:39:40.611Z', 'SYSTEM'),
  ('COM047', '실행주기구분', '실행주기구분', 'Y', 'EFC', '2025-12-28T16:39:40.612Z', 'SYSTEM', '2025-12-28T16:39:40.612Z', 'SYSTEM'),
  ('COM048', 'DBMS종류', 'DBMS종류', 'Y', 'EFC', '2025-12-28T16:39:40.613Z', 'SYSTEM', '2025-12-28T16:39:40.613Z', 'SYSTEM'),
  ('COM049', '압축구분', '압축구분', 'Y', 'EFC', '2025-12-28T16:39:40.614Z', 'SYSTEM', '2025-12-28T16:39:40.614Z', 'SYSTEM'),
  ('COM050', '수신구분', '쪽지관리', 'Y', 'EFC', '2025-12-28T16:39:40.615Z', 'SYSTEM', '2025-12-28T16:39:40.615Z', 'SYSTEM'),
  ('COM051', '승인여부', '승인여부구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.616Z', 'SYSTEM', '2025-12-28T16:39:40.616Z', 'SYSTEM'),
  ('COM052', '달력구분', '달력구분', 'Y', 'EFC', '2025-12-28T16:39:40.617Z', 'SYSTEM', '2025-12-28T16:39:40.617Z', 'SYSTEM'),
  ('COM053', '행사구분', '행사구분', 'Y', 'EFC', '2025-12-28T16:39:40.618Z', 'SYSTEM', '2025-12-28T16:39:40.618Z', 'SYSTEM'),
  ('COM054', '경조구분', '경조구분', 'Y', 'EFC', '2025-12-28T16:39:40.619Z', 'SYSTEM', '2025-12-28T16:39:40.619Z', 'SYSTEM'),
  ('COM055', '포상구분', '포상구분', 'Y', 'EFC', '2025-12-28T16:39:40.620Z', 'SYSTEM', '2025-12-28T16:39:40.620Z', 'SYSTEM'),
  ('COM056', '휴가구분', '휴가구분', 'Y', 'EFC', '2025-12-28T16:39:40.621Z', 'SYSTEM', '2025-12-28T16:39:40.621Z', 'SYSTEM'),
  ('COM057', '일정구분', '일정구분', 'Y', 'EFC', '2025-12-28T16:39:40.622Z', 'SYSTEM', '2025-12-28T16:39:40.622Z', 'SYSTEM'),
  ('COM058', '반복구분코드', '반복구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.622Z', 'SYSTEM', '2025-12-28T16:39:40.622Z', 'SYSTEM'),
  ('COM059', '우선순위', '우선순위', 'Y', 'EFC', '2025-12-28T16:39:40.623Z', 'SYSTEM', '2025-12-28T16:39:40.623Z', 'SYSTEM'),
  ('COM060', '보고서구분', '보고서구분', 'Y', 'EFC', '2025-12-28T16:39:40.624Z', 'SYSTEM', '2025-12-28T16:39:40.624Z', 'SYSTEM'),
  ('COM061', '간부상태', '간부상태', 'Y', 'EFC', '2025-12-28T16:39:40.625Z', 'SYSTEM', '2025-12-28T16:39:40.625Z', 'SYSTEM'),
  ('COM062', ' HTTP상태코드', 'HTTP상태코드', 'Y', 'EFC', '2025-12-28T16:39:40.626Z', 'SYSTEM', '2025-12-28T16:39:40.626Z', 'SYSTEM'),
  ('COM063', '상태관리', '상태관리', 'Y', 'EFC', '2025-12-28T16:39:40.627Z', 'SYSTEM', '2025-12-28T16:39:40.627Z', 'SYSTEM'),
  ('COM064', '서버종류코드', '서버종류코드', 'Y', 'EFC', '2025-12-28T16:39:40.627Z', 'SYSTEM', '2025-12-28T16:39:40.627Z', 'SYSTEM'),
  ('COM065', '장애종류코드', '장애종류코드', 'Y', 'EFC', '2025-12-28T16:39:40.628Z', 'SYSTEM', '2025-12-28T16:39:40.628Z', 'SYSTEM'),
  ('COM066', '서버자원종류', '서버자원종류', 'Y', 'EFC', '2025-12-28T16:39:40.629Z', 'SYSTEM', '2025-12-28T16:39:40.629Z', 'SYSTEM'),
  ('COM067', '네트워크관리항목', '네트워크관리항목', 'Y', 'EFC', '2025-12-28T16:39:40.630Z', 'SYSTEM', '2025-12-28T16:39:40.630Z', 'SYSTEM'),
  ('COM068', '처리상태코드', '처리상태코드', 'Y', 'EFC', '2025-12-28T16:39:40.631Z', 'SYSTEM', '2025-12-28T16:39:40.631Z', 'SYSTEM'),
  ('COM069', '기념일구분', '기념일구분', 'Y', 'EFC', '2025-12-28T16:39:40.632Z', 'SYSTEM', '2025-12-28T16:39:40.632Z', 'SYSTEM'),
  ('COM070', '위치구분', '회의실 위치구분', 'Y', 'EFC', '2025-12-28T16:39:40.633Z', 'SYSTEM', '2025-12-28T16:39:40.633Z', 'SYSTEM'),
  ('COM071', '당직체크구분', '당직체크구분', 'Y', 'EFC', '2025-12-28T16:39:40.634Z', 'SYSTEM', '2025-12-28T16:39:40.634Z', 'SYSTEM'),
  ('COM072', '서비스상태', '서비스상태', 'Y', 'EFC', '2025-12-28T16:39:40.635Z', 'SYSTEM', '2025-12-28T16:39:40.635Z', 'SYSTEM'),
  ('COM073', '가족관계', '가족관계', 'Y', 'EFC', '2025-12-28T16:39:40.636Z', 'SYSTEM', '2025-12-28T16:39:40.636Z', 'SYSTEM'),
  ('COM074', '요일구분', '요일구분', 'Y', 'EFC', '2025-12-28T16:39:40.637Z', 'SYSTEM', '2025-12-28T16:39:40.637Z', 'SYSTEM'),
  ('COM075', '업무구분코드', '업무구분코드', 'Y', 'EFC', '2025-12-28T16:39:40.638Z', 'SYSTEM', '2025-12-28T16:39:40.638Z', 'SYSTEM'),
  ('COM076', '실행상태구분', '실행상태구분', 'Y', 'EFC', '2025-12-28T16:39:40.639Z', 'SYSTEM', '2025-12-28T16:39:40.639Z', 'SYSTEM'),
  ('COM101', '게시판유형', '게시판유형', 'Y', 'EFC', '2025-12-28T16:39:40.640Z', 'SYSTEM', '2025-12-28T16:39:40.640Z', 'SYSTEM'),
  ('COM102', '단어구분', '단어구분', 'Y', 'EFC', '2025-12-28T16:39:40.641Z', 'SYSTEM', '2025-12-28T16:39:40.641Z', 'SYSTEM');

-- --------------------------------------------------------

-- Table: public.ccmmndetailcode
CREATE TABLE IF NOT EXISTS public."ccmmndetailcode" (
  "code_id" character varying(6) NOT NULL,
  "code" character varying(15) NOT NULL,
  "code_nm" character varying(60),
  "code_dc" character varying(200),
  "use_at" character(1),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."ccmmndetailcode" IS 'CCMMNDETAILCODE';
COMMENT ON COLUMN public."ccmmndetailcode"."code_id" IS '코드아이디';
COMMENT ON COLUMN public."ccmmndetailcode"."code" IS '코드';
COMMENT ON COLUMN public."ccmmndetailcode"."code_nm" IS '코드명';
COMMENT ON COLUMN public."ccmmndetailcode"."code_dc" IS '코드설명';
COMMENT ON COLUMN public."ccmmndetailcode"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ccmmndetailcode"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ccmmndetailcode"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ccmmndetailcode"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ccmmndetailcode"."last_updusr_id" IS '최종수정자아이디';

INSERT INTO public."ccmmndetailcode" ("code_id", "code", "code_nm", "code_dc", "use_at", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id") VALUES
  ('COM001', 'REGC01', '단일 게시판 이용등록', '단일 게시판 이용등록', 'Y', '2025-12-28T16:39:40.642Z', 'SYSTEM', '2025-12-28T16:39:40.642Z', 'SYSTEM'),
  ('COM001', 'REGC02', '커뮤니티 등록', '커뮤니티 등록', 'Y', '2025-12-28T16:39:40.644Z', 'SYSTEM', '2025-12-28T16:39:40.644Z', 'SYSTEM'),
  ('COM001', 'REGC03', '동호회 등록', '동호회 등록', 'Y', '2025-12-28T16:39:40.645Z', 'SYSTEM', '2025-12-28T16:39:40.645Z', 'SYSTEM'),
  ('COM001', 'REGC04', '명함등록', '명함등록', 'Y', '2025-12-28T16:39:40.646Z', 'SYSTEM', '2025-12-28T16:39:40.646Z', 'SYSTEM'),
  ('COM001', 'REGC05', '동호회 게시판 등록', '동호회 게시판 등록', 'Y', '2025-12-28T16:39:40.647Z', 'SYSTEM', '2025-12-28T16:39:40.647Z', 'SYSTEM'),
  ('COM001', 'REGC06', '커뮤니티 게시판 등록', '커뮤니티 게시판 등록', 'Y', '2025-12-28T16:39:40.647Z', 'SYSTEM', '2025-12-28T16:39:40.647Z', 'SYSTEM'),
  ('COM001', 'REGC07', '게시판사용자등록', '게시판사용자등록', 'Y', '2025-12-28T16:39:40.648Z', 'SYSTEM', '2025-12-28T16:39:40.648Z', 'SYSTEM'),
  ('COM002', 'HIST01', '소프트웨어패치', '소프트웨어패치', 'Y', '2025-12-28T16:39:40.649Z', 'SYSTEM', '2025-12-28T16:39:40.649Z', 'SYSTEM'),
  ('COM002', 'HIST02', '소프트웨어설치', '소프트웨어설치', 'Y', '2025-12-28T16:39:40.650Z', 'SYSTEM', '2025-12-28T16:39:40.650Z', 'SYSTEM'),
  ('COM002', 'HIST03', '소프트웨어삭제', '소프트웨어삭제', 'Y', '2025-12-28T16:39:40.651Z', 'SYSTEM', '2025-12-28T16:39:40.651Z', 'SYSTEM'),
  ('COM002', 'HIST04', '하드웨어업그레이드', '하드웨어업그레이드', 'Y', '2025-12-28T16:39:40.651Z', 'SYSTEM', '2025-12-28T16:39:40.651Z', 'SYSTEM'),
  ('COM002', 'HIST05', '하드웨어삭제', '하드웨어삭제', 'Y', '2025-12-28T16:39:40.652Z', 'SYSTEM', '2025-12-28T16:39:40.652Z', 'SYSTEM'),
  ('COM003', 'BBS', '게시판', '게시판', 'Y', '2025-12-28T16:39:40.653Z', 'SYSTEM', '2025-12-28T16:39:40.653Z', 'SYSTEM'),
  ('COM003', 'CMY', '커뮤니티', '커뮤니티', 'Y', '2025-12-28T16:39:40.654Z', 'SYSTEM', '2025-12-28T16:39:40.654Z', 'SYSTEM'),
  ('COM003', 'CLB', '동호회', '동호회', 'Y', '2025-12-28T16:39:40.655Z', 'SYSTEM', '2025-12-28T16:39:40.655Z', 'SYSTEM'),
  ('COM003', 'NCD', '명함', '명함', 'Y', '2025-12-28T16:39:40.656Z', 'SYSTEM', '2025-12-28T16:39:40.656Z', 'SYSTEM'),
  ('COM005', 'TMPT01', '게시판템플릿', '게시판템플릿', 'Y', '2025-12-28T16:39:40.657Z', 'SYSTEM', '2025-12-28T16:39:40.657Z', 'SYSTEM'),
  ('COM005', 'TMPT02', '커뮤니티템플릿', '커뮤니티템플릿', 'Y', '2025-12-28T16:39:40.658Z', 'SYSTEM', '2025-12-28T16:39:40.658Z', 'SYSTEM'),
  ('COM005', 'TMPT03', '블로그템플릿', '블로그템플릿', 'Y', '2025-12-28T16:39:40.658Z', 'SYSTEM', '2025-12-28T16:39:40.658Z', 'SYSTEM'),
  ('COM006', 'CF01', '커뮤니티등록', '커뮤니티등록', 'Y', '2025-12-28T16:39:40.660Z', 'SYSTEM', '2025-12-28T16:39:40.660Z', 'SYSTEM'),
  ('COM006', 'CF02', '커뮤니티삭제', '커뮤니티삭제', 'Y', '2025-12-28T16:39:40.660Z', 'SYSTEM', '2025-12-28T16:39:40.660Z', 'SYSTEM'),
  ('COM006', 'CF03', '동호회등록', '동호회등록', 'Y', '2025-12-28T16:39:40.661Z', 'SYSTEM', '2025-12-28T16:39:40.661Z', 'SYSTEM'),
  ('COM006', 'CF04', '동호회삭제', '동호회삭제', 'Y', '2025-12-28T16:39:40.662Z', 'SYSTEM', '2025-12-28T16:39:40.662Z', 'SYSTEM'),
  ('COM006', 'CF05', '커뮤니티운영자등록', '커뮤니티운영자등록', 'Y', '2025-12-28T16:39:40.663Z', 'SYSTEM', '2025-12-28T16:39:40.663Z', 'SYSTEM'),
  ('COM006', 'CF06', '커뮤니티운영자삭제', '커뮤니티운영자삭제', 'Y', '2025-12-28T16:39:40.664Z', 'SYSTEM', '2025-12-28T16:39:40.664Z', 'SYSTEM'),
  ('COM006', 'CF07', '동호회운영자등록', '동호회운영자등록', 'Y', '2025-12-28T16:39:40.664Z', 'SYSTEM', '2025-12-28T16:39:40.664Z', 'SYSTEM'),
  ('COM006', 'CF08', '동호회운영자삭제', '동호회운영자삭제', 'Y', '2025-12-28T16:39:40.665Z', 'SYSTEM', '2025-12-28T16:39:40.665Z', 'SYSTEM'),
  ('COM006', 'CF09', '게시판이용등록', '게시판이용등록', 'Y', '2025-12-28T16:39:40.666Z', 'SYSTEM', '2025-12-28T16:39:40.666Z', 'SYSTEM'),
  ('COM006', 'CF10', '게시판삭제', '게시판삭제', 'Y', '2025-12-28T16:39:40.667Z', 'SYSTEM', '2025-12-28T16:39:40.667Z', 'SYSTEM'),
  ('COM006', 'CF11', '커뮤니티사용자등록', '커뮤니티사용자등록', 'Y', '2025-12-28T16:39:40.668Z', 'SYSTEM', '2025-12-28T16:39:40.668Z', 'SYSTEM'),
  ('COM006', 'CF12', '커뮤니티사용자탈퇴', '커뮤니티사용자탈퇴', 'Y', '2025-12-28T16:39:40.668Z', 'SYSTEM', '2025-12-28T16:39:40.668Z', 'SYSTEM'),
  ('COM006', 'CF13', '동호회사용자등록', '동호회사용자등록', 'Y', '2025-12-28T16:39:40.669Z', 'SYSTEM', '2025-12-28T16:39:40.669Z', 'SYSTEM'),
  ('COM006', 'CF14', '동호회사용자탈퇴', '동호회사용자탈퇴', 'Y', '2025-12-28T16:39:40.670Z', 'SYSTEM', '2025-12-28T16:39:40.670Z', 'SYSTEM'),
  ('COM007', 'AP01', '승인요청', '승인요청', 'Y', '2025-12-28T16:39:40.671Z', 'SYSTEM', '2025-12-28T16:39:40.671Z', 'SYSTEM'),
  ('COM007', 'AP02', '승인허가', '승인허가', 'Y', '2025-12-28T16:39:40.672Z', 'SYSTEM', '2025-12-28T16:39:40.672Z', 'SYSTEM'),
  ('COM007', 'AP03', '승인반려', '승인반려', 'Y', '2025-12-28T16:39:40.673Z', 'SYSTEM', '2025-12-28T16:39:40.673Z', 'SYSTEM'),
  ('COM008', 'S01', '전송요청', '전송요청', 'Y', '2025-12-28T16:39:40.674Z', 'SYSTEM', '2025-12-28T16:39:40.674Z', 'SYSTEM'),
  ('COM008', 'S02', '전송완료', '전송완료', 'Y', '2025-12-28T16:39:40.675Z', 'SYSTEM', '2025-12-28T16:39:40.675Z', 'SYSTEM'),
  ('COM008', 'S03', '전송실패', '전송실패', 'Y', '2025-12-28T16:39:40.676Z', 'SYSTEM', '2025-12-28T16:39:40.676Z', 'SYSTEM'),
  ('COM008', 'S04', '수신요청', '수신요청', 'Y', '2025-12-28T16:39:40.677Z', 'SYSTEM', '2025-12-28T16:39:40.677Z', 'SYSTEM'),
  ('COM008', 'S05', '수신완료', '수신완료', 'Y', '2025-12-28T16:39:40.677Z', 'SYSTEM', '2025-12-28T16:39:40.677Z', 'SYSTEM'),
  ('COM008', 'S06', '수신실패', '수신실패', 'Y', '2025-12-28T16:39:40.678Z', 'SYSTEM', '2025-12-28T16:39:40.678Z', 'SYSTEM'),
  ('COM009', 'BBSA01', '유효게시판', '유효게시판', 'Y', '2025-12-28T16:39:40.679Z', 'SYSTEM', '2025-12-28T16:39:40.679Z', 'SYSTEM'),
  ('COM009', 'BBSA02', '갤러리', '갤러리', 'Y', '2025-12-28T16:39:40.680Z', 'SYSTEM', '2025-12-28T16:39:40.680Z', 'SYSTEM'),
  ('COM009', 'BBSA03', '일반게시판', '일반게시판', 'Y', '2025-12-28T16:39:40.681Z', 'SYSTEM', '2025-12-28T16:39:40.681Z', 'SYSTEM'),
  ('COM010', 'PRVS001', '시스템 관련 권한(최상위 권한)', '시스템 관련 권한(최상위 권한)', 'Y', '2025-12-28T16:39:40.681Z', 'SYSTEM', '2025-12-28T16:39:40.681Z', 'SYSTEM'),
  ('COM010', 'PRVD001', '데이터베이스 관련 권한', '데이터베이스 관련 권한', 'Y', '2025-12-28T16:39:40.682Z', 'SYSTEM', '2025-12-28T16:39:40.682Z', 'SYSTEM'),
  ('COM010', 'PRVU001', '사용자 관련 권한', '사용자 관련 권한', 'Y', '2025-12-28T16:39:40.683Z', 'SYSTEM', '2025-12-28T16:39:40.683Z', 'SYSTEM'),
  ('COM010', 'PRVA001', '어플리케이션 관련 권한', '어플리케이션 관련 권한', 'Y', '2025-12-28T16:39:40.684Z', 'SYSTEM', '2025-12-28T16:39:40.684Z', 'SYSTEM'),
  ('COM010', 'PRVB001', '게시판 관련 권한', '게시판 관련 권한', 'Y', '2025-12-28T16:39:40.685Z', 'SYSTEM', '2025-12-28T16:39:40.685Z', 'SYSTEM'),
  ('COM010', 'PRVC001', '커뮤니티 관련 권한', '커뮤니티 관련 권한', 'Y', '2025-12-28T16:39:40.685Z', 'SYSTEM', '2025-12-28T16:39:40.685Z', 'SYSTEM'),
  ('COM011', 'ROLS001', '시스템 관리 최상위 롤', '시스템 관리 최상위 롤', 'Y', '2025-12-28T16:39:40.686Z', 'SYSTEM', '2025-12-28T16:39:40.686Z', 'SYSTEM'),
  ('COM011', 'ROLS002', '시스템 접근(view) 롤', '시스템 접근(view) 롤', 'Y', '2025-12-28T16:39:40.687Z', 'SYSTEM', '2025-12-28T16:39:40.687Z', 'SYSTEM'),
  ('COM011', 'ROLS003', '시스템 설정 등록/변경 롤', '시스템 설정 등록/변경 롤', 'Y', '2025-12-28T16:39:40.688Z', 'SYSTEM', '2025-12-28T16:39:40.688Z', 'SYSTEM'),
  ('COM011', 'ROLS004', '시스템 파일 등록/변경 롤', '시스템 파일 등록/변경 롤', 'Y', '2025-12-28T16:39:40.689Z', 'SYSTEM', '2025-12-28T16:39:40.689Z', 'SYSTEM'),
  ('COM011', 'ROLD001', '데이터베이스 관련 최상위 롤', '데이터베이스 관련 최상위 롤', 'Y', '2025-12-28T16:39:40.690Z', 'SYSTEM', '2025-12-28T16:39:40.690Z', 'SYSTEM'),
  ('COM011', 'ROLD002', '데이터베이스 스키마 등록/변경 롤', '데이터베이스 스키마 등록/변경 롤', 'Y', '2025-12-28T16:39:40.691Z', 'SYSTEM', '2025-12-28T16:39:40.691Z', 'SYSTEM'),
  ('COM011', 'ROLD003', '데이터 조회 롤', '데이터 조회 롤', 'Y', '2025-12-28T16:39:40.692Z', 'SYSTEM', '2025-12-28T16:39:40.692Z', 'SYSTEM'),
  ('COM011', 'ROLD004', '데이터 등록/변경 롤', '데이터 등록/변경 롤', 'Y', '2025-12-28T16:39:40.693Z', 'SYSTEM', '2025-12-28T16:39:40.693Z', 'SYSTEM'),
  ('COM011', 'ROLU001', '사용자 관련 최상위 롤', '사용자 관련 최상위 롤', 'Y', '2025-12-28T16:39:40.693Z', 'SYSTEM', '2025-12-28T16:39:40.693Z', 'SYSTEM'),
  ('COM011', 'ROLU002', '업무 시스템 사용자 관리 롤', '업무 시스템 사용자 관리 롤', 'Y', '2025-12-28T16:39:40.694Z', 'SYSTEM', '2025-12-28T16:39:40.694Z', 'SYSTEM'),
  ('COM011', 'ROLU003', '기업회원 시스템 사용자 관리 롤', '기업회원 시스템 사용자 관리 롤', 'Y', '2025-12-28T16:39:40.695Z', 'SYSTEM', '2025-12-28T16:39:40.695Z', 'SYSTEM'),
  ('COM011', 'ROLU004', '일반회원 시스템 사용자 관리 롤', '일반회원 시스템 사용자 관리 롤', 'Y', '2025-12-28T16:39:40.696Z', 'SYSTEM', '2025-12-28T16:39:40.696Z', 'SYSTEM'),
  ('COM011', 'ROLU005', '게시판 사용자 관리 롤', '게시판 사용자 관리 롤', 'Y', '2025-12-28T16:39:40.697Z', 'SYSTEM', '2025-12-28T16:39:40.697Z', 'SYSTEM'),
  ('COM011', 'ROLU006', '커뮤니티 사용자 관리 롤', '커뮤니티 사용자 관리 롤', 'Y', '2025-12-28T16:39:40.698Z', 'SYSTEM', '2025-12-28T16:39:40.698Z', 'SYSTEM'),
  ('COM011', 'ROLA001', '어플리케이션 관련 최상위 롤', '어플리케이션 관련 최상위 롤', 'Y', '2025-12-28T16:39:40.698Z', 'SYSTEM', '2025-12-28T16:39:40.698Z', 'SYSTEM'),
  ('COM011', 'ROLA002', '업무 어플리케이션 접근 롤', '업무 어플리케이션 접근 롤', 'Y', '2025-12-28T16:39:40.699Z', 'SYSTEM', '2025-12-28T16:39:40.699Z', 'SYSTEM'),
  ('COM011', 'ROLA003', '업무 어플리케이션 관리 롤', '업무 어플리케이션 관리 롤', 'Y', '2025-12-28T16:39:40.700Z', 'SYSTEM', '2025-12-28T16:39:40.700Z', 'SYSTEM'),
  ('COM011', 'ROLA004', '일반 어플리케이션 접근 롤', '일반 어플리케이션 접근 롤', 'Y', '2025-12-28T16:39:40.701Z', 'SYSTEM', '2025-12-28T16:39:40.701Z', 'SYSTEM'),
  ('COM011', 'ROLA005', '일반 어프리케이션 관리 롤', '일반 어프리케이션 관리 롤', 'Y', '2025-12-28T16:39:40.701Z', 'SYSTEM', '2025-12-28T16:39:40.701Z', 'SYSTEM'),
  ('COM011', 'ROLA006', '어플리케이션 약관 관리 롤', '어플리케이션 약관 관리 롤', 'Y', '2025-12-28T16:39:40.702Z', 'SYSTEM', '2025-12-28T16:39:40.702Z', 'SYSTEM'),
  ('COM011', 'ROLA007', '어플리케이션 저작권 관리 롤', '어플리케이션 저작권 관리 롤', 'Y', '2025-12-28T16:39:40.703Z', 'SYSTEM', '2025-12-28T16:39:40.703Z', 'SYSTEM'),
  ('COM011', 'ROLA008', '통계 및 보고서 접근 롤', '통계 및 보고서 접근 롤', 'Y', '2025-12-28T16:39:40.704Z', 'SYSTEM', '2025-12-28T16:39:40.704Z', 'SYSTEM'),
  ('COM011', 'ROLB001', '게시판 관련 최상위 롤', '게시판 관련 최상위 롤', 'Y', '2025-12-28T16:39:40.705Z', 'SYSTEM', '2025-12-28T16:39:40.705Z', 'SYSTEM'),
  ('COM011', 'ROLB002', '게시판 생성 롤', '게시판 생성 롤', 'Y', '2025-12-28T16:39:40.706Z', 'SYSTEM', '2025-12-28T16:39:40.706Z', 'SYSTEM'),
  ('COM011', 'ROLB003', '게시판 접근 롤', '게시판 접근 롤', 'Y', '2025-12-28T16:39:40.707Z', 'SYSTEM', '2025-12-28T16:39:40.707Z', 'SYSTEM'),
  ('COM011', 'ROLB004', '게시판 글쓰기 롤', '게시판 글쓰기 롤', 'Y', '2025-12-28T16:39:40.708Z', 'SYSTEM', '2025-12-28T16:39:40.708Z', 'SYSTEM'),
  ('COM011', 'ROLB005', '게시판 글 수정/삭제 롤', '게시판 글 수정/삭제 롤', 'Y', '2025-12-28T16:39:40.709Z', 'SYSTEM', '2025-12-28T16:39:40.709Z', 'SYSTEM'),
  ('COM011', 'ROLC001', '커뮤니티 관련 최상위 롤', '커뮤니티 관련 최상위 롤', 'Y', '2025-12-28T16:39:40.710Z', 'SYSTEM', '2025-12-28T16:39:40.710Z', 'SYSTEM'),
  ('COM011', 'ROLC002', '커뮤니티 생성 롤', '커뮤니티 생성 롤', 'Y', '2025-12-28T16:39:40.710Z', 'SYSTEM', '2025-12-28T16:39:40.710Z', 'SYSTEM'),
  ('COM011', 'ROLC003', '커뮤니티 접근 롤', '커뮤니티 접근 롤', 'Y', '2025-12-28T16:39:40.711Z', 'SYSTEM', '2025-12-28T16:39:40.711Z', 'SYSTEM'),
  ('COM011', 'ROLC004', '커뮤니티 글쓰기 롤', '커뮤니티 글쓰기 롤', 'Y', '2025-12-28T16:39:40.712Z', 'SYSTEM', '2025-12-28T16:39:40.712Z', 'SYSTEM'),
  ('COM011', 'ROLC005', '커뮤니티 글 수정/삭제 롤', '커뮤니티 글 수정/삭제 롤', 'Y', '2025-12-28T16:39:40.713Z', 'SYSTEM', '2025-12-28T16:39:40.713Z', 'SYSTEM'),
  ('COM011', 'ROLC006', '파일 업로드 롤', '파일 업로드 롤', 'Y', '2025-12-28T16:39:40.714Z', 'SYSTEM', '2025-12-28T16:39:40.714Z', 'SYSTEM'),
  ('COM012', 'USR01', '일반 회원 유형', '일반 회원 유형', 'Y', '2025-12-28T16:39:40.714Z', 'SYSTEM', '2025-12-28T16:39:40.714Z', 'SYSTEM'),
  ('COM012', 'USR02', '기업 회원 유형', '기업 회원 유형', 'Y', '2025-12-28T16:39:40.715Z', 'SYSTEM', '2025-12-28T16:39:40.715Z', 'SYSTEM'),
  ('COM012', 'USR03', '업무 담당자(사용자) 유형', '업무 담당자(사용자) 유형', 'Y', '2025-12-28T16:39:40.716Z', 'SYSTEM', '2025-12-28T16:39:40.716Z', 'SYSTEM'),
  ('COM012', 'USR99', '사용자 유형 최상위 롤', '사용자 유형 최상위 롤', 'Y', '2025-12-28T16:39:40.717Z', 'SYSTEM', '2025-12-28T16:39:40.717Z', 'SYSTEM'),
  ('COM013', 'A', '회원 가입 신청 상태', '회원 가입 신청 상태', 'Y', '2025-12-28T16:39:40.717Z', 'SYSTEM', '2025-12-28T16:39:40.717Z', 'SYSTEM'),
  ('COM013', 'P', '회원 가입 승인 상태', '회원 가입 승인 상태', 'Y', '2025-12-28T16:39:40.718Z', 'SYSTEM', '2025-12-28T16:39:40.718Z', 'SYSTEM'),
  ('COM013', 'D', '회원 가입 삭제 상태', '회원 가입 삭제 상태', 'Y', '2025-12-28T16:39:40.719Z', 'SYSTEM', '2025-12-28T16:39:40.719Z', 'SYSTEM'),
  ('COM014', 'M', '남자', '남자', 'Y', '2025-12-28T16:39:40.720Z', 'SYSTEM', '2025-12-28T16:39:40.720Z', 'SYSTEM'),
  ('COM014', 'F', '여자', '여자', 'Y', '2025-12-28T16:39:40.721Z', 'SYSTEM', '2025-12-28T16:39:40.721Z', 'SYSTEM'),
  ('COM015', 'ATH01', '주민등록번호 인증', '주민등록번호 인증', 'Y', '2025-12-28T16:39:40.722Z', 'SYSTEM', '2025-12-28T16:39:40.722Z', 'SYSTEM'),
  ('COM015', 'ATH02', 'GPIN 인증', 'GPIN 인증', 'Y', '2025-12-28T16:39:40.723Z', 'SYSTEM', '2025-12-28T16:39:40.723Z', 'SYSTEM'),
  ('COM016', 'PUR01', '프로그램 변경 요청 신청', '프로그램 변경 요청 신청', 'Y', '2025-12-28T16:39:40.724Z', 'SYSTEM', '2025-12-28T16:39:40.724Z', 'SYSTEM'),
  ('COM016', 'PUR02', '프로그램 변경 요청 수락', '프로그램 변경 요청 수락', 'Y', '2025-12-28T16:39:40.725Z', 'SYSTEM', '2025-12-28T16:39:40.725Z', 'SYSTEM'),
  ('COM016', 'PUR03', '프로그램 변경 진행', '프로그램 변경 진행', 'Y', '2025-12-28T16:39:40.726Z', 'SYSTEM', '2025-12-28T16:39:40.726Z', 'SYSTEM'),
  ('COM016', 'PUR04', '프로그램 변경 완료', '프로그램 변경 완료', 'Y', '2025-12-28T16:39:40.726Z', 'SYSTEM', '2025-12-28T16:39:40.726Z', 'SYSTEM'),
  ('COM016', 'PUR05', '프로그램 변경 이관', '프로그램 변경 이관', 'Y', '2025-12-28T16:39:40.727Z', 'SYSTEM', '2025-12-28T16:39:40.727Z', 'SYSTEM'),
  ('COM017', '01', '법정휴일', '법정휴일', 'Y', '2025-12-28T16:39:40.728Z', 'SYSTEM', '2025-12-28T16:39:40.728Z', 'SYSTEM'),
  ('COM017', '02', '법정공휴일', '법정공휴일', 'Y', '2025-12-28T16:39:40.728Z', 'SYSTEM', '2025-12-28T16:39:40.728Z', 'SYSTEM'),
  ('COM017', '03', '임시공휴일', '임시공휴일', 'Y', '2025-12-28T16:39:40.729Z', 'SYSTEM', '2025-12-28T16:39:40.729Z', 'SYSTEM'),
  ('COM018', '1', '객관식', '객관식', 'Y', '2025-12-28T16:39:40.730Z', 'SYSTEM', '2025-12-28T16:39:40.730Z', 'SYSTEM'),
  ('COM018', '2', '주관식', '주관식', 'Y', '2025-12-28T16:39:40.731Z', 'SYSTEM', '2025-12-28T16:39:40.731Z', 'SYSTEM'),
  ('COM019', 'A', '높음', '높음', 'Y', '2025-12-28T16:39:40.732Z', 'SYSTEM', '2025-12-28T16:39:40.732Z', 'SYSTEM'),
  ('COM019', 'B', '보통', '보통', 'Y', '2025-12-28T16:39:40.732Z', 'SYSTEM', '2025-12-28T16:39:40.732Z', 'SYSTEM'),
  ('COM019', 'C', '낮음', '낮음', 'Y', '2025-12-28T16:39:40.733Z', 'SYSTEM', '2025-12-28T16:39:40.733Z', 'SYSTEM'),
  ('COM020', '1', '부서일정관리', '부서일정관리', 'Y', '2025-12-28T16:39:40.734Z', 'SYSTEM', '2025-12-28T16:39:40.734Z', 'SYSTEM'),
  ('COM020', '2', '일정관리', '일정관리', 'Y', '2025-12-28T16:39:40.735Z', 'SYSTEM', '2025-12-28T16:39:40.735Z', 'SYSTEM'),
  ('COM021', '1', '기능설명', '기능설명', 'Y', '2025-12-28T16:39:40.735Z', 'SYSTEM', '2025-12-28T16:39:40.735Z', 'SYSTEM'),
  ('COM021', '2', '절차설명', '절차설명', 'Y', '2025-12-28T16:39:40.737Z', 'SYSTEM', '2025-12-28T16:39:40.737Z', 'SYSTEM'),
  ('COM022', 'P01', '가장 기억에 남는 장소는?', '가장 기억에 남는 장소는?', 'Y', '2025-12-28T16:39:40.738Z', 'SYSTEM', '2025-12-28T16:39:40.738Z', 'SYSTEM'),
  ('COM022', 'P02', '나의 좌우명은?', '나의 좌우명은?', 'Y', '2025-12-28T16:39:40.739Z', 'SYSTEM', '2025-12-28T16:39:40.739Z', 'SYSTEM'),
  ('COM022', 'P03', '나의 보물 제1호는?', '나의 보물 제1호는?', 'Y', '2025-12-28T16:39:40.740Z', 'SYSTEM', '2025-12-28T16:39:40.740Z', 'SYSTEM'),
  ('COM022', 'P04', '가장 기억에 남는 선생님 성함은?', '가장 기억에 남는 선생님 성함은?', 'Y', '2025-12-28T16:39:40.741Z', 'SYSTEM', '2025-12-28T16:39:40.741Z', 'SYSTEM'),
  ('COM022', 'P05', '다른 사람은 모르는 나만의 신체비밀은?', '다른 사람은 모르는 나만의 신체비밀은?', 'Y', '2025-12-28T16:39:40.741Z', 'SYSTEM', '2025-12-28T16:39:40.741Z', 'SYSTEM'),
  ('COM022', 'P06', '오래도록 기억하고 싶은 날짜는?', '오래도록 기억하고 싶은 날짜는?', 'Y', '2025-12-28T16:39:40.742Z', 'SYSTEM', '2025-12-28T16:39:40.742Z', 'SYSTEM'),
  ('COM022', 'P07', '받았던 선물 중 기억에 남는 독특한 선물은?', '받았던 선물 중 기억에 남는 독특한 선물은?', 'Y', '2025-12-28T16:39:40.743Z', 'SYSTEM', '2025-12-28T16:39:40.743Z', 'SYSTEM'),
  ('COM022', 'P08', '가장 생각나는 친구 이름은?', '가장 생각나는 친구 이름은?', 'Y', '2025-12-28T16:39:40.744Z', 'SYSTEM', '2025-12-28T16:39:40.744Z', 'SYSTEM'),
  ('COM022', 'P09', '인상 깊게 읽은 책 이름은?', '인상 깊게 읽은 책 이름은?', 'Y', '2025-12-28T16:39:40.744Z', 'SYSTEM', '2025-12-28T16:39:40.744Z', 'SYSTEM'),
  ('COM022', 'P10', '내가 존경하는 인물은?', '내가 존경하는 인물은?', 'Y', '2025-12-28T16:39:40.745Z', 'SYSTEM', '2025-12-28T16:39:40.745Z', 'SYSTEM'),
  ('COM022', 'P11', '나의 노래방 애창곡은?', '나의 노래방 애창곡은?', 'Y', '2025-12-28T16:39:40.746Z', 'SYSTEM', '2025-12-28T16:39:40.746Z', 'SYSTEM'),
  ('COM022', 'P12', '가장 감명깊게 본 영화는?', '가장 감명깊게 본 영화는?', 'Y', '2025-12-28T16:39:40.747Z', 'SYSTEM', '2025-12-28T16:39:40.747Z', 'SYSTEM'),
  ('COM022', 'P13', '좋아하는 스포츠팀 이름은?', '좋아하는 스포츠팀 이름은?', 'Y', '2025-12-28T16:39:40.748Z', 'SYSTEM', '2025-12-28T16:39:40.748Z', 'SYSTEM'),
  ('COM023', '01', '경제', '경제', 'Y', '2025-12-28T16:39:40.748Z', 'SYSTEM', '2025-12-28T16:39:40.748Z', 'SYSTEM'),
  ('COM023', '02', '전산', '전산', 'Y', '2025-12-28T16:39:40.749Z', 'SYSTEM', '2025-12-28T16:39:40.749Z', 'SYSTEM'),
  ('COM023', '03', '행정', '행정', 'Y', '2025-12-28T16:39:40.750Z', 'SYSTEM', '2025-12-28T16:39:40.750Z', 'SYSTEM'),
  ('COM024', 'R', '요청', '요청', 'Y', '2025-12-28T16:39:40.751Z', 'SYSTEM', '2025-12-28T16:39:40.751Z', 'SYSTEM'),
  ('COM024', 'F', '실패', '실패', 'Y', '2025-12-28T16:39:40.751Z', 'SYSTEM', '2025-12-28T16:39:40.751Z', 'SYSTEM'),
  ('COM024', 'C', '완료', '완료', 'Y', '2025-12-28T16:39:40.752Z', 'SYSTEM', '2025-12-28T16:39:40.752Z', 'SYSTEM'),
  ('COM025', '00000001', '공공기관', '공공기관', 'Y', '2025-12-28T16:39:40.753Z', 'SYSTEM', '2025-12-28T16:39:40.753Z', 'SYSTEM'),
  ('COM025', '00000002', '금융기관', '금융기관', 'Y', '2025-12-28T16:39:40.754Z', 'SYSTEM', '2025-12-28T16:39:40.754Z', 'SYSTEM'),
  ('COM025', '00000003', '교육기관', '교육기관', 'Y', '2025-12-28T16:39:40.755Z', 'SYSTEM', '2025-12-28T16:39:40.755Z', 'SYSTEM'),
  ('COM025', '00000004', '의료기관', '의료기관', 'Y', '2025-12-28T16:39:40.756Z', 'SYSTEM', '2025-12-28T16:39:40.756Z', 'SYSTEM'),
  ('COM026', 'C0000001', '대기업', '대기업', 'Y', '2025-12-28T16:39:40.757Z', 'SYSTEM', '2025-12-28T16:39:40.757Z', 'SYSTEM'),
  ('COM026', 'C0000002', '중소기업', '중소기업', 'Y', '2025-12-28T16:39:40.758Z', 'SYSTEM', '2025-12-28T16:39:40.758Z', 'SYSTEM'),
  ('COM026', 'C0000003', '다국적기업', '다국적기업', 'Y', '2025-12-28T16:39:40.758Z', 'SYSTEM', '2025-12-28T16:39:40.758Z', 'SYSTEM'),
  ('COM027', 'A', '축산업', '축산업', 'Y', '2025-12-28T16:39:40.759Z', 'SYSTEM', '2025-12-28T16:39:40.759Z', 'SYSTEM'),
  ('COM027', 'B', '어업', '어업', 'Y', '2025-12-28T16:39:40.760Z', 'SYSTEM', '2025-12-28T16:39:40.760Z', 'SYSTEM'),
  ('COM027', 'C', '광업', '광업', 'Y', '2025-12-28T16:39:40.761Z', 'SYSTEM', '2025-12-28T16:39:40.761Z', 'SYSTEM'),
  ('COM027', 'D', '제조업', '제조업', 'Y', '2025-12-28T16:39:40.762Z', 'SYSTEM', '2025-12-28T16:39:40.762Z', 'SYSTEM'),
  ('COM027', 'E', '전기,가스및수도사업', '전기,가스및수도사업', 'Y', '2025-12-28T16:39:40.762Z', 'SYSTEM', '2025-12-28T16:39:40.762Z', 'SYSTEM'),
  ('COM027', 'F', '건설업', '건설업', 'Y', '2025-12-28T16:39:40.763Z', 'SYSTEM', '2025-12-28T16:39:40.763Z', 'SYSTEM'),
  ('COM027', 'G', '도소매 및 소비자용품수리업', '도소매 및 소비자용품수리업', 'Y', '2025-12-28T16:39:40.764Z', 'SYSTEM', '2025-12-28T16:39:40.764Z', 'SYSTEM'),
  ('COM027', 'H', '숙박및음식점', '숙박및음식점', 'Y', '2025-12-28T16:39:40.764Z', 'SYSTEM', '2025-12-28T16:39:40.764Z', 'SYSTEM'),
  ('COM027', 'I', '운수창고및통신업', '운수창고및통신업', 'Y', '2025-12-28T16:39:40.765Z', 'SYSTEM', '2025-12-28T16:39:40.765Z', 'SYSTEM'),
  ('COM027', 'J', '금융및보험업', '금융및보험업', 'Y', '2025-12-28T16:39:40.766Z', 'SYSTEM', '2025-12-28T16:39:40.766Z', 'SYSTEM'),
  ('COM027', 'K', '부동산,임대및사업서비스업', '부동산,임대및사업서비스업', 'Y', '2025-12-28T16:39:40.767Z', 'SYSTEM', '2025-12-28T16:39:40.767Z', 'SYSTEM'),
  ('COM027', 'M', '교육서비스업', '교육서비스업', 'Y', '2025-12-28T16:39:40.768Z', 'SYSTEM', '2025-12-28T16:39:40.768Z', 'SYSTEM'),
  ('COM027', 'N', '보건업', '보건업', 'Y', '2025-12-28T16:39:40.768Z', 'SYSTEM', '2025-12-28T16:39:40.768Z', 'SYSTEM'),
  ('COM027', 'O', '기타공공,사회및개인서비스업', '기타공공,사회및개인서비스업', 'Y', '2025-12-28T16:39:40.769Z', 'SYSTEM', '2025-12-28T16:39:40.769Z', 'SYSTEM'),
  ('COM027', 'P', '가사서비스업', '가사서비스업', 'Y', '2025-12-28T16:39:40.770Z', 'SYSTEM', '2025-12-28T16:39:40.770Z', 'SYSTEM'),
  ('COM028', '1', '접수대기', '접수대기', 'Y', '2025-12-28T16:39:40.771Z', 'SYSTEM', '2025-12-28T16:39:40.771Z', 'SYSTEM'),
  ('COM028', '2', '접수', '접수', 'Y', '2025-12-28T16:39:40.773Z', 'SYSTEM', '2025-12-28T16:39:40.773Z', 'SYSTEM'),
  ('COM028', '3', '완료', '완료', 'Y', '2025-12-28T16:39:40.774Z', 'SYSTEM', '2025-12-28T16:39:40.774Z', 'SYSTEM'),
  ('COM029', 'method', 'METHOD', 'METHOD', 'Y', '2025-12-28T16:39:40.775Z', 'SYSTEM', '2025-12-28T16:39:40.775Z', 'SYSTEM'),
  ('COM029', 'pointcut', 'POINTCUT', 'POINTCUT', 'Y', '2025-12-28T16:39:40.776Z', 'SYSTEM', '2025-12-28T16:39:40.776Z', 'SYSTEM'),
  ('COM029', 'url', 'URL', 'URL', 'Y', '2025-12-28T16:39:40.777Z', 'SYSTEM', '2025-12-28T16:39:40.777Z', 'SYSTEM'),
  ('COM030', '1', '회의', '회의', 'Y', '2025-12-28T16:39:40.778Z', 'SYSTEM', '2025-12-28T16:39:40.778Z', 'SYSTEM'),
  ('COM030', '2', '세미나', '세미나', 'Y', '2025-12-28T16:39:40.779Z', 'SYSTEM', '2025-12-28T16:39:40.779Z', 'SYSTEM'),
  ('COM030', '3', '강의', '강의', 'Y', '2025-12-28T16:39:40.780Z', 'SYSTEM', '2025-12-28T16:39:40.780Z', 'SYSTEM'),
  ('COM030', '4', '교육', '교육', 'Y', '2025-12-28T16:39:40.780Z', 'SYSTEM', '2025-12-28T16:39:40.780Z', 'SYSTEM'),
  ('COM030', '5', '기타', '기타', 'Y', '2025-12-28T16:39:40.781Z', 'SYSTEM', '2025-12-28T16:39:40.781Z', 'SYSTEM'),
  ('COM030', '6', '휴일', '휴일', 'Y', '2025-12-28T16:39:40.782Z', 'SYSTEM', '2025-12-28T16:39:40.782Z', 'SYSTEM'),
  ('COM031', '1', '당일', '당일', 'Y', '2025-12-28T16:39:40.783Z', 'SYSTEM', '2025-12-28T16:39:40.783Z', 'SYSTEM'),
  ('COM031', '2', '반복', '반복', 'Y', '2025-12-28T16:39:40.784Z', 'SYSTEM', '2025-12-28T16:39:40.784Z', 'SYSTEM'),
  ('COM031', '3', '연속', '연속', 'Y', '2025-12-28T16:39:40.784Z', 'SYSTEM', '2025-12-28T16:39:40.784Z', 'SYSTEM'),
  ('COM031', '4', '요일반복', '요일반복', 'Y', '2025-12-28T16:39:40.785Z', 'SYSTEM', '2025-12-28T16:39:40.785Z', 'SYSTEM'),
  ('COM032', 'WC01', '회원가입', '회원가입', 'Y', '2025-12-28T16:39:40.786Z', 'SYSTEM', '2025-12-28T16:39:40.786Z', 'SYSTEM'),
  ('COM032', 'WC02', '사용자등록', '사용자등록', 'Y', '2025-12-28T16:39:40.787Z', 'SYSTEM', '2025-12-28T16:39:40.787Z', 'SYSTEM'),
  ('COM032', 'WC03', '회원탈퇴', '회원탈퇴', 'Y', '2025-12-28T16:39:40.788Z', 'SYSTEM', '2025-12-28T16:39:40.788Z', 'SYSTEM'),
  ('COM032', 'WC04', '사용자삭제', '사용자삭제', 'Y', '2025-12-28T16:39:40.789Z', 'SYSTEM', '2025-12-28T16:39:40.789Z', 'SYSTEM'),
  ('COM032', 'WC05', '커뮤니티등록', '커뮤니티등록', 'Y', '2025-12-28T16:39:40.790Z', 'SYSTEM', '2025-12-28T16:39:40.790Z', 'SYSTEM'),
  ('COM032', 'WC06', '동호회등록', '동호회등록', 'Y', '2025-12-28T16:39:40.790Z', 'SYSTEM', '2025-12-28T16:39:40.790Z', 'SYSTEM'),
  ('COM032', 'WC07', '커뮤니티폐쇄', '커뮤니티폐쇄', 'Y', '2025-12-28T16:39:40.791Z', 'SYSTEM', '2025-12-28T16:39:40.791Z', 'SYSTEM'),
  ('COM032', 'WC08', '동호회폐쇄', '동호회폐쇄', 'Y', '2025-12-28T16:39:40.792Z', 'SYSTEM', '2025-12-28T16:39:40.792Z', 'SYSTEM'),
  ('COM032', 'WC09', '게시판등록', '게시판등록', 'Y', '2025-12-28T16:39:40.793Z', 'SYSTEM', '2025-12-28T16:39:40.793Z', 'SYSTEM'),
  ('COM032', 'WC10', '게시판폐쇄', '게시판폐쇄', 'Y', '2025-12-28T16:39:40.794Z', 'SYSTEM', '2025-12-28T16:39:40.794Z', 'SYSTEM'),
  ('COM033', 'C', '생성', '생성', 'Y', '2025-12-28T16:39:40.794Z', 'SYSTEM', '2025-12-28T16:39:40.794Z', 'SYSTEM'),
  ('COM033', 'R', '조회', '조회', 'Y', '2025-12-28T16:39:40.795Z', 'SYSTEM', '2025-12-28T16:39:40.795Z', 'SYSTEM'),
  ('COM033', 'U', '수정', '수정', 'Y', '2025-12-28T16:39:40.796Z', 'SYSTEM', '2025-12-28T16:39:40.796Z', 'SYSTEM'),
  ('COM033', 'D', '삭제', '삭제', 'Y', '2025-12-28T16:39:40.797Z', 'SYSTEM', '2025-12-28T16:39:40.797Z', 'SYSTEM'),
  ('COM034', '1', '학생', '학생', 'Y', '2025-12-28T16:39:40.798Z', 'SYSTEM', '2025-12-28T16:39:40.798Z', 'SYSTEM'),
  ('COM034', '2', '대학생', '대학생', 'Y', '2025-12-28T16:39:40.799Z', 'SYSTEM', '2025-12-28T16:39:40.799Z', 'SYSTEM'),
  ('COM034', '3', '군인', '군인', 'Y', '2025-12-28T16:39:40.800Z', 'SYSTEM', '2025-12-28T16:39:40.800Z', 'SYSTEM'),
  ('COM034', '4', '교사', '교사', 'Y', '2025-12-28T16:39:40.801Z', 'SYSTEM', '2025-12-28T16:39:40.801Z', 'SYSTEM'),
  ('COM034', '5', '기타', '기타', 'Y', '2025-12-28T16:39:40.802Z', 'SYSTEM', '2025-12-28T16:39:40.802Z', 'SYSTEM'),
  ('COM035', '1', '행사', '행사', 'Y', '2025-12-28T16:39:40.803Z', 'SYSTEM', '2025-12-28T16:39:40.803Z', 'SYSTEM'),
  ('COM035', '2', '이벤트', '이벤트', 'Y', '2025-12-28T16:39:40.804Z', 'SYSTEM', '2025-12-28T16:39:40.804Z', 'SYSTEM'),
  ('COM035', '3', '캠페인', '캠페인', 'Y', '2025-12-28T16:39:40.805Z', 'SYSTEM', '2025-12-28T16:39:40.805Z', 'SYSTEM'),
  ('COM036', '01', '작성', '작성', 'Y', '2025-12-28T16:39:40.806Z', 'SYSTEM', '2025-12-28T16:39:40.806Z', 'SYSTEM'),
  ('COM036', '02', '상신', '상신', 'Y', '2025-12-28T16:39:40.808Z', 'SYSTEM', '2025-12-28T16:39:40.808Z', 'SYSTEM'),
  ('COM036', '03', '반려', '반려', 'Y', '2025-12-28T16:39:40.808Z', 'SYSTEM', '2025-12-28T16:39:40.808Z', 'SYSTEM'),
  ('COM036', '04', '결재완료', '결재완료', 'Y', '2025-12-28T16:39:40.809Z', 'SYSTEM', '2025-12-28T16:39:40.809Z', 'SYSTEM'),
  ('COM038', 'N', 'N', '아니오', 'Y', '2025-12-28T16:39:40.810Z', 'SYSTEM', '2025-12-28T16:39:40.810Z', 'SYSTEM'),
  ('COM038', 'Y', 'Y', '예', 'Y', '2025-12-28T16:39:40.811Z', 'SYSTEM', '2025-12-28T16:39:40.811Z', 'SYSTEM'),
  ('COM039', '001', '사회', '사회', 'Y', '2025-12-28T16:39:40.812Z', 'SYSTEM', '2025-12-28T16:39:40.812Z', 'SYSTEM'),
  ('COM039', '002', '정치', '정치', 'Y', '2025-12-28T16:39:40.813Z', 'SYSTEM', '2025-12-28T16:39:40.813Z', 'SYSTEM'),
  ('COM039', '003', '경제', '경제', 'Y', '2025-12-28T16:39:40.814Z', 'SYSTEM', '2025-12-28T16:39:40.814Z', 'SYSTEM'),
  ('COM039', '004', '문화', '문화', 'Y', '2025-12-28T16:39:40.816Z', 'SYSTEM', '2025-12-28T16:39:40.816Z', 'SYSTEM'),
  ('COM039', '005', '인문', '인문', 'Y', '2025-12-28T16:39:40.816Z', 'SYSTEM', '2025-12-28T16:39:40.816Z', 'SYSTEM'),
  ('COM039', '006', '공학', '공학', 'Y', '2025-12-28T16:39:40.817Z', 'SYSTEM', '2025-12-28T16:39:40.817Z', 'SYSTEM'),
  ('COM039', '007', '기타', '기타', 'Y', '2025-12-28T16:39:40.818Z', 'SYSTEM', '2025-12-28T16:39:40.818Z', 'SYSTEM'),
  ('COM040', '01', '휴가계획서', '휴가계획서', 'Y', '2025-12-28T16:39:40.819Z', 'SYSTEM', '2025-12-28T16:39:40.819Z', 'SYSTEM'),
  ('COM040', '02', '출장보고서', '출장보고서', 'Y', '2025-12-28T16:39:40.820Z', 'SYSTEM', '2025-12-28T16:39:40.820Z', 'SYSTEM'),
  ('COM040', '03', '교육보고서', '교육보고서', 'Y', '2025-12-28T16:39:40.821Z', 'SYSTEM', '2025-12-28T16:39:40.821Z', 'SYSTEM'),
  ('COM040', '04', '판품요청서', '판품요청서', 'Y', '2025-12-28T16:39:40.822Z', 'SYSTEM', '2025-12-28T16:39:40.822Z', 'SYSTEM'),
  ('COM040', '05', '지원요청서', '지원요청서', 'Y', '2025-12-28T16:39:40.823Z', 'SYSTEM', '2025-12-28T16:39:40.823Z', 'SYSTEM'),
  ('COM041', '001', '절차설명', '절차설명', 'Y', '2025-12-28T16:39:40.825Z', 'SYSTEM', '2025-12-28T16:39:40.825Z', 'SYSTEM'),
  ('COM041', '002', '기능설명', '기능설명', 'Y', '2025-12-28T16:39:40.826Z', 'SYSTEM', '2025-12-28T16:39:40.826Z', 'SYSTEM'),
  ('COM041', '003', '기타설명', '기타설명', 'Y', '2025-12-28T16:39:40.827Z', 'SYSTEM', '2025-12-28T16:39:40.827Z', 'SYSTEM'),
  ('COM042', '%Y', '연도별', '연도별', 'Y', '2025-12-28T16:39:40.828Z', 'SYSTEM', '2025-12-28T16:39:40.828Z', 'SYSTEM'),
  ('COM042', '%Y-%m', '월별', '월별', 'Y', '2025-12-28T16:39:40.829Z', 'SYSTEM', '2025-12-28T16:39:40.829Z', 'SYSTEM'),
  ('COM042', '%Y-%m-%d', '일별', '일별', 'Y', '2025-12-28T16:39:40.830Z', 'SYSTEM', '2025-12-28T16:39:40.830Z', 'SYSTEM'),
  ('COM043', '01', '생성', '생성', 'Y', '2025-12-28T16:39:40.831Z', 'SYSTEM', '2025-12-28T16:39:40.831Z', 'SYSTEM'),
  ('COM043', '02', '변경', '변경', 'Y', '2025-12-28T16:39:40.832Z', 'SYSTEM', '2025-12-28T16:39:40.832Z', 'SYSTEM'),
  ('COM043', '03', '말소', '말소', 'Y', '2025-12-28T16:39:40.833Z', 'SYSTEM', '2025-12-28T16:39:40.833Z', 'SYSTEM'),
  ('COM044', '00', '수신처리', '수신처리', 'Y', '2025-12-28T16:39:40.834Z', 'SYSTEM', '2025-12-28T16:39:40.834Z', 'SYSTEM'),
  ('COM044', '01', '처리완료', '처리완료', 'Y', '2025-12-28T16:39:40.835Z', 'SYSTEM', '2025-12-28T16:39:40.835Z', 'SYSTEM'),
  ('COM044', '10', '기등록', '기등록', 'Y', '2025-12-28T16:39:40.836Z', 'SYSTEM', '2025-12-28T16:39:40.836Z', 'SYSTEM'),
  ('COM044', '11', '생성오류', '생성오류', 'Y', '2025-12-28T16:39:40.837Z', 'SYSTEM', '2025-12-28T16:39:40.837Z', 'SYSTEM'),
  ('COM044', '12', '변경오류', '변경오류', 'Y', '2025-12-28T16:39:40.838Z', 'SYSTEM', '2025-12-28T16:39:40.838Z', 'SYSTEM'),
  ('COM044', '13', '말소오류', '말소오류', 'Y', '2025-12-28T16:39:40.839Z', 'SYSTEM', '2025-12-28T16:39:40.839Z', 'SYSTEM'),
  ('COM046', '01', '정상', '정상', 'Y', '2025-12-28T16:39:40.840Z', 'SYSTEM', '2025-12-28T16:39:40.840Z', 'SYSTEM'),
  ('COM046', '02', '비정상', '비정상', 'Y', '2025-12-28T16:39:40.840Z', 'SYSTEM', '2025-12-28T16:39:40.840Z', 'SYSTEM'),
  ('COM047', '01', '매일', '매일', 'Y', '2025-12-28T16:39:40.841Z', 'SYSTEM', '2025-12-28T16:39:40.841Z', 'SYSTEM'),
  ('COM047', '02', '매주', '매주', 'Y', '2025-12-28T16:39:40.842Z', 'SYSTEM', '2025-12-28T16:39:40.842Z', 'SYSTEM'),
  ('COM047', '03', '매월', '매월', 'Y', '2025-12-28T16:39:40.843Z', 'SYSTEM', '2025-12-28T16:39:40.843Z', 'SYSTEM'),
  ('COM047', '04', '매년', '매년', 'Y', '2025-12-28T16:39:40.844Z', 'SYSTEM', '2025-12-28T16:39:40.844Z', 'SYSTEM'),
  ('COM047', '05', '한번만', '한번만', 'Y', '2025-12-28T16:39:40.845Z', 'SYSTEM', '2025-12-28T16:39:40.845Z', 'SYSTEM'),
  ('COM048', '01', 'Oracle', 'Oracle', 'Y', '2025-12-28T16:39:40.846Z', 'SYSTEM', '2025-12-28T16:39:40.846Z', 'SYSTEM'),
  ('COM048', '02', 'Mysql', 'Mysql', 'Y', '2025-12-28T16:39:40.847Z', 'SYSTEM', '2025-12-28T16:39:40.847Z', 'SYSTEM'),
  ('COM048', '03', 'Tibero', 'Tibero', 'Y', '2025-12-28T16:39:40.848Z', 'SYSTEM', '2025-12-28T16:39:40.848Z', 'SYSTEM'),
  ('COM048', '04', 'Altibase', 'Altibase', 'Y', '2025-12-28T16:39:40.848Z', 'SYSTEM', '2025-12-28T16:39:40.848Z', 'SYSTEM'),
  ('COM049', '01', 'Tar', 'Tar', 'Y', '2025-12-28T16:39:40.849Z', 'SYSTEM', '2025-12-28T16:39:40.849Z', 'SYSTEM'),
  ('COM049', '02', 'ZIP', 'ZIP', 'Y', '2025-12-28T16:39:40.850Z', 'SYSTEM', '2025-12-28T16:39:40.850Z', 'SYSTEM'),
  ('COM050', '1', '수신', '수신', 'Y', '2025-12-28T16:39:40.852Z', 'SYSTEM', '2025-12-28T16:39:40.852Z', 'SYSTEM'),
  ('COM050', '2', '참조', '참조', 'Y', '2025-12-28T16:39:40.853Z', 'SYSTEM', '2025-12-28T16:39:40.853Z', 'SYSTEM'),
  ('COM051', '01', '신청중', '신청중', 'Y', '2025-12-28T16:39:40.854Z', 'SYSTEM', '2025-12-28T16:39:40.854Z', 'SYSTEM'),
  ('COM051', '02', '승인', '승인', 'Y', '2025-12-28T16:39:40.855Z', 'SYSTEM', '2025-12-28T16:39:40.855Z', 'SYSTEM'),
  ('COM051', '03', '반려', '반려', 'Y', '2025-12-28T16:39:40.856Z', 'SYSTEM', '2025-12-28T16:39:40.856Z', 'SYSTEM'),
  ('COM052', '01', '양력', '양력', 'Y', '2025-12-28T16:39:40.857Z', 'SYSTEM', '2025-12-28T16:39:40.857Z', 'SYSTEM'),
  ('COM052', '02', '음력', '음력', 'Y', '2025-12-28T16:39:40.857Z', 'SYSTEM', '2025-12-28T16:39:40.857Z', 'SYSTEM'),
  ('COM053', '01', '교육', '교육', 'Y', '2025-12-28T16:39:40.858Z', 'SYSTEM', '2025-12-28T16:39:40.858Z', 'SYSTEM'),
  ('COM053', '02', '세미나', '세미나', 'Y', '2025-12-28T16:39:40.859Z', 'SYSTEM', '2025-12-28T16:39:40.859Z', 'SYSTEM'),
  ('COM053', '03', '홍보', '홍보', 'Y', '2025-12-28T16:39:40.860Z', 'SYSTEM', '2025-12-28T16:39:40.860Z', 'SYSTEM'),
  ('COM053', '04', '단합', '단합', 'Y', '2025-12-28T16:39:40.861Z', 'SYSTEM', '2025-12-28T16:39:40.861Z', 'SYSTEM'),
  ('COM053', '05', '간담회', '간담회', 'Y', '2025-12-28T16:39:40.863Z', 'SYSTEM', '2025-12-28T16:39:40.863Z', 'SYSTEM'),
  ('COM053', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.864Z', 'SYSTEM', '2025-12-28T16:39:40.864Z', 'SYSTEM'),
  ('COM054', '01', '결혼', '결혼', 'Y', '2025-12-28T16:39:40.865Z', 'SYSTEM', '2025-12-28T16:39:40.865Z', 'SYSTEM'),
  ('COM054', '02', '출생', '출생', 'Y', '2025-12-28T16:39:40.866Z', 'SYSTEM', '2025-12-28T16:39:40.866Z', 'SYSTEM'),
  ('COM054', '03', '회갑', '회갑', 'Y', '2025-12-28T16:39:40.867Z', 'SYSTEM', '2025-12-28T16:39:40.867Z', 'SYSTEM'),
  ('COM054', '04', '사망', '사망', 'Y', '2025-12-28T16:39:40.868Z', 'SYSTEM', '2025-12-28T16:39:40.868Z', 'SYSTEM'),
  ('COM054', '05', '출산', '출산', 'Y', '2025-12-28T16:39:40.869Z', 'SYSTEM', '2025-12-28T16:39:40.869Z', 'SYSTEM'),
  ('COM054', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.870Z', 'SYSTEM', '2025-12-28T16:39:40.870Z', 'SYSTEM'),
  ('COM055', '01', '우수사원', '우수사원', 'Y', '2025-12-28T16:39:40.872Z', 'SYSTEM', '2025-12-28T16:39:40.872Z', 'SYSTEM'),
  ('COM055', '02', '우수팀', '우수팀', 'Y', '2025-12-28T16:39:40.873Z', 'SYSTEM', '2025-12-28T16:39:40.873Z', 'SYSTEM'),
  ('COM055', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.874Z', 'SYSTEM', '2025-12-28T16:39:40.874Z', 'SYSTEM'),
  ('COM056', '01', '연차휴가', '연차휴가', 'Y', '2025-12-28T16:39:40.875Z', 'SYSTEM', '2025-12-28T16:39:40.875Z', 'SYSTEM'),
  ('COM056', '02', '반차휴가', '반차휴가', 'Y', '2025-12-28T16:39:40.877Z', 'SYSTEM', '2025-12-28T16:39:40.877Z', 'SYSTEM'),
  ('COM056', '03', '무급휴가', '무급휴가', 'Y', '2025-12-28T16:39:40.878Z', 'SYSTEM', '2025-12-28T16:39:40.878Z', 'SYSTEM'),
  ('COM056', '04', '유급휴가', '유급휴가', 'Y', '2025-12-28T16:39:40.879Z', 'SYSTEM', '2025-12-28T16:39:40.879Z', 'SYSTEM'),
  ('COM056', '05', '대체휴가', '대체휴가', 'Y', '2025-12-28T16:39:40.880Z', 'SYSTEM', '2025-12-28T16:39:40.880Z', 'SYSTEM'),
  ('COM056', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.881Z', 'SYSTEM', '2025-12-28T16:39:40.881Z', 'SYSTEM'),
  ('COM057', '1', '회의', '회의', 'Y', '2025-12-28T16:39:40.882Z', 'SYSTEM', '2025-12-28T16:39:40.882Z', 'SYSTEM'),
  ('COM057', '2', '방문', '방문', 'Y', '2025-12-28T16:39:40.882Z', 'SYSTEM', '2025-12-28T16:39:40.882Z', 'SYSTEM'),
  ('COM057', '3', '세미나', '세미나', 'Y', '2025-12-28T16:39:40.884Z', 'SYSTEM', '2025-12-28T16:39:40.884Z', 'SYSTEM'),
  ('COM057', '4', '기타', '기타', 'Y', '2025-12-28T16:39:40.884Z', 'SYSTEM', '2025-12-28T16:39:40.884Z', 'SYSTEM'),
  ('COM058', '1', '반복없음', '당일', 'Y', '2025-12-28T16:39:40.885Z', 'SYSTEM', '2025-12-28T16:39:40.885Z', 'SYSTEM'),
  ('COM058', '2', '매일', '매일', 'Y', '2025-12-28T16:39:40.886Z', 'SYSTEM', '2025-12-28T16:39:40.886Z', 'SYSTEM'),
  ('COM058', '3', '매주', '매주', 'Y', '2025-12-28T16:39:40.888Z', 'SYSTEM', '2025-12-28T16:39:40.888Z', 'SYSTEM'),
  ('COM058', '4', '매월', '매월', 'Y', '2025-12-28T16:39:40.889Z', 'SYSTEM', '2025-12-28T16:39:40.889Z', 'SYSTEM'),
  ('COM059', '1', '높음', '높음', 'Y', '2025-12-28T16:39:40.890Z', 'SYSTEM', '2025-12-28T16:39:40.890Z', 'SYSTEM'),
  ('COM059', '2', '보통', '보통', 'Y', '2025-12-28T16:39:40.891Z', 'SYSTEM', '2025-12-28T16:39:40.891Z', 'SYSTEM'),
  ('COM059', '3', '낮음', '낮음', 'Y', '2025-12-28T16:39:40.892Z', 'SYSTEM', '2025-12-28T16:39:40.892Z', 'SYSTEM'),
  ('COM060', '1', '주간보고', '주간보고', 'Y', '2025-12-28T16:39:40.893Z', 'SYSTEM', '2025-12-28T16:39:40.893Z', 'SYSTEM'),
  ('COM060', '2', '월간보고', '월간보고', 'Y', '2025-12-28T16:39:40.894Z', 'SYSTEM', '2025-12-28T16:39:40.894Z', 'SYSTEM'),
  ('COM061', '1', '재실', '재실', 'Y', '2025-12-28T16:39:40.895Z', 'SYSTEM', '2025-12-28T16:39:40.895Z', 'SYSTEM'),
  ('COM061', '2', '자리비움', '자리비움', 'Y', '2025-12-28T16:39:40.896Z', 'SYSTEM', '2025-12-28T16:39:40.896Z', 'SYSTEM'),
  ('COM061', '3', '회의중', '회의중', 'Y', '2025-12-28T16:39:40.897Z', 'SYSTEM', '2025-12-28T16:39:40.897Z', 'SYSTEM'),
  ('COM061', '4', '출장중', '출장중', 'Y', '2025-12-28T16:39:40.898Z', 'SYSTEM', '2025-12-28T16:39:40.898Z', 'SYSTEM'),
  ('COM061', '5', '휴가중', '휴가중', 'Y', '2025-12-28T16:39:40.899Z', 'SYSTEM', '2025-12-28T16:39:40.899Z', 'SYSTEM'),
  ('COM062', '100', 'Continue ', 'Continue ', 'Y', '2025-12-28T16:39:40.900Z', 'SYSTEM', '2025-12-28T16:39:40.900Z', 'SYSTEM'),
  ('COM062', '101', 'Switching Protocols ', 'Switching Protocols ', 'Y', '2025-12-28T16:39:40.901Z', 'SYSTEM', '2025-12-28T16:39:40.901Z', 'SYSTEM'),
  ('COM062', '200', 'OK ', 'OK ', 'Y', '2025-12-28T16:39:40.901Z', 'SYSTEM', '2025-12-28T16:39:40.901Z', 'SYSTEM'),
  ('COM062', '201', 'Created ', 'Created ', 'Y', '2025-12-28T16:39:40.902Z', 'SYSTEM', '2025-12-28T16:39:40.902Z', 'SYSTEM'),
  ('COM062', '202', 'Accepted ', 'Accepted ', 'Y', '2025-12-28T16:39:40.903Z', 'SYSTEM', '2025-12-28T16:39:40.903Z', 'SYSTEM'),
  ('COM062', '203', 'Non-Authoritative Information ', 'Non-Authoritative Information ', 'Y', '2025-12-28T16:39:40.904Z', 'SYSTEM', '2025-12-28T16:39:40.904Z', 'SYSTEM'),
  ('COM062', '204', 'No Content ', 'No Content ', 'Y', '2025-12-28T16:39:40.905Z', 'SYSTEM', '2025-12-28T16:39:40.905Z', 'SYSTEM'),
  ('COM062', '205', 'Reset Content ', 'Reset Content ', 'Y', '2025-12-28T16:39:40.906Z', 'SYSTEM', '2025-12-28T16:39:40.906Z', 'SYSTEM'),
  ('COM062', '206', 'Partial Content ', 'Partial Content ', 'Y', '2025-12-28T16:39:40.908Z', 'SYSTEM', '2025-12-28T16:39:40.908Z', 'SYSTEM'),
  ('COM062', '300', 'Multiple Choices ', 'Multiple Choices ', 'Y', '2025-12-28T16:39:40.909Z', 'SYSTEM', '2025-12-28T16:39:40.909Z', 'SYSTEM'),
  ('COM062', '301', 'Moved Permanently ', 'Moved Permanently ', 'Y', '2025-12-28T16:39:40.910Z', 'SYSTEM', '2025-12-28T16:39:40.910Z', 'SYSTEM'),
  ('COM062', '302', 'Found ', 'Found ', 'Y', '2025-12-28T16:39:40.911Z', 'SYSTEM', '2025-12-28T16:39:40.911Z', 'SYSTEM'),
  ('COM062', '303', 'See Other ', 'See Other ', 'Y', '2025-12-28T16:39:40.911Z', 'SYSTEM', '2025-12-28T16:39:40.911Z', 'SYSTEM'),
  ('COM062', '304', 'Not Modified ', 'Not Modified ', 'Y', '2025-12-28T16:39:40.912Z', 'SYSTEM', '2025-12-28T16:39:40.912Z', 'SYSTEM'),
  ('COM062', '305', 'Use Proxy ', 'Use Proxy ', 'Y', '2025-12-28T16:39:40.913Z', 'SYSTEM', '2025-12-28T16:39:40.913Z', 'SYSTEM'),
  ('COM062', '307', 'Temporary Redirect ', 'Temporary Redirect ', 'Y', '2025-12-28T16:39:40.914Z', 'SYSTEM', '2025-12-28T16:39:40.914Z', 'SYSTEM'),
  ('COM062', '400', 'Bad Request ', 'Bad Request ', 'Y', '2025-12-28T16:39:40.915Z', 'SYSTEM', '2025-12-28T16:39:40.915Z', 'SYSTEM'),
  ('COM062', '401', 'Unauthorized ', 'Unauthorized ', 'Y', '2025-12-28T16:39:40.916Z', 'SYSTEM', '2025-12-28T16:39:40.916Z', 'SYSTEM'),
  ('COM062', '403', 'Forbidden ', 'Forbidden ', 'Y', '2025-12-28T16:39:40.916Z', 'SYSTEM', '2025-12-28T16:39:40.916Z', 'SYSTEM'),
  ('COM062', '404', 'Not Found ', 'Not Found ', 'Y', '2025-12-28T16:39:40.917Z', 'SYSTEM', '2025-12-28T16:39:40.917Z', 'SYSTEM'),
  ('COM062', '405', 'Method Not Allowed ', 'Method Not Allowed ', 'Y', '2025-12-28T16:39:40.918Z', 'SYSTEM', '2025-12-28T16:39:40.918Z', 'SYSTEM'),
  ('COM062', '406', 'Not Acceptable ', 'Not Acceptable ', 'Y', '2025-12-28T16:39:40.919Z', 'SYSTEM', '2025-12-28T16:39:40.919Z', 'SYSTEM'),
  ('COM062', '407', 'Proxy Authentication Required ', 'Proxy Authentication Required ', 'Y', '2025-12-28T16:39:40.920Z', 'SYSTEM', '2025-12-28T16:39:40.920Z', 'SYSTEM'),
  ('COM062', '408', 'Request Timeout ', 'Request Timeout ', 'Y', '2025-12-28T16:39:40.921Z', 'SYSTEM', '2025-12-28T16:39:40.921Z', 'SYSTEM'),
  ('COM062', '409', 'Conflict ', 'Conflict ', 'Y', '2025-12-28T16:39:40.922Z', 'SYSTEM', '2025-12-28T16:39:40.922Z', 'SYSTEM'),
  ('COM062', '410', 'Gone ', 'Gone ', 'Y', '2025-12-28T16:39:40.923Z', 'SYSTEM', '2025-12-28T16:39:40.923Z', 'SYSTEM'),
  ('COM062', '411', 'Length Required ', 'Length Required ', 'Y', '2025-12-28T16:39:40.924Z', 'SYSTEM', '2025-12-28T16:39:40.924Z', 'SYSTEM'),
  ('COM062', '412', 'Precondition Failed ', 'Precondition Failed ', 'Y', '2025-12-28T16:39:40.924Z', 'SYSTEM', '2025-12-28T16:39:40.924Z', 'SYSTEM'),
  ('COM062', '413', 'Request Entity Too Large ', 'Request Entity Too Large ', 'Y', '2025-12-28T16:39:40.925Z', 'SYSTEM', '2025-12-28T16:39:40.925Z', 'SYSTEM'),
  ('COM062', '414', 'Request URI Too Long ', 'Request URI Too Long ', 'Y', '2025-12-28T16:39:40.926Z', 'SYSTEM', '2025-12-28T16:39:40.926Z', 'SYSTEM'),
  ('COM062', '415', 'Unsupported Media Type ', 'Unsupported Media Type ', 'Y', '2025-12-28T16:39:40.927Z', 'SYSTEM', '2025-12-28T16:39:40.927Z', 'SYSTEM'),
  ('COM062', '416', 'Requested Range Not Satisfiable ', 'Requested Range Not Satisfiable ', 'Y', '2025-12-28T16:39:40.928Z', 'SYSTEM', '2025-12-28T16:39:40.928Z', 'SYSTEM'),
  ('COM062', '417', 'Expectation Failed ', 'Expectation Failed ', 'Y', '2025-12-28T16:39:40.928Z', 'SYSTEM', '2025-12-28T16:39:40.928Z', 'SYSTEM'),
  ('COM062', '500', 'Internal Server Error ', 'Internal Server Error ', 'Y', '2025-12-28T16:39:40.929Z', 'SYSTEM', '2025-12-28T16:39:40.929Z', 'SYSTEM'),
  ('COM062', '501', 'Not Implemented ', 'Not Implemented ', 'Y', '2025-12-28T16:39:40.930Z', 'SYSTEM', '2025-12-28T16:39:40.930Z', 'SYSTEM'),
  ('COM062', '502', 'Bad Gateway ', 'Bad Gateway ', 'Y', '2025-12-28T16:39:40.931Z', 'SYSTEM', '2025-12-28T16:39:40.931Z', 'SYSTEM'),
  ('COM062', '503', 'Service Unavailable ', 'Service Unavailable ', 'Y', '2025-12-28T16:39:40.932Z', 'SYSTEM', '2025-12-28T16:39:40.932Z', 'SYSTEM'),
  ('COM062', '504', 'Gateway Timeout ', 'Gateway Timeout ', 'Y', '2025-12-28T16:39:40.933Z', 'SYSTEM', '2025-12-28T16:39:40.933Z', 'SYSTEM'),
  ('COM062', '505', 'HTTP Version Not Supported ', 'HTTP Version Not Supported ', 'Y', '2025-12-28T16:39:40.933Z', 'SYSTEM', '2025-12-28T16:39:40.933Z', 'SYSTEM'),
  ('COM063', '100', 'Runnable', 'Runnable', 'Y', '2025-12-28T16:39:40.934Z', 'SYSTEM', '2025-12-28T16:39:40.934Z', 'SYSTEM'),
  ('COM063', '200', 'Sleeping', 'Sleeping', 'Y', '2025-12-28T16:39:40.935Z', 'SYSTEM', '2025-12-28T16:39:40.935Z', 'SYSTEM'),
  ('COM063', '300', 'Swapped', 'Swapped', 'Y', '2025-12-28T16:39:40.936Z', 'SYSTEM', '2025-12-28T16:39:40.936Z', 'SYSTEM'),
  ('COM063', '400', 'Zombie', 'Zombie', 'Y', '2025-12-28T16:39:40.937Z', 'SYSTEM', '2025-12-28T16:39:40.937Z', 'SYSTEM'),
  ('COM063', '500', 'Stopped', 'Stopped', 'Y', '2025-12-28T16:39:40.938Z', 'SYSTEM', '2025-12-28T16:39:40.938Z', 'SYSTEM'),
  ('COM064', '01', '웹 서버', '웹 서버', 'Y', '2025-12-28T16:39:40.939Z', 'SYSTEM', '2025-12-28T16:39:40.939Z', 'SYSTEM'),
  ('COM064', '02', 'WAS', 'WAS', 'Y', '2025-12-28T16:39:40.940Z', 'SYSTEM', '2025-12-28T16:39:40.940Z', 'SYSTEM'),
  ('COM064', '03', 'DB 서버', 'DB 서버', 'Y', '2025-12-28T16:39:40.941Z', 'SYSTEM', '2025-12-28T16:39:40.941Z', 'SYSTEM'),
  ('COM064', '04', 'Mail 서버', 'Mail 서버', 'Y', '2025-12-28T16:39:40.942Z', 'SYSTEM', '2025-12-28T16:39:40.942Z', 'SYSTEM'),
  ('COM064', '05', 'DNS 서버', 'DNS 서버', 'Y', '2025-12-28T16:39:40.942Z', 'SYSTEM', '2025-12-28T16:39:40.942Z', 'SYSTEM'),
  ('COM064', '99', '기타 서버', '기타 서버', 'Y', '2025-12-28T16:39:40.943Z', 'SYSTEM', '2025-12-28T16:39:40.943Z', 'SYSTEM'),
  ('COM065', '01', '네트워크 장애', '네트워크 장애', 'Y', '2025-12-28T16:39:40.944Z', 'SYSTEM', '2025-12-28T16:39:40.944Z', 'SYSTEM'),
  ('COM065', '02', '하드웨어 장애', '하드웨어 장애', 'Y', '2025-12-28T16:39:40.945Z', 'SYSTEM', '2025-12-28T16:39:40.945Z', 'SYSTEM'),
  ('COM065', '03', '어플리케이션 장애', '어플리케이션 장애', 'Y', '2025-12-28T16:39:40.946Z', 'SYSTEM', '2025-12-28T16:39:40.946Z', 'SYSTEM'),
  ('COM065', '04', '서비스 장애', '서비스 장애', 'Y', '2025-12-28T16:39:40.946Z', 'SYSTEM', '2025-12-28T16:39:40.946Z', 'SYSTEM'),
  ('COM065', '05', '모니터링 장애', '모니터링 장애', 'Y', '2025-12-28T16:39:40.947Z', 'SYSTEM', '2025-12-28T16:39:40.947Z', 'SYSTEM'),
  ('COM065', '06', '정전', '정전', 'Y', '2025-12-28T16:39:40.948Z', 'SYSTEM', '2025-12-28T16:39:40.948Z', 'SYSTEM'),
  ('COM065', '07', '화재', '화재', 'Y', '2025-12-28T16:39:40.949Z', 'SYSTEM', '2025-12-28T16:39:40.949Z', 'SYSTEM'),
  ('COM065', '08', '홍수', '홍수', 'Y', '2025-12-28T16:39:40.949Z', 'SYSTEM', '2025-12-28T16:39:40.949Z', 'SYSTEM'),
  ('COM065', '99', '기타 장애', '기타 장애', 'Y', '2025-12-28T16:39:40.950Z', 'SYSTEM', '2025-12-28T16:39:40.950Z', 'SYSTEM'),
  ('COM066', '01', 'CPU', 'CPU', 'Y', '2025-12-28T16:39:40.951Z', 'SYSTEM', '2025-12-28T16:39:40.951Z', 'SYSTEM'),
  ('COM066', '02', '메모리', '메모리', 'Y', '2025-12-28T16:39:40.952Z', 'SYSTEM', '2025-12-28T16:39:40.952Z', 'SYSTEM'),
  ('COM067', '01', '서버', '서버', 'Y', '2025-12-28T16:39:40.953Z', 'SYSTEM', '2025-12-28T16:39:40.953Z', 'SYSTEM'),
  ('COM067', '02', '라우터', '라우터', 'Y', '2025-12-28T16:39:40.954Z', 'SYSTEM', '2025-12-28T16:39:40.954Z', 'SYSTEM'),
  ('COM067', '03', '스위치', '스위치', 'Y', '2025-12-28T16:39:40.955Z', 'SYSTEM', '2025-12-28T16:39:40.955Z', 'SYSTEM'),
  ('COM067', '04', 'PC', 'PC', 'Y', '2025-12-28T16:39:40.956Z', 'SYSTEM', '2025-12-28T16:39:40.956Z', 'SYSTEM'),
  ('COM067', '05', '프린터', '프린터', 'Y', '2025-12-28T16:39:40.957Z', 'SYSTEM', '2025-12-28T16:39:40.957Z', 'SYSTEM'),
  ('COM067', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.958Z', 'SYSTEM', '2025-12-28T16:39:40.958Z', 'SYSTEM'),
  ('COM068', 'A', '접수', '접수', 'Y', '2025-12-28T16:39:40.958Z', 'SYSTEM', '2025-12-28T16:39:40.958Z', 'SYSTEM'),
  ('COM068', 'C', '완료', '완료', 'Y', '2025-12-28T16:39:40.959Z', 'SYSTEM', '2025-12-28T16:39:40.959Z', 'SYSTEM'),
  ('COM068', 'R', '요청', '요청', 'Y', '2025-12-28T16:39:40.960Z', 'SYSTEM', '2025-12-28T16:39:40.960Z', 'SYSTEM'),
  ('COM069', '01', '생일', '생일', 'Y', '2025-12-28T16:39:40.961Z', 'SYSTEM', '2025-12-28T16:39:40.961Z', 'SYSTEM'),
  ('COM069', '02', '기념', '기념', 'N', '2025-12-28T16:39:40.962Z', 'SYSTEM', '2025-12-28T16:39:40.962Z', 'SYSTEM'),
  ('COM069', '03', '결혼', '결혼', 'Y', '2025-12-28T16:39:40.963Z', 'SYSTEM', '2025-12-28T16:39:40.963Z', 'SYSTEM'),
  ('COM069', '04', '탄생', '탄생', 'Y', '2025-12-28T16:39:40.963Z', 'SYSTEM', '2025-12-28T16:39:40.963Z', 'SYSTEM'),
  ('COM069', '05', '축하', '축하', 'Y', '2025-12-28T16:39:40.964Z', 'SYSTEM', '2025-12-28T16:39:40.964Z', 'SYSTEM'),
  ('COM069', '06', '출장', '출장', 'Y', '2025-12-28T16:39:40.965Z', 'SYSTEM', '2025-12-28T16:39:40.965Z', 'SYSTEM'),
  ('COM069', '07', '퇴원', '퇴원', 'Y', '2025-12-28T16:39:40.966Z', 'SYSTEM', '2025-12-28T16:39:40.966Z', 'SYSTEM'),
  ('COM069', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.967Z', 'SYSTEM', '2025-12-28T16:39:40.967Z', 'SYSTEM'),
  ('COM070', '01', '본관1층', '본관1층', 'Y', '2025-12-28T16:39:40.968Z', 'SYSTEM', '2025-12-28T16:39:40.968Z', 'SYSTEM'),
  ('COM070', '02', '본관2층', '본관2층', 'Y', '2025-12-28T16:39:40.968Z', 'SYSTEM', '2025-12-28T16:39:40.968Z', 'SYSTEM'),
  ('COM070', '03', '본관3층', '본관3층', 'Y', '2025-12-28T16:39:40.969Z', 'SYSTEM', '2025-12-28T16:39:40.969Z', 'SYSTEM'),
  ('COM070', '04', '본관4층', '본관4층', 'Y', '2025-12-28T16:39:40.970Z', 'SYSTEM', '2025-12-28T16:39:40.970Z', 'SYSTEM'),
  ('COM070', '05', '본관5층', '본관5층', 'Y', '2025-12-28T16:39:40.971Z', 'SYSTEM', '2025-12-28T16:39:40.971Z', 'SYSTEM'),
  ('COM070', '06', '별관1층', '별관1층', 'Y', '2025-12-28T16:39:40.972Z', 'SYSTEM', '2025-12-28T16:39:40.972Z', 'SYSTEM'),
  ('COM070', '07', '별관2층', '별관2층', 'Y', '2025-12-28T16:39:40.973Z', 'SYSTEM', '2025-12-28T16:39:40.973Z', 'SYSTEM'),
  ('COM070', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.974Z', 'SYSTEM', '2025-12-28T16:39:40.974Z', 'SYSTEM'),
  ('COM071', '01', '전기시설', '전기시설', 'Y', '2025-12-28T16:39:40.975Z', 'SYSTEM', '2025-12-28T16:39:40.975Z', 'SYSTEM'),
  ('COM071', '02', '소등상태', '소등상태', 'Y', '2025-12-28T16:39:40.976Z', 'SYSTEM', '2025-12-28T16:39:40.976Z', 'SYSTEM'),
  ('COM071', '03', '방화요소', '방화요소', 'Y', '2025-12-28T16:39:40.976Z', 'SYSTEM', '2025-12-28T16:39:40.976Z', 'SYSTEM'),
  ('COM071', '04', '소방시설', '소방시설', 'Y', '2025-12-28T16:39:40.977Z', 'SYSTEM', '2025-12-28T16:39:40.977Z', 'SYSTEM'),
  ('COM071', '05', '비상 KEY', '비상 KEY', 'Y', '2025-12-28T16:39:40.978Z', 'SYSTEM', '2025-12-28T16:39:40.978Z', 'SYSTEM'),
  ('COM071', '06', '시건장치', '시건장치', 'Y', '2025-12-28T16:39:40.979Z', 'SYSTEM', '2025-12-28T16:39:40.979Z', 'SYSTEM'),
  ('COM071', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.980Z', 'SYSTEM', '2025-12-28T16:39:40.980Z', 'SYSTEM'),
  ('COM072', '01', '정상', '정상', 'Y', '2025-12-28T16:39:40.981Z', 'SYSTEM', '2025-12-28T16:39:40.981Z', 'SYSTEM'),
  ('COM072', '02', '오류', '오류', 'Y', '2025-12-28T16:39:40.981Z', 'SYSTEM', '2025-12-28T16:39:40.981Z', 'SYSTEM'),
  ('COM072', '03', '중지', '중지', 'Y', '2025-12-28T16:39:40.982Z', 'SYSTEM', '2025-12-28T16:39:40.982Z', 'SYSTEM'),
  ('COM072', '09', '기타', '기타', 'Y', '2025-12-28T16:39:40.984Z', 'SYSTEM', '2025-12-28T16:39:40.984Z', 'SYSTEM'),
  ('COM073', '01', '본인', '본인', 'Y', '2025-12-28T16:39:40.985Z', 'SYSTEM', '2025-12-28T16:39:40.985Z', 'SYSTEM'),
  ('COM073', '02', '배우자', '배우자', 'Y', '2025-12-28T16:39:40.986Z', 'SYSTEM', '2025-12-28T16:39:40.986Z', 'SYSTEM'),
  ('COM073', '03', '자녀', '자녀', 'Y', '2025-12-28T16:39:40.987Z', 'SYSTEM', '2025-12-28T16:39:40.987Z', 'SYSTEM'),
  ('COM073', '04', '부친', '부친', 'Y', '2025-12-28T16:39:40.988Z', 'SYSTEM', '2025-12-28T16:39:40.988Z', 'SYSTEM'),
  ('COM073', '05', '모친', '모친', 'Y', '2025-12-28T16:39:40.989Z', 'SYSTEM', '2025-12-28T16:39:40.989Z', 'SYSTEM'),
  ('COM073', '06', '배우자부친', '배우자부친', 'Y', '2025-12-28T16:39:40.990Z', 'SYSTEM', '2025-12-28T16:39:40.990Z', 'SYSTEM'),
  ('COM073', '07', '배우자모친', '배우자모친', 'Y', '2025-12-28T16:39:40.991Z', 'SYSTEM', '2025-12-28T16:39:40.991Z', 'SYSTEM'),
  ('COM073', '08', '조부', '조부', 'Y', '2025-12-28T16:39:40.992Z', 'SYSTEM', '2025-12-28T16:39:40.992Z', 'SYSTEM'),
  ('COM073', '09', '조모', '조모', 'Y', '2025-12-28T16:39:40.993Z', 'SYSTEM', '2025-12-28T16:39:40.993Z', 'SYSTEM'),
  ('COM073', '10', '형제자매(본인)', '형제자매(본인)', 'Y', '2025-12-28T16:39:40.993Z', 'SYSTEM', '2025-12-28T16:39:40.993Z', 'SYSTEM'),
  ('COM073', '11', '외조부', '외조부', 'Y', '2025-12-28T16:39:40.994Z', 'SYSTEM', '2025-12-28T16:39:40.994Z', 'SYSTEM'),
  ('COM073', '12', '외조모', '외조모', 'Y', '2025-12-28T16:39:40.995Z', 'SYSTEM', '2025-12-28T16:39:40.995Z', 'SYSTEM'),
  ('COM073', '13', '백숙부', '백숙부', 'Y', '2025-12-28T16:39:40.996Z', 'SYSTEM', '2025-12-28T16:39:40.996Z', 'SYSTEM'),
  ('COM073', '14', '백숙모', '백숙모', 'Y', '2025-12-28T16:39:40.997Z', 'SYSTEM', '2025-12-28T16:39:40.997Z', 'SYSTEM'),
  ('COM073', '15', '형제자매(배우자)', '형제자매(배우자)', 'Y', '2025-12-28T16:39:40.998Z', 'SYSTEM', '2025-12-28T16:39:40.998Z', 'SYSTEM'),
  ('COM073', '99', '기타', '기타', 'Y', '2025-12-28T16:39:40.999Z', 'SYSTEM', '2025-12-28T16:39:40.999Z', 'SYSTEM'),
  ('COM074', '1', '일요일', '일요일', 'Y', '2025-12-28T16:39:40.999Z', 'SYSTEM', '2025-12-28T16:39:40.999Z', 'SYSTEM'),
  ('COM074', '2', '월요일', '월요일', 'Y', '2025-12-28T16:39:41.000Z', 'SYSTEM', '2025-12-28T16:39:41.000Z', 'SYSTEM'),
  ('COM074', '3', '화요일', '화요일', 'Y', '2025-12-28T16:39:41.001Z', 'SYSTEM', '2025-12-28T16:39:41.001Z', 'SYSTEM'),
  ('COM074', '4', '수요일', '수요일', 'Y', '2025-12-28T16:39:41.002Z', 'SYSTEM', '2025-12-28T16:39:41.002Z', 'SYSTEM'),
  ('COM074', '5', '목요일', '목요일', 'Y', '2025-12-28T16:39:41.003Z', 'SYSTEM', '2025-12-28T16:39:41.003Z', 'SYSTEM'),
  ('COM074', '6', '금요일', '금요일', 'Y', '2025-12-28T16:39:41.004Z', 'SYSTEM', '2025-12-28T16:39:41.004Z', 'SYSTEM'),
  ('COM074', '7', '토요일', '토요일', 'Y', '2025-12-28T16:39:41.005Z', 'SYSTEM', '2025-12-28T16:39:41.005Z', 'SYSTEM'),
  ('COM075', '001', '경조신청', '경조신청', 'Y', '2025-12-28T16:39:41.006Z', 'SYSTEM', '2025-12-28T16:39:41.006Z', 'SYSTEM'),
  ('COM075', '002', '포상신청', '포상신청', 'Y', '2025-12-28T16:39:41.007Z', 'SYSTEM', '2025-12-28T16:39:41.007Z', 'SYSTEM'),
  ('COM075', '003', '휴가신청', '휴가신청', 'Y', '2025-12-28T16:39:41.008Z', 'SYSTEM', '2025-12-28T16:39:41.008Z', 'SYSTEM'),
  ('COM075', '004', '행사신청', '행사신청', 'Y', '2025-12-28T16:39:41.008Z', 'SYSTEM', '2025-12-28T16:39:41.008Z', 'SYSTEM'),
  ('COM076', '01', '정상', '정상', 'Y', '2025-12-28T16:39:41.009Z', 'SYSTEM', '2025-12-28T16:39:41.009Z', 'SYSTEM'),
  ('COM076', '02', '비정상', '비정상', 'Y', '2025-12-28T16:39:41.010Z', 'SYSTEM', '2025-12-28T16:39:41.010Z', 'SYSTEM'),
  ('COM076', '03', '수행중', '수행중', 'Y', '2025-12-28T16:39:41.011Z', 'SYSTEM', '2025-12-28T16:39:41.011Z', 'SYSTEM'),
  ('COM101', 'BBST01', '통합게시판', '통합게시판', 'Y', '2025-12-28T16:39:41.012Z', 'SYSTEM', '2025-12-28T16:39:41.012Z', 'SYSTEM'),
  ('COM101', 'BBST02', '블로그형게시판', '블로그형게시판', 'Y', '2025-12-28T16:39:41.013Z', 'SYSTEM', '2025-12-28T16:39:41.013Z', 'SYSTEM'),
  ('COM101', 'BBST03', '방명록', '방명록', 'Y', '2025-12-28T16:39:41.014Z', 'SYSTEM', '2025-12-28T16:39:41.014Z', 'SYSTEM'),
  ('COM102', '1', '표준어', '표준어', 'Y', '2025-12-28T16:39:41.015Z', 'SYSTEM', '2025-12-28T16:39:41.015Z', 'SYSTEM'),
  ('COM102', '2', '동의어', '동의어', 'Y', '2025-12-28T16:39:41.016Z', 'SYSTEM', '2025-12-28T16:39:41.016Z', 'SYSTEM');

-- --------------------------------------------------------

-- Table: public.ecopseq
CREATE TABLE IF NOT EXISTS public."ecopseq" (
  "table_name" character varying(20) NOT NULL,
  "next_id" numeric
);
COMMENT ON TABLE public."ecopseq" IS 'ECOPSEQ';
COMMENT ON COLUMN public."ecopseq"."table_name" IS 'TABLENAME';
COMMENT ON COLUMN public."ecopseq"."next_id" IS 'NEXT아이디';

INSERT INTO public."ecopseq" ("table_name", "next_id") VALUES
  ('ADBKUSER_ID', '1'),
  ('ADBK_ID', '1'),
  ('ADMINIST_WORD_ID', '1'),
  ('ADMIN_CODE_OPERT', '1'),
  ('ANN_ID', '1'),
  ('BACKUP_OPERT_ID', '1'),
  ('BACKUP_RESULT_ID', '1'),
  ('BANNER_ID', '1'),
  ('BATCH_OPERT_ID', '1'),
  ('BATCH_RESULT_ID', '1'),
  ('BATCH_SCHDUL_ID', '1'),
  ('BBS_ID', '1'),
  ('CLB_ID', '1'),
  ('CMMNTY_ID', '1'),
  ('CNSLT_ID', '1'),
  ('CNTC_ID', '1'),
  ('CNTC_MESSAGE_ID', '1'),
  ('CNTNTS_ID', '1'),
  ('ECOPSEQ', '1'),
  ('CPYRHT_ID', '1'),
  ('CTSNN_ID', '1'),
  ('DAM_ID', '1'),
  ('DB_MNTRNG_LOG_ID', '1'),
  ('DEPT_JOB_BX_ID', '1'),
  ('DEPT_JOB_ID', '1'),
  ('DIARY_ID', '1'),
  ('DUS_ID', '1'),
  ('EVENTINFO_ID', '1'),
  ('EVENT_ID', '1'),
  ('EXTRLHRINFO_ID', '1'),
  ('FAQ_ID', '1'),
  ('FILESYS_LOGID', '1'),
  ('FILESYS_MNTRNG', '1'),
  ('FILE_ID', '1'),
  ('GROUP_ID', '1'),
  ('HPCM_ID', '1'),
  ('HTTL_ID', '1'),
  ('HTTP_ID', '1'),
  ('INDVDL_INFO_ID', '1'),
  ('INFRML_SANCTN', '1'),
  ('INSTT_CODE_OPERT', '1'),
  ('INSTT_ID', '1'),
  ('ISG_ID', '1'),
  ('ITEM_ID', '1'),
  ('KNO_ID', '1'),
  ('KNO_ID2', '1'),
  ('LEADER_SCHDUL_ID', '1'),
  ('LOGINLOG_ID', '1'),
  ('LSI_ID', '1'),
  ('MAILMSG_ID', '1'),
  ('MEMO_REPRT', '1'),
  ('MEMO_TODO_ID', '1'),
  ('MSI_ID', '1'),
  ('MTG_ID', '1'),
  ('MTG_PLACE_ID', '1'),
  ('NCRD_ID', '1'),
  ('NEWS_ID', '1'),
  ('NOTE_ID', '1'),
  ('NOTE_RECPTN_ID', '1'),
  ('NOTE_TRNSMIT_ID', '1'),
  ('NTWRKSVC_LOGID', '1'),
  ('NTWRK_ID', '1'),
  ('ONLINE_MUL_ID', '1'),
  ('POLL_IEM_ID', '1'),
  ('POLL_MGR_ID', '1'),
  ('POLL_RUT_ID', '1'),
  ('POPUP_ID', '1'),
  ('PROC_ID', '1'),
  ('PROL_ID', '1'),
  ('PROXYLOG_ID', '1'),
  ('PROXYSVC_ID', '1'),
  ('QA_ID', '1'),
  ('QESITM_', '1'),
  ('QESRSPNS_ID', '1'),
  ('QESTNR_QESITM_ID', '1'),
  ('QESTNR_RPD_ID', '1'),
  ('QUSTNRQESTN_ID', '1'),
  ('QUSTNRTMPLA_ID', '1'),
  ('RECOMEND_SITE_ID', '1'),
  ('RESTDE_ID', '1'),
  ('RESVE_ID', '1'),
  ('ROLE_ID', '20'),
  ('RSS_ID', '1'),
  ('RS_ID', '1'),
  ('RWARD_ID', '1'),
  ('SCHDUL_ID', '1'),
  ('SCRAP_ID', '1'),
  ('SERVER_ID', '1'),
  ('SEVEQ_ID', '1'),
  ('SITE_ID', '1'),
  ('SMS_ID', '1'),
  ('SRCHWRD_ID', '1'),
  ('SRCHWRD_MANAGEID', '2'),
  ('SRCHWRD_MANAGE_I', '1'),
  ('SVCRESMONTLOG_ID', '1'),
  ('SVC_ID', '1'),
  ('SYNCHRNSERVER_ID', '1'),
  ('SYSLOG_ID', '1'),
  ('SYS_ID', '1'),
  ('TEST1', '1'),
  ('TMPLAT_ID', '1'),
  ('TROBL_ID', '1'),
  ('TRSMRCVLOG_ID', '1'),
  ('TR_MNTRNG_LOG_ID', '1'),
  ('UNITY_LINK_ID', '1'),
  ('USE_STPLAT_ID', '3'),
  ('USRCNFRM_ID', '3'),
  ('WEBLOG_ID', '1'),
  ('WIKI_ID', '1'),
  ('WIKMNTHNG_REPRT', '1'),
  ('WORD_ID', '1'),
  ('NTT_ID', '1'),
  ('ORGNZT_ID', '1'),
  ('ANSWER_NO', '1'),
  ('STSFDG_NO', '1'),
  ('ROUGHMAP_ID', '1');

-- --------------------------------------------------------

-- Table: public.hconfmhistory
CREATE TABLE IF NOT EXISTS public."hconfmhistory" (
  "confm_no" numeric NOT NULL,
  "confm_rqester_id" character varying(20) NOT NULL,
  "confmer_id" character varying(20),
  "confm_de" character(20),
  "confm_ty_code" character(4) NOT NULL,
  "confm_sttus_code" character(4) NOT NULL,
  "opert_ty_code" character(4),
  "opert_id" character varying(20),
  "trget_job_ty_code" character(3),
  "trget_job_id" character(20)
);
COMMENT ON TABLE public."hconfmhistory" IS 'HCONFMHISTORY';
COMMENT ON COLUMN public."hconfmhistory"."confm_no" IS 'CONFM번호';
COMMENT ON COLUMN public."hconfmhistory"."confm_rqester_id" IS 'CONFMRQESTER아이디';
COMMENT ON COLUMN public."hconfmhistory"."confmer_id" IS 'CONFMER아이디';
COMMENT ON COLUMN public."hconfmhistory"."confm_de" IS 'CONFM일자';
COMMENT ON COLUMN public."hconfmhistory"."confm_ty_code" IS 'CONFM유형코드';
COMMENT ON COLUMN public."hconfmhistory"."confm_sttus_code" IS 'CONFM상태코드';
COMMENT ON COLUMN public."hconfmhistory"."opert_ty_code" IS 'OPERT유형코드';
COMMENT ON COLUMN public."hconfmhistory"."opert_id" IS 'OPERT아이디';
COMMENT ON COLUMN public."hconfmhistory"."trget_job_ty_code" IS 'TRGET작업유형코드';
COMMENT ON COLUMN public."hconfmhistory"."trget_job_id" IS 'TRGET작업아이디';

-- --------------------------------------------------------

-- Table: public.hdbmntrngloginfo
CREATE TABLE IF NOT EXISTS public."hdbmntrngloginfo" (
  "data_sourc_nm" character varying(60) NOT NULL,
  "server_nm" character varying(60),
  "dbms_knd" character varying(2),
  "ceck_sql" character varying(250),
  "mngr_nm" character varying(60),
  "mngr_email_adres" character varying(50),
  "mntrng_sttus" character(2),
  "log_info" character varying(2000),
  "creat_dt" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updt_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "log_id" character(20) NOT NULL
);
COMMENT ON TABLE public."hdbmntrngloginfo" IS 'HDBMNTRNGLOGINFO';
COMMENT ON COLUMN public."hdbmntrngloginfo"."data_sourc_nm" IS '자료SOURC명';
COMMENT ON COLUMN public."hdbmntrngloginfo"."server_nm" IS 'SERVER명';
COMMENT ON COLUMN public."hdbmntrngloginfo"."dbms_knd" IS 'DBMS종류';
COMMENT ON COLUMN public."hdbmntrngloginfo"."ceck_sql" IS 'CECKSQL';
COMMENT ON COLUMN public."hdbmntrngloginfo"."mngr_nm" IS '관리자명';
COMMENT ON COLUMN public."hdbmntrngloginfo"."mngr_email_adres" IS '관리자이메일주소';
COMMENT ON COLUMN public."hdbmntrngloginfo"."mntrng_sttus" IS 'MNTRNG상태';
COMMENT ON COLUMN public."hdbmntrngloginfo"."log_info" IS '로그정보';
COMMENT ON COLUMN public."hdbmntrngloginfo"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."hdbmntrngloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."hdbmntrngloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."hdbmntrngloginfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."hdbmntrngloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."hdbmntrngloginfo"."log_id" IS '로그아이디';

-- --------------------------------------------------------

-- Table: public.hemaildsptchmanage
CREATE TABLE IF NOT EXISTS public."hemaildsptchmanage" (
  "mssage_id" character varying(20) NOT NULL,
  "email_cn" text,
  "sndr" character varying(50) NOT NULL,
  "rcver" character varying(50) NOT NULL,
  "sj" character varying(60) NOT NULL,
  "sndng_result_code" character(1),
  "dsptch_dt" character(20) NOT NULL,
  "atch_file_id" character(20)
);
COMMENT ON TABLE public."hemaildsptchmanage" IS 'HEMAILDSPTCHMANAGE';
COMMENT ON COLUMN public."hemaildsptchmanage"."mssage_id" IS 'MSSAGE아이디';
COMMENT ON COLUMN public."hemaildsptchmanage"."email_cn" IS '이메일내용';
COMMENT ON COLUMN public."hemaildsptchmanage"."sndr" IS '발송자';
COMMENT ON COLUMN public."hemaildsptchmanage"."rcver" IS '수화자';
COMMENT ON COLUMN public."hemaildsptchmanage"."sj" IS '제목';
COMMENT ON COLUMN public."hemaildsptchmanage"."sndng_result_code" IS '발송RESULT코드';
COMMENT ON COLUMN public."hemaildsptchmanage"."dsptch_dt" IS '발신일시';
COMMENT ON COLUMN public."hemaildsptchmanage"."atch_file_id" IS '첨부파일아이디';

-- --------------------------------------------------------

-- Table: public.hemplyrinfochangedtls
CREATE TABLE IF NOT EXISTS public."hemplyrinfochangedtls" (
  "emplyr_id" character varying(20) NOT NULL,
  "change_de" character(20) NOT NULL,
  "orgnzt_id" character(20),
  "group_id" character(20),
  "empl_no" character varying(20),
  "sexdstn_code" character(1),
  "brthdy" character(20),
  "fxnum" character varying(20),
  "house_adres" character varying(100),
  "house_end_telno" character varying(4),
  "area_no" character varying(4),
  "detail_adres" character varying(100),
  "zip" character varying(6),
  "offm_telno" character varying(20),
  "mbtlnum" character varying(20),
  "email_adres" character varying(50),
  "house_middle_telno" character varying(4),
  "pstinst_code" character(8),
  "emplyr_sttus_code" character(1),
  "esntl_id" character(20)
);
COMMENT ON TABLE public."hemplyrinfochangedtls" IS 'HEMPLYRINFOCHANGEDTLS';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."change_de" IS 'CHANGE일자';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."orgnzt_id" IS '조직아이디';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."group_id" IS '그룹아이디';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."empl_no" IS '사원번호';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."sexdstn_code" IS 'SEXDSTN코드';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."brthdy" IS '생년월일';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."fxnum" IS 'FXNUM';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."house_adres" IS '택주소';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."house_end_telno" IS '택종료전화번호';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."area_no" IS '지역번호';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."detail_adres" IS 'DETAIL주소';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."zip" IS '우편번호';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."offm_telno" IS '사무실전화번호';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."mbtlnum" IS '휴대폰번호';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."email_adres" IS '이메일주소';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."house_middle_telno" IS '택MIDDLE전화번호';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."pstinst_code" IS '게시물기관코드';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."emplyr_sttus_code" IS '사용자상태코드';
COMMENT ON COLUMN public."hemplyrinfochangedtls"."esntl_id" IS '필수아이디';

-- --------------------------------------------------------

-- Table: public.hhttpmonloginfo
CREATE TABLE IF NOT EXISTS public."hhttpmonloginfo" (
  "sys_id" character varying(20) NOT NULL,
  "site_url" character varying(100),
  "websvc_knd" character varying(10),
  "http_sttus_code" character varying(3),
  "creat_dt" timestamp without time zone,
  "log_info" character varying(2000),
  "mngr_nm" character varying(60),
  "mngr_email_adres" character varying(50),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "log_id" character(20) NOT NULL
);
COMMENT ON TABLE public."hhttpmonloginfo" IS 'HHTTPMONLOGINFO';
COMMENT ON COLUMN public."hhttpmonloginfo"."sys_id" IS '시스템아이디';
COMMENT ON COLUMN public."hhttpmonloginfo"."site_url" IS '사이트URL';
COMMENT ON COLUMN public."hhttpmonloginfo"."websvc_knd" IS '웹봉사종류';
COMMENT ON COLUMN public."hhttpmonloginfo"."http_sttus_code" IS 'HTTP상태코드';
COMMENT ON COLUMN public."hhttpmonloginfo"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."hhttpmonloginfo"."log_info" IS '로그정보';
COMMENT ON COLUMN public."hhttpmonloginfo"."mngr_nm" IS '관리자명';
COMMENT ON COLUMN public."hhttpmonloginfo"."mngr_email_adres" IS '관리자이메일주소';
COMMENT ON COLUMN public."hhttpmonloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."hhttpmonloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."hhttpmonloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."hhttpmonloginfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."hhttpmonloginfo"."log_id" IS '로그아이디';

-- --------------------------------------------------------

-- Table: public.htrsmrcvmntrngloginfo
CREATE TABLE IF NOT EXISTS public."htrsmrcvmntrngloginfo" (
  "log_id" character(20) NOT NULL,
  "cntc_id" character(8) NOT NULL,
  "test_class_nm" character varying(255),
  "mngr_nm" character varying(60),
  "mngr_email_adres" character varying(50),
  "mntrng_sttus" character(2),
  "log_info" character varying(2000),
  "creat_dt" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone NOT NULL
);
COMMENT ON TABLE public."htrsmrcvmntrngloginfo" IS 'HTRSMRCVMNTRNGLOGINFO';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."log_id" IS '로그아이디';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."cntc_id" IS '접촉아이디';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."test_class_nm" IS '시험CLASS명';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."mngr_nm" IS '관리자명';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."mngr_email_adres" IS '관리자이메일주소';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."mntrng_sttus" IS 'MNTRNG상태';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."log_info" IS '로그정보';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."htrsmrcvmntrngloginfo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ids
CREATE TABLE IF NOT EXISTS public."ids" (
  "table_name" character varying(20) NOT NULL,
  "next_id" numeric NOT NULL
);

INSERT INTO public."ids" ("table_name", "next_id") VALUES
  ('BBS_ID', '1'),
  ('FILE_ID', '1'),
  ('USER_ID', '1'),
  ('DEPT_JOB_ID', '0'),
  ('DEPT_JOB_BX_ID', '0'),
  ('MEMO_TODO_ID', '0'),
  ('WIK_MNTHNG_ID', '0');

-- --------------------------------------------------------

-- Table: public.imgtemp
CREATE TABLE IF NOT EXISTS public."imgtemp" (
  "orgnzt_code" character varying(10) NOT NULL,
  "erncsl_se" character varying(2) NOT NULL,
  "image_info" bytea NOT NULL,
  "image_ty" character varying(20)
);
COMMENT ON TABLE public."imgtemp" IS 'IMGTEMP';
COMMENT ON COLUMN public."imgtemp"."orgnzt_code" IS '조직코드';
COMMENT ON COLUMN public."imgtemp"."erncsl_se" IS 'ERNCSL구분';
COMMENT ON COLUMN public."imgtemp"."image_info" IS 'IMAGE정보';
COMMENT ON COLUMN public."imgtemp"."image_ty" IS 'IMAGE유형';

-- --------------------------------------------------------

-- Table: public.j_attachfile
CREATE TABLE IF NOT EXISTS public."j_attachfile" (
  "file_id" character varying(13) NOT NULL,
  "file_seq" integer NOT NULL,
  "file_name" character varying(100) NOT NULL,
  "file_size" integer,
  "file_mask" character varying(100),
  "download_count" integer,
  "download_expire_date" character varying(8),
  "download_limit_count" integer,
  "reg_date" timestamp without time zone,
  "delete_yn" character varying(1)
);
COMMENT ON TABLE public."j_attachfile" IS 'JATTACHFILE';
COMMENT ON COLUMN public."j_attachfile"."file_id" IS '파일아이디';
COMMENT ON COLUMN public."j_attachfile"."file_seq" IS '파일순서';
COMMENT ON COLUMN public."j_attachfile"."file_name" IS '파일NAME';
COMMENT ON COLUMN public."j_attachfile"."file_size" IS '파일SIZE';
COMMENT ON COLUMN public."j_attachfile"."file_mask" IS '파일MASK';
COMMENT ON COLUMN public."j_attachfile"."download_count" IS 'DOWNLOADCOUNT';
COMMENT ON COLUMN public."j_attachfile"."download_expire_date" IS 'DOWNLOADEXPIREDATE';
COMMENT ON COLUMN public."j_attachfile"."download_limit_count" IS 'DOWNLOADLIMITCOUNT';
COMMENT ON COLUMN public."j_attachfile"."reg_date" IS '등록DATE';
COMMENT ON COLUMN public."j_attachfile"."delete_yn" IS 'DELETE여부';

-- --------------------------------------------------------

-- Table: public.n_user_notification
CREATE TABLE IF NOT EXISTS public."n_user_notification" (
  "ntcn_no" character varying(20) NOT NULL,
  "ntcn_sj" character varying(255) NOT NULL,
  "ntcn_cn" character varying(4000),
  "receiver_id" character varying(20) NOT NULL,
  "is_read" character varying(1) DEFAULT 'N'::character varying,
  "link_url" character varying(255),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);

INSERT INTO public."n_user_notification" ("ntcn_no", "ntcn_sj", "ntcn_cn", "receiver_id", "is_read", "link_url", "frst_register_id", "frst_regist_pnttm", "last_updusr_id", "last_updt_pnttm") VALUES
  ('NT001', '테스트 알림입니다', '알림 내용입니다', 'webmaster', 'N', NULL, NULL, '2026-02-24T15:59:33.784Z', NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nadbk
CREATE TABLE IF NOT EXISTS public."nadbk" (
  "emplyr_id" character varying(20),
  "ncrd_id" character(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "adbk_constnt_id" character(20) NOT NULL,
  "nm" character varying(50),
  "email_adres" character varying(50),
  "mbtlnum" character varying(20),
  "fxnum" character varying(20),
  "offm_telno" character varying(20),
  "house_telno" character varying(20),
  "adbk_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nadbk" IS 'NADBK';
COMMENT ON COLUMN public."nadbk"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."nadbk"."ncrd_id" IS 'NCRD아이디';
COMMENT ON COLUMN public."nadbk"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nadbk"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nadbk"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nadbk"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nadbk"."adbk_constnt_id" IS '주소록CONSTNT아이디';
COMMENT ON COLUMN public."nadbk"."nm" IS '명';
COMMENT ON COLUMN public."nadbk"."email_adres" IS '이메일주소';
COMMENT ON COLUMN public."nadbk"."mbtlnum" IS '휴대폰번호';
COMMENT ON COLUMN public."nadbk"."fxnum" IS 'FXNUM';
COMMENT ON COLUMN public."nadbk"."offm_telno" IS '사무실전화번호';
COMMENT ON COLUMN public."nadbk"."house_telno" IS '택전화번호';
COMMENT ON COLUMN public."nadbk"."adbk_id" IS '주소록아이디';

-- --------------------------------------------------------

-- Table: public.nadbkmanage
CREATE TABLE IF NOT EXISTS public."nadbkmanage" (
  "adbk_id" character(20) NOT NULL,
  "adbk_nm" character varying(50) NOT NULL,
  "othbc_scope" character varying(20) NOT NULL,
  "use_at" character(1) NOT NULL,
  "wrter_id" character varying(20),
  "trget_orgnzt_id" character(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nadbkmanage" IS 'NADBKMANAGE';
COMMENT ON COLUMN public."nadbkmanage"."adbk_id" IS '주소록아이디';
COMMENT ON COLUMN public."nadbkmanage"."adbk_nm" IS '주소록명';
COMMENT ON COLUMN public."nadbkmanage"."othbc_scope" IS 'OTHBCSCOPE';
COMMENT ON COLUMN public."nadbkmanage"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nadbkmanage"."wrter_id" IS 'WRTER아이디';
COMMENT ON COLUMN public."nadbkmanage"."trget_orgnzt_id" IS 'TRGET조직아이디';
COMMENT ON COLUMN public."nadbkmanage"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nadbkmanage"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nadbkmanage"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nadbkmanage"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nanswer
CREATE TABLE IF NOT EXISTS public."nanswer" (
  "ntt_id" numeric NOT NULL,
  "bbs_id" character(30) NOT NULL,
  "wrter_id" character varying(20),
  "answer" character varying(200),
  "use_at" character(1) NOT NULL,
  "wrter_nm" character varying(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "answer_no" numeric NOT NULL
);
COMMENT ON TABLE public."nanswer" IS 'NANSWER';
COMMENT ON COLUMN public."nanswer"."ntt_id" IS 'NTT아이디';
COMMENT ON COLUMN public."nanswer"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nanswer"."wrter_id" IS 'WRTER아이디';
COMMENT ON COLUMN public."nanswer"."answer" IS 'ANSWER';
COMMENT ON COLUMN public."nanswer"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nanswer"."wrter_nm" IS 'WRTER명';
COMMENT ON COLUMN public."nanswer"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nanswer"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nanswer"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nanswer"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nanswer"."answer_no" IS 'ANSWER번호';

-- --------------------------------------------------------

-- Table: public.nauthorgroupinfo
CREATE TABLE IF NOT EXISTS public."nauthorgroupinfo" (
  "group_id" character(20) NOT NULL,
  "group_nm" character varying(60) NOT NULL,
  "group_creat_de" timestamp without time zone NOT NULL,
  "group_dc" character varying(100),
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nauthorgroupinfo" IS 'NAUTHORGROUPINFO';
COMMENT ON COLUMN public."nauthorgroupinfo"."group_id" IS '그룹아이디';
COMMENT ON COLUMN public."nauthorgroupinfo"."group_nm" IS '그룹명';
COMMENT ON COLUMN public."nauthorgroupinfo"."group_creat_de" IS '그룹CREAT일자';
COMMENT ON COLUMN public."nauthorgroupinfo"."group_dc" IS '그룹설명';

INSERT INTO public."nauthorgroupinfo" ("group_id", "group_nm", "group_creat_de", "group_dc", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('GROUP_00000000000000', '0번  그룹입니다', '2025-12-28T16:39:41.016Z', '0번  그룹입니다', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nauthorinfo
CREATE TABLE IF NOT EXISTS public."nauthorinfo" (
  "author_code" character varying(30) NOT NULL,
  "author_nm" character varying(60) NOT NULL,
  "author_dc" character varying(200),
  "author_creat_de" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nauthorinfo" IS 'NAUTHORINFO';
COMMENT ON COLUMN public."nauthorinfo"."author_code" IS '권한코드';
COMMENT ON COLUMN public."nauthorinfo"."author_nm" IS '권한명';
COMMENT ON COLUMN public."nauthorinfo"."author_dc" IS '권한설명';
COMMENT ON COLUMN public."nauthorinfo"."author_creat_de" IS '권한CREAT일자';

INSERT INTO public."nauthorinfo" ("author_code", "author_nm", "author_dc", "author_creat_de", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('ROLE_ANONYMOUS', '익명 사용자', '', '2025-12-28T16:39:41.026Z', NULL, NULL, NULL, NULL),
  ('IS_AUTHENTICATED_ANONYMOUSLY', '스프링시큐리티 내부사용(롤부여 금지)', '', '2025-12-28T16:39:41.027Z', NULL, NULL, NULL, NULL),
  ('IS_AUTHENTICATED_REMEMBERED', '스프링시큐리티 내부사용(롤부여 금지)', '', '2025-12-28T16:39:41.027Z', NULL, NULL, NULL, NULL),
  ('IS_AUTHENTICATED_FULLY', '스프링시큐리티 내부사용(롤부여 금지)', '', '2025-12-28T16:39:41.028Z', NULL, NULL, NULL, NULL),
  ('ROLE_USER', '일반 사용자', '', '2025-12-28T16:39:41.029Z', NULL, NULL, NULL, NULL),
  ('ROLE_ADMIN', '관리자', '', '2025-12-28T16:39:41.030Z', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nauthorrolerelate
CREATE TABLE IF NOT EXISTS public."nauthorrolerelate" (
  "author_code" character varying(30) NOT NULL,
  "role_code" character varying(50) NOT NULL,
  "creat_dt" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nauthorrolerelate" IS 'NAUTHORROLERELATE';
COMMENT ON COLUMN public."nauthorrolerelate"."author_code" IS '권한코드';
COMMENT ON COLUMN public."nauthorrolerelate"."role_code" IS '역할코드';
COMMENT ON COLUMN public."nauthorrolerelate"."creat_dt" IS 'CREAT일시';

INSERT INTO public."nauthorrolerelate" ("author_code", "role_code", "creat_dt", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('ROLE_ANONYMOUS', 'web-000001', '2025-12-28T16:39:41.049Z', NULL, NULL, NULL, NULL),
  ('ROLE_ANONYMOUS', 'web-000002', '2025-12-28T16:39:41.051Z', NULL, NULL, NULL, NULL),
  ('ROLE_ANONYMOUS', 'web-000004', '2025-12-28T16:39:41.051Z', NULL, NULL, NULL, NULL),
  ('ROLE_ANONYMOUS', 'web-000007', '2025-12-28T16:39:41.052Z', NULL, NULL, NULL, NULL),
  ('ROLE_ANONYMOUS', 'web-000009', '2025-12-28T16:39:41.053Z', NULL, NULL, NULL, NULL),
  ('ROLE_ANONYMOUS', 'web-000010', '2025-12-28T16:39:41.054Z', NULL, NULL, NULL, NULL),
  ('ROLE_ANONYMOUS', 'web-000011', '2025-12-28T16:39:41.055Z', NULL, NULL, NULL, NULL),
  ('ROLE_ANONYMOUS', 'web-000012', '2025-12-28T16:39:41.056Z', NULL, NULL, NULL, NULL),
  ('ROLE_USER', 'web-000003', '2025-12-28T16:39:41.057Z', NULL, NULL, NULL, NULL),
  ('ROLE_ADMIN', 'web-000003', '2025-12-28T16:39:41.058Z', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nbackupschduldfk
CREATE TABLE IF NOT EXISTS public."nbackupschduldfk" (
  "backup_opert_id" character varying(20) NOT NULL,
  "execut_schdul_dfk_se" character(1) NOT NULL
);
COMMENT ON TABLE public."nbackupschduldfk" IS 'NBACKUPSCHDULDFK';
COMMENT ON COLUMN public."nbackupschduldfk"."backup_opert_id" IS 'BACKUPOPERT아이디';
COMMENT ON COLUMN public."nbackupschduldfk"."execut_schdul_dfk_se" IS 'EXECUTSCHDULDFK구분';

-- --------------------------------------------------------

-- Table: public.nbanner
CREATE TABLE IF NOT EXISTS public."nbanner" (
  "banner_id" character(20) NOT NULL,
  "banner_nm" character varying(60) NOT NULL,
  "link_url" character varying(255) NOT NULL,
  "banner_image" character varying(60) NOT NULL,
  "banner_dc" character varying(200),
  "reflct_at" character(1) NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "banner_image_file" character varying(60),
  "sort_ordr" numeric
);
COMMENT ON TABLE public."nbanner" IS 'NBANNER';
COMMENT ON COLUMN public."nbanner"."banner_id" IS 'BANNER아이디';
COMMENT ON COLUMN public."nbanner"."banner_nm" IS 'BANNER명';
COMMENT ON COLUMN public."nbanner"."link_url" IS '연계URL';
COMMENT ON COLUMN public."nbanner"."banner_image" IS 'BANNERIMAGE';
COMMENT ON COLUMN public."nbanner"."banner_dc" IS 'BANNER설명';
COMMENT ON COLUMN public."nbanner"."reflct_at" IS '반영여부';
COMMENT ON COLUMN public."nbanner"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nbanner"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nbanner"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nbanner"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nbanner"."banner_image_file" IS 'BANNERIMAGE파일';
COMMENT ON COLUMN public."nbanner"."sort_ordr" IS '정렬순서';

-- --------------------------------------------------------

-- Table: public.nbbs
CREATE TABLE IF NOT EXISTS public."nbbs" (
  "ntt_id" numeric NOT NULL,
  "bbs_id" character varying(30) NOT NULL,
  "ntt_no" numeric,
  "ntt_sj" character varying(2000),
  "ntt_cn" text,
  "answer_at" character(1),
  "parntsctt_no" numeric,
  "answer_lc" numeric,
  "sort_ordr" numeric,
  "rdcnt" numeric,
  "use_at" character(1) NOT NULL,
  "ntce_bgnde" character(20),
  "ntce_endde" character(20),
  "ntcr_id" character varying(20),
  "ntcr_nm" character varying(20),
  "password" character varying(200),
  "atch_file_id" character(20),
  "notice_at" character(1),
  "sj_bold_at" character(1),
  "secret_at" character(1),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "blog_id" character(20),
  "comment_co" integer DEFAULT 0,
  "file_co" integer DEFAULT 0
);
COMMENT ON TABLE public."nbbs" IS 'NBBS';
COMMENT ON COLUMN public."nbbs"."ntt_id" IS 'NTT아이디';
COMMENT ON COLUMN public."nbbs"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nbbs"."ntt_no" IS 'NTT번호';
COMMENT ON COLUMN public."nbbs"."ntt_sj" IS 'NTT제목';
COMMENT ON COLUMN public."nbbs"."ntt_cn" IS 'NTT내용';
COMMENT ON COLUMN public."nbbs"."answer_at" IS 'ANSWER여부';
COMMENT ON COLUMN public."nbbs"."parntsctt_no" IS 'PARNTSCTT번호';
COMMENT ON COLUMN public."nbbs"."answer_lc" IS 'ANSWER위치';
COMMENT ON COLUMN public."nbbs"."sort_ordr" IS '정렬순서';
COMMENT ON COLUMN public."nbbs"."rdcnt" IS 'RDCNT';
COMMENT ON COLUMN public."nbbs"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nbbs"."ntce_bgnde" IS '공지시작일';
COMMENT ON COLUMN public."nbbs"."ntce_endde" IS '공지종료일';
COMMENT ON COLUMN public."nbbs"."ntcr_id" IS 'NTCR아이디';
COMMENT ON COLUMN public."nbbs"."ntcr_nm" IS 'NTCR명';
COMMENT ON COLUMN public."nbbs"."password" IS '비밀번호';
COMMENT ON COLUMN public."nbbs"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."nbbs"."notice_at" IS 'NOTICE여부';
COMMENT ON COLUMN public."nbbs"."sj_bold_at" IS '제목BOLD여부';
COMMENT ON COLUMN public."nbbs"."secret_at" IS 'SECRET여부';
COMMENT ON COLUMN public."nbbs"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nbbs"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nbbs"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nbbs"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nbbs"."blog_id" IS '블로그아이디';
COMMENT ON COLUMN public."nbbs"."comment_co" IS '댓글 수';
COMMENT ON COLUMN public."nbbs"."file_co" IS '첨부파일 수';

INSERT INTO public."nbbs" ("ntt_id", "bbs_id", "ntt_no", "ntt_sj", "ntt_cn", "answer_at", "parntsctt_no", "answer_lc", "sort_ordr", "rdcnt", "use_at", "ntce_bgnde", "ntce_endde", "ntcr_id", "ntcr_nm", "password", "atch_file_id", "notice_at", "sj_bold_at", "secret_at", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id", "blog_id", "comment_co", "file_co") VALUES
  ('1', 'BBSMSTR_AAAAAAAAAAAA', NULL, '공지사항 테스트', '테스트 게시글입니다.', NULL, NULL, NULL, NULL, '0', 'Y', '20250101            ', '20261231            ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-28T19:52:47.171Z', 'SYSTEM', NULL, NULL, NULL, 0, 0),
  ('2', 'BBSMSTR_CCCCCCCCCCCC', NULL, '업무 테스트', '업무 테스트입니다.', NULL, NULL, NULL, NULL, '0', 'Y', '20250101            ', '20261231            ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-28T19:52:47.171Z', 'SYSTEM', NULL, NULL, NULL, 0, 0);

-- --------------------------------------------------------

-- Table: public.nbbsmaster
CREATE TABLE IF NOT EXISTS public."nbbsmaster" (
  "bbs_id" character varying(30) NOT NULL,
  "bbs_nm" character varying(255) NOT NULL,
  "bbs_intrcn" character varying(2400),
  "bbs_ty_code" character(6) NOT NULL,
  "reply_posbl_at" character(1),
  "file_atch_posbl_at" character(1) NOT NULL,
  "atch_posbl_file_number" numeric NOT NULL,
  "atch_posbl_file_size" numeric,
  "use_at" character(1) NOT NULL,
  "tmplat_id" character(20),
  "cmmnty_id" character(20),
  "frst_register_id" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "blog_id" character(20),
  "blog_at" character(2),
  "bbs_attrb_code" character varying(6)
);
COMMENT ON TABLE public."nbbsmaster" IS 'NBBSMASTER';
COMMENT ON COLUMN public."nbbsmaster"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nbbsmaster"."bbs_nm" IS '게시판명';
COMMENT ON COLUMN public."nbbsmaster"."bbs_intrcn" IS '게시판도입내용';
COMMENT ON COLUMN public."nbbsmaster"."bbs_ty_code" IS '게시판유형코드';
COMMENT ON COLUMN public."nbbsmaster"."reply_posbl_at" IS 'REPLYPOS선하증권여부';
COMMENT ON COLUMN public."nbbsmaster"."file_atch_posbl_at" IS '파일첨부POS선하증권여부';
COMMENT ON COLUMN public."nbbsmaster"."atch_posbl_file_number" IS '첨부POS선하증권파일NUMBER';
COMMENT ON COLUMN public."nbbsmaster"."atch_posbl_file_size" IS '첨부POS선하증권파일SIZE';
COMMENT ON COLUMN public."nbbsmaster"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nbbsmaster"."tmplat_id" IS '템플릿아이디';
COMMENT ON COLUMN public."nbbsmaster"."cmmnty_id" IS '커뮤니티아이디';
COMMENT ON COLUMN public."nbbsmaster"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nbbsmaster"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nbbsmaster"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nbbsmaster"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nbbsmaster"."blog_id" IS '블로그아이디';
COMMENT ON COLUMN public."nbbsmaster"."blog_at" IS '블로그여부';

INSERT INTO public."nbbsmaster" ("bbs_id", "bbs_nm", "bbs_intrcn", "bbs_ty_code", "reply_posbl_at", "file_atch_posbl_at", "atch_posbl_file_number", "atch_posbl_file_size", "use_at", "tmplat_id", "cmmnty_id", "frst_register_id", "frst_regist_pnttm", "last_updusr_id", "last_updt_pnttm", "blog_id", "blog_at", "bbs_attrb_code") VALUES
  ('BBSMSTR_AAAAAAAAAAAA', '공지사항', '공지사항 게시판', 'BBST01', 'Y', 'Y', '3', '5242880', 'Y', 'TMPLAT_BOARD_DEFAULT', NULL, 'SYSTEM', '2025-12-28T19:51:11.602Z', NULL, NULL, NULL, NULL, NULL),
  ('BBSMSTR_CCCCCCCCCCCC', '업무게시판', '업무 게시판', 'BBST01', 'Y', 'Y', '3', '5242880', 'Y', 'TMPLAT_BOARD_DEFAULT', NULL, 'SYSTEM', '2025-12-28T19:51:11.602Z', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nbbsmasteroptn
CREATE TABLE IF NOT EXISTS public."nbbsmasteroptn" (
  "bbs_id" character(30) NOT NULL,
  "answer_at" character(1) NOT NULL,
  "stsfdg_at" character(1) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nbbsmasteroptn" IS 'NBBSMASTEROPTN';
COMMENT ON COLUMN public."nbbsmasteroptn"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nbbsmasteroptn"."answer_at" IS 'ANSWER여부';
COMMENT ON COLUMN public."nbbsmasteroptn"."stsfdg_at" IS 'STSFDG여부';
COMMENT ON COLUMN public."nbbsmasteroptn"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nbbsmasteroptn"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nbbsmasteroptn"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nbbsmasteroptn"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nbbsuse
CREATE TABLE IF NOT EXISTS public."nbbsuse" (
  "bbs_id" character(30) NOT NULL,
  "trget_id" character(20) NOT NULL,
  "use_at" character(1) NOT NULL,
  "regist_se_code" character(6),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nbbsuse" IS 'NBBSUSE';
COMMENT ON COLUMN public."nbbsuse"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nbbsuse"."trget_id" IS 'TRGET아이디';
COMMENT ON COLUMN public."nbbsuse"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nbbsuse"."regist_se_code" IS '등록구분코드';
COMMENT ON COLUMN public."nbbsuse"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nbbsuse"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nbbsuse"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nbbsuse"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nbkmkmenumanageresult
CREATE TABLE IF NOT EXISTS public."nbkmkmenumanageresult" (
  "menu_id" numeric NOT NULL,
  "emplyr_id" character varying(20) NOT NULL,
  "menu_nm" character varying(60) NOT NULL,
  "progrm_stre_path" character varying(100) NOT NULL
);
COMMENT ON TABLE public."nbkmkmenumanageresult" IS 'NBKMKMENUMANAGERESULT';
COMMENT ON COLUMN public."nbkmkmenumanageresult"."menu_id" IS '메뉴아이디';
COMMENT ON COLUMN public."nbkmkmenumanageresult"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."nbkmkmenumanageresult"."menu_nm" IS '메뉴명';
COMMENT ON COLUMN public."nbkmkmenumanageresult"."progrm_stre_path" IS '프로그램저장경로';

-- --------------------------------------------------------

-- Table: public.nblog
CREATE TABLE IF NOT EXISTS public."nblog" (
  "blog_id" character(20) NOT NULL,
  "blog_nm" character varying(255) NOT NULL,
  "blog_intrcn" character varying(2400),
  "use_at" character(1) NOT NULL,
  "regist_se_code" character(6),
  "tmplat_id" character(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "bbs_id" character(30) DEFAULT NULL::bpchar,
  "blog_at" character(2) DEFAULT NULL::bpchar
);
COMMENT ON TABLE public."nblog" IS 'NBLOG';
COMMENT ON COLUMN public."nblog"."blog_id" IS '블로그아이디';
COMMENT ON COLUMN public."nblog"."blog_nm" IS '블로그명';
COMMENT ON COLUMN public."nblog"."blog_intrcn" IS '블로그도입내용';
COMMENT ON COLUMN public."nblog"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nblog"."regist_se_code" IS '등록구분코드';
COMMENT ON COLUMN public."nblog"."tmplat_id" IS '템플릿아이디';
COMMENT ON COLUMN public."nblog"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nblog"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nblog"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nblog"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nblog"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nblog"."blog_at" IS '블로그여부';

-- --------------------------------------------------------

-- Table: public.nbloguser
CREATE TABLE IF NOT EXISTS public."nbloguser" (
  "blog_id" character(20) NOT NULL,
  "emplyr_id" character varying(20) NOT NULL,
  "mngr_at" character(1) NOT NULL,
  "mber_sttus" character varying(15),
  "sbscrb_de" timestamp without time zone,
  "secsn_de" character(20),
  "use_at" character(1),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nbloguser" IS 'NBLOGUSER';
COMMENT ON COLUMN public."nbloguser"."blog_id" IS '블로그아이디';
COMMENT ON COLUMN public."nbloguser"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."nbloguser"."mngr_at" IS '관리자여부';
COMMENT ON COLUMN public."nbloguser"."mber_sttus" IS '회원상태';
COMMENT ON COLUMN public."nbloguser"."sbscrb_de" IS 'SBSCRB일자';
COMMENT ON COLUMN public."nbloguser"."secsn_de" IS 'SECSN일자';
COMMENT ON COLUMN public."nbloguser"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nbloguser"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nbloguser"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nbloguser"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nbloguser"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nclub
CREATE TABLE IF NOT EXISTS public."nclub" (
  "clb_id" character(20) NOT NULL,
  "cmmnty_id" character(20) NOT NULL,
  "clb_nm" character varying(255) NOT NULL,
  "clb_intrcn" character varying(2400),
  "use_at" character(1) NOT NULL,
  "regist_se_code" character(6),
  "tmplat_id" character(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nclub" IS 'NCLUB';
COMMENT ON COLUMN public."nclub"."clb_id" IS 'CLB아이디';
COMMENT ON COLUMN public."nclub"."cmmnty_id" IS '커뮤니티아이디';
COMMENT ON COLUMN public."nclub"."clb_nm" IS 'CLB명';
COMMENT ON COLUMN public."nclub"."clb_intrcn" IS 'CLB도입내용';
COMMENT ON COLUMN public."nclub"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nclub"."regist_se_code" IS '등록구분코드';
COMMENT ON COLUMN public."nclub"."tmplat_id" IS '템플릿아이디';
COMMENT ON COLUMN public."nclub"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nclub"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nclub"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nclub"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nclubuser
CREATE TABLE IF NOT EXISTS public."nclubuser" (
  "clb_id" character(20) NOT NULL,
  "cmmnty_id" character(20) NOT NULL,
  "oprtr_at" character(1) NOT NULL,
  "sbscrb_de" timestamp without time zone,
  "secsn_de" character(20),
  "use_at" character(1) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "emplyr_id" character varying(20) NOT NULL
);
COMMENT ON TABLE public."nclubuser" IS 'NCLUBUSER';
COMMENT ON COLUMN public."nclubuser"."clb_id" IS 'CLB아이디';
COMMENT ON COLUMN public."nclubuser"."cmmnty_id" IS '커뮤니티아이디';
COMMENT ON COLUMN public."nclubuser"."oprtr_at" IS '작업자여부';
COMMENT ON COLUMN public."nclubuser"."sbscrb_de" IS 'SBSCRB일자';
COMMENT ON COLUMN public."nclubuser"."secsn_de" IS 'SECSN일자';
COMMENT ON COLUMN public."nclubuser"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nclubuser"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nclubuser"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nclubuser"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nclubuser"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nclubuser"."emplyr_id" IS '사용자아이디';

-- --------------------------------------------------------

-- Table: public.ncmmnty
CREATE TABLE IF NOT EXISTS public."ncmmnty" (
  "cmmnty_id" character(20) NOT NULL,
  "cmmnty_nm" character varying(255) NOT NULL,
  "cmmnty_intrcn" character varying(2400),
  "use_at" character(1) NOT NULL,
  "regist_se_code" character(6),
  "tmplat_id" character(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."ncmmnty" IS 'NCMMNTY';
COMMENT ON COLUMN public."ncmmnty"."cmmnty_id" IS '커뮤니티아이디';
COMMENT ON COLUMN public."ncmmnty"."cmmnty_nm" IS '커뮤니티명';
COMMENT ON COLUMN public."ncmmnty"."cmmnty_intrcn" IS '커뮤니티도입내용';
COMMENT ON COLUMN public."ncmmnty"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ncmmnty"."regist_se_code" IS '등록구분코드';
COMMENT ON COLUMN public."ncmmnty"."tmplat_id" IS '템플릿아이디';
COMMENT ON COLUMN public."ncmmnty"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ncmmnty"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ncmmnty"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ncmmnty"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.ncmmntyuser
CREATE TABLE IF NOT EXISTS public."ncmmntyuser" (
  "cmmnty_id" character(20) NOT NULL,
  "emplyr_id" character varying(20) NOT NULL,
  "mngr_at" character(1) NOT NULL,
  "mber_sttus" character varying(15),
  "sbscrb_de" timestamp without time zone,
  "secsn_de" character(20),
  "use_at" character(1),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."ncmmntyuser" IS 'NCMMNTYUSER';
COMMENT ON COLUMN public."ncmmntyuser"."cmmnty_id" IS '커뮤니티아이디';
COMMENT ON COLUMN public."ncmmntyuser"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."ncmmntyuser"."mngr_at" IS '관리자여부';
COMMENT ON COLUMN public."ncmmntyuser"."mber_sttus" IS '회원상태';
COMMENT ON COLUMN public."ncmmntyuser"."sbscrb_de" IS 'SBSCRB일자';
COMMENT ON COLUMN public."ncmmntyuser"."secsn_de" IS 'SECSN일자';
COMMENT ON COLUMN public."ncmmntyuser"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ncmmntyuser"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ncmmntyuser"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ncmmntyuser"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ncmmntyuser"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.ncnsltlist
CREATE TABLE IF NOT EXISTS public."ncnsltlist" (
  "cnslt_id" character(20) NOT NULL,
  "cnslt_sj" character varying(255),
  "othbc_at" character(1),
  "email_adres" character varying(50),
  "cnslt_cn" character varying(2500),
  "managt_cn" character varying(2500),
  "managt_de" character(20),
  "rdcnt" numeric,
  "atch_file_id" character(20),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "area_no" character varying(4),
  "middle_telno" character varying(4),
  "end_telno" character varying(4),
  "frst_mbtlnum" character varying(4),
  "middle_mbtlnum" character varying(4),
  "end_mbtlnum" character varying(4),
  "writng_de" character(20),
  "wrter_nm" character varying(20),
  "email_answer_at" character(1),
  "qna_process_sttus_code" character(1),
  "writng_password" character varying(20)
);
COMMENT ON TABLE public."ncnsltlist" IS 'NCNSLTLIST';
COMMENT ON COLUMN public."ncnsltlist"."cnslt_id" IS '컨설팅아이디';
COMMENT ON COLUMN public."ncnsltlist"."cnslt_sj" IS '컨설팅제목';
COMMENT ON COLUMN public."ncnsltlist"."othbc_at" IS 'OTHBC여부';
COMMENT ON COLUMN public."ncnsltlist"."email_adres" IS '이메일주소';
COMMENT ON COLUMN public."ncnsltlist"."cnslt_cn" IS '컨설팅내용';
COMMENT ON COLUMN public."ncnsltlist"."managt_cn" IS 'MANAGT내용';
COMMENT ON COLUMN public."ncnsltlist"."managt_de" IS 'MANAGT일자';
COMMENT ON COLUMN public."ncnsltlist"."rdcnt" IS 'RDCNT';
COMMENT ON COLUMN public."ncnsltlist"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."ncnsltlist"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ncnsltlist"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ncnsltlist"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ncnsltlist"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ncnsltlist"."area_no" IS '지역번호';
COMMENT ON COLUMN public."ncnsltlist"."middle_telno" IS 'MIDDLE전화번호';
COMMENT ON COLUMN public."ncnsltlist"."end_telno" IS '종료전화번호';
COMMENT ON COLUMN public."ncnsltlist"."frst_mbtlnum" IS '최초휴대폰번호';
COMMENT ON COLUMN public."ncnsltlist"."middle_mbtlnum" IS 'MIDDLE휴대폰번호';
COMMENT ON COLUMN public."ncnsltlist"."end_mbtlnum" IS '종료휴대폰번호';
COMMENT ON COLUMN public."ncnsltlist"."writng_de" IS 'WRITNG일자';
COMMENT ON COLUMN public."ncnsltlist"."wrter_nm" IS 'WRTER명';
COMMENT ON COLUMN public."ncnsltlist"."email_answer_at" IS '이메일ANSWER여부';
COMMENT ON COLUMN public."ncnsltlist"."qna_process_sttus_code" IS '질의응답PROCESS상태코드';
COMMENT ON COLUMN public."ncnsltlist"."writng_password" IS 'WRITNG비밀번호';

-- --------------------------------------------------------

-- Table: public.ncnsltmanage
CREATE TABLE IF NOT EXISTS public."ncnsltmanage" (
  "cnslt_id" character varying(20) NOT NULL,
  "cnslt_sj" character varying(255) NOT NULL,
  "cnslt_cn" text,
  "othbc_at" character(1),
  "writng_de" character varying(20),
  "wrter_id" character varying(20) NOT NULL,
  "wrter_nm" character varying(20),
  "managt_cn" text,
  "managt_de" character varying(20),
  "qna_process_sttus_code" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);

-- --------------------------------------------------------

-- Table: public.ncntcmessage
CREATE TABLE IF NOT EXISTS public."ncntcmessage" (
  "cntc_mssage_id" character varying(20) NOT NULL,
  "cntc_mssage_nm" character varying(100),
  "upper_cntc_mssage_id" character varying(20),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "use_at" character(1)
);
COMMENT ON TABLE public."ncntcmessage" IS 'NCNTCMESSAGE';
COMMENT ON COLUMN public."ncntcmessage"."cntc_mssage_id" IS '접촉MSSAGE아이디';
COMMENT ON COLUMN public."ncntcmessage"."cntc_mssage_nm" IS '접촉MSSAGE명';
COMMENT ON COLUMN public."ncntcmessage"."upper_cntc_mssage_id" IS 'UPPER접촉MSSAGE아이디';
COMMENT ON COLUMN public."ncntcmessage"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ncntcmessage"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ncntcmessage"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ncntcmessage"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ncntcmessage"."use_at" IS '사용여부';

-- --------------------------------------------------------

-- Table: public.ncntcmessageitem
CREATE TABLE IF NOT EXISTS public."ncntcmessageitem" (
  "cntc_mssage_id" character varying(20) NOT NULL,
  "iem_id" character varying(20) NOT NULL,
  "iem_nm" character varying(100),
  "iem_ty" character varying(50),
  "iem_lt" numeric,
  "use_at" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ncntcmessageitem" IS 'NCNTCMESSAGEITEM';
COMMENT ON COLUMN public."ncntcmessageitem"."cntc_mssage_id" IS '접촉MSSAGE아이디';
COMMENT ON COLUMN public."ncntcmessageitem"."iem_id" IS 'IEM아이디';
COMMENT ON COLUMN public."ncntcmessageitem"."iem_nm" IS 'IEM명';
COMMENT ON COLUMN public."ncntcmessageitem"."iem_ty" IS 'IEM유형';
COMMENT ON COLUMN public."ncntcmessageitem"."iem_lt" IS 'IEM로트';
COMMENT ON COLUMN public."ncntcmessageitem"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ncntcmessageitem"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ncntcmessageitem"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ncntcmessageitem"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ncntcmessageitem"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ncntcservice
CREATE TABLE IF NOT EXISTS public."ncntcservice" (
  "instt_id" character varying(20) NOT NULL,
  "sys_id" character varying(20) NOT NULL,
  "svc_id" character varying(20) NOT NULL,
  "svc_nm" character varying(255),
  "requst_mssage_id" character varying(20),
  "rspns_mssage_id" character varying(20),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "use_at" character(1)
);
COMMENT ON TABLE public."ncntcservice" IS 'NCNTCSERVICE';
COMMENT ON COLUMN public."ncntcservice"."instt_id" IS 'INSTT아이디';
COMMENT ON COLUMN public."ncntcservice"."sys_id" IS '시스템아이디';
COMMENT ON COLUMN public."ncntcservice"."svc_id" IS '봉사아이디';
COMMENT ON COLUMN public."ncntcservice"."svc_nm" IS '봉사명';
COMMENT ON COLUMN public."ncntcservice"."requst_mssage_id" IS 'REQUSTMSSAGE아이디';
COMMENT ON COLUMN public."ncntcservice"."rspns_mssage_id" IS '응답MSSAGE아이디';
COMMENT ON COLUMN public."ncntcservice"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ncntcservice"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ncntcservice"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ncntcservice"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ncntcservice"."use_at" IS '사용여부';

-- --------------------------------------------------------

-- Table: public.ncntntslist
CREATE TABLE IF NOT EXISTS public."ncntntslist" (
  "cntnts_id" character varying(20) NOT NULL,
  "emplyr_id" character varying(20) NOT NULL
);
COMMENT ON TABLE public."ncntntslist" IS 'NCNTNTSLIST';
COMMENT ON COLUMN public."ncntntslist"."cntnts_id" IS 'CNTNTS아이디';
COMMENT ON COLUMN public."ncntntslist"."emplyr_id" IS '사용자아이디';

-- --------------------------------------------------------

-- Table: public.ncomment
CREATE TABLE IF NOT EXISTS public."ncomment" (
  "ntt_id" numeric NOT NULL,
  "bbs_id" character(30) NOT NULL,
  "answer_no" numeric NOT NULL,
  "wrter_id" character varying(20),
  "wrter_nm" character varying(20),
  "answer" character varying(200),
  "use_at" character(1) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "password" character varying(200)
);
COMMENT ON TABLE public."ncomment" IS 'NCOMMENT';
COMMENT ON COLUMN public."ncomment"."ntt_id" IS 'NTT아이디';
COMMENT ON COLUMN public."ncomment"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."ncomment"."answer_no" IS 'ANSWER번호';
COMMENT ON COLUMN public."ncomment"."wrter_id" IS 'WRTER아이디';
COMMENT ON COLUMN public."ncomment"."wrter_nm" IS 'WRTER명';
COMMENT ON COLUMN public."ncomment"."answer" IS 'ANSWER';
COMMENT ON COLUMN public."ncomment"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ncomment"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ncomment"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ncomment"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ncomment"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ncomment"."password" IS '비밀번호';

-- --------------------------------------------------------

-- Table: public.ndeptjob
CREATE TABLE IF NOT EXISTS public."ndeptjob" (
  "dept_job_id" character(20) NOT NULL,
  "dept_jobbx_id" character(6) NOT NULL,
  "dept_job_nm" character varying(255) NOT NULL,
  "dept_job_cn" character varying(2500) NOT NULL,
  "atch_file_id" character(20),
  "charger_id" character varying(20) NOT NULL,
  "priort" character(1) NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ndeptjob" IS 'NDEPTJOB';
COMMENT ON COLUMN public."ndeptjob"."dept_job_id" IS '부서작업아이디';
COMMENT ON COLUMN public."ndeptjob"."dept_jobbx_id" IS '부서JOBBX아이디';
COMMENT ON COLUMN public."ndeptjob"."dept_job_nm" IS '부서작업명';
COMMENT ON COLUMN public."ndeptjob"."dept_job_cn" IS '부서작업내용';
COMMENT ON COLUMN public."ndeptjob"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."ndeptjob"."charger_id" IS 'CHARGER아이디';
COMMENT ON COLUMN public."ndeptjob"."priort" IS 'PRIORT';
COMMENT ON COLUMN public."ndeptjob"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ndeptjob"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ndeptjob"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ndeptjob"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ndeptjobbx
CREATE TABLE IF NOT EXISTS public."ndeptjobbx" (
  "dept_jobbx_id" character(6) NOT NULL,
  "dept_jobbx_nm" character varying(255) NOT NULL,
  "dept_id" character varying(20) NOT NULL,
  "indict_ordr" numeric,
  "frst_register_id" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ndeptjobbx" IS 'NDEPTJOBBX';
COMMENT ON COLUMN public."ndeptjobbx"."dept_jobbx_id" IS '부서JOBBX아이디';
COMMENT ON COLUMN public."ndeptjobbx"."dept_jobbx_nm" IS '부서JOBBX명';
COMMENT ON COLUMN public."ndeptjobbx"."dept_id" IS '부서아이디';
COMMENT ON COLUMN public."ndeptjobbx"."indict_ordr" IS 'INDICT순서';
COMMENT ON COLUMN public."ndeptjobbx"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ndeptjobbx"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ndeptjobbx"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ndeptjobbx"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ndiaryinfo
CREATE TABLE IF NOT EXISTS public."ndiaryinfo" (
  "schdul_id" character(20) NOT NULL,
  "diary_id" character(20) NOT NULL,
  "diary_progrsrt" numeric,
  "diary_nm" character varying(255),
  "drct_matter" character varying(2500),
  "partclr_matter" character varying(2500),
  "atch_file_id" character(20),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."ndiaryinfo" IS 'NDIARYINFO';
COMMENT ON COLUMN public."ndiaryinfo"."schdul_id" IS 'SCHDUL아이디';
COMMENT ON COLUMN public."ndiaryinfo"."diary_id" IS 'DI배열아이디';
COMMENT ON COLUMN public."ndiaryinfo"."diary_progrsrt" IS 'DI배열PROGRSRT';
COMMENT ON COLUMN public."ndiaryinfo"."diary_nm" IS 'DI배열명';
COMMENT ON COLUMN public."ndiaryinfo"."drct_matter" IS '직접MATTER';
COMMENT ON COLUMN public."ndiaryinfo"."partclr_matter" IS '부분접수자MATTER';
COMMENT ON COLUMN public."ndiaryinfo"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."ndiaryinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ndiaryinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ndiaryinfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."ndiaryinfo"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.ndtausestats
CREATE TABLE IF NOT EXISTS public."ndtausestats" (
  "dta_use_stats_id" character(20) NOT NULL,
  "bbs_id" character(30) NOT NULL,
  "ntt_id" numeric NOT NULL,
  "atch_file_id" character(20) NOT NULL,
  "file_sn" numeric NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ndtausestats" IS 'NDTAUSESTATS';
COMMENT ON COLUMN public."ndtausestats"."dta_use_stats_id" IS 'DTA사용통계아이디';
COMMENT ON COLUMN public."ndtausestats"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."ndtausestats"."ntt_id" IS 'NTT아이디';
COMMENT ON COLUMN public."ndtausestats"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."ndtausestats"."file_sn" IS '파일일련번호';
COMMENT ON COLUMN public."ndtausestats"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ndtausestats"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ndtausestats"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ndtausestats"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nemplyrinfo
CREATE TABLE IF NOT EXISTS public."nemplyrinfo" (
  "emplyr_id" character varying(20) NOT NULL,
  "orgnzt_id" character(20),
  "user_nm" character varying(60) NOT NULL,
  "password" character varying(200) NOT NULL,
  "empl_no" character varying(20),
  "ihidnum" character varying(200),
  "sexdstn_code" character(1),
  "brthdy" character(20),
  "fxnum" character varying(20),
  "house_adres" character varying(100) NOT NULL,
  "password_hint" character varying(100) NOT NULL,
  "password_cnsr" character varying(100) NOT NULL,
  "house_end_telno" character varying(4) NOT NULL,
  "area_no" character varying(4) NOT NULL,
  "detail_adres" character varying(100),
  "zip" character varying(6) NOT NULL,
  "offm_telno" character varying(20),
  "mbtlnum" character varying(20),
  "email_adres" character varying(50),
  "ofcps_nm" character varying(60),
  "house_middle_telno" character varying(4) NOT NULL,
  "group_id" character(20),
  "pstinst_code" character(8),
  "emplyr_sttus_code" character(1) NOT NULL,
  "esntl_id" character(20) NOT NULL,
  "crtfc_dn_value" character varying(100),
  "sbscrb_de" timestamp without time zone,
  "lock_at" character(1),
  "lock_cnt" numeric,
  "lock_last_pnttm" timestamp without time zone,
  "chg_pwd_last_pnttm" timestamp without time zone,
  "chg_pwd_cnt" integer,
  "role" character varying(60) DEFAULT 'USER'::character varying,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nemplyrinfo" IS 'NEMPLYRINFO';
COMMENT ON COLUMN public."nemplyrinfo"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."nemplyrinfo"."orgnzt_id" IS '조직아이디';
COMMENT ON COLUMN public."nemplyrinfo"."user_nm" IS '사용자명';
COMMENT ON COLUMN public."nemplyrinfo"."password" IS '비밀번호';
COMMENT ON COLUMN public."nemplyrinfo"."empl_no" IS '사원번호';
COMMENT ON COLUMN public."nemplyrinfo"."ihidnum" IS '주민등록번호';
COMMENT ON COLUMN public."nemplyrinfo"."sexdstn_code" IS 'SEXDSTN코드';
COMMENT ON COLUMN public."nemplyrinfo"."brthdy" IS '생년월일';
COMMENT ON COLUMN public."nemplyrinfo"."fxnum" IS 'FXNUM';
COMMENT ON COLUMN public."nemplyrinfo"."house_adres" IS '택주소';
COMMENT ON COLUMN public."nemplyrinfo"."password_hint" IS '비밀번호힌트';
COMMENT ON COLUMN public."nemplyrinfo"."password_cnsr" IS '비밀번호답변';
COMMENT ON COLUMN public."nemplyrinfo"."house_end_telno" IS '택종료전화번호';
COMMENT ON COLUMN public."nemplyrinfo"."area_no" IS '지역번호';
COMMENT ON COLUMN public."nemplyrinfo"."detail_adres" IS 'DETAIL주소';
COMMENT ON COLUMN public."nemplyrinfo"."zip" IS '우편번호';
COMMENT ON COLUMN public."nemplyrinfo"."offm_telno" IS '사무실전화번호';
COMMENT ON COLUMN public."nemplyrinfo"."mbtlnum" IS '휴대폰번호';
COMMENT ON COLUMN public."nemplyrinfo"."email_adres" IS '이메일주소';
COMMENT ON COLUMN public."nemplyrinfo"."ofcps_nm" IS 'OFCPS명';
COMMENT ON COLUMN public."nemplyrinfo"."house_middle_telno" IS '택MIDDLE전화번호';
COMMENT ON COLUMN public."nemplyrinfo"."group_id" IS '그룹아이디';
COMMENT ON COLUMN public."nemplyrinfo"."pstinst_code" IS '게시물기관코드';
COMMENT ON COLUMN public."nemplyrinfo"."emplyr_sttus_code" IS '사용자상태코드';
COMMENT ON COLUMN public."nemplyrinfo"."esntl_id" IS '필수아이디';
COMMENT ON COLUMN public."nemplyrinfo"."crtfc_dn_value" IS 'CRTFCDNVALUE';
COMMENT ON COLUMN public."nemplyrinfo"."sbscrb_de" IS 'SBSCRB일자';
COMMENT ON COLUMN public."nemplyrinfo"."lock_at" IS 'LOCK여부';
COMMENT ON COLUMN public."nemplyrinfo"."lock_cnt" IS 'LOCK수';
COMMENT ON COLUMN public."nemplyrinfo"."lock_last_pnttm" IS 'LOCK최종시점';
COMMENT ON COLUMN public."nemplyrinfo"."chg_pwd_last_pnttm" IS '변경PWD최종시점';

INSERT INTO public."nemplyrinfo" ("emplyr_id", "orgnzt_id", "user_nm", "password", "empl_no", "ihidnum", "sexdstn_code", "brthdy", "fxnum", "house_adres", "password_hint", "password_cnsr", "house_end_telno", "area_no", "detail_adres", "zip", "offm_telno", "mbtlnum", "email_adres", "ofcps_nm", "house_middle_telno", "group_id", "pstinst_code", "emplyr_sttus_code", "esntl_id", "crtfc_dn_value", "sbscrb_de", "lock_at", "lock_cnt", "lock_last_pnttm", "chg_pwd_last_pnttm", "chg_pwd_cnt", "role", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('TEST1', 'ORGNZT_0000000000000', '테스트1', 'yfHoVdC88xaHuSkJSJYdLcw3athlaHO9oUzEvD/EwFI=', '20112059', NULL, 'F', '20111130            ', '1566-2059', '서울 중구 무교동 한국정보화진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '관리자', '1566', 'GROUP_00000000000000', '00000001', 'P', 'USRCNFRM_00000000000', '', '2025-12-28T16:39:41.018Z', NULL, NULL, NULL, NULL, NULL, 'USER', NULL, NULL, NULL, NULL),
  ('webmaster', 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$w7oT8zi3T1nI8gcSKG01h.LAjbO1FJNjsohFsyymgCz9a7wrzm1ve', '20112060', NULL, 'F', '20111130            ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001', 'P', 'USRCNFRM_99999999999', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-19T13:50:49.658Z', NULL, 'ADMIN', NULL, 'SYSTEM', NULL, '2026-03-19T13:50:49.931Z'),
  ('user_regular', NULL, '일반사용자', '{bcrypt}$2a$10$S7nxmcG8u.cuhFyJeV.WouRJ06qxSPeesGGhsvtWExEB82UnWnzE2', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-19T13:50:51.370Z', NULL, 'USER', 'SYSTEM', 'SYSTEM', '2026-03-13T02:46:17.634Z', '2026-03-19T13:50:51.536Z');

-- --------------------------------------------------------

-- Table: public.nemplyrinfo_aud
CREATE TABLE IF NOT EXISTS public."nemplyrinfo_aud" (
  "emplyr_id" character varying(60) NOT NULL,
  "rev" integer NOT NULL,
  "revtype" smallint,
  "orgnzt_id" character(20),
  "user_nm" character varying(180),
  "password" character varying(600),
  "empl_no" character varying(60),
  "ihidnum" character varying(600),
  "sexdstn_code" character(1),
  "brthdy" character(60),
  "fxnum" character varying(60),
  "house_adres" character varying(300),
  "password_hint" character varying(300),
  "password_cnsr" character varying(300),
  "house_end_telno" character varying(12),
  "area_no" character varying(12),
  "detail_adres" character varying(300),
  "zip" character varying(18),
  "offm_telno" character varying(60),
  "mbtlnum" character varying(60),
  "email_adres" character varying(150),
  "ofcps_nm" character varying(180),
  "house_middle_telno" character varying(12),
  "group_id" character(20),
  "pstinst_code" character(24),
  "emplyr_sttus_code" character varying(15),
  "esntl_id" character(60),
  "crtfc_dn_value" character varying(300),
  "sbscrb_de" timestamp without time zone,
  "lock_at" character(1),
  "lock_cnt" numeric,
  "lock_last_pnttm" timestamp without time zone,
  "chg_pwd_last_pnttm" timestamp without time zone,
  "chg_pwd_cnt" integer,
  "role" character varying(180)
);

INSERT INTO public."nemplyrinfo_aud" ("emplyr_id", "rev", "revtype", "orgnzt_id", "user_nm", "password", "empl_no", "ihidnum", "sexdstn_code", "brthdy", "fxnum", "house_adres", "password_hint", "password_cnsr", "house_end_telno", "area_no", "detail_adres", "zip", "offm_telno", "mbtlnum", "email_adres", "ofcps_nm", "house_middle_telno", "group_id", "pstinst_code", "emplyr_sttus_code", "esntl_id", "crtfc_dn_value", "sbscrb_de", "lock_at", "lock_cnt", "lock_last_pnttm", "chg_pwd_last_pnttm", "chg_pwd_cnt", "role") VALUES
  ('webmaster', 2, 1, 'ORGNZT_0000000000000', '웹마스터', 'lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w=', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, NULL, NULL, 'ADMIN'),
  ('webmaster', 52, 1, 'ORGNZT_0000000000000', '관리자', 'lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w=', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, NULL, NULL, 'USER'),
  ('user_regular', 102, 0, NULL, '일반사용자', '{bcrypt}$2a$10$y.7OXJ.JCAOUJ9bmPbojs.e8FN/5agnbptQChcsCVXUXXdlvWRe.y', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', NULL, NULL, NULL, NULL, 'USER'),
  ('webmaster', 152, 1, 'ORGNZT_0000000000000', '관리자', 'lR9HSaayoa3L47nbYGT0XbRvrYp2Ldo4g54am6/pS2w=', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, NULL, NULL, 'ADMIN'),
  ('user_regular', 202, 1, NULL, '일반사용자', '{bcrypt}$2a$10$y.7OXJ.JCAOUJ9bmPbojs.e8FN/5agnbptQChcsCVXUXXdlvWRe.y', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, NULL, NULL, 'USER'),
  ('webmaster', 252, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$WtyGwq7drkUf2Hs4VoMjA.PhbF.gQfOSVf.iCzJj0CM5Fel97jnCC', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-13T12:43:06.736Z', NULL, 'ADMIN'),
  ('user_regular', 253, 1, NULL, '일반사용자', '{bcrypt}$2a$10$pIu45C1xfsYJaCx.Y73jPe3oS72roCtb6kw9coBxM1C5bZM20VGPG', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-13T12:43:08.201Z', NULL, 'USER'),
  ('webmaster', 302, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$3xVZk5pqXP1fyDClWF3SxucfsAUuIGb4hapbcheX4rlBdhgxooxy2', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-13T12:46:12.233Z', NULL, 'ADMIN'),
  ('user_regular', 303, 1, NULL, '일반사용자', '{bcrypt}$2a$10$vs1vvvKoqK45VMysUMgB0umSVlgcyT2W8tBMLqJULmILqyMO4uVgO', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-13T12:46:13.677Z', NULL, 'USER'),
  ('webmaster', 352, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$wioqTzNzidylclEZXus4wu4O2lnIMYCJfY0PWs.NHNEA32Jt.48GS', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-13T13:47:05.190Z', NULL, 'ADMIN'),
  ('user_regular', 353, 1, NULL, '일반사용자', '{bcrypt}$2a$10$it7gZ1J4irCAjaImFZbBHOG4QV8yn7PJ2MnibX6jnRwO6DddY5RPC', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-13T13:47:08.107Z', NULL, 'USER'),
  ('webmaster', 402, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$Q9Y0.9qQXFnWWEEpVPGA1.miEiuLe9dlaDH.ENP9zf82mCcZxEsg6', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-16T01:39:54.273Z', NULL, 'ADMIN'),
  ('user_regular', 403, 1, NULL, '일반사용자', '{bcrypt}$2a$10$ERurSoj6qSUhdRQpUasd4OvU8TD71T2MFt4Bwlq5R96wyBlqySRBq', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-16T01:39:55.700Z', NULL, 'USER'),
  ('webmaster', 452, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$9/3VZVgUcHLJKosvpJU3kO2UYZ1X5yYSD/Y04UcuNOTUTvvUiAjCm', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-16T01:50:58.943Z', NULL, 'ADMIN'),
  ('user_regular', 453, 1, NULL, '일반사용자', '{bcrypt}$2a$10$YLnjeRgCB6mjYwqm9a5IKOmUQ0ZSGeWkV/vAJAH5kotq62lXZ63tG', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-16T01:51:00.455Z', NULL, 'USER'),
  ('webmaster', 502, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$vdG5n3LwckbOcP9TfWDGv.DCjd5o9CNmeb5Ka8PY7rePUdu/lYHIO', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-16T01:58:37.296Z', NULL, 'ADMIN'),
  ('user_regular', 503, 1, NULL, '일반사용자', '{bcrypt}$2a$10$Y3zWVBMBqq0S4MjUrYIw6OPSGrJv95WVKtIm6zi75/8x3xPjMtU3m', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-16T01:58:38.627Z', NULL, 'USER'),
  ('webmaster', 552, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$NRnqN.nwZxWe01BiSsk4Su.qlAj87Ys//VJVJf2WKEs3JzaQyJsGO', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-16T07:32:57.671Z', NULL, 'ADMIN'),
  ('user_regular', 553, 1, NULL, '일반사용자', '{bcrypt}$2a$10$bMmSeYF1.khtxxRUcD2tOO3U82j8K8xiUTm9RLJFu6DsyGIfxJOHy', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-16T07:32:59.145Z', NULL, 'USER'),
  ('webmaster', 602, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$FDSBWywwUWAv6AoqJAUe9eYgtK5cpSP/OC9ma9AZRJMGcHclUHU7y', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-16T08:21:21.889Z', NULL, 'ADMIN'),
  ('user_regular', 603, 1, NULL, '일반사용자', '{bcrypt}$2a$10$PQ07f5KHZKGPIKAvtX6cMeTs6BHIXiNRTxG8yCxWR21i1uS7m5hku', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-16T08:21:23.288Z', NULL, 'USER'),
  ('webmaster', 652, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$44wmaR7kyu1Ybc1H3lHM8O6QVtbi2lUn/4suBtKL70ydt9cHug8I.', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-17T02:32:28.377Z', NULL, 'ADMIN'),
  ('user_regular', 653, 1, NULL, '일반사용자', '{bcrypt}$2a$10$yEzb/opLhRjXKaGOB.BJVuXH.CPTFvDboOVZGfDI3/nX.hd8oji0K', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-17T02:32:29.824Z', NULL, 'USER'),
  ('webmaster', 702, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$pWHLs5w1IjWnH3EyZ8EPXOTn1HFRc1ptS5W14F.f8IvCwQjCjjtQy', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-17T05:21:15.776Z', NULL, 'ADMIN'),
  ('user_regular', 703, 1, NULL, '일반사용자', '{bcrypt}$2a$10$5DeaJHeidSqs4cwLB3WG2.yZvorQsnFZ2DY46dd/M8GAyWh7VfyRa', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-17T05:21:17.270Z', NULL, 'USER'),
  ('webmaster', 752, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$RnbcvYJKgmfeF9XxLzvfkeBc8fKnCs9YrgIgyR9Un7Qc.m5Z059J6', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-17T05:28:06.914Z', NULL, 'ADMIN'),
  ('user_regular', 753, 1, NULL, '일반사용자', '{bcrypt}$2a$10$AQpQ/7GYG7p5eMReOZnzDObhzYwUZoeUiZW5JS0oCMemqnsGAT6kC', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-17T05:28:08.321Z', NULL, 'USER'),
  ('webmaster', 802, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$/Z/5VaCKaw3WaFeey6zKxOTJ5OL9lnjYJLA6uLC2J3EjlP9nJTg/O', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-17T05:42:38.805Z', NULL, 'ADMIN'),
  ('user_regular', 803, 1, NULL, '일반사용자', '{bcrypt}$2a$10$af62to5jz..1svBBsmf.A.azyOTgG2i2QGIqImxrUTZ96tTbYMibC', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-17T05:42:40.215Z', NULL, 'USER'),
  ('webmaster', 852, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$iKTBPg5nmWGgF0bVqcRryOlfDjvGWqJUnD4AsnxXrF5Ca4fwyMGxO', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-18T11:27:26.726Z', NULL, 'ADMIN'),
  ('user_regular', 853, 1, NULL, '일반사용자', '{bcrypt}$2a$10$MXRQwfs2VLr9GMPZwfjYXOk6J9AA4M4lIUFbLTrphyg4SFcFKaiCm', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-18T11:27:28.357Z', NULL, 'USER'),
  ('webmaster', 902, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$sndYBd4Tf/wH0T2ojfyyNeYKXZKg0GGEu13zTRwZyfifESAl.IOl6', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-18T11:30:23.405Z', NULL, 'ADMIN'),
  ('user_regular', 903, 1, NULL, '일반사용자', '{bcrypt}$2a$10$vmbn.w.E//e2wesiE/Xy8eVYhEtyvGdJLIeqvpfLQZEh6YSV1hj6m', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-18T11:30:25.053Z', NULL, 'USER'),
  ('webmaster', 952, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$6b.5U1cfs/MMzizcTpuGsey6g5d2GyTBTskEZJbxG5uWqqkDYObPW', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-18T11:41:34.534Z', NULL, 'ADMIN'),
  ('user_regular', 953, 1, NULL, '일반사용자', '{bcrypt}$2a$10$Gyw5XgWzyIYZYVpuGcfzyuIOm81lIQj3QJ.nIHM/VoTHwZlWIcodG', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-18T11:41:36.129Z', NULL, 'USER'),
  ('webmaster', 1002, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$Nv8PV7bTk3WuONiTCpN.Tuzz6P.cj0vWx.arr6ryYpsrWl0c5M3RK', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-18T11:44:57.927Z', NULL, 'ADMIN'),
  ('user_regular', 1003, 1, NULL, '일반사용자', '{bcrypt}$2a$10$Db1QciticSR6XTe.aSsSVe9Q/v08g22WhJG5C3xlHva7XSIGRWlAC', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-18T11:44:59.358Z', NULL, 'USER'),
  ('webmaster', 1052, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$jatOkRjK7.XPATU.Q4Kq1OpxzKQSNoVpBHWGFhCviaC8nA7vk4gfG', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-19T00:42:38.467Z', NULL, 'ADMIN'),
  ('user_regular', 1053, 1, NULL, '일반사용자', '{bcrypt}$2a$10$tH2l1pfbFeXvRjWzP2jtAudj4CSRSNRDSF0GE5gesk/kzM7FXeyWC', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-19T00:42:39.867Z', NULL, 'USER'),
  ('webmaster', 1102, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$wzhbpJXZtrxL5iSkDYInCeF3gGQz6XxalPz5N1VvsvOS27BwzRkoy', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-19T01:00:04.948Z', NULL, 'ADMIN'),
  ('user_regular', 1103, 1, NULL, '일반사용자', '{bcrypt}$2a$10$ZpsVdVOEY8j7UxewVOyRhuV0O.XNjU2Vg5FSqtapWT4scmHApWKou', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-19T01:00:06.391Z', NULL, 'USER'),
  ('webmaster', 1152, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$Fj6tu2cWkiYL.1Uf86b6luX3UExvIIR7399bfWJW5cGhuAIJIhEqm', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-19T01:08:12.150Z', NULL, 'ADMIN'),
  ('user_regular', 1153, 1, NULL, '일반사용자', '{bcrypt}$2a$10$WZP5KrSGpG9WJLmSHOaOBeLW7bKSb5/1whhHmZn2bgvU9T6aIlpQ2', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-19T01:08:13.554Z', NULL, 'USER'),
  ('webmaster', 1202, 1, 'ORGNZT_0000000000000', '관리자', '{bcrypt}$2a$10$w7oT8zi3T1nI8gcSKG01h.LAjbO1FJNjsohFsyymgCz9a7wrzm1ve', '20112060', NULL, 'F', '20111130                                                    ', '1566-2059', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', 'P01', '전자정부표준프레임워크센터', '2059', '02', '전자정부표준프레임워크센터', '100775', '1566-2059', '1566-2059', 'egovframesupport@gmail.com', '웹관리자', '1566', 'GROUP_00000000000000', '00000001                ', 'P', 'USRCNFRM_99999999999                                        ', '', '2025-12-28T16:39:41.020Z', 'N', '0', NULL, '2026-03-19T13:50:49.658Z', NULL, 'ADMIN'),
  ('user_regular', 1203, 1, NULL, '일반사용자', '{bcrypt}$2a$10$S7nxmcG8u.cuhFyJeV.WouRJ06qxSPeesGGhsvtWExEB82UnWnzE2', NULL, NULL, NULL, NULL, NULL, 'Seoul', 'P01', 'Hint Answer', '0000', '02', NULL, '000000', NULL, NULL, NULL, NULL, '0000', NULL, NULL, 'P', 'USRCNFRM_00000000002                                        ', NULL, '2026-03-13T02:46:17.404Z', 'N', '0', NULL, '2026-03-19T13:50:51.370Z', NULL, 'USER');

-- --------------------------------------------------------

-- Table: public.nemplyrscrtyestbs
CREATE TABLE IF NOT EXISTS public."nemplyrscrtyestbs" (
  "scrty_dtrmn_trget_id" character varying(20) NOT NULL,
  "mber_ty_code" character(5),
  "author_code" character varying(30) NOT NULL,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nemplyrscrtyestbs" IS 'NEMPLYRSCRTYESTBS';
COMMENT ON COLUMN public."nemplyrscrtyestbs"."scrty_dtrmn_trget_id" IS '보안일시잔존TRGET아이디';
COMMENT ON COLUMN public."nemplyrscrtyestbs"."mber_ty_code" IS '회원유형코드';
COMMENT ON COLUMN public."nemplyrscrtyestbs"."author_code" IS '권한코드';

INSERT INTO public."nemplyrscrtyestbs" ("scrty_dtrmn_trget_id", "mber_ty_code", "author_code", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('USRCNFRM_00000000001', 'USR01', 'ROLE_USER', NULL, NULL, NULL, NULL),
  ('USRCNFRM_00000000000', 'USR03', 'ROLE_USER', NULL, NULL, NULL, NULL),
  ('USRCNFRM_00000000002', NULL, 'ROLE_USER', NULL, NULL, NULL, NULL),
  ('USRCNFRM_99999999999', 'USR03', 'ROLE_ADMIN', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nentrprsmber
CREATE TABLE IF NOT EXISTS public."nentrprsmber" (
  "entrprs_mber_id" character varying(20) NOT NULL,
  "entrprs_se_code" character(8),
  "bizrno" character varying(10),
  "jurirno" character varying(13),
  "cmpny_nm" character varying(60) NOT NULL,
  "cxfc" character varying(50),
  "zip" character varying(6) NOT NULL,
  "adres" character varying(100) NOT NULL,
  "entrprs_middle_telno" character varying(4) NOT NULL,
  "fxnum" character varying(20),
  "induty_code" character(1),
  "applcnt_nm" character varying(50) NOT NULL,
  "applcnt_ihidnum" character varying(200),
  "sbscrb_de" timestamp without time zone,
  "entrprs_mber_sttus" character varying(15),
  "entrprs_mber_password" character varying(200),
  "entrprs_mber_password_hint" character varying(100) NOT NULL,
  "entrprs_mber_password_cnsr" character varying(100) NOT NULL,
  "group_id" character(20),
  "detail_adres" character varying(100),
  "entrprs_end_telno" character varying(4) NOT NULL,
  "area_no" character varying(4) NOT NULL,
  "applcnt_email_adres" character varying(50) NOT NULL,
  "esntl_id" character(20) NOT NULL,
  "lock_at" character(1),
  "lock_cnt" numeric,
  "lock_last_pnttm" timestamp without time zone,
  "chg_pwd_last_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nentrprsmber" IS 'NENTRPRSMBER';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_mber_id" IS '기업회원아이디';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_se_code" IS '기업구분코드';
COMMENT ON COLUMN public."nentrprsmber"."bizrno" IS 'BIZRNO';
COMMENT ON COLUMN public."nentrprsmber"."jurirno" IS 'JURIRNO';
COMMENT ON COLUMN public."nentrprsmber"."cmpny_nm" IS 'CMPNY명';
COMMENT ON COLUMN public."nentrprsmber"."cxfc" IS 'CXFC';
COMMENT ON COLUMN public."nentrprsmber"."zip" IS '우편번호';
COMMENT ON COLUMN public."nentrprsmber"."adres" IS '주소';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_middle_telno" IS '기업MIDDLE전화번호';
COMMENT ON COLUMN public."nentrprsmber"."fxnum" IS 'FXNUM';
COMMENT ON COLUMN public."nentrprsmber"."induty_code" IS 'INDUTY코드';
COMMENT ON COLUMN public."nentrprsmber"."applcnt_nm" IS '출원수명';
COMMENT ON COLUMN public."nentrprsmber"."applcnt_ihidnum" IS '출원수주민등록번호';
COMMENT ON COLUMN public."nentrprsmber"."sbscrb_de" IS 'SBSCRB일자';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_mber_sttus" IS '기업회원상태';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_mber_password" IS '기업회원비밀번호';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_mber_password_hint" IS '기업회원비밀번호힌트';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_mber_password_cnsr" IS '기업회원비밀번호답변';
COMMENT ON COLUMN public."nentrprsmber"."group_id" IS '그룹아이디';
COMMENT ON COLUMN public."nentrprsmber"."detail_adres" IS 'DETAIL주소';
COMMENT ON COLUMN public."nentrprsmber"."entrprs_end_telno" IS '기업종료전화번호';
COMMENT ON COLUMN public."nentrprsmber"."area_no" IS '지역번호';
COMMENT ON COLUMN public."nentrprsmber"."applcnt_email_adres" IS '출원수이메일주소';
COMMENT ON COLUMN public."nentrprsmber"."esntl_id" IS '필수아이디';
COMMENT ON COLUMN public."nentrprsmber"."lock_at" IS 'LOCK여부';
COMMENT ON COLUMN public."nentrprsmber"."lock_cnt" IS 'LOCK수';
COMMENT ON COLUMN public."nentrprsmber"."lock_last_pnttm" IS 'LOCK최종시점';
COMMENT ON COLUMN public."nentrprsmber"."chg_pwd_last_pnttm" IS '변경PWD최종시점';

INSERT INTO public."nentrprsmber" ("entrprs_mber_id", "entrprs_se_code", "bizrno", "jurirno", "cmpny_nm", "cxfc", "zip", "adres", "entrprs_middle_telno", "fxnum", "induty_code", "applcnt_nm", "applcnt_ihidnum", "sbscrb_de", "entrprs_mber_sttus", "entrprs_mber_password", "entrprs_mber_password_hint", "entrprs_mber_password_cnsr", "group_id", "detail_adres", "entrprs_end_telno", "area_no", "applcnt_email_adres", "esntl_id", "lock_at", "lock_cnt", "lock_last_pnttm", "chg_pwd_last_pnttm", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('ENTERPRISE', 'C0000001', '1008360001', '1000310000011', 'NIA', '이가브', '100775', '서울특별시 중구 청계천로 14 - 0 한국정보사회진흥원', '1566', '1566-2059', 'O', '관리자', NULL, '2025-12-28T16:39:41.022Z', 'P', 'c3OjO3zLDnA7H76K6HT9HGgMLhLpazgLihL5jcwt48s=', 'P01', '전자정부표준프레임워크센터', 'GROUP_00000000000000', '표준프레임워크센터', '2059', '02', 'egovframesupport@gmail.com', 'USRCNFRM_00000000002', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.neventinfo
CREATE TABLE IF NOT EXISTS public."neventinfo" (
  "event_id" character(20) NOT NULL,
  "bsns_year" character(4),
  "bsns_code" character varying(2),
  "event_cn" character varying(1000),
  "event_svc_bgnde" character(20),
  "svc_use_nmpr_co" numeric,
  "charger_nm" character varying(50),
  "prparetg_cn" character varying(2500),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "event_svc_endde" character(20),
  "event_ty_code" character(1),
  "event_confm_at" character(1),
  "event_confm_de" character(20)
);
COMMENT ON TABLE public."neventinfo" IS '행사정보';

-- --------------------------------------------------------

-- Table: public.nextrlhrinfo
CREATE TABLE IF NOT EXISTS public."nextrlhrinfo" (
  "event_id" character(20) NOT NULL,
  "extrl_hr_id" character(20) NOT NULL,
  "sexdstn_code" character(1),
  "extrl_hr_nm" character varying(60),
  "occp_ty_code" character(1),
  "psitn_instt_nm" character varying(100),
  "brthdy" character(20),
  "area_no" character varying(4),
  "middle_telno" character varying(4),
  "end_telno" character varying(4),
  "email_adres" character varying(50),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nextrlhrinfo" IS '외부인사정보';

-- --------------------------------------------------------

-- Table: public.nfaqinfo
CREATE TABLE IF NOT EXISTS public."nfaqinfo" (
  "faq_id" character(20) NOT NULL,
  "qestn_sj" character varying(255),
  "qestn_cn" character varying(2500),
  "answer_cn" character varying(2500),
  "rdcnt" numeric,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20) NOT NULL,
  "atch_file_id" character(20),
  "qna_process_sttus_code" character(1)
);
COMMENT ON TABLE public."nfaqinfo" IS 'NFAQINFO';
COMMENT ON COLUMN public."nfaqinfo"."faq_id" IS 'FAQ아이디';
COMMENT ON COLUMN public."nfaqinfo"."qestn_sj" IS 'QESTN제목';
COMMENT ON COLUMN public."nfaqinfo"."qestn_cn" IS 'QESTN내용';
COMMENT ON COLUMN public."nfaqinfo"."answer_cn" IS 'ANSWER내용';
COMMENT ON COLUMN public."nfaqinfo"."rdcnt" IS 'RDCNT';
COMMENT ON COLUMN public."nfaqinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nfaqinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nfaqinfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nfaqinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nfaqinfo"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."nfaqinfo"."qna_process_sttus_code" IS '질의응답PROCESS상태코드';

-- --------------------------------------------------------

-- Table: public.nfile
CREATE TABLE IF NOT EXISTS public."nfile" (
  "atch_file_id" character(20) NOT NULL,
  "creat_dt" timestamp without time zone NOT NULL,
  "use_at" character(1)
);
COMMENT ON TABLE public."nfile" IS 'NFILE';
COMMENT ON COLUMN public."nfile"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."nfile"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."nfile"."use_at" IS '사용여부';

-- --------------------------------------------------------

-- Table: public.nfiledetail
CREATE TABLE IF NOT EXISTS public."nfiledetail" (
  "atch_file_id" character(20) NOT NULL,
  "file_sn" numeric NOT NULL,
  "file_stre_cours" character varying(2000) NOT NULL,
  "stre_file_nm" character varying(255) NOT NULL,
  "orignl_file_nm" character varying(255),
  "file_extsn" character varying(20) NOT NULL,
  "file_cn" text,
  "file_size" numeric
);
COMMENT ON TABLE public."nfiledetail" IS 'NFILEDETAIL';
COMMENT ON COLUMN public."nfiledetail"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."nfiledetail"."file_sn" IS '파일일련번호';
COMMENT ON COLUMN public."nfiledetail"."file_stre_cours" IS '파일저장COURS';
COMMENT ON COLUMN public."nfiledetail"."stre_file_nm" IS '저장파일명';
COMMENT ON COLUMN public."nfiledetail"."orignl_file_nm" IS 'ORIGNL파일명';
COMMENT ON COLUMN public."nfiledetail"."file_extsn" IS '파일내선일련번호';
COMMENT ON COLUMN public."nfiledetail"."file_cn" IS '파일내용';
COMMENT ON COLUMN public."nfiledetail"."file_size" IS '파일SIZE';

-- --------------------------------------------------------

-- Table: public.nfilesysmntrngloginfo
CREATE TABLE IF NOT EXISTS public."nfilesysmntrngloginfo" (
  "file_sys_id" character(20) NOT NULL,
  "file_sys_nm" character varying(60) NOT NULL,
  "file_sys_manage_nm" character varying(255) NOT NULL,
  "file_sys_size" numeric NOT NULL,
  "file_sys_thrhld" numeric NOT NULL,
  "file_sys_usgqty" numeric,
  "mntrng_sttus" character(2),
  "log_info" character varying(2000),
  "creat_dt" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "log_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nfilesysmntrngloginfo" IS 'NFILESYSMNTRNGLOGINFO';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."file_sys_id" IS '파일시스템아이디';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."file_sys_nm" IS '파일시스템명';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."file_sys_manage_nm" IS '파일시스템MANAGE명';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."file_sys_size" IS '파일시스템SIZE';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."file_sys_thrhld" IS '파일시스템THRHLD';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."file_sys_usgqty" IS '파일시스템용도수량';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."mntrng_sttus" IS 'MNTRNG상태';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."log_info" IS '로그정보';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nfilesysmntrngloginfo"."log_id" IS '로그아이디';

-- --------------------------------------------------------

-- Table: public.nfxtrsmanage
CREATE TABLE IF NOT EXISTS public."nfxtrsmanage" (
  "fxtrs_code" character(14) NOT NULL,
  "fxtrs_nm" character varying(100) NOT NULL,
  "makr_nm" character varying(100),
  "price" numeric
);
COMMENT ON TABLE public."nfxtrsmanage" IS 'NFXTRSMANAGE';
COMMENT ON COLUMN public."nfxtrsmanage"."fxtrs_code" IS '비품코드';
COMMENT ON COLUMN public."nfxtrsmanage"."fxtrs_nm" IS '비품명';
COMMENT ON COLUMN public."nfxtrsmanage"."makr_nm" IS 'MAKR명';
COMMENT ON COLUMN public."nfxtrsmanage"."price" IS 'PRICE';

-- --------------------------------------------------------

-- Table: public.ngnrlmber
CREATE TABLE IF NOT EXISTS public."ngnrlmber" (
  "mber_id" character varying(20) NOT NULL,
  "password" character varying(200) NOT NULL,
  "password_hint" character varying(100),
  "password_cnsr" character varying(100),
  "ihidnum" character varying(200),
  "mber_nm" character varying(50) NOT NULL,
  "zip" character varying(6) NOT NULL,
  "adres" character varying(100) NOT NULL,
  "area_no" character varying(4) NOT NULL,
  "mber_sttus" character varying(15),
  "detail_adres" character varying(100),
  "end_telno" character varying(4) NOT NULL,
  "mbtlnum" character varying(20) NOT NULL,
  "group_id" character(20),
  "mber_fxnum" character varying(20),
  "mber_email_adres" character varying(50),
  "middle_telno" character varying(4) NOT NULL,
  "sbscrb_de" timestamp without time zone,
  "sexdstn_code" character(1),
  "esntl_id" character(20) NOT NULL,
  "lock_at" character(1),
  "lock_cnt" numeric,
  "lock_last_pnttm" timestamp without time zone,
  "chg_pwd_last_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ngnrlmber" IS 'NGNRLMBER';
COMMENT ON COLUMN public."ngnrlmber"."mber_id" IS '회원아이디';
COMMENT ON COLUMN public."ngnrlmber"."password" IS '비밀번호';
COMMENT ON COLUMN public."ngnrlmber"."password_hint" IS '비밀번호힌트';
COMMENT ON COLUMN public."ngnrlmber"."password_cnsr" IS '비밀번호답변';
COMMENT ON COLUMN public."ngnrlmber"."ihidnum" IS '주민등록번호';
COMMENT ON COLUMN public."ngnrlmber"."mber_nm" IS '회원명';
COMMENT ON COLUMN public."ngnrlmber"."zip" IS '우편번호';
COMMENT ON COLUMN public."ngnrlmber"."adres" IS '주소';
COMMENT ON COLUMN public."ngnrlmber"."area_no" IS '지역번호';
COMMENT ON COLUMN public."ngnrlmber"."mber_sttus" IS '회원상태';
COMMENT ON COLUMN public."ngnrlmber"."detail_adres" IS 'DETAIL주소';
COMMENT ON COLUMN public."ngnrlmber"."end_telno" IS '종료전화번호';
COMMENT ON COLUMN public."ngnrlmber"."mbtlnum" IS '휴대폰번호';
COMMENT ON COLUMN public."ngnrlmber"."group_id" IS '그룹아이디';
COMMENT ON COLUMN public."ngnrlmber"."mber_fxnum" IS '회원FXNUM';
COMMENT ON COLUMN public."ngnrlmber"."mber_email_adres" IS '회원이메일주소';
COMMENT ON COLUMN public."ngnrlmber"."middle_telno" IS 'MIDDLE전화번호';
COMMENT ON COLUMN public."ngnrlmber"."sbscrb_de" IS 'SBSCRB일자';
COMMENT ON COLUMN public."ngnrlmber"."sexdstn_code" IS 'SEXDSTN코드';
COMMENT ON COLUMN public."ngnrlmber"."esntl_id" IS '필수아이디';
COMMENT ON COLUMN public."ngnrlmber"."lock_at" IS 'LOCK여부';
COMMENT ON COLUMN public."ngnrlmber"."lock_cnt" IS 'LOCK수';
COMMENT ON COLUMN public."ngnrlmber"."lock_last_pnttm" IS 'LOCK최종시점';
COMMENT ON COLUMN public."ngnrlmber"."chg_pwd_last_pnttm" IS '변경PWD최종시점';

INSERT INTO public."ngnrlmber" ("mber_id", "password", "password_hint", "password_cnsr", "ihidnum", "mber_nm", "zip", "adres", "area_no", "mber_sttus", "detail_adres", "end_telno", "mbtlnum", "group_id", "mber_fxnum", "mber_email_adres", "middle_telno", "sbscrb_de", "sexdstn_code", "esntl_id", "lock_at", "lock_cnt", "lock_last_pnttm", "chg_pwd_last_pnttm", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('USER', 'p9ddPCJCWPhbI8pHFSs3VFoL/M4kkGa0owIFCGd136M=', 'P01', '전자정부표준프레임워크센터', NULL, '일반회원', '100775', '서울 중구 무교동 한국정보화진흥원', '02', 'P', '전자정부표준프레임워크센터', '2059', '1566-2059', 'GROUP_00000000000000', '1566-2059', 'egovframesupport@gmail.com', '1566', '2025-12-28T16:39:41.021Z', 'F', 'USRCNFRM_00000000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nhpcminfo
CREATE TABLE IF NOT EXISTS public."nhpcminfo" (
  "hpcm_id" character(20) NOT NULL,
  "hpcm_se_code" character(1),
  "hpcm_dfn" character varying(1000),
  "hpcm_dc" character varying(2500),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nhpcminfo" IS 'NHPCMINFO';
COMMENT ON COLUMN public."nhpcminfo"."hpcm_id" IS 'HPCM아이디';
COMMENT ON COLUMN public."nhpcminfo"."hpcm_se_code" IS 'HPCM구분코드';
COMMENT ON COLUMN public."nhpcminfo"."hpcm_dfn" IS 'HPCM정의';
COMMENT ON COLUMN public."nhpcminfo"."hpcm_dc" IS 'HPCM설명';
COMMENT ON COLUMN public."nhpcminfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nhpcminfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nhpcminfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nhpcminfo"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nindvdlinfopolicy
CREATE TABLE IF NOT EXISTS public."nindvdlinfopolicy" (
  "indvdl_info_policy_id" character(20) NOT NULL,
  "indvdl_info_policy_cn" character varying(2500),
  "indvdl_info_policy_agre_at" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "indvdl_info_policy_nm" character varying(255)
);
COMMENT ON TABLE public."nindvdlinfopolicy" IS 'NINDVDLINFOPOLICY';
COMMENT ON COLUMN public."nindvdlinfopolicy"."indvdl_info_policy_id" IS 'INDVDL정보POLICY아이디';
COMMENT ON COLUMN public."nindvdlinfopolicy"."indvdl_info_policy_cn" IS 'INDVDL정보POLICY내용';
COMMENT ON COLUMN public."nindvdlinfopolicy"."indvdl_info_policy_agre_at" IS 'INDVDL정보POLICY동의여부';
COMMENT ON COLUMN public."nindvdlinfopolicy"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nindvdlinfopolicy"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nindvdlinfopolicy"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nindvdlinfopolicy"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nindvdlinfopolicy"."indvdl_info_policy_nm" IS 'INDVDL정보POLICY명';

-- --------------------------------------------------------

-- Table: public.nindvdlpgecntnts
CREATE TABLE IF NOT EXISTS public."nindvdlpgecntnts" (
  "cntnts_id" character varying(20) NOT NULL,
  "cntnts_nm" character varying(100) NOT NULL,
  "cntc_url" character varying(255) NOT NULL,
  "cntnts_use_at" character(1) NOT NULL,
  "cntnts_link_url" character varying(1000),
  "cntnts_dc" character varying(250)
);
COMMENT ON TABLE public."nindvdlpgecntnts" IS 'NINDVDLPGECNTNTS';
COMMENT ON COLUMN public."nindvdlpgecntnts"."cntnts_id" IS 'CNTNTS아이디';
COMMENT ON COLUMN public."nindvdlpgecntnts"."cntnts_nm" IS 'CNTNTS명';
COMMENT ON COLUMN public."nindvdlpgecntnts"."cntc_url" IS '접촉URL';
COMMENT ON COLUMN public."nindvdlpgecntnts"."cntnts_use_at" IS 'CNTNTS사용여부';
COMMENT ON COLUMN public."nindvdlpgecntnts"."cntnts_link_url" IS 'CNTNTS연계URL';
COMMENT ON COLUMN public."nindvdlpgecntnts"."cntnts_dc" IS 'CNTNTS설명';

-- --------------------------------------------------------

-- Table: public.nindvdlpgeestbs
CREATE TABLE IF NOT EXISTS public."nindvdlpgeestbs" (
  "emplyr_id" character varying(20) NOT NULL,
  "upend_image" character varying(1024),
  "titlebar_color" character(7),
  "algn_mthd" character(1),
  "algn_co" numeric
);
COMMENT ON TABLE public."nindvdlpgeestbs" IS 'NINDVDLPGEESTBS';
COMMENT ON COLUMN public."nindvdlpgeestbs"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."nindvdlpgeestbs"."upend_image" IS '상단IMAGE';
COMMENT ON COLUMN public."nindvdlpgeestbs"."titlebar_color" IS 'TITLEBARCOLOR';
COMMENT ON COLUMN public."nindvdlpgeestbs"."algn_mthd" IS 'ALGN방법';
COMMENT ON COLUMN public."nindvdlpgeestbs"."algn_co" IS 'ALGN수';

-- --------------------------------------------------------

-- Table: public.ninfrmlsanctn
CREATE TABLE IF NOT EXISTS public."ninfrmlsanctn" (
  "infrml_sanctn_id" character(20) NOT NULL,
  "job_se_code" character(3) NOT NULL,
  "applcnt_id" character varying(20) NOT NULL,
  "reqst_de" character(20) NOT NULL,
  "sanctner_id" character varying(20) NOT NULL,
  "confm_at" character(1) NOT NULL,
  "sanctn_dt" timestamp without time zone,
  "return_resn" character varying(1000),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ninfrmlsanctn" IS 'NINFRMLSANCTN';
COMMENT ON COLUMN public."ninfrmlsanctn"."infrml_sanctn_id" IS '침해남성SANCTN아이디';
COMMENT ON COLUMN public."ninfrmlsanctn"."job_se_code" IS '작업구분코드';
COMMENT ON COLUMN public."ninfrmlsanctn"."applcnt_id" IS '출원수아이디';
COMMENT ON COLUMN public."ninfrmlsanctn"."reqst_de" IS 'REQST일자';
COMMENT ON COLUMN public."ninfrmlsanctn"."sanctner_id" IS 'SANCTNER아이디';
COMMENT ON COLUMN public."ninfrmlsanctn"."confm_at" IS 'CONFM여부';
COMMENT ON COLUMN public."ninfrmlsanctn"."sanctn_dt" IS 'SANCTN일시';
COMMENT ON COLUMN public."ninfrmlsanctn"."return_resn" IS 'RETURNRESN';
COMMENT ON COLUMN public."ninfrmlsanctn"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ninfrmlsanctn"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ninfrmlsanctn"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ninfrmlsanctn"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ninsttcode
CREATE TABLE IF NOT EXISTS public."ninsttcode" (
  "instt_code" character(7) NOT NULL,
  "all_instt_nm" character varying(255),
  "lowest_instt_nm" character varying(100),
  "instt_abrv_nm" character varying(50),
  "odr" character(1),
  "ord" character(3),
  "instt_odr" character(2),
  "upper_instt_code" character(7),
  "best_instt_code" character(7),
  "reprsnt_instt_code" character(7),
  "instt_ty_lclas" character varying(100),
  "instt_ty_mlsfc" character varying(100),
  "instt_ty_sclas" character varying(100),
  "telno" character varying(20),
  "fxnum" character varying(20),
  "creat_de" character(20),
  "abl_de" character(20),
  "abl_ennc" character(1),
  "change_de" character(20),
  "change_time" character varying(6),
  "bsis_de" character(20),
  "sort_ordr" numeric,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ninsttcode" IS 'NINSTTCODE';
COMMENT ON COLUMN public."ninsttcode"."instt_code" IS 'INSTT코드';
COMMENT ON COLUMN public."ninsttcode"."all_instt_nm" IS 'ALLINSTT명';
COMMENT ON COLUMN public."ninsttcode"."lowest_instt_nm" IS 'LOWESTINSTT명';
COMMENT ON COLUMN public."ninsttcode"."instt_abrv_nm" IS 'INSTTABRV명';
COMMENT ON COLUMN public."ninsttcode"."odr" IS '발주자';
COMMENT ON COLUMN public."ninsttcode"."ord" IS 'ORD';
COMMENT ON COLUMN public."ninsttcode"."instt_odr" IS 'INSTT발주자';
COMMENT ON COLUMN public."ninsttcode"."upper_instt_code" IS 'UPPERINSTT코드';
COMMENT ON COLUMN public."ninsttcode"."best_instt_code" IS 'BESTINSTT코드';
COMMENT ON COLUMN public."ninsttcode"."reprsnt_instt_code" IS 'REPRSNTINSTT코드';
COMMENT ON COLUMN public."ninsttcode"."instt_ty_lclas" IS 'INSTT유형LCLAS';
COMMENT ON COLUMN public."ninsttcode"."instt_ty_mlsfc" IS 'INSTT유형MLSFC';
COMMENT ON COLUMN public."ninsttcode"."instt_ty_sclas" IS 'INSTT유형SCLAS';
COMMENT ON COLUMN public."ninsttcode"."telno" IS '전화번호';
COMMENT ON COLUMN public."ninsttcode"."fxnum" IS 'FXNUM';
COMMENT ON COLUMN public."ninsttcode"."creat_de" IS 'CREAT일자';
COMMENT ON COLUMN public."ninsttcode"."abl_de" IS '폐지일자';
COMMENT ON COLUMN public."ninsttcode"."abl_ennc" IS '폐지ENNC';
COMMENT ON COLUMN public."ninsttcode"."change_de" IS 'CHANGE일자';
COMMENT ON COLUMN public."ninsttcode"."change_time" IS 'CHANGETIME';
COMMENT ON COLUMN public."ninsttcode"."bsis_de" IS 'BSIS일자';
COMMENT ON COLUMN public."ninsttcode"."sort_ordr" IS '정렬순서';
COMMENT ON COLUMN public."ninsttcode"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ninsttcode"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ninsttcode"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ninsttcode"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ninsttcoderecptnlog
CREATE TABLE IF NOT EXISTS public."ninsttcoderecptnlog" (
  "occrrnc_de" character(20) NOT NULL,
  "instt_code" character(7) NOT NULL,
  "opert_sn" numeric NOT NULL,
  "change_se_code" character varying(2),
  "process_se" character varying(2),
  "etc_code" character(2),
  "all_instt_nm" character varying(255),
  "lowest_instt_nm" character varying(100),
  "instt_abrv_nm" character varying(50),
  "odr" character(1),
  "ord" character(3),
  "instt_odr" character(2),
  "upper_instt_code" character(7),
  "best_instt_code" character(7),
  "reprsnt_instt_code" character(7),
  "instt_ty_lclas" character varying(100),
  "instt_ty_mlsfc" character varying(100),
  "instt_ty_sclas" character varying(100),
  "telno" character varying(20),
  "fxnum" character varying(20),
  "creat_de" character(20),
  "abl_de" character(20),
  "abl_ennc" character(1),
  "change_de" character(20),
  "change_time" character varying(6),
  "bsis_de" character(20),
  "sort_ordr" numeric,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ninsttcoderecptnlog" IS 'NINSTTCODERECPTNLOG';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."instt_code" IS 'INSTT코드';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."opert_sn" IS 'OPERT일련번호';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."change_se_code" IS 'CHANGE구분코드';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."process_se" IS 'PROCESS구분';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."etc_code" IS '기타코드';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."all_instt_nm" IS 'ALLINSTT명';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."lowest_instt_nm" IS 'LOWESTINSTT명';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."instt_abrv_nm" IS 'INSTTABRV명';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."odr" IS '발주자';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."ord" IS 'ORD';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."instt_odr" IS 'INSTT발주자';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."upper_instt_code" IS 'UPPERINSTT코드';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."best_instt_code" IS 'BESTINSTT코드';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."reprsnt_instt_code" IS 'REPRSNTINSTT코드';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."instt_ty_lclas" IS 'INSTT유형LCLAS';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."instt_ty_mlsfc" IS 'INSTT유형MLSFC';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."instt_ty_sclas" IS 'INSTT유형SCLAS';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."telno" IS '전화번호';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."fxnum" IS 'FXNUM';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."creat_de" IS 'CREAT일자';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."abl_de" IS '폐지일자';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."abl_ennc" IS '폐지ENNC';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."change_de" IS 'CHANGE일자';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."change_time" IS 'CHANGETIME';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."bsis_de" IS 'BSIS일자';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."sort_ordr" IS '정렬순서';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ninsttcoderecptnlog"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nintnetsvc
CREATE TABLE IF NOT EXISTS public."nintnetsvc" (
  "intnet_svc_id" character(20) NOT NULL,
  "intnet_svc_nm" character varying(20) NOT NULL,
  "intnet_svc_dc" character varying(200),
  "reflct_at" character(1) NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nintnetsvc" IS 'NINTNETSVC';
COMMENT ON COLUMN public."nintnetsvc"."intnet_svc_id" IS 'INTNET봉사아이디';
COMMENT ON COLUMN public."nintnetsvc"."intnet_svc_nm" IS 'INTNET봉사명';
COMMENT ON COLUMN public."nintnetsvc"."intnet_svc_dc" IS 'INTNET봉사설명';
COMMENT ON COLUMN public."nintnetsvc"."reflct_at" IS '반영여부';
COMMENT ON COLUMN public."nintnetsvc"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nintnetsvc"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nintnetsvc"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nintnetsvc"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nleaderschdul
CREATE TABLE IF NOT EXISTS public."nleaderschdul" (
  "schdul_id" character(20) NOT NULL,
  "schdul_se" character(1),
  "schdul_nm" character varying(255) NOT NULL,
  "schdul_cn" character varying(2500) NOT NULL,
  "schdul_place" character varying(255),
  "leader_id" character varying(20) NOT NULL,
  "reptit_se_code" character(1),
  "schdul_bgnde" character(20),
  "schdul_endde" character(20),
  "schdul_charger_id" character varying(20) NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nleaderschdul" IS 'NLEADERSCHDUL';
COMMENT ON COLUMN public."nleaderschdul"."schdul_id" IS 'SCHDUL아이디';
COMMENT ON COLUMN public."nleaderschdul"."schdul_se" IS 'SCHDUL구분';
COMMENT ON COLUMN public."nleaderschdul"."schdul_nm" IS 'SCHDUL명';
COMMENT ON COLUMN public."nleaderschdul"."schdul_cn" IS 'SCHDUL내용';
COMMENT ON COLUMN public."nleaderschdul"."schdul_place" IS 'SCHDULPLACE';
COMMENT ON COLUMN public."nleaderschdul"."leader_id" IS 'LEADER아이디';
COMMENT ON COLUMN public."nleaderschdul"."reptit_se_code" IS 'REPTIT구분코드';
COMMENT ON COLUMN public."nleaderschdul"."schdul_bgnde" IS 'SCHDUL시작일';
COMMENT ON COLUMN public."nleaderschdul"."schdul_endde" IS 'SCHDUL종료일';
COMMENT ON COLUMN public."nleaderschdul"."schdul_charger_id" IS 'SCHDULCHARGER아이디';
COMMENT ON COLUMN public."nleaderschdul"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nleaderschdul"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nleaderschdul"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nleaderschdul"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nleaderschdulde
CREATE TABLE IF NOT EXISTS public."nleaderschdulde" (
  "schdul_id" character(20) NOT NULL,
  "schdul_de" character(8) NOT NULL
);
COMMENT ON TABLE public."nleaderschdulde" IS 'NLEADERSCHDULDE';
COMMENT ON COLUMN public."nleaderschdulde"."schdul_id" IS 'SCHDUL아이디';
COMMENT ON COLUMN public."nleaderschdulde"."schdul_de" IS 'SCHDUL일자';

-- --------------------------------------------------------

-- Table: public.nleadersttus
CREATE TABLE IF NOT EXISTS public."nleadersttus" (
  "leader_id" character varying(20) NOT NULL,
  "leader_sttus" character(1) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nleadersttus" IS 'NLEADERSTTUS';
COMMENT ON COLUMN public."nleadersttus"."leader_id" IS 'LEADER아이디';
COMMENT ON COLUMN public."nleadersttus"."leader_sttus" IS 'LEADER상태';
COMMENT ON COLUMN public."nleadersttus"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nleadersttus"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nleadersttus"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nleadersttus"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nloginlog
CREATE TABLE IF NOT EXISTS public."nloginlog" (
  "log_id" character(20) NOT NULL,
  "conect_id" character varying(20),
  "conect_ip" character varying(23),
  "conect_mthd" character(4),
  "error_occrrnc_at" character(1),
  "error_code" character(3),
  "creat_dt" timestamp without time zone
);
COMMENT ON TABLE public."nloginlog" IS 'NLOGINLOG';
COMMENT ON COLUMN public."nloginlog"."log_id" IS '로그아이디';
COMMENT ON COLUMN public."nloginlog"."conect_id" IS 'CONECT아이디';
COMMENT ON COLUMN public."nloginlog"."conect_ip" IS 'CONECTIP';
COMMENT ON COLUMN public."nloginlog"."conect_mthd" IS 'CONECT방법';
COMMENT ON COLUMN public."nloginlog"."error_occrrnc_at" IS 'ERROROCCRRNC여부';
COMMENT ON COLUMN public."nloginlog"."error_code" IS 'ERROR코드';
COMMENT ON COLUMN public."nloginlog"."creat_dt" IS 'CREAT일시';

-- --------------------------------------------------------

-- Table: public.nloginpolicy
CREATE TABLE IF NOT EXISTS public."nloginpolicy" (
  "emplyr_id" character varying(20) NOT NULL,
  "ip_info" character varying(23) NOT NULL,
  "dplct_perm_at" character(1) NOT NULL,
  "lmtt_at" character(1) NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nloginpolicy" IS 'NLOGINPOLICY';
COMMENT ON COLUMN public."nloginpolicy"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."nloginpolicy"."ip_info" IS 'IP정보';
COMMENT ON COLUMN public."nloginpolicy"."dplct_perm_at" IS 'DPLCTPERM여부';
COMMENT ON COLUMN public."nloginpolicy"."lmtt_at" IS 'LMTT여부';
COMMENT ON COLUMN public."nloginpolicy"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nloginpolicy"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nloginpolicy"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nloginpolicy"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nmainimage
CREATE TABLE IF NOT EXISTS public."nmainimage" (
  "image_id" character(20) NOT NULL,
  "image_nm" character varying(20) NOT NULL,
  "image" character varying(60) NOT NULL,
  "image_dc" character varying(200),
  "reflct_at" character(1) NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "image_file" character varying(60)
);
COMMENT ON TABLE public."nmainimage" IS 'NMAINIMAGE';
COMMENT ON COLUMN public."nmainimage"."image_id" IS 'IMAGE아이디';
COMMENT ON COLUMN public."nmainimage"."image_nm" IS 'IMAGE명';
COMMENT ON COLUMN public."nmainimage"."image" IS 'IMAGE';
COMMENT ON COLUMN public."nmainimage"."image_dc" IS 'IMAGE설명';
COMMENT ON COLUMN public."nmainimage"."reflct_at" IS '반영여부';
COMMENT ON COLUMN public."nmainimage"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nmainimage"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nmainimage"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nmainimage"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nmainimage"."image_file" IS 'IMAGE파일';

-- --------------------------------------------------------

-- Table: public.nmemoreprt
CREATE TABLE IF NOT EXISTS public."nmemoreprt" (
  "reprt_sj" character varying(255) NOT NULL,
  "report_de" character(20) NOT NULL,
  "wrter_id" character varying(20) NOT NULL,
  "reportr_id" character varying(20) NOT NULL,
  "report_cn" character varying(2500) NOT NULL,
  "atch_file_id" character(20),
  "drct_matter" character varying(2500),
  "drct_matter_regist_dt" character varying(14),
  "reportr_inqire_dt" character varying(14),
  "frst_register_id" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "reprt_id" character(6) NOT NULL
);
COMMENT ON TABLE public."nmemoreprt" IS 'NMEMOREPRT';
COMMENT ON COLUMN public."nmemoreprt"."reprt_sj" IS 'REPRT제목';
COMMENT ON COLUMN public."nmemoreprt"."report_de" IS 'REPORT일자';
COMMENT ON COLUMN public."nmemoreprt"."wrter_id" IS 'WRTER아이디';
COMMENT ON COLUMN public."nmemoreprt"."reportr_id" IS 'REPORTR아이디';
COMMENT ON COLUMN public."nmemoreprt"."report_cn" IS 'REPORT내용';
COMMENT ON COLUMN public."nmemoreprt"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."nmemoreprt"."drct_matter" IS '직접MATTER';
COMMENT ON COLUMN public."nmemoreprt"."drct_matter_regist_dt" IS '직접MATTER등록일시';
COMMENT ON COLUMN public."nmemoreprt"."reportr_inqire_dt" IS 'REPORTRINQIRE일시';
COMMENT ON COLUMN public."nmemoreprt"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nmemoreprt"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nmemoreprt"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nmemoreprt"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nmemoreprt"."reprt_id" IS 'REPRT아이디';

-- --------------------------------------------------------

-- Table: public.nmemotodo
CREATE TABLE IF NOT EXISTS public."nmemotodo" (
  "todo_id" character(20) NOT NULL,
  "todo_sj" character varying(255) NOT NULL,
  "todo_begin_time" character varying(14) NOT NULL,
  "todo_end_time" character varying(14) NOT NULL,
  "wrter_id" character varying(20) NOT NULL,
  "todo_cn" character varying(2500) NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nmemotodo" IS 'NMEMOTODO';
COMMENT ON COLUMN public."nmemotodo"."todo_id" IS 'TODO아이디';
COMMENT ON COLUMN public."nmemotodo"."todo_sj" IS 'TODO제목';
COMMENT ON COLUMN public."nmemotodo"."todo_begin_time" IS 'TODOBEGINTIME';
COMMENT ON COLUMN public."nmemotodo"."todo_end_time" IS 'TODO종료TIME';
COMMENT ON COLUMN public."nmemotodo"."wrter_id" IS 'WRTER아이디';
COMMENT ON COLUMN public."nmemotodo"."todo_cn" IS 'TODO내용';
COMMENT ON COLUMN public."nmemotodo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nmemotodo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nmemotodo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nmemotodo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nmenucreatdtls
CREATE TABLE IF NOT EXISTS public."nmenucreatdtls" (
  "menu_no" numeric NOT NULL,
  "author_code" character varying(30) NOT NULL,
  "mapng_creat_id" character varying(30),
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nmenucreatdtls" IS 'NMENUCREATDTLS';
COMMENT ON COLUMN public."nmenucreatdtls"."menu_no" IS '메뉴번호';
COMMENT ON COLUMN public."nmenucreatdtls"."author_code" IS '권한코드';
COMMENT ON COLUMN public."nmenucreatdtls"."mapng_creat_id" IS 'MAPNGCREAT아이디';

INSERT INTO public."nmenucreatdtls" ("menu_no", "author_code", "mapng_creat_id", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('2070000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2030300', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010210', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010210', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1000000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1000000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2000000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2000000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9000000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1050000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1050000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1050100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1050100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9030200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010500', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('800000000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1010000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1020000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1030000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1040000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2020000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2030000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2040000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2050000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2060000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9030000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040000', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010300', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010400', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020300', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020310', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9030100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1010100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1010200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1020100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1020200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1020300', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1030100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1040100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('1040200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010300', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010400', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010500', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010600', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010700', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2010800', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2020100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2030100', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2030200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2030400', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('2030500', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010210', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020110', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020120', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020130', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020210', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020220', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020230', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020311', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020312', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9030110', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9030120', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040200', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040300', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040310', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040320', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040330', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9030130', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('800000000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1010000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1020000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1030000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1040000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2010000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2020000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2030000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2040000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2050000', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9010100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9010200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9010300', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9010400', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9020100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9020200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9020300', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9030100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1010100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1010200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1020100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1020200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1020300', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1030100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1040100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('1040200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2010200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2010700', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2010800', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2020100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2030100', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2030200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2030400', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('2030500', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9010220', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9010220', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9010230', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9020110', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9020130', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9020312', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9030110', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9030120', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9040101', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040101', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9040102', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040103', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040104', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040105', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040105', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9040106', 'ROLE_ADMIN', NULL, NULL, NULL, NULL, NULL),
  ('9040106', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL),
  ('9040200', 'ROLE_USER', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nmenuinfo
CREATE TABLE IF NOT EXISTS public."nmenuinfo" (
  "menu_nm" character varying(60) NOT NULL,
  "progrm_file_nm" character varying(60) NOT NULL,
  "menu_no" numeric NOT NULL,
  "upper_menu_no" numeric,
  "menu_ordr" numeric NOT NULL,
  "menu_dc" character varying(250),
  "relate_image_path" character varying(100),
  "relate_image_nm" character varying(60),
  "route_updated_at" timestamp without time zone,
  "modern_route" character varying(500),
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nmenuinfo" IS 'NMENUINFO';
COMMENT ON COLUMN public."nmenuinfo"."menu_nm" IS '메뉴명';
COMMENT ON COLUMN public."nmenuinfo"."progrm_file_nm" IS '프로그램파일명';
COMMENT ON COLUMN public."nmenuinfo"."menu_no" IS '메뉴번호';
COMMENT ON COLUMN public."nmenuinfo"."upper_menu_no" IS 'UPPER메뉴번호';
COMMENT ON COLUMN public."nmenuinfo"."menu_ordr" IS '메뉴순서';
COMMENT ON COLUMN public."nmenuinfo"."menu_dc" IS '메뉴설명';
COMMENT ON COLUMN public."nmenuinfo"."relate_image_path" IS 'RELATEIMAGE경로';
COMMENT ON COLUMN public."nmenuinfo"."relate_image_nm" IS 'RELATEIMAGE명';

INSERT INTO public."nmenuinfo" ("menu_nm", "progrm_file_nm", "menu_no", "upper_menu_no", "menu_ordr", "menu_dc", "relate_image_path", "relate_image_nm", "route_updated_at", "modern_route", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('통합 코드 관리 허브', 'dir', '9010100', '9010000', '1', '코드 통합', 'dir', 'dir', NULL, '/admin/system/common-code', NULL, NULL, NULL, NULL),
  ('온라인 매뉴얼 관리', 'listOnlineManual', '2050000', '2000000', '4', '온라인매뉴얼', '/', '/', NULL, '/admin/sanctn/forms', NULL, NULL, NULL, NULL),
  ('도움말', 'HpcmListInqire', '2040000', '2000000', '1', '도움말', '/', '/', NULL, '/admin/help/faq', NULL, NULL, NULL, NULL),
  ('FAQ관리', 'FaqListInqire', '2060000', '2000000', '2', 'FAQ관리', '/', '/', NULL, '/admin/help/faq', NULL, NULL, NULL, NULL),
  ('사용자지원', 'dir', '2030000', '2000000', '0', '사용자지원', '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('마이페이지관리', 'EgovIndvdlpgeCntntsList', '2030100', '2030000', '5', '마이페이지관리', '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('협업', 'dir', '2020000', '2000000', '1', '협업', '/', '/', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('스크랩 목록', 'selectScrapList', '2020100', '2020000', '4', '스크랩 목록', '/', '/', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('설문조사 및 투표 센터', 'dir', '2010000', '2000000', '7', '설문 통합', 'dir', 'dir', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('설문관리', 'EgovQustnrManageList', '2010100', '2010000', '20', '설문관리', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('설문조사', 'EgovQustnrRespondInfoManageList', '2010200', '2010000', '21', '설문조사', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('설문 결과 확인', 'dir', '2010210', '2010000', '210', NULL, 'dir', 'dir', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('설문템플릿관리', 'EgovQustnrTmplatManageList', '2010300', '2010000', '22', '설문템플릿관리', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('응답자관리', 'EgovQustnrRespondManageList', '2010400', '2010000', '23', '응답자관리', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('질문관리', 'EgovQustnrQestnManageList', '2010500', '2010000', '24', '질문관리', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('항목관리', 'EgovQustnrItemManageList', '2010600', '2010000', '25', '항목관리', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('그룹관리', 'EgovGroupList', '9020210', '9020200', '3', '그룹관리', '/', '/', NULL, '/admin/security/authorization', NULL, NULL, NULL, NULL),
  ('롤관리', 'EgovRoleList', '9020220', '9020200', '4', '롤관리', '/', '/', NULL, '/admin/security/roles', NULL, NULL, NULL, NULL),
  ('ROOT', 'dir', '800000000', '800000000', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('외부인사정보', 'EgovTnextrlHrInfoList', '2030200', '2030000', '33', '외부인사정보', '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('사용자부재관리', 'selectUserAbsnceListView', '2030500', '2030000', '43', '사용자부재관리', '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('통합 보안 및 접속 정책', 'dir', '9020100', '9020000', '1', '보안 통합', 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('데이터 비즈니스 인사이트', 'dir', '9040100', '9040000', '1', '통계 통합', 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('상담 관리 (Q&A)', 'CnsltAnswerListInqire', '2070000', '2000000', '3', '상담답변관리', '/', '/', NULL, '/admin/help/faq', NULL, NULL, NULL, NULL),
  ('포털 콘텐츠 및 UI 관리', 'dir', '9010300', '9010000', '3', 'UI자산 통합', 'dir', 'dir', NULL, '/admin/system/layout', NULL, NULL, NULL, NULL),
  ('정보알림이', 'selectNotificationList', '2030400', '2030000', '35', '정보알림이', '/', '/', NULL, '/admin/help/faq', NULL, NULL, NULL, NULL),
  ('🏢 워크스페이스', 'dir', '1000000', NULL, '1', '개인 및 팀 협업 공간', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('💬 커뮤니티 및 콘텐츠', 'dir', '2000000', NULL, '2', '소통 및 콘텐츠 관리', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('사용자 계정 및 권한 관리', 'dir', '9020200', '9020000', '2', '권한 통합', 'dir', 'dir', NULL, NULL, NULL, NULL, NULL, NULL),
  ('임직원 및 부서 관리', 'dir', '9020300', '9020000', '3', '인사 통합', 'dir', 'dir', NULL, NULL, NULL, NULL, NULL, NULL),
  ('⚙️ 시스템 관리 센터', 'dir', '9000000', NULL, '9', '대고민 및 서비스 운영', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('게시판 및 커뮤니티 관리', 'dir', '9030100', '9030000', '1', '설정 통합', 'dir', 'dir', NULL, '/admin/community/boards', NULL, NULL, NULL, NULL),
  ('포상관리', 'selectRwardManageList', '2030300', '2030000', '34', '포상관리', '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('결재 양식 관리', 'SanctnFormManage', '9030200', '9030000', '320', NULL, 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('통합 커뮤니케이션 센터', 'dir', '1020000', '1000000', '3', '발송 통합', 'dir', 'dir', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('문자메시지', 'selectSmsList', '1020100', '1020000', '6', '문자메시지', '/', '/', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('메일발송', 'insertSndngMailView', '1020200', '1020000', '11', '메일발송', '/', '/', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('쪽지함', 'listNoteTrnsmit', '1020300', '1020000', '51', '보낸쪽지함관리', '/', '/', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('발송메일내역', 'selectSndngMailList', '9040200', '9040000', '3', '발송메일내역', '/', '/', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('스마트 일정/일지 관리', 'dir', '1010000', '1000000', '2', '일정 통합', 'dir', 'dir', NULL, '/admin/work-hub', NULL, NULL, NULL, NULL),
  ('부서일정관리', 'EgovDeptSchdulManageList', '1010100', '1010000', '7', '부서일정관리', '/', '/', NULL, '/admin/work-hub', NULL, NULL, NULL, NULL),
  ('일정 관리', 'EgovIndvdlSchdulManageList', '1010200', '1010000', '8', '일정관리', '/', '/', NULL, '/admin/work-hub', NULL, NULL, NULL, NULL),
  ('업무 보고 및 보고함', 'dir', '1040000', '1000000', '5', '보고 통합', 'dir', 'dir', NULL, '/admin/work-hub', NULL, NULL, NULL, NULL),
  ('부서 업무 관리', 'selectDeptJobBxList', '1040100', '1040000', '17', '부서업무함관리', '/', '/', NULL, '/admin/work-hub', NULL, NULL, NULL, NULL),
  ('업무 보고 관리', 'selectWikMnthngReprtList', '1040200', '1040000', '19', '주간/월간보고관리', '/', '/', NULL, '/admin/work-hub', NULL, NULL, NULL, NULL),
  ('인맥 및 주소록 관리', 'dir', '1030000', '1000000', '4', '주소록 통합', 'dir', 'dir', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('주소록관리', 'selectAdbkList', '1030100', '1030000', '15', '주소록관리', '/', '/', NULL, '/admin/collaboration/mail-history', NULL, NULL, NULL, NULL),
  ('전자결재 및 문서 관리', 'dir', '1050000', '1000000', '500', NULL, 'dir', 'dir', NULL, '/admin/sanctn/forms', NULL, NULL, NULL, NULL),
  ('내 결재함 및 대시보드', 'ApprovalDashboard', '1050100', '1050000', '510', NULL, 'dir', 'dir', NULL, '/admin/sanctn/forms', NULL, NULL, NULL, NULL),
  ('워크플로우 프로세스 설정', 'WorkflowEngineManage', '9010500', '9010000', '150', NULL, 'dir', 'dir', NULL, '/admin/sanctn/forms', NULL, NULL, NULL, NULL),
  ('게시판사용정보', 'selectBBSUseInfs', '9030110', '9030100', '2', '게시판사용정보', '/', '/', NULL, '/admin/community/boards', NULL, NULL, NULL, NULL),
  ('템플릿관리', 'selectTemplateInfs', '9030120', '9030100', '3', '템플릿관리', '/', '/', NULL, '/admin/community/templates', NULL, NULL, NULL, NULL),
  ('부서권한관리', 'EgovDeptAuthorList', '9020230', '9020200', '5', '부서권한관리', '/', '/', NULL, '/admin/security/departments', NULL, NULL, NULL, NULL),
  ('로그인', 'egovLoginUsr', '9020110', '9020100', '1', '로그인', '/', '/', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('로그인정책관리', 'selectLoginPolicyList', '9020120', '9020100', '2', '로그인정책관리', '/', '/', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('개인정보보호정책확인', 'listIndvdlInfoPolicy', '9020130', '9020100', '8', '개인정보보호정책확인', '/', '/', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('배너 및 팝업 관리', 'selectBannerMainList', '9010400', '9010000', '6', 'MYPAGE배너관리', '', '', NULL, '/admin/system/layout', NULL, NULL, NULL, NULL),
  ('온라인poll관리', 'listOnlinePollManage', '2010700', '2010000', '27', '온라인poll관리', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('온라인poll참여', 'listOnlinePollPartcptn', '2010800', '2010000', '28', '온라인poll참여', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('댓글 및 평가 관리', 'CommentManage', '9030130', '9030100', '30', NULL, 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('감사 및 관찰성 관리', 'dir', '9040300', '9040000', '4', NULL, 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('보안 감사 로그', 'SecurityAudit', '9040310', '9040300', '10', NULL, 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('시스템 감사 로그', 'SystemAudit', '9040320', '9040300', '20', NULL, 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('시스템 상태 모니터링', 'SystemObservability', '9040330', '9040300', '30', NULL, 'dir', 'dir', NULL, '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('권한 및 그룹 관리', 'EgovAuthorList', '9020311', '9020310', '1', '권한관리', '/', '/', NULL, '/admin/security/authority', NULL, NULL, NULL, NULL),
  ('사용자 관리', 'EgovEntrprsMberManage', '9020310', '9020300', '1', '기업회원관리', '/', '/', NULL, '/admin/user/manage', NULL, NULL, NULL, NULL),
  ('부서관리', 'selectDeptManageListView', '9020312', '9020310', '3', '부서관리', '/', '/', NULL, '/admin/user/departments', NULL, NULL, NULL, NULL),
  ('접속통계', 'selectConectStats', '9040103', '9040100', '3', '접속통계', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('메뉴 구성 및 프로그램 설정', 'dir', '9010200', '9010000', '2', '메뉴 구성 통합', 'dir', 'dir', NULL, '/admin/system/menus', NULL, NULL, NULL, NULL),
  ('시스템 기반 설정', 'dir', '9010000', '9000000', '1', NULL, '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('메뉴 관리', 'EgovMenuListSelect', '9010210', '9010200', '13', '메뉴리스트관리', '/', '/', NULL, '/admin/system/menus', NULL, NULL, NULL, NULL),
  ('메뉴생성관리', 'EgovMenuCreatManageSelect', '9010220', '9010200', '15', '메뉴생성관리', '/', '/', NULL, '/admin/system/menus/by-authority', NULL, NULL, NULL, NULL),
  ('프로그램 관리', 'EgovProgramListManageSelect', '9010230', '9010200', '18', '프로그램관리', '/', '/', NULL, '/admin/system/programs', NULL, NULL, NULL, NULL),
  ('계정 및 권한 관리', 'dir', '9020000', '9000000', '2', NULL, '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('서비스 운영 관리', 'dir', '9030000', '9000000', '3', NULL, '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('감사 및 통계 모니터링', 'dir', '9040000', '9000000', '4', NULL, '/', '/', NULL, NULL, NULL, NULL, NULL, NULL),
  ('게시물통계', 'selectBbsStats', '9040101', '9040100', '1', '게시물통계', '/', '/', NULL, '/admin/stats/board', NULL, NULL, NULL, NULL),
  ('사용자통계', 'selectUserStats', '9040102', '9040100', '2', '사용자통계', '/', '/', NULL, '/admin/stats/user', NULL, NULL, NULL, NULL),
  ('화면통계', 'selectScrinStats', '9040104', '9040100', '4', '화면통계', '/', '/', NULL, '/admin/stats/screen', NULL, NULL, NULL, NULL),
  ('보고서통계', 'selectReprtStatsListView', '9040105', '9040100', '5', '보고서통계', '/', '/', NULL, '/admin/stats/report', NULL, NULL, NULL, NULL),
  ('자료이용현황통계', 'selectDtaUseStatsList', '9040106', '9040100', '6', '자료이용현황통계', '/', '/', NULL, '/admin/stats/data-usage', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nmtgplacefxtrs
CREATE TABLE IF NOT EXISTS public."nmtgplacefxtrs" (
  "mtgrum_id" character(20) NOT NULL,
  "fxtrs_code" character(14) NOT NULL,
  "qy" numeric NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nmtgplacefxtrs" IS 'NMTGPLACEFXTRS';
COMMENT ON COLUMN public."nmtgplacefxtrs"."mtgrum_id" IS 'MTGRUM아이디';
COMMENT ON COLUMN public."nmtgplacefxtrs"."fxtrs_code" IS '비품코드';
COMMENT ON COLUMN public."nmtgplacefxtrs"."qy" IS 'QY';
COMMENT ON COLUMN public."nmtgplacefxtrs"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nmtgplacefxtrs"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nmtgplacefxtrs"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nmtgplacefxtrs"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nnote
CREATE TABLE IF NOT EXISTS public."nnote" (
  "note_id" character(20) NOT NULL,
  "note_sj" character varying(255),
  "note_cn" character varying(4000),
  "atch_file_id" character(20),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nnote" IS 'NNOTE';
COMMENT ON COLUMN public."nnote"."note_id" IS '쪽지아이디';
COMMENT ON COLUMN public."nnote"."note_sj" IS '쪽지제목';
COMMENT ON COLUMN public."nnote"."note_cn" IS '쪽지내용';
COMMENT ON COLUMN public."nnote"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."nnote"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nnote"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nnote"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nnote"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nnoterecptn
CREATE TABLE IF NOT EXISTS public."nnoterecptn" (
  "note_id" character(20) NOT NULL,
  "note_trnsmit_id" character(20) NOT NULL,
  "note_recptn_id" character(20) NOT NULL,
  "rcver_id" character(20),
  "open_yn" character(1),
  "recptn_se" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nnoterecptn" IS 'NNOTERECPTN';
COMMENT ON COLUMN public."nnoterecptn"."note_id" IS '쪽지아이디';
COMMENT ON COLUMN public."nnoterecptn"."note_trnsmit_id" IS '쪽지TRNSMIT아이디';
COMMENT ON COLUMN public."nnoterecptn"."note_recptn_id" IS '쪽지RECPTN아이디';
COMMENT ON COLUMN public."nnoterecptn"."rcver_id" IS '수화자아이디';
COMMENT ON COLUMN public."nnoterecptn"."open_yn" IS '개봉여부';
COMMENT ON COLUMN public."nnoterecptn"."recptn_se" IS 'RECPTN구분';
COMMENT ON COLUMN public."nnoterecptn"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nnoterecptn"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nnoterecptn"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nnoterecptn"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nnotetrnsmit
CREATE TABLE IF NOT EXISTS public."nnotetrnsmit" (
  "note_id" character(20) NOT NULL,
  "note_trnsmit_id" character(20) NOT NULL,
  "trnsmiter_id" character(20),
  "delete_at" character(8),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nnotetrnsmit" IS 'NNOTETRNSMIT';
COMMENT ON COLUMN public."nnotetrnsmit"."note_id" IS '쪽지아이디';
COMMENT ON COLUMN public."nnotetrnsmit"."note_trnsmit_id" IS '쪽지TRNSMIT아이디';
COMMENT ON COLUMN public."nnotetrnsmit"."trnsmiter_id" IS 'TRNSMITER아이디';
COMMENT ON COLUMN public."nnotetrnsmit"."delete_at" IS 'DELETE여부';
COMMENT ON COLUMN public."nnotetrnsmit"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nnotetrnsmit"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nnotetrnsmit"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nnotetrnsmit"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nntfcinfo
CREATE TABLE IF NOT EXISTS public."nntfcinfo" (
  "ntcn_no" numeric NOT NULL,
  "ntcn_sj" character varying(60) NOT NULL,
  "ntcn_cn" character varying(100) NOT NULL,
  "ntcn_tm" character varying(14) NOT NULL,
  "bh_ntcn_intrvl" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nntfcinfo" IS 'NNTFCINFO';
COMMENT ON COLUMN public."nntfcinfo"."ntcn_no" IS 'NTCN번호';
COMMENT ON COLUMN public."nntfcinfo"."ntcn_sj" IS 'NTCN제목';
COMMENT ON COLUMN public."nntfcinfo"."ntcn_cn" IS 'NTCN내용';
COMMENT ON COLUMN public."nntfcinfo"."ntcn_tm" IS 'NTCN시각';
COMMENT ON COLUMN public."nntfcinfo"."bh_ntcn_intrvl" IS 'BHNTCN도입값';
COMMENT ON COLUMN public."nntfcinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nntfcinfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nntfcinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nntfcinfo"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nnttstats
CREATE TABLE IF NOT EXISTS public."nnttstats" (
  "stats_id" character(18) NOT NULL,
  "ntce_co" numeric,
  "avrg_rdcnt" numeric,
  "top_rdcnt" numeric,
  "mumm_rdcnt" numeric,
  "top_ntcr_id" character varying(20)
);
COMMENT ON TABLE public."nnttstats" IS 'NNTTSTATS';
COMMENT ON COLUMN public."nnttstats"."stats_id" IS '통계아이디';
COMMENT ON COLUMN public."nnttstats"."ntce_co" IS '공지수';
COMMENT ON COLUMN public."nnttstats"."avrg_rdcnt" IS 'AVRGRDCNT';
COMMENT ON COLUMN public."nnttstats"."top_rdcnt" IS 'TOPRDCNT';
COMMENT ON COLUMN public."nnttstats"."mumm_rdcnt" IS 'MUMMRDCNT';
COMMENT ON COLUMN public."nnttstats"."top_ntcr_id" IS 'TOPNTCR아이디';

-- --------------------------------------------------------

-- Table: public.nntwrkinfo
CREATE TABLE IF NOT EXISTS public."nntwrkinfo" (
  "ntwrk_id" character(20) NOT NULL,
  "ntwrk_ip" character varying(23),
  "gtwy" character varying(23),
  "subnet" character varying(23),
  "domn_nm_server" character varying(23),
  "manage_iem" character(2),
  "user_nm" character varying(60),
  "use_at" character(1),
  "rgsde" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nntwrkinfo" IS 'NNTWRKINFO';
COMMENT ON COLUMN public."nntwrkinfo"."ntwrk_id" IS 'NTWRK아이디';
COMMENT ON COLUMN public."nntwrkinfo"."ntwrk_ip" IS 'NTWRKIP';
COMMENT ON COLUMN public."nntwrkinfo"."gtwy" IS 'GTWY';
COMMENT ON COLUMN public."nntwrkinfo"."subnet" IS 'SUBNET';
COMMENT ON COLUMN public."nntwrkinfo"."domn_nm_server" IS 'DOMN명SERVER';
COMMENT ON COLUMN public."nntwrkinfo"."manage_iem" IS 'MANAGEIEM';
COMMENT ON COLUMN public."nntwrkinfo"."user_nm" IS '사용자명';
COMMENT ON COLUMN public."nntwrkinfo"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nntwrkinfo"."rgsde" IS 'RGSDE';
COMMENT ON COLUMN public."nntwrkinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nntwrkinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nntwrkinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nntwrkinfo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nntwrksvcmntrngloginfo
CREATE TABLE IF NOT EXISTS public."nntwrksvcmntrngloginfo" (
  "sys_ip" character varying(23) NOT NULL,
  "sys_port" numeric NOT NULL,
  "sys_nm" character varying(255) NOT NULL,
  "mntrng_sttus" character(2),
  "log_info" character varying(2000),
  "creat_dt" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone NOT NULL,
  "log_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nntwrksvcmntrngloginfo" IS 'NNTWRKSVCMNTRNGLOGINFO';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."sys_ip" IS '시스템IP';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."sys_port" IS '시스템포트';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."sys_nm" IS '시스템명';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."mntrng_sttus" IS 'MNTRNG상태';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."log_info" IS '로그정보';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nntwrksvcmntrngloginfo"."log_id" IS '로그아이디';

-- --------------------------------------------------------

-- Table: public.nonlinemanual
CREATE TABLE IF NOT EXISTS public."nonlinemanual" (
  "online_mnl_id" character(20) NOT NULL,
  "online_mnl_se_code" character(3),
  "online_mnl_dfn" text,
  "online_mnl_dc" text,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "online_mnl_nm" character varying(255)
);
COMMENT ON TABLE public."nonlinemanual" IS 'NONLINEMANUAL';
COMMENT ON COLUMN public."nonlinemanual"."online_mnl_id" IS 'ONLINE매뉴얼아이디';
COMMENT ON COLUMN public."nonlinemanual"."online_mnl_se_code" IS 'ONLINE매뉴얼구분코드';
COMMENT ON COLUMN public."nonlinemanual"."online_mnl_dfn" IS 'ONLINE매뉴얼정의';
COMMENT ON COLUMN public."nonlinemanual"."online_mnl_dc" IS 'ONLINE매뉴얼설명';
COMMENT ON COLUMN public."nonlinemanual"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nonlinemanual"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nonlinemanual"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nonlinemanual"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nonlinemanual"."online_mnl_nm" IS 'ONLINE매뉴얼명';

-- --------------------------------------------------------

-- Table: public.nonlinepolliem
CREATE TABLE IF NOT EXISTS public."nonlinepolliem" (
  "poll_iem_nm" character varying(255),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "poll_iem_id" character(20) NOT NULL,
  "poll_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nonlinepolliem" IS 'NONLINEPOLLIEM';
COMMENT ON COLUMN public."nonlinepolliem"."poll_iem_nm" IS 'POLLIEM명';
COMMENT ON COLUMN public."nonlinepolliem"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nonlinepolliem"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nonlinepolliem"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nonlinepolliem"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nonlinepolliem"."poll_iem_id" IS 'POLLIEM아이디';
COMMENT ON COLUMN public."nonlinepolliem"."poll_id" IS 'POLL아이디';

-- --------------------------------------------------------

-- Table: public.nonlinepollmanage
CREATE TABLE IF NOT EXISTS public."nonlinepollmanage" (
  "poll_id" character(20) NOT NULL,
  "poll_nm" character varying(255),
  "poll_bgnde" character(10),
  "poll_endde" character(10),
  "poll_knd" character(3),
  "poll_dsuse_ennc" character(1),
  "poll_atmc_dsuse_ennc" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nonlinepollmanage" IS 'NONLINEPOLLMANAGE';
COMMENT ON COLUMN public."nonlinepollmanage"."poll_id" IS 'POLL아이디';
COMMENT ON COLUMN public."nonlinepollmanage"."poll_nm" IS 'POLL명';
COMMENT ON COLUMN public."nonlinepollmanage"."poll_bgnde" IS 'POLL시작일';
COMMENT ON COLUMN public."nonlinepollmanage"."poll_endde" IS 'POLL종료일';
COMMENT ON COLUMN public."nonlinepollmanage"."poll_knd" IS 'POLL종류';
COMMENT ON COLUMN public."nonlinepollmanage"."poll_dsuse_ennc" IS 'POLLDSUSEENNC';
COMMENT ON COLUMN public."nonlinepollmanage"."poll_atmc_dsuse_ennc" IS 'POLLATMCDSUSEENNC';
COMMENT ON COLUMN public."nonlinepollmanage"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nonlinepollmanage"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nonlinepollmanage"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nonlinepollmanage"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nonlinepollresult
CREATE TABLE IF NOT EXISTS public."nonlinepollresult" (
  "poll_result_id" character(20) NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "poll_iem_id" character(20) NOT NULL,
  "poll_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nonlinepollresult" IS 'NONLINEPOLLRESULT';
COMMENT ON COLUMN public."nonlinepollresult"."poll_result_id" IS 'POLLRESULT아이디';
COMMENT ON COLUMN public."nonlinepollresult"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nonlinepollresult"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nonlinepollresult"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nonlinepollresult"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nonlinepollresult"."poll_iem_id" IS 'POLLIEM아이디';
COMMENT ON COLUMN public."nonlinepollresult"."poll_id" IS 'POLL아이디';

-- --------------------------------------------------------

-- Table: public.norgnztinfo
CREATE TABLE IF NOT EXISTS public."norgnztinfo" (
  "orgnzt_id" character(20) NOT NULL,
  "orgnzt_nm" character varying(20) NOT NULL,
  "orgnzt_dc" character varying(100),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."norgnztinfo" IS 'NORGNZTINFO';
COMMENT ON COLUMN public."norgnztinfo"."orgnzt_id" IS '조직아이디';
COMMENT ON COLUMN public."norgnztinfo"."orgnzt_nm" IS '조직명';
COMMENT ON COLUMN public."norgnztinfo"."orgnzt_dc" IS '조직설명';

INSERT INTO public."norgnztinfo" ("orgnzt_id", "orgnzt_nm", "orgnzt_dc", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id") VALUES
  ('ORGNZT_0000000000000', '기본조직', '기본조직', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.npopupmanage
CREATE TABLE IF NOT EXISTS public."npopupmanage" (
  "popup_id" character varying(20) NOT NULL,
  "popup_sj_nm" character varying(1024),
  "file_url" character varying(1024),
  "popup_width_lc" character varying(20),
  "popup_width_size" numeric,
  "ntce_bgnde" character(20),
  "ntce_endde" character(20),
  "stopvew_setup_at" character(1),
  "ntce_at" character(1),
  "popup_vrticl_lc" character varying(20),
  "popup_vrticl_size" numeric,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."npopupmanage" IS 'NPOPUPMANAGE';
COMMENT ON COLUMN public."npopupmanage"."popup_id" IS '팝업아이디';
COMMENT ON COLUMN public."npopupmanage"."popup_sj_nm" IS '팝업제목명';
COMMENT ON COLUMN public."npopupmanage"."file_url" IS '파일URL';
COMMENT ON COLUMN public."npopupmanage"."popup_width_lc" IS '팝업가로위치';
COMMENT ON COLUMN public."npopupmanage"."popup_width_size" IS '팝업가로SIZE';
COMMENT ON COLUMN public."npopupmanage"."ntce_bgnde" IS '공지시작일';
COMMENT ON COLUMN public."npopupmanage"."ntce_endde" IS '공지종료일';
COMMENT ON COLUMN public."npopupmanage"."stopvew_setup_at" IS 'STOPVEWSETUP여부';
COMMENT ON COLUMN public."npopupmanage"."ntce_at" IS '공지여부';
COMMENT ON COLUMN public."npopupmanage"."popup_vrticl_lc" IS '팝업세로위치';
COMMENT ON COLUMN public."npopupmanage"."popup_vrticl_size" IS '팝업세로SIZE';
COMMENT ON COLUMN public."npopupmanage"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."npopupmanage"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."npopupmanage"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."npopupmanage"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nprivacylog
CREATE TABLE IF NOT EXISTS public."nprivacylog" (
  "requst_id" character varying(20) NOT NULL,
  "inqire_dt" timestamp without time zone NOT NULL,
  "srvc_nm" character varying(500),
  "inqire_info" character varying(100),
  "rqester_id" character varying(20),
  "rqester_ip" character varying(23)
);
COMMENT ON TABLE public."nprivacylog" IS 'NPRIVACYLOG';
COMMENT ON COLUMN public."nprivacylog"."requst_id" IS 'REQUST아이디';
COMMENT ON COLUMN public."nprivacylog"."inqire_dt" IS 'INQIRE일시';
COMMENT ON COLUMN public."nprivacylog"."srvc_nm" IS '서비스명';
COMMENT ON COLUMN public."nprivacylog"."inqire_info" IS 'INQIRE정보';
COMMENT ON COLUMN public."nprivacylog"."rqester_id" IS 'RQESTER아이디';
COMMENT ON COLUMN public."nprivacylog"."rqester_ip" IS 'RQESTERIP';

-- --------------------------------------------------------

-- Table: public.nprocessmonloginfo
CREATE TABLE IF NOT EXISTS public."nprocessmonloginfo" (
  "procs_id" character(20) NOT NULL,
  "procs_nm" character varying(60),
  "procs_sttus" character varying(3),
  "creat_dt" timestamp without time zone,
  "log_info" character varying(2000),
  "mngr_nm" character varying(60),
  "mngr_email_adres" character varying(50),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "log_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nprocessmonloginfo" IS 'NPROCESSMONLOGINFO';
COMMENT ON COLUMN public."nprocessmonloginfo"."procs_id" IS '공정아이디';
COMMENT ON COLUMN public."nprocessmonloginfo"."procs_nm" IS '공정명';
COMMENT ON COLUMN public."nprocessmonloginfo"."procs_sttus" IS '공정상태';
COMMENT ON COLUMN public."nprocessmonloginfo"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."nprocessmonloginfo"."log_info" IS '로그정보';
COMMENT ON COLUMN public."nprocessmonloginfo"."mngr_nm" IS '관리자명';
COMMENT ON COLUMN public."nprocessmonloginfo"."mngr_email_adres" IS '관리자이메일주소';
COMMENT ON COLUMN public."nprocessmonloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nprocessmonloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nprocessmonloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nprocessmonloginfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nprocessmonloginfo"."log_id" IS '로그아이디';

-- --------------------------------------------------------

-- Table: public.nprogrmlist
CREATE TABLE IF NOT EXISTS public."nprogrmlist" (
  "progrm_file_nm" character varying(60) NOT NULL,
  "progrm_stre_path" character varying(100) NOT NULL,
  "progrm_korean_nm" character varying(60),
  "progrm_dc" character varying(200),
  "url" character varying(100) NOT NULL,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nprogrmlist" IS '프로그램목록';
COMMENT ON COLUMN public."nprogrmlist"."progrm_file_nm" IS '프로그램파일명';
COMMENT ON COLUMN public."nprogrmlist"."progrm_stre_path" IS '프로그램저장경로';
COMMENT ON COLUMN public."nprogrmlist"."progrm_korean_nm" IS '프로그램KOREAN명';
COMMENT ON COLUMN public."nprogrmlist"."progrm_dc" IS '프로그램설명';
COMMENT ON COLUMN public."nprogrmlist"."url" IS 'URL';

INSERT INTO public."nprogrmlist" ("progrm_file_nm", "progrm_stre_path", "progrm_korean_nm", "progrm_dc", "url", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('ApprovalDashboard', '/approvals/', '내 결재함 및 대시보드', '신규 전자결재 대시보드', '/approvals', NULL, NULL, NULL, NULL),
  ('SanctnFormManage', '/admin/sanctn/forms/', '결재 양식 관리', '결재 양식 관리', '/admin/sanctn/forms', NULL, NULL, NULL, NULL),
  ('dir', 'dir', '디렉토리', '디렉토리', 'dir', NULL, NULL, NULL, NULL),
  ('WorkflowEngineManage', '/admin/workflow/', '워크플로우 프로세스 설정', '워크플로우 프로세스 설정', '/admin/workflow', NULL, NULL, NULL, NULL),
  ('EgovGroupList', '/sec/gmt/', '그룹관리', '그룹관리', '/admin/security/group', NULL, NULL, NULL, NULL),
  ('EgovDeptAuthorList', '/sec/drm/', '부서권한관리', '부서권한관리', '/admin/security/dept-authority', NULL, NULL, NULL, NULL),
  ('EgovEntrprsMberManage', '/uss/umt/', '기업회원관리', '기업회원관리', '/admin/user/manage', NULL, NULL, NULL, NULL),
  ('FaqListInqire', '/uss/olh/faq/', 'FAQ관리', 'FAQ관리', '/admin/help/faq', NULL, NULL, NULL, NULL),
  ('EgovCcmCmmnClCodeList', '/sym/ccm/ccc/', '공통분류코드', '공통분류코드', '/admin/system/common-code', NULL, NULL, NULL, NULL),
  ('EgovIndvdlpgeCntntsList', '/uss/mpe/', '마이페이지관리', '마이페이지관리', '/mypage', NULL, NULL, NULL, NULL),
  ('EgovMenuCreatManageSelect', '/sym/mnu/mcm/', '메뉴생성관리', '메뉴생성관리', '/admin/system/menus/by-authority', NULL, NULL, NULL, NULL),
  ('EgovDeptSchdulManageList', '/cop/smt/sdm/', '부서일정관리', '부서일정관리', '/admin/collaboration', NULL, NULL, NULL, NULL),
  ('EgovIndvdlSchdulManageList', '/cop/smt/sim/', '일정관리', '일정관리', '/admin/collaboration', NULL, NULL, NULL, NULL),
  ('EgovCcmAdministCodeList', '/sym/ccm/adc/', '행정코드관리', '행정코드관리', '/admin/system/common-code/groups', NULL, NULL, NULL, NULL),
  ('SecurityAudit', '/admin/security/audit', '보안 감사 로그', '보안 감사 로그', '/admin/security/audit', NULL, NULL, NULL, NULL),
  ('SystemAudit', '/admin/system/audit', '시스템 감사 로그', '시스템 감사 로그', '/admin/system/audit', NULL, NULL, NULL, NULL),
  ('SystemObservability', '/admin/observability', '시스템 상태 모니터링', '시스템 상태 모니터링', '/admin/observability', NULL, NULL, NULL, NULL),
  ('CommentManage', '/admin/system/comments', '댓글 및 평가 관리', '댓글 및 평가 관리', '/admin/system/comments', NULL, NULL, NULL, NULL),
  ('listRequestOffer', '/dam/spe/req/', '지식정보제공', '지식정보제공', '/admin/knowledge/request-offer', NULL, NULL, NULL, NULL),
  ('selectBbsStats', '/sts/bst/', '게시물통계', '게시물통계', '/admin/stats/bbs-stats', NULL, NULL, NULL, NULL),
  ('selectDtaUseStatsList', '/sts/dst/', '자료이용현황통계', '자료이용현황통계', '/admin/stats/dta-use-stats', NULL, NULL, NULL, NULL),
  ('getInsttCodeRecptnList', '/sym/ccm/icr/', '기관코드수신', '기관코드수신', '/admin/system/instt-code-recptn', NULL, NULL, NULL, NULL),
  ('selectBkmkMenuManageList', '/sym/mnu/bmm/', '바로가기메뉴관리', '바로가기메뉴관리', '/admin/system/bkmk-menu', NULL, NULL, NULL, NULL),
  ('listIndvdlInfoPolicy', '/uss/sam/ipm/', '개인정보보호정책확인', '개인정보보호정책확인', '/admin/user/indvdl-info-policy', NULL, NULL, NULL, NULL),
  ('selectDeptManageListView', '/uss/umt/dpt/', '부서관리', '부서관리', '/admin/user/dept-manage', NULL, NULL, NULL, NULL),
  ('HpcmListInqire', '/uss/olh/hpc/', '도움말', '도움말', '/help', NULL, NULL, NULL, NULL),
  ('insertSndngMailView', '/cop/ems/', '메일발송', '메일발송', '/admin/collaboration', NULL, NULL, NULL, NULL),
  ('selectDeptJobBxList', '/cop/smt/djm/', '부서업무함관리', '부서업무함관리', '/admin/collaboration', NULL, NULL, NULL, NULL),
  ('loginSessionView', '/utl/sys/rsc/', '로그인세션정보체크', '로그인세션정보체크', '/admin/system/logs/login', NULL, NULL, NULL, NULL),
  ('SelectLoginLogList', '/sym/log/clg/', '접속로그관리', '접속로그관리', '/admin/system/logs/login', NULL, NULL, NULL, NULL),
  ('selectLoginPolicyList', '/uat/uap/', '로그인정책관리', '로그인정책관리', '/admin/user/manage', NULL, NULL, NULL, NULL),
  ('selectConectStats', '/sts/cst/', '접속통계', '접속통계', '/admin/stats/user', NULL, NULL, NULL, NULL),
  ('QnaListInqire', '/uss/olh/qna/', 'Q&amp;A관리', 'Q&amp;A관리', '/admin/help/qna', NULL, NULL, NULL, NULL),
  ('selectAnnvrsryMainList', '/uss/ion/ans/', '기념일목록(확인용)', '기념일목록(확인용)', '/uss/ion/anniversaries', NULL, NULL, NULL, NULL),
  ('selectAnnvrsryManageList', '/uss/ion/ans/', '기념일관리', '기념일관리', '/uss/ion/anniversaries', NULL, NULL, NULL, NULL),
  ('EgovProgramListManageSelect', '/sym/prm/', '프로그램관리', '프로그램관리', '/admin/system/programs', NULL, NULL, NULL, NULL),
  ('selectProxySvcList', '/utl/sys/pxy/', '프록시서비스', '프록시서비스', '/admin/system/monitoring', NULL, NULL, NULL, NULL),
  ('EgovAuthorList', '/sec/ram/', '권한관리', '권한관리', '/admin/security/authority', NULL, NULL, NULL, NULL),
  ('EgovRoleList', '/sec/rmt/', '롤관리', '롤관리', '/admin/security/role', NULL, NULL, NULL, NULL),
  ('CnsltAnswerListInqire', '/uss/olh/cnm/', '상담답변관리', '상담답변관리 프로그램', '/uss/olh/cnm/CnsltAnswerListInqire.do', NULL, NULL, NULL, NULL),
  ('selectUserStats', '/sts/ust/', '사용자통계', '사용자통계', '/admin/stats/user', NULL, NULL, NULL, NULL),
  ('selectUserAbsnceListView', '/uss/ion/uas/', '사용자부재관리', '사용자부재관리', '/uss/ion/user-absences', NULL, NULL, NULL, NULL),
  ('EgovTnextrlHrInfoList', '/uss/ion/ecc/', '외부인사정보', '외부인사정보', '/admin/uss/ion/external-hr', NULL, NULL, NULL, NULL),
  ('egovLoginUsr', '/uat/uia/', '로그인', '로그인', '/login', NULL, NULL, NULL, NULL),
  ('EgovQustnrItemManageList', '/uss/olp/qim/', '항목관리', '항목관리', '/admin/survey/manage', NULL, NULL, NULL, NULL),
  ('EgovQustnrManageList', '/uss/olp/qmc/', '설문관리', '설문관리', '/admin/survey/manage', NULL, NULL, NULL, NULL),
  ('EgovQustnrQestnManageList', '/uss/olp/qqm/', '질문관리', '질문관리', '/admin/survey/manage', NULL, NULL, NULL, NULL),
  ('EgovQustnrRespondInfoManageList', '/uss/olp/qnn/', '설문조사', '설문조사', '/admin/survey/manage', NULL, NULL, NULL, NULL),
  ('EgovQustnrRespondManageList', '/uss/olp/qrm/', '응답자관리', '응답자관리', '/admin/survey/manage', NULL, NULL, NULL, NULL),
  ('EgovQustnrTmplatManageList', '/uss/olp/qtm/', '설문템플릿관리', '설문템플릿관리', '/admin/survey/manage', NULL, NULL, NULL, NULL),
  ('selectScrinStats', '/sts/sst/', '화면통계', '화면통계', '/admin/stats/screen', NULL, NULL, NULL, NULL),
  ('selectReprtStatsListView', '/sts/rst/', '보고서통계', '보고서통계', '/admin/stats', NULL, NULL, NULL, NULL),
  ('selectSndngMailList', '/cop/ems/', '발송메일내역', '발송메일내역', '/admin/collaboration', NULL, NULL, NULL, NULL),
  ('listNoteTrnsmit', '/uss/ion/nts/', '보낸쪽지함관리', '보낸쪽지함관리', '/admin/uss/ion/note', NULL, NULL, NULL, NULL),
  ('listOnlineManual', '/uss/olh/omm/', '온라인매뉴얼', '온라인매뉴얼', '/admin/uss/olh/online-manual', NULL, NULL, NULL, NULL),
  ('listOnlinePollManage', '/uss/olp/opm/', '온라인poll관리', '온라인poll관리', '/admin/uss/olp/online-poll', NULL, NULL, NULL, NULL),
  ('listOnlinePollPartcptn', '/uss/olp/opp/', '온라인poll참여', '온라인poll참여', '/admin/uss/olp/online-poll', NULL, NULL, NULL, NULL),
  ('QnaAnswerListInqire', '/uss/olh/qnm/', 'Q&amp;A답변관리', 'Q&amp;A답변관리', '/admin/uss/olh/qna-answer', NULL, NULL, NULL, NULL),
  ('selectBBSUseInfs', '/cop/com/', '게시판사용정보', '게시판사용정보', '/cop/com/selectBBSUseInfs', NULL, NULL, NULL, NULL),
  ('selectIntnetSvcGuidanceList', '/uss/ion/isg/', '인터넷서비스안내및관리', '인터넷서비스안내및관리', '/admin/uss/ion/internet-service', NULL, NULL, NULL, NULL),
  ('selectScrapList', '/cop/scp/', '스크랩 목록', '스크랩 목록', '/cop/scp/selectScrapList', NULL, NULL, NULL, NULL),
  ('selectSmsList', '/cop/sms/', '문자메시지', '문자메시지', '/cop/sms/selectSmsList', NULL, NULL, NULL, NULL),
  ('selectTemplateInfs', '/cop/tpl/', '템플릿관리', '템플릿관리', '/cop/tpl/selectTemplateList', NULL, NULL, NULL, NULL),
  ('selectWikMnthngReprtList', '/cop/smt/wmr/', '주간/월간보고관리', '주간/월간보고관리', '/cop/smt/wmr/selectReportList', NULL, NULL, NULL, NULL),
  ('selectAdbkList', '/cop/adb/', '주소록관리', '주소록관리', '/admin/collaboration', NULL, NULL, NULL, NULL),
  ('selectNotificationList', '/uss/ion/noi/', '정보알림이', '정보알림이', '/admin/notifications', NULL, NULL, NULL, NULL),
  ('selectRwardManageList', '/uss/ion/rwd/', '포상관리', '포상관리', '/admin/system/reward', NULL, NULL, NULL, NULL),
  ('SelectSysLogList', '/sym/log/lgm/', '로그관리', '로그관리', '/admin/system/logs/system', NULL, NULL, NULL, NULL),
  ('SelectTrsmrcvLogList', '/sym/log/tlg/', '송/수신로그관리', '송/수신로그관리', '/admin/system/logs/transfer', NULL, NULL, NULL, NULL),
  ('SelectUserLogList', '/sym/log/ulg/', '사용로그관리', '사용로그관리', '/admin/system/logs/user', NULL, NULL, NULL, NULL),
  ('SelectWebLogList', '/sym/log/wlg/', '웹로그관리', '웹로그관리', '/admin/system/logs/web', NULL, NULL, NULL, NULL),
  ('EgovMenuListSelect', '/sym/mnu/mpm/', '메뉴리스트관리', '메뉴리스트관리', '/admin/system/menus', NULL, NULL, NULL, NULL),
  ('selectBannerMainList', '/uss/ion/bnr/', 'MYPAGE배너관리', 'MYPAGE배너관리', '/admin/system/banner', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nproxyinfo
CREATE TABLE IF NOT EXISTS public."nproxyinfo" (
  "proxy_id" character(20) NOT NULL,
  "proxy_nm" character varying(60),
  "proxy_ip" character varying(23),
  "proxy_port" character varying(10),
  "trget_svc_nm" character varying(255),
  "svc_dc" character varying(2000),
  "svc_ip" character varying(23),
  "svc_port" character varying(10),
  "svc_sttus" character(2),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nproxyinfo" IS 'NPROXYINFO';
COMMENT ON COLUMN public."nproxyinfo"."proxy_id" IS 'PROXY아이디';
COMMENT ON COLUMN public."nproxyinfo"."proxy_nm" IS 'PROXY명';
COMMENT ON COLUMN public."nproxyinfo"."proxy_ip" IS 'PROXYIP';
COMMENT ON COLUMN public."nproxyinfo"."proxy_port" IS 'PROXY포트';
COMMENT ON COLUMN public."nproxyinfo"."trget_svc_nm" IS 'TRGET봉사명';
COMMENT ON COLUMN public."nproxyinfo"."svc_dc" IS '봉사설명';
COMMENT ON COLUMN public."nproxyinfo"."svc_ip" IS '봉사IP';
COMMENT ON COLUMN public."nproxyinfo"."svc_port" IS '봉사포트';
COMMENT ON COLUMN public."nproxyinfo"."svc_sttus" IS '봉사상태';
COMMENT ON COLUMN public."nproxyinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nproxyinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nproxyinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nproxyinfo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nproxyloginfo
CREATE TABLE IF NOT EXISTS public."nproxyloginfo" (
  "proxy_id" character(20) NOT NULL,
  "clnt_ip" character varying(23),
  "clnt_port" character varying(10),
  "conect_time" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "log_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nproxyloginfo" IS 'NPROXYLOGINFO';
COMMENT ON COLUMN public."nproxyloginfo"."proxy_id" IS 'PROXY아이디';
COMMENT ON COLUMN public."nproxyloginfo"."clnt_ip" IS '클라이언트IP';
COMMENT ON COLUMN public."nproxyloginfo"."clnt_port" IS '클라이언트포트';
COMMENT ON COLUMN public."nproxyloginfo"."conect_time" IS 'CONECTTIME';
COMMENT ON COLUMN public."nproxyloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nproxyloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nproxyloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nproxyloginfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nproxyloginfo"."log_id" IS '로그아이디';

-- --------------------------------------------------------

-- Table: public.nqainfo
CREATE TABLE IF NOT EXISTS public."nqainfo" (
  "qa_id" character(20) NOT NULL,
  "qestn_sj" character varying(255),
  "qestn_cn" character varying(2500),
  "writng_de" character(20),
  "rdcnt" numeric,
  "email_adres" character varying(50),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "qna_process_sttus_code" character(1),
  "wrter_nm" character varying(20),
  "answer_cn" character varying(2500),
  "writng_password" character varying(20),
  "answer_de" character(20),
  "email_answer_at" character(1),
  "area_no" character varying(4),
  "middle_telno" character varying(4),
  "end_telno" character varying(4)
);
COMMENT ON TABLE public."nqainfo" IS 'NQAINFO';
COMMENT ON COLUMN public."nqainfo"."qa_id" IS '질의응답아이디';
COMMENT ON COLUMN public."nqainfo"."qestn_sj" IS 'QESTN제목';
COMMENT ON COLUMN public."nqainfo"."qestn_cn" IS 'QESTN내용';
COMMENT ON COLUMN public."nqainfo"."writng_de" IS 'WRITNG일자';
COMMENT ON COLUMN public."nqainfo"."rdcnt" IS 'RDCNT';
COMMENT ON COLUMN public."nqainfo"."email_adres" IS '이메일주소';
COMMENT ON COLUMN public."nqainfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nqainfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nqainfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nqainfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nqainfo"."qna_process_sttus_code" IS '질의응답PROCESS상태코드';
COMMENT ON COLUMN public."nqainfo"."wrter_nm" IS 'WRTER명';
COMMENT ON COLUMN public."nqainfo"."answer_cn" IS 'ANSWER내용';
COMMENT ON COLUMN public."nqainfo"."writng_password" IS 'WRITNG비밀번호';
COMMENT ON COLUMN public."nqainfo"."answer_de" IS 'ANSWER일자';
COMMENT ON COLUMN public."nqainfo"."email_answer_at" IS '이메일ANSWER여부';
COMMENT ON COLUMN public."nqainfo"."area_no" IS '지역번호';
COMMENT ON COLUMN public."nqainfo"."middle_telno" IS 'MIDDLE전화번호';
COMMENT ON COLUMN public."nqainfo"."end_telno" IS '종료전화번호';

-- --------------------------------------------------------

-- Table: public.nqestnrinfo
CREATE TABLE IF NOT EXISTS public."nqestnrinfo" (
  "qustnr_tmplat_id" character(20) NOT NULL,
  "qestnr_id" character(20) NOT NULL,
  "qustnr_sj" character varying(255),
  "qustnr_purps" character varying(1000),
  "qustnr_writng_guidance_cn" character varying(2000),
  "qustnr_trget" character varying(1000),
  "qustnr_bgnde" character(20),
  "qustnr_endde" character(20),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nqestnrinfo" IS 'NQESTNRINFO';
COMMENT ON COLUMN public."nqestnrinfo"."qustnr_tmplat_id" IS '설문템플릿아이디';
COMMENT ON COLUMN public."nqestnrinfo"."qestnr_id" IS '설문아이디';
COMMENT ON COLUMN public."nqestnrinfo"."qustnr_sj" IS '설문제목';
COMMENT ON COLUMN public."nqestnrinfo"."qustnr_purps" IS '설문PURPS';
COMMENT ON COLUMN public."nqestnrinfo"."qustnr_writng_guidance_cn" IS '설문WRITNGGUIDANCE내용';
COMMENT ON COLUMN public."nqestnrinfo"."qustnr_trget" IS '설문TRGET';
COMMENT ON COLUMN public."nqestnrinfo"."qustnr_bgnde" IS '설문시작일';
COMMENT ON COLUMN public."nqestnrinfo"."qustnr_endde" IS '설문종료일';
COMMENT ON COLUMN public."nqestnrinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nqestnrinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nqestnrinfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nqestnrinfo"."last_updusr_id" IS '최종수정자아이디';

INSERT INTO public."nqestnrinfo" ("qustnr_tmplat_id", "qestnr_id", "qustnr_sj", "qustnr_purps", "qustnr_writng_guidance_cn", "qustnr_trget", "qustnr_bgnde", "qustnr_endde", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id") VALUES
  ('TMPLAT_0000000000001', 'QESTNR_0000000000001', '2025년 직원 만족도 조사', '직원들의 근무 환경 만족도를 조사합니다.', '솔직하게 답변해 주시기 바랍니다.', '전 직원', '2025-01-01          ', '2025-12-31          ', '2025-12-28T16:39:41.363Z', 'USER', '2025-12-28T16:39:41.363Z', 'USER');

-- --------------------------------------------------------

-- Table: public.nqustnriem
CREATE TABLE IF NOT EXISTS public."nqustnriem" (
  "qustnr_tmplat_id" character(20) NOT NULL,
  "qestnr_id" character(20) NOT NULL,
  "qustnr_qesitm_id" character(20) NOT NULL,
  "qustnr_iem_id" character varying(20) NOT NULL,
  "iem_sn" numeric,
  "iem_cn" character varying(1000),
  "etc_answer_at" character(1),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nqustnriem" IS 'NQUSTNRIEM';
COMMENT ON COLUMN public."nqustnriem"."qustnr_tmplat_id" IS '설문템플릿아이디';
COMMENT ON COLUMN public."nqustnriem"."qestnr_id" IS '설문아이디';
COMMENT ON COLUMN public."nqustnriem"."qustnr_qesitm_id" IS '설문QESITM아이디';
COMMENT ON COLUMN public."nqustnriem"."qustnr_iem_id" IS '설문IEM아이디';
COMMENT ON COLUMN public."nqustnriem"."iem_sn" IS 'IEM일련번호';
COMMENT ON COLUMN public."nqustnriem"."iem_cn" IS 'IEM내용';
COMMENT ON COLUMN public."nqustnriem"."etc_answer_at" IS '기타ANSWER여부';
COMMENT ON COLUMN public."nqustnriem"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nqustnriem"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nqustnriem"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nqustnriem"."last_updusr_id" IS '최종수정자아이디';

INSERT INTO public."nqustnriem" ("qustnr_tmplat_id", "qestnr_id", "qustnr_qesitm_id", "qustnr_iem_id", "iem_sn", "iem_cn", "etc_answer_at", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id") VALUES
  ('TMPLAT_0000000000001', 'QESTNR_0000000000001', 'QESITM_0000000000001', 'IEM_0000000000000001', '1', '매우 만족', NULL, '2025-12-28T16:39:41.366Z', 'USER', '2025-12-28T16:39:41.366Z', 'USER'),
  ('TMPLAT_0000000000001', 'QESTNR_0000000000001', 'QESITM_0000000000001', 'IEM_0000000000000002', '2', '만족', NULL, '2025-12-28T16:39:41.368Z', 'USER', '2025-12-28T16:39:41.368Z', 'USER'),
  ('TMPLAT_0000000000001', 'QESTNR_0000000000001', 'QESITM_0000000000001', 'IEM_0000000000000003', '3', '보통', NULL, '2025-12-28T16:39:41.369Z', 'USER', '2025-12-28T16:39:41.369Z', 'USER'),
  ('TMPLAT_0000000000001', 'QESTNR_0000000000001', 'QESITM_0000000000001', 'IEM_0000000000000004', '4', '불만족', NULL, '2025-12-28T16:39:41.370Z', 'USER', '2025-12-28T16:39:41.370Z', 'USER');

-- --------------------------------------------------------

-- Table: public.nqustnrqesitm
CREATE TABLE IF NOT EXISTS public."nqustnrqesitm" (
  "qestnr_id" character(20) NOT NULL,
  "qustnr_qesitm_id" character(20) NOT NULL,
  "qustnr_tmplat_id" character(20) NOT NULL,
  "qestn_sn" numeric,
  "qestn_ty_code" character(1),
  "qestn_cn" character varying(2500),
  "mxmm_choise_co" numeric,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20) NOT NULL
);
COMMENT ON TABLE public."nqustnrqesitm" IS 'NQUSTNRQESITM';
COMMENT ON COLUMN public."nqustnrqesitm"."qestnr_id" IS '설문아이디';
COMMENT ON COLUMN public."nqustnrqesitm"."qustnr_qesitm_id" IS '설문QESITM아이디';
COMMENT ON COLUMN public."nqustnrqesitm"."qustnr_tmplat_id" IS '설문템플릿아이디';
COMMENT ON COLUMN public."nqustnrqesitm"."qestn_sn" IS 'QESTN일련번호';
COMMENT ON COLUMN public."nqustnrqesitm"."qestn_ty_code" IS 'QESTN유형코드';
COMMENT ON COLUMN public."nqustnrqesitm"."qestn_cn" IS 'QESTN내용';
COMMENT ON COLUMN public."nqustnrqesitm"."mxmm_choise_co" IS 'MXMMCHOISE수';
COMMENT ON COLUMN public."nqustnrqesitm"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nqustnrqesitm"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nqustnrqesitm"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nqustnrqesitm"."last_updusr_id" IS '최종수정자아이디';

INSERT INTO public."nqustnrqesitm" ("qestnr_id", "qustnr_qesitm_id", "qustnr_tmplat_id", "qestn_sn", "qestn_ty_code", "qestn_cn", "mxmm_choise_co", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id") VALUES
  ('QESTNR_0000000000001', 'QESITM_0000000000001', 'TMPLAT_0000000000001', '1', '1', '현재 근무 환경에 만족하십니까?', '1', '2025-12-28T16:39:41.364Z', 'USER', '2025-12-28T16:39:41.364Z', 'USER'),
  ('QESTNR_0000000000001', 'QESITM_0000000000002', 'TMPLAT_0000000000001', '2', '2', '개선이 필요한 점을 자유롭게 기술해 주세요.', '1', '2025-12-28T16:39:41.365Z', 'USER', '2025-12-28T16:39:41.365Z', 'USER');

-- --------------------------------------------------------

-- Table: public.nqustnrrespondinfo
CREATE TABLE IF NOT EXISTS public."nqustnrrespondinfo" (
  "qustnr_tmplat_id" character(20) NOT NULL,
  "qestnr_id" character(20) NOT NULL,
  "qustnr_respond_id" character(20) NOT NULL,
  "sexdstn_code" character(1),
  "occp_ty_code" character(1),
  "respond_nm" character varying(50),
  "brthdy" character(20),
  "area_no" character varying(4),
  "middle_telno" character varying(4),
  "end_telno" character varying(4),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nqustnrrespondinfo" IS 'NQUSTNRRESPONDINFO';
COMMENT ON COLUMN public."nqustnrrespondinfo"."qustnr_tmplat_id" IS '설문템플릿아이디';
COMMENT ON COLUMN public."nqustnrrespondinfo"."qestnr_id" IS '설문아이디';
COMMENT ON COLUMN public."nqustnrrespondinfo"."qustnr_respond_id" IS '설문응답아이디';
COMMENT ON COLUMN public."nqustnrrespondinfo"."sexdstn_code" IS 'SEXDSTN코드';
COMMENT ON COLUMN public."nqustnrrespondinfo"."occp_ty_code" IS 'OCCP유형코드';
COMMENT ON COLUMN public."nqustnrrespondinfo"."respond_nm" IS '응답명';
COMMENT ON COLUMN public."nqustnrrespondinfo"."brthdy" IS '생년월일';
COMMENT ON COLUMN public."nqustnrrespondinfo"."area_no" IS '지역번호';
COMMENT ON COLUMN public."nqustnrrespondinfo"."middle_telno" IS 'MIDDLE전화번호';
COMMENT ON COLUMN public."nqustnrrespondinfo"."end_telno" IS '종료전화번호';
COMMENT ON COLUMN public."nqustnrrespondinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nqustnrrespondinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nqustnrrespondinfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nqustnrrespondinfo"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nqustnrrspnsresult
CREATE TABLE IF NOT EXISTS public."nqustnrrspnsresult" (
  "qustnr_rspns_result_id" character(20) NOT NULL,
  "qestnr_id" character(20) NOT NULL,
  "qustnr_qesitm_id" character(20) NOT NULL,
  "qustnr_tmplat_id" character(20) NOT NULL,
  "respond_answer_cn" character varying(1000),
  "etc_answer_cn" character varying(1000),
  "respond_nm" character varying(50),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "qustnr_iem_id" character varying(20)
);
COMMENT ON TABLE public."nqustnrrspnsresult" IS 'NQUSTNRRSPNSRESULT';
COMMENT ON COLUMN public."nqustnrrspnsresult"."qustnr_rspns_result_id" IS '설문응답RESULT아이디';
COMMENT ON COLUMN public."nqustnrrspnsresult"."qestnr_id" IS '설문아이디';
COMMENT ON COLUMN public."nqustnrrspnsresult"."qustnr_qesitm_id" IS '설문QESITM아이디';
COMMENT ON COLUMN public."nqustnrrspnsresult"."qustnr_tmplat_id" IS '설문템플릿아이디';
COMMENT ON COLUMN public."nqustnrrspnsresult"."respond_answer_cn" IS '응답ANSWER내용';
COMMENT ON COLUMN public."nqustnrrspnsresult"."etc_answer_cn" IS '기타ANSWER내용';
COMMENT ON COLUMN public."nqustnrrspnsresult"."respond_nm" IS '응답명';
COMMENT ON COLUMN public."nqustnrrspnsresult"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nqustnrrspnsresult"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nqustnrrspnsresult"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nqustnrrspnsresult"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nqustnrrspnsresult"."qustnr_iem_id" IS '설문IEM아이디';

INSERT INTO public."nqustnrrspnsresult" ("qustnr_rspns_result_id", "qestnr_id", "qustnr_qesitm_id", "qustnr_tmplat_id", "respond_answer_cn", "etc_answer_cn", "respond_nm", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id", "qustnr_iem_id") VALUES
  ('RESULT_0000000000001', 'QESTNR_0000000000001', 'QESITM_0000000000001', 'TMPLAT_0000000000001', '1', NULL, '홍길동', '2025-12-28T16:39:41.371Z', 'USER', '2025-12-28T16:39:41.371Z', 'USER', 'IEM_0000000000000001'),
  ('RESULT_0000000000002', 'QESTNR_0000000000001', 'QESITM_0000000000002', 'TMPLAT_0000000000001', '휴게 공간이 더 필요합니다.', NULL, '홍길동', '2025-12-28T16:39:41.373Z', 'USER', '2025-12-28T16:39:41.373Z', 'USER', NULL);

-- --------------------------------------------------------

-- Table: public.nqustnrtmplat
CREATE TABLE IF NOT EXISTS public."nqustnrtmplat" (
  "qustnr_tmplat_id" character(20) NOT NULL,
  "qustnr_tmplat_ty" character varying(100),
  "qustnr_tmplat_dc" character varying(2000),
  "qustnr_tmplat_path_nm" character varying(100),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "qustnr_tmplat_image_info" bytea
);
COMMENT ON TABLE public."nqustnrtmplat" IS 'NQUSTNRTMPLAT';
COMMENT ON COLUMN public."nqustnrtmplat"."qustnr_tmplat_id" IS '설문템플릿아이디';
COMMENT ON COLUMN public."nqustnrtmplat"."qustnr_tmplat_ty" IS '설문템플릿유형';
COMMENT ON COLUMN public."nqustnrtmplat"."qustnr_tmplat_dc" IS '설문템플릿설명';
COMMENT ON COLUMN public."nqustnrtmplat"."qustnr_tmplat_path_nm" IS '설문템플릿경로명';
COMMENT ON COLUMN public."nqustnrtmplat"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nqustnrtmplat"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nqustnrtmplat"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nqustnrtmplat"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nqustnrtmplat"."qustnr_tmplat_image_info" IS '설문템플릿IMAGE정보';

INSERT INTO public."nqustnrtmplat" ("qustnr_tmplat_id", "qustnr_tmplat_ty", "qustnr_tmplat_dc", "qustnr_tmplat_path_nm", "frst_regist_pnttm", "frst_register_id", "last_updt_pnttm", "last_updusr_id", "qustnr_tmplat_image_info") VALUES
  ('TMPLAT_0000000000001', '기본설문', '기본 설문 템플릿입니다.', '/WEB-INF/jsp/egovframework/com/uss/olp/qri/template/template01.jsp', '2025-12-28T16:39:41.361Z', 'USER', '2025-12-28T16:39:41.361Z', 'USER', NULL);

-- --------------------------------------------------------

-- Table: public.nrefresh_token
CREATE TABLE IF NOT EXISTS public."nrefresh_token" (
  "user_id" character varying(20) NOT NULL,
  "token" character varying(255) NOT NULL,
  "expiry_date" timestamp without time zone NOT NULL
);

INSERT INTO public."nrefresh_token" ("user_id", "token", "expiry_date") VALUES
  ('webmaster', 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ3ZWJtYXN0ZXIiLCJpYXQiOjE3NzI2MTIzOTUsImV4cCI6MTc3MzIxNzE5NX0.0ZoEXDsEuC4Z7BYUbMPG7lPty1953-ZVqux_MvaZhibEUVg7nCne3zsapdCmndj7ZiZG7YiAyIf4SlEIhNdxqw', '2026-03-10T23:19:55.892Z');

-- --------------------------------------------------------

-- Table: public.nreprtstats
CREATE TABLE IF NOT EXISTS public."nreprtstats" (
  "reprt_id" character(6) NOT NULL,
  "reprt_nm" character varying(20) NOT NULL,
  "reprt_sttus" character(2) NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "reprt_ty" character(2)
);
COMMENT ON TABLE public."nreprtstats" IS 'NREPRTSTATS';
COMMENT ON COLUMN public."nreprtstats"."reprt_id" IS 'REPRT아이디';
COMMENT ON COLUMN public."nreprtstats"."reprt_nm" IS 'REPRT명';
COMMENT ON COLUMN public."nreprtstats"."reprt_sttus" IS 'REPRT상태';
COMMENT ON COLUMN public."nreprtstats"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nreprtstats"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nreprtstats"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nreprtstats"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nreprtstats"."reprt_ty" IS 'REPRT유형';

-- --------------------------------------------------------

-- Table: public.nroleinfo
CREATE TABLE IF NOT EXISTS public."nroleinfo" (
  "role_code" character varying(50) NOT NULL,
  "role_nm" character varying(60) NOT NULL,
  "role_pttrn" character varying(300),
  "role_dc" character varying(200),
  "role_ty" character varying(80),
  "role_sort" character varying(10),
  "role_creat_de" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20),
  "last_updusr_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nroleinfo" IS 'NROLEINFO';
COMMENT ON COLUMN public."nroleinfo"."role_code" IS '역할코드';
COMMENT ON COLUMN public."nroleinfo"."role_nm" IS '역할명';
COMMENT ON COLUMN public."nroleinfo"."role_pttrn" IS '역할PTTRN';
COMMENT ON COLUMN public."nroleinfo"."role_dc" IS '역할설명';
COMMENT ON COLUMN public."nroleinfo"."role_ty" IS '역할유형';
COMMENT ON COLUMN public."nroleinfo"."role_sort" IS '역할정렬';
COMMENT ON COLUMN public."nroleinfo"."role_creat_de" IS '역할CREAT일자';

INSERT INTO public."nroleinfo" ("role_code", "role_nm", "role_pttrn", "role_dc", "role_ty", "role_sort", "role_creat_de", "frst_register_id", "last_updusr_id", "frst_regist_pnttm", "last_updt_pnttm") VALUES
  ('web-000001', '로그인롤', '\A/uat/uia/.*\.do.*\Z', '로그인허용을 위한 롤', 'url', '1', '2025-12-28T16:39:41.039Z', NULL, NULL, NULL, NULL),
  ('web-000002', '좌측메뉴', '/EgovLeft.do', '좌측 메뉴에 대한 접근 제한 롤', 'url', '2', '2025-12-28T16:39:41.041Z', NULL, NULL, NULL, NULL),
  ('web-000003', '모든접근제한', '\A/.*\.do.*\Z', '모든자원에 대한 접근 제한 롤', 'url', '3', '2025-12-28T16:39:41.041Z', NULL, NULL, NULL, NULL),
  ('web-000004', '회원관리', '\A/uss/umt/.*\.do.*\Z', '회원관리에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.042Z', NULL, NULL, NULL, NULL),
  ('web-000005', '실명확인', '\A/sec/rnc/.*\.do.*\Z', '실명확인에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.043Z', NULL, NULL, NULL, NULL),
  ('web-000006', '우편번호', '\A/sym/ccm/zip/.*\.do.*\Z', '우편번호관리에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.044Z', NULL, NULL, NULL, NULL),
  ('web-000007', '로그인이미지', '\A/uss/ion/lsi/.*\.do.*\Z', '로그인이미지관리에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.045Z', NULL, NULL, NULL, NULL),
  ('web-000008', '파일다운로드', '/cmm/fms/FileDown.do.*', '파일다운로드에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.046Z', NULL, NULL, NULL, NULL),
  ('web-000009', '상단메뉴', '/EgovTop.do', '상단메뉴에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.046Z', NULL, NULL, NULL, NULL),
  ('web-000010', '하단메뉴', '/EgovBottom.do', '하단메뉴에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.047Z', NULL, NULL, NULL, NULL),
  ('web-000011', '왼쪽메뉴', '/EgovLeft.do', '왼쪽메뉴에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.048Z', NULL, NULL, NULL, NULL),
  ('web-000012', 'Validator모듈', '/validator.do', 'Validator에 대한 접근 제한 롤', 'url', '1', '2025-12-28T16:39:41.049Z', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

-- Table: public.nroles_hierarchy
CREATE TABLE IF NOT EXISTS public."nroles_hierarchy" (
  "parnts_role" character varying(30) NOT NULL,
  "chldrn_role" character varying(30) NOT NULL
);
COMMENT ON TABLE public."nroles_hierarchy" IS 'NROLESHIERARCHY';
COMMENT ON COLUMN public."nroles_hierarchy"."parnts_role" IS 'PARNTS역할';
COMMENT ON COLUMN public."nroles_hierarchy"."chldrn_role" IS '자녀강수량역할';

INSERT INTO public."nroles_hierarchy" ("parnts_role", "chldrn_role") VALUES
  ('ROLE_ANONYMOUS', 'IS_AUTHENTICATED_ANONYMOUSLY'),
  ('IS_AUTHENTICATED_ANONYMOUSLY', 'IS_AUTHENTICATED_REMEMBERED'),
  ('IS_AUTHENTICATED_REMEMBERED', 'IS_AUTHENTICATED_FULLY'),
  ('IS_AUTHENTICATED_FULLY', 'ROLE_USER'),
  ('ROLE_USER', 'ROLE_ADMIN');

-- --------------------------------------------------------

-- Table: public.nroughmap
CREATE TABLE IF NOT EXISTS public."nroughmap" (
  "roughmap_id" character varying(75) NOT NULL,
  "roughmapsj" character varying(75) NOT NULL,
  "roughmapaddress" character varying(200),
  "la" character varying(48),
  "lo" character varying(48),
  "markerla" character varying(48),
  "markerlo" character varying(48),
  "infowindow" character varying(20),
  "zoomlevel" character varying(10),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nroughmap" IS 'NROUGHMAP';
COMMENT ON COLUMN public."nroughmap"."roughmap_id" IS 'ROUGHMAP아이디';
COMMENT ON COLUMN public."nroughmap"."roughmapsj" IS 'ROUGHMAPSJ';
COMMENT ON COLUMN public."nroughmap"."roughmapaddress" IS 'ROUGHMAPADDRESS';
COMMENT ON COLUMN public."nroughmap"."la" IS 'LA';
COMMENT ON COLUMN public."nroughmap"."lo" IS 'LO';
COMMENT ON COLUMN public."nroughmap"."markerla" IS 'MARKERLA';
COMMENT ON COLUMN public."nroughmap"."markerlo" IS 'MARKERLO';
COMMENT ON COLUMN public."nroughmap"."infowindow" IS 'INFOWINDOW';
COMMENT ON COLUMN public."nroughmap"."zoomlevel" IS 'ZOOMLEVEL';
COMMENT ON COLUMN public."nroughmap"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nroughmap"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nroughmap"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nroughmap"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nrwardmanage
CREATE TABLE IF NOT EXISTS public."nrwardmanage" (
  "rward_id" character(20) NOT NULL,
  "rwardwnr_id" character varying(20) NOT NULL,
  "rward_code" character(2) NOT NULL,
  "rward_de" character(20) NOT NULL,
  "rward_nm" character varying(255) NOT NULL,
  "pblen_cn" character varying(1000),
  "sanctner_id" character varying(20) NOT NULL,
  "confm_at" character(1),
  "sanctn_dt" timestamp without time zone,
  "return_resn" character varying(1000),
  "atch_file_id" character(20),
  "infrml_sanctn_id" character(20),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nrwardmanage" IS '포상관리';

-- --------------------------------------------------------

-- Table: public.nschdulinfo
CREATE TABLE IF NOT EXISTS public."nschdulinfo" (
  "schdul_id" character(20) NOT NULL,
  "schdul_se" character(1),
  "schdul_dept_id" character varying(20),
  "schdul_knd_code" character(1),
  "schdul_bgnde" character(20),
  "schdul_endde" character(20),
  "schdul_nm" character varying(255),
  "schdul_cn" character varying(2500),
  "schdul_place" character varying(255),
  "schdul_ipcr_code" character(1),
  "schdul_charger_id" character varying(20),
  "atch_file_id" character(20),
  "frst_regist_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "reptit_se_code" character(1)
);
COMMENT ON TABLE public."nschdulinfo" IS 'NSCHDULINFO';
COMMENT ON COLUMN public."nschdulinfo"."schdul_id" IS 'SCHDUL아이디';
COMMENT ON COLUMN public."nschdulinfo"."schdul_se" IS 'SCHDUL구분';
COMMENT ON COLUMN public."nschdulinfo"."schdul_dept_id" IS 'SCHDUL부서아이디';
COMMENT ON COLUMN public."nschdulinfo"."schdul_knd_code" IS 'SCHDUL종류코드';
COMMENT ON COLUMN public."nschdulinfo"."schdul_bgnde" IS 'SCHDUL시작일';
COMMENT ON COLUMN public."nschdulinfo"."schdul_endde" IS 'SCHDUL종료일';
COMMENT ON COLUMN public."nschdulinfo"."schdul_nm" IS 'SCHDUL명';
COMMENT ON COLUMN public."nschdulinfo"."schdul_cn" IS 'SCHDUL내용';
COMMENT ON COLUMN public."nschdulinfo"."schdul_place" IS 'SCHDULPLACE';
COMMENT ON COLUMN public."nschdulinfo"."schdul_ipcr_code" IS 'SCHDULIP직업코드';
COMMENT ON COLUMN public."nschdulinfo"."schdul_charger_id" IS 'SCHDULCHARGER아이디';
COMMENT ON COLUMN public."nschdulinfo"."atch_file_id" IS '첨부파일아이디';
COMMENT ON COLUMN public."nschdulinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nschdulinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nschdulinfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nschdulinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nschdulinfo"."reptit_se_code" IS 'REPTIT구분코드';

-- --------------------------------------------------------

-- Table: public.nscrap
CREATE TABLE IF NOT EXISTS public."nscrap" (
  "scrap_id" character(20) NOT NULL,
  "ntt_id" numeric NOT NULL,
  "bbs_id" character(30) NOT NULL,
  "scrap_nm" character varying(100) NOT NULL,
  "use_at" character(1) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nscrap" IS 'NSCRAP';
COMMENT ON COLUMN public."nscrap"."scrap_id" IS 'SCRAP아이디';
COMMENT ON COLUMN public."nscrap"."ntt_id" IS 'NTT아이디';
COMMENT ON COLUMN public."nscrap"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nscrap"."scrap_nm" IS 'SCRAP명';
COMMENT ON COLUMN public."nscrap"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nscrap"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nscrap"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nscrap"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nscrap"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nservereqpmninfo
CREATE TABLE IF NOT EXISTS public."nservereqpmninfo" (
  "server_eqpmn_id" character varying(20) NOT NULL,
  "server_eqpmn_nm" character varying(60),
  "server_eqpmn_ip" character varying(23),
  "server_eqpmn_mngr" character varying(60),
  "mngr_email_adres" character varying(50),
  "opersysm_info" character varying(2000),
  "cpu_info" character varying(2000),
  "mory_info" character varying(2000),
  "hddisk" character(18),
  "etc_info" character varying(250),
  "rgsde" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nservereqpmninfo" IS 'NSERVEREQPMNINFO';
COMMENT ON COLUMN public."nservereqpmninfo"."server_eqpmn_id" IS 'SERVEREQPMN아이디';
COMMENT ON COLUMN public."nservereqpmninfo"."server_eqpmn_nm" IS 'SERVEREQPMN명';
COMMENT ON COLUMN public."nservereqpmninfo"."server_eqpmn_ip" IS 'SERVEREQPMNIP';
COMMENT ON COLUMN public."nservereqpmninfo"."server_eqpmn_mngr" IS 'SERVEREQPMN관리자';
COMMENT ON COLUMN public."nservereqpmninfo"."mngr_email_adres" IS '관리자이메일주소';
COMMENT ON COLUMN public."nservereqpmninfo"."opersysm_info" IS 'OPERSYSM정보';
COMMENT ON COLUMN public."nservereqpmninfo"."cpu_info" IS 'CPU정보';
COMMENT ON COLUMN public."nservereqpmninfo"."mory_info" IS 'MORY정보';
COMMENT ON COLUMN public."nservereqpmninfo"."hddisk" IS 'HDDISK';
COMMENT ON COLUMN public."nservereqpmninfo"."etc_info" IS '기타정보';
COMMENT ON COLUMN public."nservereqpmninfo"."rgsde" IS 'RGSDE';
COMMENT ON COLUMN public."nservereqpmninfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nservereqpmninfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nservereqpmninfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nservereqpmninfo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nserverinfo
CREATE TABLE IF NOT EXISTS public."nserverinfo" (
  "server_id" character(20) NOT NULL,
  "server_nm" character varying(60),
  "server_knd" character(2),
  "rgsde" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nserverinfo" IS 'NSERVERINFO';
COMMENT ON COLUMN public."nserverinfo"."server_id" IS 'SERVER아이디';
COMMENT ON COLUMN public."nserverinfo"."server_nm" IS 'SERVER명';
COMMENT ON COLUMN public."nserverinfo"."server_knd" IS 'SERVER종류';
COMMENT ON COLUMN public."nserverinfo"."rgsde" IS 'RGSDE';
COMMENT ON COLUMN public."nserverinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nserverinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nserverinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nserverinfo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nserverresrceloginfo
CREATE TABLE IF NOT EXISTS public."nserverresrceloginfo" (
  "server_eqpmn_id" character varying(20) NOT NULL,
  "cpu_use_rt" numeric,
  "mory_use_rt" numeric,
  "svc_sttus" character(2),
  "log_info" character varying(2000),
  "creat_dt" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "server_id" character(20) NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "log_id" character(20) NOT NULL
);
COMMENT ON TABLE public."nserverresrceloginfo" IS 'NSERVERRESRCELOGINFO';
COMMENT ON COLUMN public."nserverresrceloginfo"."server_eqpmn_id" IS 'SERVEREQPMN아이디';
COMMENT ON COLUMN public."nserverresrceloginfo"."cpu_use_rt" IS 'CPU사용비율';
COMMENT ON COLUMN public."nserverresrceloginfo"."mory_use_rt" IS 'MORY사용비율';
COMMENT ON COLUMN public."nserverresrceloginfo"."svc_sttus" IS '봉사상태';
COMMENT ON COLUMN public."nserverresrceloginfo"."log_info" IS '로그정보';
COMMENT ON COLUMN public."nserverresrceloginfo"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."nserverresrceloginfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nserverresrceloginfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nserverresrceloginfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nserverresrceloginfo"."server_id" IS 'SERVER아이디';
COMMENT ON COLUMN public."nserverresrceloginfo"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nserverresrceloginfo"."log_id" IS '로그아이디';

-- --------------------------------------------------------

-- Table: public.nsitemap
CREATE TABLE IF NOT EXISTS public."nsitemap" (
  "mapng_creat_id" character varying(30) NOT NULL,
  "creatr_id" character varying(20) NOT NULL,
  "mapng_file_nm" character varying(60) NOT NULL,
  "mapng_file_path" character varying(100) NOT NULL
);
COMMENT ON TABLE public."nsitemap" IS 'NSITEMAP';
COMMENT ON COLUMN public."nsitemap"."mapng_creat_id" IS 'MAPNGCREAT아이디';
COMMENT ON COLUMN public."nsitemap"."creatr_id" IS '생성자아이디';
COMMENT ON COLUMN public."nsitemap"."mapng_file_nm" IS 'MAPNG파일명';
COMMENT ON COLUMN public."nsitemap"."mapng_file_path" IS 'MAPNG파일경로';

-- --------------------------------------------------------

-- Table: public.nsms
CREATE TABLE IF NOT EXISTS public."nsms" (
  "sms_id" character(20) NOT NULL,
  "trnsmis_telno" character varying(12) NOT NULL,
  "trnsmis_cn" character varying(80) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nsms" IS 'NSMS';
COMMENT ON COLUMN public."nsms"."sms_id" IS 'SMS아이디';
COMMENT ON COLUMN public."nsms"."trnsmis_telno" IS 'TRNSMIS전화번호';
COMMENT ON COLUMN public."nsms"."trnsmis_cn" IS 'TRNSMIS내용';
COMMENT ON COLUMN public."nsms"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nsms"."frst_register_id" IS '최초등록자아이디';

-- --------------------------------------------------------

-- Table: public.nsmsrecptn
CREATE TABLE IF NOT EXISTS public."nsmsrecptn" (
  "sms_id" character(20) NOT NULL,
  "recptn_telno" character varying(12) NOT NULL,
  "result_code" character varying(4),
  "result_mssage" character varying(4000)
);
COMMENT ON TABLE public."nsmsrecptn" IS 'NSMSRECPTN';
COMMENT ON COLUMN public."nsmsrecptn"."sms_id" IS 'SMS아이디';
COMMENT ON COLUMN public."nsmsrecptn"."recptn_telno" IS 'RECPTN전화번호';
COMMENT ON COLUMN public."nsmsrecptn"."result_code" IS 'RESULT코드';
COMMENT ON COLUMN public."nsmsrecptn"."result_mssage" IS 'RESULTMSSAGE';

-- --------------------------------------------------------

-- Table: public.nstsfdg
CREATE TABLE IF NOT EXISTS public."nstsfdg" (
  "stsfdg_no" numeric NOT NULL,
  "ntt_id" numeric NOT NULL,
  "bbs_id" character(30) NOT NULL,
  "wrter_id" character varying(20),
  "wrter_nm" character varying(20),
  "password" character varying(200),
  "stsfdg" numeric NOT NULL,
  "stsfdg_cn" character varying(200),
  "use_at" character(1) NOT NULL,
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updt_pnttm" timestamp without time zone,
  "frst_register_id" character varying(20) NOT NULL,
  "last_updusr_id" character varying(20)
);
COMMENT ON TABLE public."nstsfdg" IS 'NSTSFDG';
COMMENT ON COLUMN public."nstsfdg"."stsfdg_no" IS 'STSFDG번호';
COMMENT ON COLUMN public."nstsfdg"."ntt_id" IS 'NTT아이디';
COMMENT ON COLUMN public."nstsfdg"."bbs_id" IS '게시판아이디';
COMMENT ON COLUMN public."nstsfdg"."wrter_id" IS 'WRTER아이디';
COMMENT ON COLUMN public."nstsfdg"."wrter_nm" IS 'WRTER명';
COMMENT ON COLUMN public."nstsfdg"."password" IS '비밀번호';
COMMENT ON COLUMN public."nstsfdg"."stsfdg" IS 'STSFDG';
COMMENT ON COLUMN public."nstsfdg"."stsfdg_cn" IS 'STSFDG내용';
COMMENT ON COLUMN public."nstsfdg"."use_at" IS '사용여부';
COMMENT ON COLUMN public."nstsfdg"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nstsfdg"."last_updt_pnttm" IS '최종수정시점';
COMMENT ON COLUMN public."nstsfdg"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nstsfdg"."last_updusr_id" IS '최종수정자아이디';

-- --------------------------------------------------------

-- Table: public.nsynchrnserverinfo
CREATE TABLE IF NOT EXISTS public."nsynchrnserverinfo" (
  "server_id" character(20) NOT NULL,
  "server_nm" character varying(60),
  "server_ip" character varying(23),
  "server_port" character varying(10),
  "ftp_id" character varying(20),
  "ftp_password" character varying(20),
  "synchrn_lc" character varying(255),
  "reflct_at" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nsynchrnserverinfo" IS 'NSYNCHRNSERVERINFO';
COMMENT ON COLUMN public."nsynchrnserverinfo"."server_id" IS 'SERVER아이디';
COMMENT ON COLUMN public."nsynchrnserverinfo"."server_nm" IS 'SERVER명';
COMMENT ON COLUMN public."nsynchrnserverinfo"."server_ip" IS 'SERVERIP';
COMMENT ON COLUMN public."nsynchrnserverinfo"."server_port" IS 'SERVER포트';
COMMENT ON COLUMN public."nsynchrnserverinfo"."ftp_id" IS 'FTP아이디';
COMMENT ON COLUMN public."nsynchrnserverinfo"."ftp_password" IS 'FTP비밀번호';
COMMENT ON COLUMN public."nsynchrnserverinfo"."synchrn_lc" IS 'SYNCHRN위치';
COMMENT ON COLUMN public."nsynchrnserverinfo"."reflct_at" IS '반영여부';
COMMENT ON COLUMN public."nsynchrnserverinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nsynchrnserverinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nsynchrnserverinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nsynchrnserverinfo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nsyslog
CREATE TABLE IF NOT EXISTS public."nsyslog" (
  "requst_id" character varying(20) NOT NULL,
  "job_se_code" character(3),
  "instt_code" character(7),
  "occrrnc_de" timestamp without time zone,
  "rqester_ip" character varying(23),
  "rqester_id" character varying(20),
  "trget_menu_nm" character varying(255),
  "svc_nm" character varying(255),
  "method_nm" character varying(60),
  "process_se_code" character(3),
  "process_co" numeric,
  "process_time" character varying(14),
  "rspns_code" character(3),
  "error_se" character(1),
  "error_co" numeric,
  "error_code" character(3)
);
COMMENT ON TABLE public."nsyslog" IS 'NSYSLOG';
COMMENT ON COLUMN public."nsyslog"."requst_id" IS 'REQUST아이디';
COMMENT ON COLUMN public."nsyslog"."job_se_code" IS '작업구분코드';
COMMENT ON COLUMN public."nsyslog"."instt_code" IS 'INSTT코드';
COMMENT ON COLUMN public."nsyslog"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."nsyslog"."rqester_ip" IS 'RQESTERIP';
COMMENT ON COLUMN public."nsyslog"."rqester_id" IS 'RQESTER아이디';
COMMENT ON COLUMN public."nsyslog"."trget_menu_nm" IS 'TRGET메뉴명';
COMMENT ON COLUMN public."nsyslog"."svc_nm" IS '봉사명';
COMMENT ON COLUMN public."nsyslog"."method_nm" IS 'METHOD명';
COMMENT ON COLUMN public."nsyslog"."process_se_code" IS 'PROCESS구분코드';
COMMENT ON COLUMN public."nsyslog"."process_co" IS 'PROCESS수';
COMMENT ON COLUMN public."nsyslog"."process_time" IS 'PROCESSTIME';
COMMENT ON COLUMN public."nsyslog"."rspns_code" IS '응답코드';
COMMENT ON COLUMN public."nsyslog"."error_se" IS 'ERROR구분';
COMMENT ON COLUMN public."nsyslog"."error_co" IS 'ERROR수';
COMMENT ON COLUMN public."nsyslog"."error_code" IS 'ERROR코드';

-- --------------------------------------------------------

-- Table: public.ntmplatinfo
CREATE TABLE IF NOT EXISTS public."ntmplatinfo" (
  "tmplat_id" character(20) NOT NULL,
  "tmplat_nm" character varying(255),
  "tmplat_cours" character varying(2000),
  "use_at" character(1),
  "tmplat_se_code" character(6),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ntmplatinfo" IS 'NTMPLATINFO';
COMMENT ON COLUMN public."ntmplatinfo"."tmplat_id" IS '템플릿아이디';
COMMENT ON COLUMN public."ntmplatinfo"."tmplat_nm" IS '템플릿명';
COMMENT ON COLUMN public."ntmplatinfo"."tmplat_cours" IS '템플릿COURS';
COMMENT ON COLUMN public."ntmplatinfo"."use_at" IS '사용여부';
COMMENT ON COLUMN public."ntmplatinfo"."tmplat_se_code" IS '템플릿구분코드';
COMMENT ON COLUMN public."ntmplatinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ntmplatinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ntmplatinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ntmplatinfo"."last_updt_pnttm" IS '최종수정시점';

INSERT INTO public."ntmplatinfo" ("tmplat_id", "tmplat_nm", "tmplat_cours", "use_at", "tmplat_se_code", "frst_register_id", "frst_regist_pnttm", "last_updusr_id", "last_updt_pnttm") VALUES
  ('TMPLAT_BOARD_DEFAULT', '게시판 기본템플릿', '/css/egovframework/com/cop/tpl/egovbbsTemplate.css', 'Y', 'TMPT01', 'SYSTEM', '2025-12-28T16:39:41.354Z', NULL, NULL),
  ('TMPLAT_CMNTY_DEFAULT', '커뮤니티 기본템플릿', 'egovframework/com/cop/tpl/EgovCmmntyBaseTmpl', 'Y', 'TMPT02', 'SYSTEM', '2025-12-28T16:39:41.356Z', NULL, NULL),
  ('TMPLAT_CLUB__DEFAULT', '동호회 기본템플릿', 'egovframework/com/cop/tpl/EgovClbBaseTmpl', 'Y', 'TMPT03', 'SYSTEM', '2025-12-28T16:39:41.356Z', NULL, NULL);

-- --------------------------------------------------------

-- Table: public.ntroblinfo
CREATE TABLE IF NOT EXISTS public."ntroblinfo" (
  "trobl_id" character(20) NOT NULL,
  "trobl_nm" character varying(60),
  "trobl_knd" character(2),
  "trobl_dc" character varying(2000),
  "trobl_occrrnc_time" character varying(14),
  "trobl_rqester_nm" character varying(60),
  "trobl_requst_time" character varying(14),
  "trobl_process_result" character varying(2000),
  "trobl_opetr_nm" character varying(60),
  "trobl_process_time" character varying(14),
  "process_sttus" character(1),
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."ntroblinfo" IS 'NTROBLINFO';
COMMENT ON COLUMN public."ntroblinfo"."trobl_id" IS 'TROBL아이디';
COMMENT ON COLUMN public."ntroblinfo"."trobl_nm" IS 'TROBL명';
COMMENT ON COLUMN public."ntroblinfo"."trobl_knd" IS 'TROBL종류';
COMMENT ON COLUMN public."ntroblinfo"."trobl_dc" IS 'TROBL설명';
COMMENT ON COLUMN public."ntroblinfo"."trobl_occrrnc_time" IS 'TROBLOCCRRNCTIME';
COMMENT ON COLUMN public."ntroblinfo"."trobl_rqester_nm" IS 'TROBLRQESTER명';
COMMENT ON COLUMN public."ntroblinfo"."trobl_requst_time" IS 'TROBLREQUSTTIME';
COMMENT ON COLUMN public."ntroblinfo"."trobl_process_result" IS 'TROBLPROCESSRESULT';
COMMENT ON COLUMN public."ntroblinfo"."trobl_opetr_nm" IS 'TROBLOPETR명';
COMMENT ON COLUMN public."ntroblinfo"."trobl_process_time" IS 'TROBLPROCESSTIME';
COMMENT ON COLUMN public."ntroblinfo"."process_sttus" IS 'PROCESS상태';
COMMENT ON COLUMN public."ntroblinfo"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ntroblinfo"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ntroblinfo"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ntroblinfo"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.ntrsmrcvlog
CREATE TABLE IF NOT EXISTS public."ntrsmrcvlog" (
  "requst_id" character varying(20) NOT NULL,
  "occrrnc_de" character(20),
  "trsmrcv_se_code" character(3),
  "cntc_id" character(8),
  "provd_instt_id" character(8),
  "provd_sys_id" character(8),
  "provd_svc_id" character(8),
  "requst_instt_id" character(8),
  "requst_sys_id" character(8),
  "requst_trnsmit_tm" character varying(14),
  "requst_recptn_tm" character varying(14),
  "rspns_trnsmit_tm" character varying(14),
  "rspns_recptn_tm" character varying(14),
  "result_code" character varying(4),
  "result_mssage" character varying(4000),
  "frst_regist_pnttm" timestamp without time zone,
  "rqester_id" character varying(20)
);
COMMENT ON TABLE public."ntrsmrcvlog" IS 'NTRSMRCVLOG';
COMMENT ON COLUMN public."ntrsmrcvlog"."requst_id" IS 'REQUST아이디';
COMMENT ON COLUMN public."ntrsmrcvlog"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."ntrsmrcvlog"."trsmrcv_se_code" IS '전송수령구분코드';
COMMENT ON COLUMN public."ntrsmrcvlog"."cntc_id" IS '접촉아이디';
COMMENT ON COLUMN public."ntrsmrcvlog"."provd_instt_id" IS 'PROVDINSTT아이디';
COMMENT ON COLUMN public."ntrsmrcvlog"."provd_sys_id" IS 'PROVD시스템아이디';
COMMENT ON COLUMN public."ntrsmrcvlog"."provd_svc_id" IS 'PROVD봉사아이디';
COMMENT ON COLUMN public."ntrsmrcvlog"."requst_instt_id" IS 'REQUSTINSTT아이디';
COMMENT ON COLUMN public."ntrsmrcvlog"."requst_sys_id" IS 'REQUST시스템아이디';
COMMENT ON COLUMN public."ntrsmrcvlog"."requst_trnsmit_tm" IS 'REQUSTTRNSMIT시각';
COMMENT ON COLUMN public."ntrsmrcvlog"."requst_recptn_tm" IS 'REQUSTRECPTN시각';
COMMENT ON COLUMN public."ntrsmrcvlog"."rspns_trnsmit_tm" IS '응답TRNSMIT시각';
COMMENT ON COLUMN public."ntrsmrcvlog"."rspns_recptn_tm" IS '응답RECPTN시각';
COMMENT ON COLUMN public."ntrsmrcvlog"."result_code" IS 'RESULT코드';
COMMENT ON COLUMN public."ntrsmrcvlog"."result_mssage" IS 'RESULTMSSAGE';
COMMENT ON COLUMN public."ntrsmrcvlog"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ntrsmrcvlog"."rqester_id" IS 'RQESTER아이디';

-- --------------------------------------------------------

-- Table: public.ntrsmrcvmntrng
CREATE TABLE IF NOT EXISTS public."ntrsmrcvmntrng" (
  "cntc_id" character(8) NOT NULL,
  "test_class_nm" character varying(255),
  "mngr_nm" character varying(60),
  "mngr_email_adres" character varying(50),
  "mntrng_sttus" character(2),
  "creat_dt" timestamp without time zone,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone NOT NULL,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone NOT NULL
);
COMMENT ON TABLE public."ntrsmrcvmntrng" IS 'NTRSMRCVMNTRNG';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."cntc_id" IS '접촉아이디';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."test_class_nm" IS '시험CLASS명';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."mngr_nm" IS '관리자명';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."mngr_email_adres" IS '관리자이메일주소';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."mntrng_sttus" IS 'MNTRNG상태';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."creat_dt" IS 'CREAT일시';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."ntrsmrcvmntrng"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nuserabsnce
CREATE TABLE IF NOT EXISTS public."nuserabsnce" (
  "emplyr_id" character varying(20) NOT NULL,
  "user_absnce_at" character(1) NOT NULL,
  "frst_register_id" character varying(20),
  "frst_regist_pnttm" timestamp without time zone,
  "last_updusr_id" character varying(20),
  "last_updt_pnttm" timestamp without time zone
);
COMMENT ON TABLE public."nuserabsnce" IS 'NUSERABSNCE';
COMMENT ON COLUMN public."nuserabsnce"."emplyr_id" IS '사용자아이디';
COMMENT ON COLUMN public."nuserabsnce"."user_absnce_at" IS '사용자ABSNCE여부';
COMMENT ON COLUMN public."nuserabsnce"."frst_register_id" IS '최초등록자아이디';
COMMENT ON COLUMN public."nuserabsnce"."frst_regist_pnttm" IS '최초등록시점';
COMMENT ON COLUMN public."nuserabsnce"."last_updusr_id" IS '최종수정자아이디';
COMMENT ON COLUMN public."nuserabsnce"."last_updt_pnttm" IS '최종수정시점';

-- --------------------------------------------------------

-- Table: public.nuserlog
CREATE TABLE IF NOT EXISTS public."nuserlog" (
  "occrrnc_de" character(8) NOT NULL,
  "rqester_id" character varying(20) NOT NULL,
  "svc_nm" character varying(255) NOT NULL,
  "method_nm" character varying(60) NOT NULL,
  "creat_co" numeric,
  "updt_co" numeric,
  "rdcnt" numeric,
  "delete_co" numeric,
  "outpt_co" numeric,
  "error_co" numeric
);
COMMENT ON TABLE public."nuserlog" IS 'NUSERLOG';
COMMENT ON COLUMN public."nuserlog"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."nuserlog"."rqester_id" IS 'RQESTER아이디';
COMMENT ON COLUMN public."nuserlog"."svc_nm" IS '봉사명';
COMMENT ON COLUMN public."nuserlog"."method_nm" IS 'METHOD명';
COMMENT ON COLUMN public."nuserlog"."creat_co" IS 'CREAT수';
COMMENT ON COLUMN public."nuserlog"."updt_co" IS '수정수';
COMMENT ON COLUMN public."nuserlog"."rdcnt" IS 'RDCNT';
COMMENT ON COLUMN public."nuserlog"."delete_co" IS 'DELETE수';
COMMENT ON COLUMN public."nuserlog"."outpt_co" IS 'OUTPT수';
COMMENT ON COLUMN public."nuserlog"."error_co" IS 'ERROR수';

-- --------------------------------------------------------

-- Table: public.nweblog
CREATE TABLE IF NOT EXISTS public."nweblog" (
  "requst_id" character varying(20) NOT NULL,
  "occrrnc_de" timestamp without time zone,
  "url" character varying(200),
  "rqester_id" character varying(20),
  "rqester_ip" character varying(23)
);
COMMENT ON TABLE public."nweblog" IS 'NWEBLOG';
COMMENT ON COLUMN public."nweblog"."requst_id" IS 'REQUST아이디';
COMMENT ON COLUMN public."nweblog"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."nweblog"."url" IS 'URL';
COMMENT ON COLUMN public."nweblog"."rqester_id" IS 'RQESTER아이디';
COMMENT ON COLUMN public."nweblog"."rqester_ip" IS 'RQESTERIP';

-- --------------------------------------------------------

-- Table: public.revinfo
CREATE TABLE IF NOT EXISTS public."revinfo" (
  "rev" integer NOT NULL,
  "revtstmp" bigint
);

INSERT INTO public."revinfo" ("rev", "revtstmp") VALUES
  (2, '1772542236737'),
  (52, '1772973711613'),
  (102, '1773369977868'),
  (152, '1773384125309'),
  (202, '1773405692302'),
  (252, '1773405787152'),
  (253, '1773405788514'),
  (302, '1773405972642'),
  (303, '1773405973974'),
  (352, '1773409626583'),
  (353, '1773409628472'),
  (402, '1773625194671'),
  (403, '1773625196015'),
  (452, '1773625859334'),
  (453, '1773625860772'),
  (502, '1773626317665'),
  (503, '1773626318936'),
  (552, '1773646378094'),
  (553, '1773646379466'),
  (602, '1773649282270'),
  (603, '1773649283597'),
  (652, '1773714748786'),
  (653, '1773714750131'),
  (702, '1773724876179'),
  (703, '1773724877587'),
  (752, '1773725287344'),
  (753, '1773725288625'),
  (802, '1773726159188'),
  (803, '1773726160529'),
  (852, '1773833247238'),
  (853, '1773833248661'),
  (902, '1773833423861'),
  (903, '1773833425391'),
  (952, '1773834095004'),
  (953, '1773834096451'),
  (1002, '1773834298317'),
  (1003, '1773834299670'),
  (1052, '1773880958866'),
  (1053, '1773880960841'),
  (1102, '1773882005370'),
  (1103, '1773882006701'),
  (1152, '1773882492543'),
  (1153, '1773882493869'),
  (1202, '1773928250166'),
  (1203, '1773928251693');

-- --------------------------------------------------------

-- Table: public.sbbssummary
CREATE TABLE IF NOT EXISTS public."sbbssummary" (
  "occrrnc_de" character(20) NOT NULL,
  "stats_se" character varying(10) NOT NULL,
  "detail_stats_se" character varying(10) NOT NULL,
  "creat_co" numeric,
  "tot_rdcnt" numeric,
  "avrg_rdcnt" numeric,
  "top_inqire_bbsctt_id" character varying(20),
  "mumm_inqire_bbsctt_id" character varying(20),
  "top_ntcr_id" character varying(20)
);
COMMENT ON TABLE public."sbbssummary" IS 'SBBSSUMMARY';
COMMENT ON COLUMN public."sbbssummary"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."sbbssummary"."stats_se" IS '통계구분';
COMMENT ON COLUMN public."sbbssummary"."detail_stats_se" IS 'DETAIL통계구분';
COMMENT ON COLUMN public."sbbssummary"."creat_co" IS 'CREAT수';
COMMENT ON COLUMN public."sbbssummary"."tot_rdcnt" IS '집계RDCNT';
COMMENT ON COLUMN public."sbbssummary"."avrg_rdcnt" IS 'AVRGRDCNT';
COMMENT ON COLUMN public."sbbssummary"."top_inqire_bbsctt_id" IS 'TOPINQIREBBSCTT아이디';
COMMENT ON COLUMN public."sbbssummary"."mumm_inqire_bbsctt_id" IS 'MUMMINQIREBBSCTT아이디';
COMMENT ON COLUMN public."sbbssummary"."top_ntcr_id" IS 'TOPNTCR아이디';

-- --------------------------------------------------------

-- Table: public.ssyslogsummary
CREATE TABLE IF NOT EXISTS public."ssyslogsummary" (
  "occrrnc_de" character(8) NOT NULL,
  "svc_nm" character varying(255) NOT NULL,
  "method_nm" character varying(60) NOT NULL,
  "creat_co" numeric,
  "updt_co" numeric,
  "rdcnt" numeric,
  "delete_co" numeric,
  "outpt_co" numeric,
  "error_co" numeric
);
COMMENT ON TABLE public."ssyslogsummary" IS 'SSYSLOGSUMMARY';
COMMENT ON COLUMN public."ssyslogsummary"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."ssyslogsummary"."svc_nm" IS '봉사명';
COMMENT ON COLUMN public."ssyslogsummary"."method_nm" IS 'METHOD명';
COMMENT ON COLUMN public."ssyslogsummary"."creat_co" IS 'CREAT수';
COMMENT ON COLUMN public."ssyslogsummary"."updt_co" IS '수정수';
COMMENT ON COLUMN public."ssyslogsummary"."rdcnt" IS 'RDCNT';
COMMENT ON COLUMN public."ssyslogsummary"."delete_co" IS 'DELETE수';
COMMENT ON COLUMN public."ssyslogsummary"."outpt_co" IS 'OUTPT수';
COMMENT ON COLUMN public."ssyslogsummary"."error_co" IS 'ERROR수';

-- --------------------------------------------------------

-- Table: public.strsmrcvlogsummary
CREATE TABLE IF NOT EXISTS public."strsmrcvlogsummary" (
  "occrrnc_de" character(20) NOT NULL,
  "trsmrcv_se_code" character(3) NOT NULL,
  "provd_instt_id" character(8) NOT NULL,
  "provd_sys_id" character(8) NOT NULL,
  "provd_svc_id" character(8) NOT NULL,
  "requst_instt_id" character(8) NOT NULL,
  "requst_sys_id" character(8) NOT NULL,
  "rdcnt" numeric,
  "error_co" numeric
);
COMMENT ON TABLE public."strsmrcvlogsummary" IS 'STRSMRCVLOGSUMMARY';
COMMENT ON COLUMN public."strsmrcvlogsummary"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."strsmrcvlogsummary"."trsmrcv_se_code" IS '전송수령구분코드';
COMMENT ON COLUMN public."strsmrcvlogsummary"."provd_instt_id" IS 'PROVDINSTT아이디';
COMMENT ON COLUMN public."strsmrcvlogsummary"."provd_sys_id" IS 'PROVD시스템아이디';
COMMENT ON COLUMN public."strsmrcvlogsummary"."provd_svc_id" IS 'PROVD봉사아이디';
COMMENT ON COLUMN public."strsmrcvlogsummary"."requst_instt_id" IS 'REQUSTINSTT아이디';
COMMENT ON COLUMN public."strsmrcvlogsummary"."requst_sys_id" IS 'REQUST시스템아이디';
COMMENT ON COLUMN public."strsmrcvlogsummary"."rdcnt" IS 'RDCNT';
COMMENT ON COLUMN public."strsmrcvlogsummary"."error_co" IS 'ERROR수';

-- --------------------------------------------------------

-- Table: public.susersummary
CREATE TABLE IF NOT EXISTS public."susersummary" (
  "occrrnc_de" character(20) NOT NULL,
  "stats_se" character varying(10) NOT NULL,
  "detail_stats_se" character varying(10) NOT NULL,
  "user_co" numeric
);
COMMENT ON TABLE public."susersummary" IS 'SUSERSUMMARY';
COMMENT ON COLUMN public."susersummary"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."susersummary"."stats_se" IS '통계구분';
COMMENT ON COLUMN public."susersummary"."detail_stats_se" IS 'DETAIL통계구분';
COMMENT ON COLUMN public."susersummary"."user_co" IS '사용자수';

-- --------------------------------------------------------

-- Table: public.sweblogsummary
CREATE TABLE IF NOT EXISTS public."sweblogsummary" (
  "occrrnc_de" character(8) NOT NULL,
  "url" character varying(200) NOT NULL,
  "rdcnt" numeric
);
COMMENT ON TABLE public."sweblogsummary" IS 'SWEBLOGSUMMARY';
COMMENT ON COLUMN public."sweblogsummary"."occrrnc_de" IS 'OCCRRNC일자';
COMMENT ON COLUMN public."sweblogsummary"."url" IS 'URL';
COMMENT ON COLUMN public."sweblogsummary"."rdcnt" IS 'RDCNT';

-- --------------------------------------------------------
