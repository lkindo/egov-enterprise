package com.company.project.security.test;

import com.company.project.foundation.security.jwt.JwtTokenProvider;
import com.company.project.foundation.service.user.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;
import com.company.project.config.SecurityTestConfig;

/**
 * 癰귣똻釉??온?????뮞?紐? ?袁る립 甕곗쥙????????
 * ?⑤벏??怨몄뵥 Mock ??쇱젟??Spring Context ?닌딄쉐???⑤벊???뤿연 ???뮞????얜즲???關湲??쀪텕??筌롫뗀?덄뵳??????깆뱽 餓κ쑴???덈뼄.
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
