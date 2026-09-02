package nuri.api.controller.business.comment;

import nuri.business.service.comment.CommentService;
import nuri.business.service.comment.dto.CommentDto;
import nuri.business.service.board.BoardService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CommentApiController 테스트")
class CommentApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CommentService commentService;

    @Mock
    private BoardService boardService;

    @InjectMocks
    private CommentApiController commentApiController;

    /** 인증 주체를 심어 두는 principal. 작성자 신원이 여기서 와야 한다. */
    private static final nuri.foundation.security.service.CustomUserDetails PRINCIPAL =
            nuri.foundation.security.service.CustomUserDetails.builder()
                    .userId("writer01")
                    .esntlId("USRCNFRM_00000000001")
                    .userNm("홍길동")
                    .roleName("USER")
                    .build();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(commentApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(
                        new org.springframework.data.web.PageableHandlerMethodArgumentResolver(),
                        // ⚠ 이 리졸버가 없으면 @AuthenticationPrincipal 파라미터가 **null 로 조용히 주입**돼
                        //   "작성자를 인증 주체에서 채운다" 는 계약이 검증되지 않은 채 green 이 된다.
                        new org.springframework.security.web.method.annotation
                                .AuthenticationPrincipalArgumentResolver())
                .build();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        PRINCIPAL, null, PRINCIPAL.getAuthorities()));
    }

    @org.junit.jupiter.api.AfterEach
    void clearSecurityContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("댓글 목록 조회 성공")
    void getComments_Success() throws Exception {
        // Given
        Page<CommentDto> page = new PageImpl<>(List.of(
                CommentDto.builder()
                        .ansSn(1L)
                        .pstSn(1L)
                        .bbsId("BBS_001")
                        .ansCn("Comment")
                        .pswd("response-must-not-expose-this")
                        .build()
        ));
        given(commentService.getComments(any(Long.class), anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/comments")
                .param("pstSn", "1")
                .param("bbsId", "BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].ansSn").value(1))
                .andExpect(jsonPath("$.data.list[0].wrterId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.list[0].wrterNm").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.list[0].frstRgtrId").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.list[0].crtDt").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.list[0].pswd").doesNotExist());
        verify(boardService).assertCommentAccess("BBS_001", 1L);
    }

    @Test
    @DisplayName("댓글 생성 성공 — 작성자는 인증 주체에서 온다")
    void createComment_Success() throws Exception {
        // Given
        given(commentService.createComment(anyString(), anyString(), any(CommentDto.class))).willReturn(1L);

        // When & Then
        mockMvc.perform(post("/api/v1/comments")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pstSn\":\"1\", \"bbsId\":\"BBS_001\", \"ansCn\":\"Content\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(1));

        // 종전에는 요청 본문의 작성자를 그대로 저장했고, 화면이 그 필드를 보내지 않아 전 건이 null 이었다.
        verify(commentService).createComment(
                org.mockito.ArgumentMatchers.eq("USRCNFRM_00000000001"),
                org.mockito.ArgumentMatchers.eq("홍길동"),
                any(CommentDto.class));
        verify(boardService).assertCommentAccess("BBS_001", 1L);
    }

    @Test
    @DisplayName("[위조 차단] 요청이 작성자를 주장해도 저장되는 값은 인증 주체의 것이다")
    void createComment_ignoresClaimedAuthor() throws Exception {
        given(commentService.createComment(anyString(), anyString(), any(CommentDto.class))).willReturn(2L);

        mockMvc.perform(post("/api/v1/comments")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pstSn\":\"1\",\"bbsId\":\"BBS_001\",\"ansCn\":\"Content\","
                        + "\"wrterId\":\"SPOOFED_ID\",\"wrterNm\":\"남의이름\","
                        + "\"crtDt\":\"2099-01-01T00:00:00\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // DTO 의 두 필드는 READ_ONLY 라 요청 값이 바인딩되지 않는다(400 이 아니라 무시다).
        org.mockito.ArgumentCaptor<CommentDto> body = org.mockito.ArgumentCaptor.forClass(CommentDto.class);
        verify(commentService).createComment(
                org.mockito.ArgumentMatchers.eq("USRCNFRM_00000000001"),
                org.mockito.ArgumentMatchers.eq("홍길동"),
                body.capture());
        assertThat(body.getValue().getWrterId()).isNull();
        assertThat(body.getValue().getWrterNm()).isNull();
        assertThat(body.getValue().getCrtDt()).isNull();
    }

    @Test
    @DisplayName("비밀글·게시판 불일치 접근이 거부되면 댓글 조회를 실행하지 않는다")
    void getComments_deniedPostDoesNotReadComments() throws Exception {
        doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(boardService).assertCommentAccess("WRONG_BBS", 1L);

        mockMvc.perform(get("/api/v1/comments")
                        .param("pstSn", "1")
                        .param("bbsId", "WRONG_BBS"))
                .andExpect(status().isForbidden());

        verify(commentService, never()).getComments(anyLong(), anyString(), any(Pageable.class));
    }

    @Test
    @DisplayName("댓글 삭제 성공")
    void deleteComment_Success() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/comments/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
