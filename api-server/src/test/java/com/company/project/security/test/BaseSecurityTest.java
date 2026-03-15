package com.company.project.security.test;

import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.user.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;
import com.company.project.config.SecurityTestConfig;

/**
 * 보안 관련 테스트를 위한 베이스 클래스.
 * 공통적인 Mock 설정과 Spring Context 구성을 공유하여 테스트 속도를 향상시키고 메모리 사용량을 줄입니다.
 */
@SpringBootTest(properties = {
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
}
