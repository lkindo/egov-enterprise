package nuri.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = nuri.ApiServerApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Authentication API 통합 테스트")
class AuthenticationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private io.micrometer.core.instrument.MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        User testUser = User.builder()
                .userId("testuser")
                .pswd(passwordEncoder.encode("password123!"))
                .userNm("Test User")
                .esntlId("USR_0000000000001")
                .userSttsCd("P")
                .build();
        userRepository.save(testUser);
    }

    @Test
    @DisplayName("로그인 성공 및 토큰 반환")
    void login_success() throws Exception {
        Map<String, String> loginRequest = Map.of(
                "userId", "testuser",
                "password", "password123!"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.groups").isEmpty())
                .andExpect(jsonPath("$.data.permissions").isEmpty())
                .andExpect(jsonPath("$.data.authorizationVersion").isString());
    }

    @Test
    @DisplayName("로그인 실패 - 잘못된 비밀번호")
    void login_fail_wrongPassword() throws Exception {
        Map<String, String> loginRequest = Map.of(
                "userId", "testuser",
                "password", "wrongpassword"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    /**
     * 로그인 실패 경보의 원천 계약. {@code config/observability/prometheus-alert-rules.yml} 의 로그인 실패 경보는
     * 별도 카운터가 아니라 표준 요청 메트릭({@code http_server_requests_seconds_count})의 {@code uri}·{@code status}
     * 태그에 결속한다. 태그 값이 핸들러 패턴이 아니게 되거나(예: 필터에서 401 을 끝내 {@code UNKNOWN}) 상태가 401 이
     * 아니게 되면 경보는 오류 없이 영원히 조용해지므로, 그 두 값을 실제 요청으로 고정한다.
     */
    @Test
    @DisplayName("[2026-09-14] 로그인 실패는 uri=/api/v1/auth/login·status=401 요청 메트릭으로 남는다 — 경보 결속 대상")
    void login_fail_isRecordedForAlerting() throws Exception {
        double before = loginRequests("401");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("userId", "testuser", "password", "wrongpassword"))))
                .andExpect(status().isUnauthorized());

        assertThat(loginRequests("401") - before).isEqualTo(1.0);
    }

    private double loginRequests(String status) {
        io.micrometer.core.instrument.Timer timer = meterRegistry.find("http.server.requests")
                .tag("uri", "/api/v1/auth/login")
                .tag("status", status)
                .timer();
        return timer == null ? 0 : timer.count();
    }
}
