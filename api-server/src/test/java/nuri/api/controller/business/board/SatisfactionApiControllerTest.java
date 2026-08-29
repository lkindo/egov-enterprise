package nuri.api.controller.business.board;

import nuri.business.service.board.SatisfactionService;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.security.annotation.AdminOnly;
import nuri.foundation.security.annotation.Authenticated;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("SatisfactionApiController 테스트")
class SatisfactionApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SatisfactionService satisfactionService;

    @InjectMocks
    private SatisfactionApiController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    /**
     * 🔒 <b>관리자 대리 삭제만 {@code @AdminOnly} 여야 한다 — 양방향으로 못 박는다.</b>
     *
     * <p>넓히면(일반 삭제에 {@code @AdminOnly} 부재를 넘어 대리 삭제까지 열리면) 비밀번호 검증이
     * 무의미해지고, 반대로 일반 삭제까지 {@code @AdminOnly} 로 좁히면 <b>익명 작성자가 자기 글을
     * 지울 수 없다</b>. standalone MockMvc 는 {@code @PreAuthorize} 를 강제하지 않아 어느 쪽으로
     * 틀어져도 기능 테스트는 초록이므로, 애노테이션 배치를 리플렉션으로 직접 단언한다.
     */
    @Test
    @DisplayName("🔒 @AdminOnly 는 대리 삭제(moderate) 하나뿐 — 다른 핸들러로 번지면 안 된다")
    void onlyModerateIsAdminOnly() {
        List<Method> mapped = Arrays.stream(SatisfactionApiController.class.getDeclaredMethods())
                .filter(m -> Arrays.stream(m.getAnnotations())
                        .anyMatch(a -> a.annotationType().getName().startsWith("org.springframework.web.bind")))
                .toList();

        assertThat(mapped)
                .as("매핑 핸들러 6개 — 늘어나면 이 단언이 먼저 깨져 인가 검토를 강제한다")
                .hasSize(6);

        for (Method m : mapped) {
            boolean isModerate = m.getName().equals("moderate");
            assertThat(m.isAnnotationPresent(AdminOnly.class))
                    .as("%s 의 @AdminOnly 여부는 %s 여야 한다", m.getName(), isModerate)
                    .isEqualTo(isModerate);
            // 나머지 5개는 @Authenticated 여야 한다. 이걸 지우면 전역 규칙에만 기대게 되는데,
            // 그 상태를 SecurityAuthAnnotationLinterTest 가 이미 위반으로 판정한 바 있다.
            assertThat(m.isAnnotationPresent(Authenticated.class))
                    .as("%s 의 @Authenticated 여부는 %s 여야 한다", m.getName(), !isModerate)
                    .isEqualTo(!isModerate);
        }
    }

    /** 경로가 조회 범위를 강제하는지 — 본문이 다른 게시글을 가리켜도 경로가 이겨야 한다. */
    @Test
    @DisplayName("등록 - 경로의 bbsId/pstSn 가 본문 값을 덮어쓴다 (교차 게시글 등록 차단)")
    void createOverridesBodyIdsWithPathVariables() throws Exception {
        when(satisfactionService.createSatisfaction(any(), any())).thenReturn(1L);

        mockMvc.perform(post("/api/v1/boards/BBS_01/posts/1/satisfactions")
                        .contentType("application/json")
                        .content("{\"bbsId\":\"BBS_OTHER\",\"pstSn\":999,\"dgstfnScr\":5,\"useYn\":\"Y\",\"pswd\":\"x\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<SatisfactionDto> captor = ArgumentCaptor.forClass(SatisfactionDto.class);
        verify(satisfactionService).createSatisfaction(any(), captor.capture());
        assertThat(captor.getValue().getBbsId()).isEqualTo("BBS_01");
        assertThat(captor.getValue().getPstSn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("목록 - 경로의 bbsId/pstSn 가 서비스까지 전달된다")
    void listPassesPathVariables() throws Exception {
        when(satisfactionService.getSatisfactionList(anyString(), any(Long.class)))
                .thenReturn(List.of(SatisfactionDto.builder().dgstfnSn(1L).dgstfnScr(5).build()));

        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/1/satisfactions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].dgstfnScr").value(5));

        verify(satisfactionService).getSatisfactionList("BBS_01", 1L);
    }

    /** 삭제 자격(pswd)이 쿼리에서 서비스까지 도달해야 한다 — 유실되면 인가가 통째로 무력화된다. */
    @Test
    @DisplayName("🔒 삭제 - pswd 자격이 서비스까지 전달된다")
    void deletePassesPasswordToService() throws Exception {
        mockMvc.perform(delete("/api/v1/boards/BBS_01/posts/1/satisfactions/10").param("pswd", "secret"))
                .andExpect(status().isOk());

        verify(satisfactionService).deleteSatisfaction(eq(10L), isNull(), eq("secret"));
    }

    /**
     * [2026-08-29] 이 테스트는 종전에 <b>결함을 계약으로 고정</b>하고 있었다 —
     * "평균 - 응답이 없으면 0.0 으로 내려간다 (null 직렬화 회피)".
     *
     * <p>이름이 이유까지 정직하게 적어 두었다: {@code Map.of} 는 null 값을 담으면 NPE 라
     * 평가가 없는 경우를 0.0 으로 바꿀 수밖에 없었다. 그런데 같은 핸들러의 {@code @Operation}
     * 설명은 "응답이 없으면 null 이다 — 0 과 구분해야 한다" 로 <b>정반대를 약속</b>했고,
     * 화면은 그 0.0 을 그대로 별점으로 그려 <b>아무도 평가하지 않은 게시글과 모두가 최하점을
     * 준 게시글이 똑같이 보였다</b>.
     *
     * <p>전용 DTO 로 이행하면서 제약 자체가 사라졌으므로 계약을 뒤집는다.
     */
    @Test
    @DisplayName("평균 - 평가가 없으면 null 이다 (0 과 구분한다)")
    void averageKeepsNullWhenNobodyRated() throws Exception {
        when(satisfactionService.getAverageSatisfaction(anyString(), any(Long.class))).thenReturn(null);

        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/1/satisfactions/average"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.average").doesNotExist());
    }

    @Test
    @DisplayName("평균 - 실제 평균이 있으면 그 값을 그대로 싣는다")
    void averageCarriesMeasuredValue() throws Exception {
        when(satisfactionService.getAverageSatisfaction(anyString(), any(Long.class))).thenReturn(4.5);

        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/1/satisfactions/average"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.average").value(4.5));
    }

    @Test
    @DisplayName("대리 삭제 - 관리자 경로가 서비스의 moderator 메서드를 호출한다")
    void moderateCallsModeratorPath() throws Exception {
        mockMvc.perform(delete("/api/v1/boards/BBS_01/posts/1/satisfactions/10/moderate"))
                .andExpect(status().isOk());

        // 일반 삭제 경로로 새면 비밀번호 검증을 우회하게 된다.
        verify(satisfactionService).deleteByModerator(any(Long.class), any());
    }
}
