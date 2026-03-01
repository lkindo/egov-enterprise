package com.company.project.constants;

/**
 * ?�듯???곸닔 ??�???
 */
public class Constants {
    
    /**
     * �?��???�???곸닔
     */
    public static class Cache {
        public static final String USERS_CACHE = "users";
        public static final String BOARD_MASTER_CACHE = "boardMaster";
        public static final String AUTHORITIES_CACHE = "authorities";
        public static final String SYSTEM_CONFIG_CACHE = "systemConfig";
    }
    
    /**
     * ??�뒪????�젙 ?�???곸닔
     */
    public static class System {
        public static final String DEFAULT_PAGE_SIZE = "10";
        public static final String MAX_PAGE_SIZE = "100";
        public static final String DEFAULT_SORT_DIRECTION = "ASC";
    }
    
    /**
     * ??????�???곸닔
     */
    public static class User {
        public static final String DEFAULT_ROLE = "USER";
        public static final String ADMIN_ROLE = "ADMIN";
        public static final String GUEST_ROLE = "GUEST";
        public static final String USER_PREFIX = "USR_";
        public static final int UUID_LENGTH = 16;
        public static final String USRCNFRM_PREFIX = "USRCNFRM_";
        public static final int ESNTL_ID_UUID_LENGTH = 10;
    }

    /**
     * 寃뚯????�???곸닔
     */
    public static class Board {
        public static final String DEFAULT_TEMPLATE_ID = "DEFAULT_TMPL";
        public static final String NOTICE_BOARD_TYPE = "NOTICE";
        public static final String GENERAL_BOARD_TYPE = "GENERAL";
    }

    /**
     * ???�� ??�줈???�???곸닔
     */
    public static class File {
        public static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        public static final String DEFAULT_UPLOAD_PATH = "./uploads";
        public static final String ALLOWED_EXTENSIONS = "jpg,jpeg,png,gif,bmp,pdf,doc,docx,hwp,xls,xlsx";
    }

    /**
     * 蹂댁�??�???곸닔
     */
    public static class Security {
        public static final String JWT_HEADER = "Authorization";
        public static final String JWT_PREFIX = "Bearer ";
        public static final long ACCESS_TOKEN_VALIDITY_SECONDS = 60 * 60; // 1 hour
        public static final long REFRESH_TOKEN_VALIDITY_SECONDS = 7 * 24 * 60 * 60; // 7 days
    }
}
