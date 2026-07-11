package nuri.business.domain.user.entity;

/**
 * 사용자 권한 열거형
 */
public enum Role {
    USER,
    ADMIN;

    public static Role fromAuthorCode(String authorCode) {
        if (authorCode == null) {
            return USER;
        }
        String cleanRole = authorCode.startsWith("ROLE_") ? authorCode.substring(5) : authorCode;
        for (Role r : values()) {
            if (r.name().equalsIgnoreCase(cleanRole)) {
                return r;
            }
        }
        return USER;
    }
}
