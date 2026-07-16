package nuri.business.security.annotation;

import org.springframework.security.test.context.support.WithSecurityContext;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockCustomUserSecurityContextFactory.class)
public @interface WithMockCustomUser {
    String username() default "user01";
    String esntlId() default "user01";
    String role() default "USER";
}
