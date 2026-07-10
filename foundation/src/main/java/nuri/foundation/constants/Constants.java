package nuri.foundation.constants;

/**
 * 프로젝트 전체 상수 정의 클래스
 */
public final class Constants {

    private Constants() {
        // 상수 홀더 — 인스턴스화 금지
    }

    /**
     * 캐시 설정 상수
     */
    public static class Cache {
        public static final String USERS_CACHE = "users";
        public static final String BOARD_MASTER_CACHE = "boardMaster";
        public static final String AUTHORITIES_CACHE = "authorities";
        public static final String SYSTEM_CONFIG_CACHE = "systemConfig";
    }

    /**
     * 시스템 기본 설정 상수
     */
    public static class System {
        public static final String DEFAULT_PAGE_SIZE = "10";
        public static final String MAX_PAGE_SIZE = "100";
        public static final String DEFAULT_SORT_DIRECTION = "ASC";
    }

    /**
     * 사용자 권한 및 기본 정보 상수
     */
    public static class User {
        public static final String DEFAULT_ROLE = "USER";
        public static final String ADMIN_ROLE = "ADMIN";
        public static final String GUEST_ROLE = "GUEST";
        public static final String USER_PREFIX = "USR_";
        public static final String MBER_PREFIX = "MBER_";
        public static final String INFRML_PREFIX = "INFRML_";
        public static final int UUID_LENGTH = 16;
        public static final String USRCNFRM_PREFIX = "USRCNFRM_";
        public static final String SMS_PREFIX = "SMS_";
        public static final String MAIL_PREFIX = "MAIL_";
        // [H3] 절단 UUID 엔트로피 상향: 10(40bit)→13(52bit)으로 충돌 임계를 약 130만→9400만건으로 확대.
        // 상한 13은 이 값을 쓰는 생성기 중 최장 접두사 INFRML_(7자) + varchar(20) PK 컬럼 제약(7+13=20)에서 도출.
        // (근본적 무충돌은 시퀀스 기반 EgovIdGnrConfig 또는 unique 위반 재시도 필요 — 별도 개선 대상)
        public static final int ESNTL_ID_UUID_LENGTH = 13;
    }

    /**
     * 게시판 설정 상수
     */
    public static class Board {
        public static final String DEFAULT_TEMPLATE_ID = "DEFAULT_TMPL";
        public static final String NOTICE_BOARD_TYPE = "NOTICE";
        public static final String GENERAL_BOARD_TYPE = "GENERAL";
    }

    /**
     * 파일 업로드 및 제한 설정 상수
     */
    public static class File {
        public static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        public static final String DEFAULT_UPLOAD_PATH = "./uploads";
        public static final String ALLOWED_EXTENSIONS = "jpg,jpeg,png,gif,bmp,pdf,doc,docx,hwp,xls,xlsx";
    }

    /**
     * 보안 및 인증(JWT) 관련 상수
     */
    public static class Security {
        public static final String JWT_HEADER = "Authorization";
        public static final String JWT_PREFIX = "Bearer ";
        public static final long ACCESS_TOKEN_VALIDITY_SECONDS = 60 * 60; // 1 hour
        public static final long REFRESH_TOKEN_VALIDITY_SECONDS = 7 * 24 * 60 * 60; // 7 days
    }
}
