package com.company.project.auth;

import com.company.foundation.support.IntegrationTest;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
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
@DisplayName("인증 컨트롤러 통합 테스트")
public class AuthenticationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        User user = User.builder()
                .userId("testuser")
                .password("$2a$10$7p.Y/lGubU3H.TzQvP.Yle3L1U.S1.S1.S1.S1.S1.S1.S1.S1.S1") // password
                .userNm("테스트")
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(user);
    }

    @Test
    @DisplayName("로그인 성공 시나리오")
    void loginSuccess() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"testuser\", \"password\":\"password\"}"))
                .andExpect(status().isOk());
    }
}
