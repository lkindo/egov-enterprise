package nuri.security.test;

import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.service.user.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;
import nuri.config.SecurityTestConfig;

/**
 * 시큐리티 테스트를 위한 기본 추상 클래스
 * MockMvc를 이용한 보안 테스트 환경을 제공하며, 필요한 인증 빈을 Mock으로 설정한다.
 */
@SpringBootTest(classes = nuri.ApiServerApplication.class, properties = {
    "spring.main.allow-bean-definition-overriding=true",
    "springdoc.api-docs.enabled=false"
})
@AutoConfigureMockMvc
@ActiveProfiles({ "test", "mock-security-test" })
@Import(SecurityTestConfig.class)
public abstract class BaseSecurityTest {

    @Autowired
    protected MockMvc mockMvc;

    @MockitoBean
    protected UserService userService;

    @MockitoBean
    protected JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    protected org.springframework.security.authentication.AuthenticationManager authenticationManager;
}
