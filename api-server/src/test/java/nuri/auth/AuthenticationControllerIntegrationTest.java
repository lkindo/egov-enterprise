package nuri.auth;

import nuri.foundation.support.IntegrationTest;
import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@AutoConfigureMockMvc
@org.springframework.data.jpa.repository.config.EnableJpaRepositories(basePackages = "nuri")
@org.springframework.boot.autoconfigure.domain.EntityScan(basePackages = "nuri")
@DisplayName("인증 컨트롤러 통합 테스트")
public class AuthenticationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private nuri.foundation.security.service.EgovPasswordEncoder egovPasswordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        User user = User.builder()
                .userId("testuser")
                .esntlId("USR001")
                .password(egovPasswordEncoder.encode("password", "testuser"))
                .userNm("테스트")
                .role(Role.USER)
                .build();
        userRepository.save(user);
    }

    @Test
    @DisplayName("로그인 성공 시나리오")
    void loginSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"testuser\", \"password\":\"password\"}"))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk());
    }
}
