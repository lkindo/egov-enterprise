package nuri.business.security.audit;

import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import java.util.Optional;

/**
 * JPA Auditing({@code @CreatedBy}/{@code @LastModifiedBy})을 위해
 * 현재 인증 주체의 <b>loginId</b>({@link CustomUserDetails#getUserId()})를 반환한다.
 *
 * <p>이 값이 {@link nuri.foundation.domain.common.BaseEntity#frstRgtrId} 및
 * {@code lastMdfrId} 감사 컬럼에 기록된다. 따라서 <b>소유권(IDOR) 비교 시
 * {@code entity.getFrstRgtrId()} 와 대조할 식별자는 loginId</b>여야 한다.</p>
 *
 * <p><b>esntlId(시스템 내부 PK)가 아님에 유의한다.</b>
 * 식별자 규약 상세: {@code docs/03-guides/identity-model-guide.md}</p>
 *
 * @see nuri.business.security.util.SecurityUtil#getCurrentLoginId()
 * @see nuri.business.security.util.SecurityUtil#assertOwnerOrAdmin(String)
 */
@Component("loginUserAuditorAware")
public class LoginUserAuditorAware implements AuditorAware<String> {

    /**
     * 현재 인증 주체가 {@link CustomUserDetails}이면 <b>loginId</b>({@link CustomUserDetails#getUserId()})를
     * 반환한다. 인증 정보가 없거나 익명 사용자이면 {@code "SYSTEM"}을 반환한다.
     *
     * <p><b>⚠ fallback 주의:</b> principal 이 {@code CustomUserDetails}가 아닌 비표준 인증
     * (문자열 principal·타 {@code UserDetails} 구현 등)인 경우 {@code authentication.getName()}
     * 이 기록되며, 이 값은 <b>esntlId</b>가 될 수 있다. 표준 로그인 경로(JWT → CustomUserDetails)
     * 에서는 항상 loginId 이므로 감사 컬럼 규약(=loginId)이 성립한다.</p>
     *
     * @return loginId(표준 경로) 또는 {@code "SYSTEM"} (non-null)
     */
    @Override
    @NonNull
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.of("SYSTEM");
        }

        Object principal = authentication.getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            return Optional.of("SYSTEM");
        }

        if (principal instanceof CustomUserDetails) {
            return Optional.of(((CustomUserDetails) principal).getUserId());
        }

        String name = authentication.getName();
        return Optional.ofNullable(name).or(() -> Optional.of("SYSTEM"));
    }
}
