package nuri.auth;

import nuri.foundation.support.IntegrationTest;
import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@DisplayName("인증 컨트롤러 통합 테스트")
public class AuthenticationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private nuri.foundation.domain.auth.UserAuthorityRepository userAuthorityRepository;

    @BeforeEach
    void setUp() {
        userAuthorityRepository.deleteAll();
        userRepository.deleteAll();
        
        String userId = "testuser";
        String esntlId = "USR001";
        
        User user = User.builder()
                .userId(userId)
                .esntlId(esntlId)
                .password(passwordEncoder.encode("password"))
                .userNm("테스트")
                .role(Role.USER)
                .statusCode("A")
                .build();
        userRepository.save(user);
        
        userAuthorityRepository.save(nuri.foundation.domain.auth.UserAuthority.builder()
                .uniqId(esntlId)
                .authorCode("ROLE_USER")
                .mberTyCode("USR")
                .build());
        
        userRepository.flush();
        userAuthorityRepository.flush();
    }

    @Test
    @DisplayName("로그인 성공 시나리오")
    void loginSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"testuser\", \"password\":\"password\"}"))
                .andExpect(status().isOk());
    }
}
