package nuri.business.security.authorization;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

import java.util.function.Supplier;

/**
 * 섀도우 인가 로거.
 *
 * <p>기존 하드코딩 인가(enforce)와 DB 기반 인가(shadow)의 결정을 <b>병렬 평가</b>하여,
 * 불일치가 있을 경우 WARN 로그를 남긴다. enforce 결정은 항상 기존 하드코딩을 따른다.
 *
 * <p>프로퍼티 {@code rbac.shadow.enabled=true}로 활성화/비활성화한다.
 */
@Slf4j
@SuppressWarnings("deprecation")
public class ShadowAuthorizationLogger implements AuthorizationManager<RequestAuthorizationContext> {

    private final AuthorizationManager<RequestAuthorizationContext> enforceManager;
    private final AuthorizationManager<RequestAuthorizationContext> shadowManager;
    private volatile boolean enabled;

    /**
     * @param enforceManager 실제 인가 결정을 내리는 매니저 (기존 하드코딩)
     * @param shadowManager  DB 기반 인가 결정을 내리는 매니저 (섀도우)
     * @param enabled        섀도우 평가 활성화 여부
     */
    public ShadowAuthorizationLogger(
            AuthorizationManager<RequestAuthorizationContext> enforceManager,
            AuthorizationManager<RequestAuthorizationContext> shadowManager,
            boolean enabled) {
        this.enforceManager = enforceManager;
        this.shadowManager = shadowManager;
        this.enabled = enabled;
    }

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authentication, RequestAuthorizationContext context) {
        // enforce 결정은 항상 기존 하드코딩
        AuthorizationDecision enforceDecision = enforceManager.check(authentication, context);

        if (!enabled) {
            return enforceDecision;
        }

        // 섀도우(DB) 평가
        try {
            AuthorizationDecision shadowDecision = shadowManager.check(authentication, context);

            boolean enforceGranted = enforceDecision != null && enforceDecision.isGranted();
            boolean shadowGranted = shadowDecision != null && shadowDecision.isGranted();

            if (enforceGranted != shadowGranted) {
                String requestUri = context.getRequest().getRequestURI();
                Authentication auth = authentication.get();
                String principal = auth != null ? auth.getName() : "anonymous";

                log.warn("[SHADOW_MISMATCH] URI={}, principal={}, enforce={}, shadow={}",
                        requestUri, principal, enforceGranted, shadowGranted);
            }
        } catch (Exception e) {
            log.warn("[SHADOW_ERROR] 섀도우 인가 평가 중 오류: {}", e.getMessage());
        }

        // 항상 enforce 결정을 반환
        return enforceDecision;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }
}
