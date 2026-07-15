package nuri.business.security.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import java.util.Optional;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.security.AuthorityConstants;

@Component
public class SecurityUtil {

    /**
     * 현재 인증 주체의 <b>esntlId</b>(시스템 내부 PK)를 반환한다.
     * (principal 이 {@link UserDetails} 이면 {@code getUsername()} == esntlId 규약을 따른다.)
     *
     * <p><b>⚠ 감사 컬럼과의 비교에는 이 메서드를 쓰지 않는다.</b> 감사 컬럼
     * ({@code frstRgtrId}/{@code lastMdfrId})에 저장되는 값은 <b>loginId</b>이므로
     * ({@link nuri.business.security.audit.LoginUserAuditorAware} 참조)
     * {@link #getCurrentLoginId()} 로 비교해야 한다.</p>
     *
     * <p><b>소유권(IDOR) 비교의 축은 도메인마다 다르다.</b> 소유자 필드가 감사 컬럼을
     * 쓰는 표준 도메인은 {@link #assertOwnerOrAdmin(String)}(loginId 기준)로,
     * 소유자 필드를 <b>esntlId 로 저장</b>하는 도메인({@code InformalSanction.aplcntId},
     * {@code Board.userId} 등)은 이 메서드({@code getCurrentEsntlId()})로 비교해야 축이 일치한다.
     * 상세 규약: {@code docs/03-guides/identity-model-guide.md} §2.</p>
     *
     * @return esntlId (User 엔티티 PK). 인증 정보 부재 시 {@code Optional.empty()}.
     * @see #getCurrentLoginId()
     * @see #assertOwnerOrAdmin(String)
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

    /**
     * 현재 인증 주체의 <b>로그인 ID</b>(CustomUserDetails.getUserId)를 반환한다.
     * 소유권 비교는 감사 컬럼 frstRgtrId 에 저장되는 값(=loginId, {@code LoginUserAuditorAware})과
     * 일치시켜야 하므로 esntlId 가 아닌 loginId 를 쓴다.
     */
    public static Optional<String> getCurrentLoginId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            return Optional.ofNullable(userDetails.getLoginId());
        }
        return Optional.empty();
    }

    /**
     * 리소스 소유권(작성자) 검증. 관리자(ADMIN/SYSTEM)는 우회한다.
     * 소유자 식별은 <b>loginId</b> 기준(frstRgtrId 저장값과 동일)이다. — IDOR 방어 표준 가드.
     *
     * @param ownerLoginId 리소스의 작성자 loginId (보통 {@code entity.getFrstRgtrId()})
     * @throws BusinessException ACCESS_DENIED — 관리자가 아니고 현재 사용자가 소유자가 아닐 때
     */
    public static void assertOwnerOrAdmin(String ownerLoginId) {
        if (hasRole(AuthorityConstants.ROLE_ADMIN) || hasRole(AuthorityConstants.ROLE_SYSTEM)) {
            return;
        }
        String current = getCurrentLoginId().orElse(null);
        if (current == null || !current.equals(ownerLoginId)) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
    }
}
