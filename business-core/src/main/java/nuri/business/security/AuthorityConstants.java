package nuri.business.security;

/**
 * 권한(Role/Authority) 문자열 상수 홀더.
 *
 * <p>코드 전반에 흩어져 있던 역할 리터럴("ADMIN"/"SYSTEM"/"ROLE_ADMIN") 중복을 제거하기 위한 SSOT다.
 * Spring Security 의 {@code hasRole()}/{@code hasAnyRole()} 및
 * {@link nuri.business.security.util.SecurityUtil#hasRole(String)} 는 내부적으로
 * {@code ROLE_} 접두사를 자동 부가하므로, 이들 메서드의 <b>인자로는 접두사 없는 순수 역할명</b>
 * ({@link #ROLE_ADMIN}, {@link #ROLE_SYSTEM})을 사용한다.
 * 반대로 {@code GrantedAuthority#getAuthority()} 반환값(예: 사용자 권한 목록)과 직접 비교할 때는
 * <b>접두사가 포함된 권한 문자열</b>({@link #AUTHORITY_ADMIN}, {@link #AUTHORITY_SYSTEM})을 사용한다.
 *
 * <p>주의: 이 클래스는 문자열 상수 중앙화(리터럴 드리프트 방지)만을 목적으로 하며,
 * 인가(Authorization) 로직 자체를 변경하지 않는다. DB 기반 동적 권한 관리는 별도 과제다.
 */
public final class AuthorityConstants {

    private AuthorityConstants() {
        // 상수 홀더 — 인스턴스화 금지
    }

    /** Spring Security 권한 접두사. */
    public static final String ROLE_PREFIX = "ROLE_";

    // --- 접두사 없는 순수 역할명 (hasRole/hasAnyRole 인자용) ---
    /** 관리자 역할명 (ROLE_ 접두사 미포함). */
    public static final String ROLE_ADMIN = "ADMIN";
    /** 시스템 역할명 (ROLE_ 접두사 미포함). */
    public static final String ROLE_SYSTEM = "SYSTEM";

    // --- 접두사 포함 권한 문자열 (GrantedAuthority 비교용) ---
    /** 관리자 권한 문자열 (ROLE_ 접두사 포함). */
    public static final String AUTHORITY_ADMIN = ROLE_PREFIX + ROLE_ADMIN;
    /** 시스템 권한 문자열 (ROLE_ 접두사 포함). */
    public static final String AUTHORITY_SYSTEM = ROLE_PREFIX + ROLE_SYSTEM;
}
