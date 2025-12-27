package com.company.project.web.board;

import com.company.project.config.TestSecurityConfig;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 게시판 API 통합 테스트
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Import(TestSecurityConfig.class)
class BoardApiControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String accessToken;
    private BoardMaster testBoardMaster;

    @BeforeEach
    void setUp() {
        // 테스트 사용자 생성
        User testUser = User.builder()
                .userId("testUser")
                .password(passwordEncoder.encode("password"))
                .userNm("테스트 사용자")
                .esntlId("USR_TEST001")
                .role(Role.USER)
                .build();
        userRepository.saveAndFlush(testUser);

        // JWT 토큰 생성 (esntlId를 subject로 사용해야 CustomUserDetailsService가 찾을 수 있음)
        accessToken = jwtTokenProvider.createToken("USR_TEST001", "ROLE_USER");

        // 테스트 게시판 마스터 생성
        testBoardMaster = BoardMaster.builder()
                .bbsId("TEST_BBS")
                .bbsNm("테스트 게시판")
                .bbsTyCode("BBST01")
                .bbsAttrbCode("BBSA01")
                .useAt("Y")
                .fileAtchPosblAt("Y")
                .atchPosblFileNumber(3)
                .build();
        boardMasterRepository.saveAndFlush(testBoardMaster);
    }

    @Test
    @DisplayName("게시물 목록 조회 - 인증된 사용자")
    void getBoardList_authenticated() throws Exception {
        mockMvc.perform(get("/api/v1/boards/{bbsId}", testBoardMaster.getBbsId())
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("게시물 목록 조회 - 인증되지 않은 사용자 (401)")
    void getBoardList_unauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/boards/{bbsId}", testBoardMaster.getBbsId())
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("존재하지 않는 게시판 조회 (404)")
    void getBoardList_notFound() throws Exception {
        mockMvc.perform(get("/api/v1/boards/{bbsId}", "NOT_EXIST")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isNotFound());
    }

}
