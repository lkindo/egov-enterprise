package com.company.project.api.config;

import com.company.project.foundation.security.iam.EgovAuthenticationProvider;
import com.company.project.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import com.company.project.api.controller.UserApiController;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.core.config.ApplicationContextProvider;
import com.company.project.api.interceptor.OperationalAuditInterceptor;

@WebMvcTest(controllers = UserApiController.class)
@ActiveProfiles({ "prod", "test", "security-test" })
@ContextConfiguration(classes = { ApiSecurityConfig.class })
@DisplayName("ApiSecurityConfig ?ㅼ젙 ?뚯뒪??)
public class ApiSecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovAuthenticationProvider egovAuthenticationProvider;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private OperationalAuditInterceptor operationalAuditInterceptor;

    @Autowired(required = false)
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private SecurityFilterChain apiSecurityFilterChain;

    @Autowired(required = false)
    private AuthenticationManager authenticationManager;

    @Test
    @DisplayName("蹂댁븞 愿??鍮덈뱾???뺤긽?곸쑝濡??깅줉?섏뿀?붿? ?뺤씤")
    void securityBeansLoadedTest() {
        assertThat(passwordEncoder).isNotNull();
        assertThat(apiSecurityFilterChain).isNotNull();
        assertThat(authenticationManager).isNotNull();
    }

    @Test
    @DisplayName("怨듦컻 API ?붾뱶?ъ씤?몃뒗 ?몄쬆 ?놁씠 ?묎렐 媛?ν빐????)
    void publicEndpointsTest() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isNotEqualTo(401);
                    assertThat(status).isNotEqualTo(403);
                });
        
        mockMvc.perform(get("/api/v1/auth/login"))
                .andDo(print())
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).withFailMessage("Expected status not to be 401 but was 401 for /api/v1/auth/login")
                                      .isNotEqualTo(401);
                    assertThat(status).isNotEqualTo(403);
                });
    }

    @Test
    @DisplayName("?몄쬆?섏? ?딆? ?ъ슜?먭? 蹂댄샇??API ?묎렐 ??401??諛섑솚?댁빞 ??)
    void unauthorizedAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("?쇰컲 ?ъ슜?먭? 愿由ъ옄 API ?묎렐 ??403??諛섑솚?댁빞 ??)
    void forbiddenAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("愿由ъ옄 沅뚰븳?쇰줈 愿由ъ옄 API ?묎렐 媛???뺤씤")
    void adminAccessTest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isNotFound()); // 沅뚰븳 ?듦낵 ??而⑦듃濡ㅻ윭 遺?щ줈 404
    }

    @Test
    @DisplayName("CORS ?ㅼ젙 ?뺤씤 - OPTIONS ?붿껌 ??愿???ㅻ뜑媛 ?ы븿?섏뼱????)
    void corsConfigurationTest() throws Exception {
        mockMvc.perform(options("/api/v1/health")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }
}
