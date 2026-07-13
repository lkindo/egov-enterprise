package nuri.business.security.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class SecurityUtil {

    /**
     * 현재 인증 주체의 <b>esntlId</b> 를 반환한다.
     * (principal 이 {@link UserDetails} 이면 {@code getUsername()} == esntlId 규약을 따른다.)
     * 감사 컬럼(frst_rgtr_id/last_mdfr_id) 등 시스템 전반의 사용자 식별은 esntlId 로 일원화한다.
     */
    public static Optional<String> getCurrentEsntlId() {
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            return Optional.empty();
        }

        String esntlId = null;
        if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            esntlId = springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof String principalString) {
            esntlId = principalString;
        }

        return Optional.ofNullable(esntlId);
    }

    /**
     * @deprecated 이름과 달리 <b>로그인 ID 가 아니라 esntlId</b> 를 반환한다(정체성 footgun).
     * 의미가 명확한 {@link #getCurrentEsntlId()} 를 사용하라. 하위호환을 위해 위임만 유지한다.
     */
    @Deprecated
    public static Optional<String> getCurrentUserId() {
        return getCurrentEsntlId();
    }

    public static boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null)
            return false;

        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
