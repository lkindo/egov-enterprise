package nuri.foundation.constants;

/**
 * 프로젝트 전체 상수 정의 클래스
 */
public final class Constants {

    private Constants() {
        // 상수 홀더 — 인스턴스화 금지
    }

    /**
     * 사용자 식별자 상수
     */
    public static class User {
        public static final String USER_PREFIX = "USR_";
        public static final int UUID_LENGTH = 16;
        // [V2_12] 시스템 최고관리자(webmaster) esntl_id — R__seed_framework.sql 시드와 결속.
        // 탈퇴 사용자의 콘텐츠(게시글/댓글/주소록) 재귀속 대상이며, 이 계정 자체의 삭제는 금지된다.
        public static final String SYSTEM_ADMIN_ESNTL_ID = "USRCNFRM_00000000001";
    }
}
