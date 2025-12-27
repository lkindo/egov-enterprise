package com.company.project.web.file;

import com.company.project.config.TestSecurityConfig;
import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
public class FileApiControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String accessToken;

    @BeforeEach
    void setUp() {
        // 테스트 사용자 생성
        User testUser = User.builder()
                .userId("fileTestUser")
                .password(passwordEncoder.encode("password"))
                .userNm("파일 테스트 사용자")
                .esntlId("USR_FILE_001")
                .role(Role.USER)
                .build();
        userRepository.saveAndFlush(testUser);

        // JWT 토큰 생성
        accessToken = jwtTokenProvider.createToken("USR_FILE_001", "ROLE_USER");
    }

    @Test
    @DisplayName("파일 업로드 성공")
    void uploadFiles_success() throws Exception {
        MockMultipartFile file1 = new MockMultipartFile(
                "files",
                "test1.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "Hello World 1".getBytes());

        mockMvc.perform(multipart("/api/v1/files")
                .file(file1)
                .header("Authorization", "Bearer " + accessToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists());
    }

    @Test
    @DisplayName("인증 없이 파일 업로드 시 401 에러")
    void uploadFiles_unauthorized() throws Exception {
        MockMultipartFile file1 = new MockMultipartFile(
                "files",
                "test1.txt",
                MediaType.TEXT_PLAIN_VALUE,
                "Hello World 1".getBytes());

        mockMvc.perform(multipart("/api/v1/files")
                .file(file1))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }
}
