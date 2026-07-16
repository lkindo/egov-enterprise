package nuri.business.security.annotation;

import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

public class WithMockCustomUserSecurityContextFactory implements WithSecurityContextFactory<WithMockCustomUser> {

    @Override
    public SecurityContext createSecurityContext(WithMockCustomUser customUser) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();

        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(customUser.username())
                .esntlId(customUser.esntlId())
                .userNm(customUser.username() + " Name")
                .password("password")
                .roleName(customUser.role())
                .authorCode("ROLE_" + customUser.role())
                .lockAt("N")
                .build();

        Authentication auth = new UsernamePasswordAuthenticationToken(principal, "password", principal.getAuthorities());
        context.setAuthentication(auth);
        return context;
    }
}
