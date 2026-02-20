package com.company.project.common.constant;

/**
 * ?⑤벏???怨몃땾 ?????
 */
public class Constants {
    
    // ??????온???怨몃땾
    public static final class User {
        public static final String USER_PREFIX = "USR_";
        public static final String ESNTL_ID_PREFIX = "USR_";
        public static final String USRCNFRM_PREFIX = "USRCNFRM_";
        public static final int UUID_LENGTH = 16;
        public static final int ESNTL_ID_UUID_LENGTH = 10;
        public static final int MIN_PASSWORD_LENGTH = 8;
    }
    
    // 筌?Ŋ???온???怨몃땾
    public static final class Cache {
        public static final String USERS_CACHE = "users";
    }
    
    // 亦낅슦釉??온???怨몃땾
    public static final class Authority {
        public static final String DEFAULT_ROLE = "ROLE_USER";
    }
}