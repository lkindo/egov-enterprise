package nuri.api.controller.business.board;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.SatisfactionService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("SatisfactionApiController 테스트")
class SatisfactionApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SatisfactionService satisfactionService;

    // [2026-09-05] 게시글 가시성 가드. 기본 mock 은 아무것도 던지지 않으므로 기존 테스트는 그대로 통과한다.
    @Mock
    private BoardService boardService;

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
     * <p>넓히면(대리 삭제까지 열리면) 관리자 moderation 경계가 사라지고, 반대로 일반 삭제까지
     * {@code @AdminOnly} 로 좁히면 <b>일반 사용자인 소유자가 자기 평가를 지울 수 없다</b>.
     * standalone MockMvc 는 {@code @PreAuthorize} 를 강제하지 않아 어느 쪽으로
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
        when(satisfactionService.createSatisfaction(any())).thenReturn(1L);

        mockMvc.perform(post("/api/v1/boards/BBS_01/posts/1/satisfactions")
                        .contentType("application/json")
                        .content("{\"bbsId\":\"BBS_OTHER\",\"pstSn\":999,\"dgstfnScr\":5,\"useYn\":\"Y\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<SatisfactionDto> captor = ArgumentCaptor.forClass(SatisfactionDto.class);
        verify(satisfactionService).createSatisfaction(captor.capture());
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

    /**
     * 삭제 자격은 인증 주체와 저장된 작성자 감사 필드로 판정한다. 자격증명을 URL query 로
     * 다시 받으면 브라우저·프록시 access log 에 남으므로 핸들러 표면에서부터 없어야 한다.
     */
    @Test
    @DisplayName("🔒 삭제 - URL 자격증명 없이 owner/admin 서비스 경로만 호출한다")
    void deleteUsesAuthenticatedOwnerPathWithoutCredentialQuery() throws Exception {
        Method deleteHandler = SatisfactionApiController.class.getDeclaredMethod(
                "delete", String.class, Long.class, Long.class);
        assertThat(deleteHandler.getParameters())
                .allSatisfy(parameter -> assertThat(parameter.isAnnotationPresent(
                        org.springframework.web.bind.annotation.RequestParam.class)).isFalse());

        mockMvc.perform(delete("/api/v1/boards/BBS_01/posts/1/satisfactions/10"))
                .andExpect(status().isOk());

        verify(satisfactionService).deleteSatisfaction(10L);
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
     *
     * <p>⚠ <b>{@code jsonPath(...).doesNotExist()} 로 검사하지 않는다</b> — Spring 의 그 matcher 는
     * <b>JSON null 에도 통과</b>해서, 서버가 {@code "average":null} 을 실어도 green 이 된다.
     * 실제로 그 눈먼 단언 때문에 "키가 없다" 고 믿었고, 소비자가 {@code === undefined} 로
     * 검사하다가 CI e2e 에서 터졌다({@code Cannot read properties of null}). 원문으로 못박는다.
     */
    @Test
    @DisplayName("평균 - 평가가 없으면 null 이다 (0 과 구분한다)")
    void averageKeepsNullWhenNobodyRated() throws Exception {
        when(satisfactionService.getAverageSatisfaction(anyString(), any(Long.class))).thenReturn(null);

        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/1/satisfactions/average"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("average"))));
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

        // 일반 owner/admin 경로와 moderation 경로는 서비스에서도 분리한다.
        verify(satisfactionService).deleteByModerator(10L);
    }

    /**
     * 🔒 <b>게시글 가시성 가드 — 볼 수 없는 글의 만족도는 읽을 수도 남길 수도 없다.</b>
     *
     * <p>[2026-09-05] 종전에는 조회 두 개와 등록이 {@code useYn='Y'} 만 걸렀다. 인증 사용자면 누구나
     * pstSn 을 순차 열거해 <b>비밀글의 자유서술과 평가자 이름</b>을 읽을 수 있었다. 형제 자원인
     * 댓글은 같은 {@code assertCommentAccess} 로 막고 있었고 만족도만 빠져 있던 비대칭이다.
     *
     * <p>⚠ 가드가 <b>서비스 호출보다 먼저</b> 돌아야 한다. 순서가 뒤집히면 403 은 나지만 조회는
     * 이미 실행돼 로그·캐시에 흔적이 남는다. {@code never()} 로 그 순서까지 고정한다.
     */
    @Test
    @DisplayName("🔒 볼 수 없는 글의 만족도 목록은 403 이고 서비스에 닿지 않는다")
    void listOnInaccessiblePostIsForbiddenBeforeService() throws Exception {
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(boardService).assertCommentAccess("BBS_01", 99L);

        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/99/satisfactions"))
                .andExpect(status().isForbidden());

        verify(satisfactionService, never()).getSatisfactionList(anyString(), anyLong());
    }

    @Test
    @DisplayName("🔒 볼 수 없는 글의 만족도 평균도 403 이다 — 집계값도 글의 존재를 드러낸다")
    void averageOnInaccessiblePostIsForbidden() throws Exception {
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(boardService).assertCommentAccess("BBS_01", 99L);

        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/99/satisfactions/average"))
                .andExpect(status().isForbidden());

        verify(satisfactionService, never()).getAverageSatisfaction(anyString(), anyLong());
    }

    @Test
    @DisplayName("🔒 볼 수 없는 글에는 만족도를 남길 수 없다 — 댓글 등록과 같은 자리의 같은 검사")
    void createOnInaccessiblePostIsForbiddenBeforeService() throws Exception {
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(boardService).assertCommentAccess("BBS_01", 99L);

        mockMvc.perform(post("/api/v1/boards/BBS_01/posts/99/satisfactions")
                        .contentType("application/json")
                        .content("{\"dgstfnScr\":5,\"useYn\":\"Y\"}"))
                .andExpect(status().isForbidden());

        verify(satisfactionService, never()).createSatisfaction(any());
    }

    @Test
    @DisplayName("볼 수 있는 글은 조회·평균·등록 모두 가드를 지나 정상 처리된다 — 가드가 과잉이면 여기가 red")
    void accessiblePostPassesGuardOnAllThreePaths() throws Exception {
        when(satisfactionService.getSatisfactionList("BBS_01", 1L)).thenReturn(List.of());
        when(satisfactionService.getAverageSatisfaction("BBS_01", 1L)).thenReturn(4.0);
        when(satisfactionService.createSatisfaction(any())).thenReturn(7L);

        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/1/satisfactions")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/boards/BBS_01/posts/1/satisfactions/average")).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/boards/BBS_01/posts/1/satisfactions")
                        .contentType("application/json")
                        .content("{\"dgstfnScr\":5,\"useYn\":\"Y\"}"))
                .andExpect(status().isOk());

        // 세 경로 전부 가드를 지났음을 호출 횟수로 고정한다 — 하나라도 빠지면 그 경로가 다시 열린 것이다.
        verify(boardService, org.mockito.Mockito.times(3)).assertCommentAccess("BBS_01", 1L);
    }
}
