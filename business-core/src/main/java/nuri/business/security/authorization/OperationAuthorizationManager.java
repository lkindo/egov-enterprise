package nuri.business.security.authorization;

import java.util.List;
import java.util.function.Supplier;
import org.springframework.http.server.PathContainer;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

/** Exact HTTP method plus the most specific reviewed path; unknown operations are denied. */
public final class OperationAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {
    private record Entry(PermissionPolicy.Binding binding, PathPattern pattern) {}
    private final PermissionPolicy policy;
    private final List<Entry> entries;
    public OperationAuthorizationManager(PermissionPolicy policy) {
        this.policy=policy;
        this.entries=policy.bindings().stream().map(b -> new Entry(b,PathPatternParser.defaultInstance.parse(b.path())))
                .sorted((a,b) -> PathPattern.SPECIFICITY_COMPARATOR.compare(a.pattern(),b.pattern())).toList();
    }

    @Override
    @SuppressWarnings("deprecation")
    public AuthorizationDecision check(Supplier<Authentication> authentication,RequestAuthorizationContext context) {
        var request=context.getRequest();
        String uri=request.getRequestURI().substring(request.getContextPath().length());
        String method="HEAD".equals(request.getMethod())?"GET":request.getMethod();
        var path=PathContainer.parsePath(uri);
        return entries.stream().filter(e -> e.binding().method().equals(method) && e.pattern().matches(path))
                .findFirst().map(e -> new AuthorizationDecision(policy.allows(authentication.get(),e.binding())))
                .orElseGet(() -> new AuthorizationDecision(false));
    }
}
