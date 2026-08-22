package nuri.api.controller.business.board;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BoardApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("BoardApiController 테스트")
class BoardApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private BoardService boardService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("게시글 목록 조회 성공")
    void getPosts_Success() throws Exception {
        // Given
        Page<BoardDto> page = new PageImpl<>(List.of(BoardDto.builder().pstSn(1L).pstTtl("Subject").build()));
        given(boardService.getBoardPosts(anyString(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/boards/BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].pstSn").value(1));

        verify(boardService).getBoardPosts(
                eq("BBS_001"), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class));
    }

    @Test
    @DisplayName("게시글 상세 조회 성공")
    void getPost_Success() throws Exception {
        // Given
        given(boardService.getPostDetail(anyString(), any(Long.class))).willReturn(BoardDto.builder().pstSn(1L).build());

        // When & Then
        mockMvc.perform(get("/api/v1/boards/BBS_001/posts/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pstSn").value(1));
    }

    @Test
    @DisplayName("공개 FAQ 목록 요청은 전용 공개 projection으로 위임")
    void getPublicFaqs_UsesDedicatedClosedProjection() throws Exception {
        Page<BoardDto> page = new PageImpl<>(List.of(
                BoardDto.builder()
                        .pstSn(1L)
                        .bbsId("BBSMSTR_AAAAAAAAAAAA")
                        .pstTtl("Public FAQ")
                        .pstCn("must-not-be-in-list")
                        .userId("must-not-be-in-response")
                        .useYn("Y")
                        .scrtYn("N")
                        .build()));
        given(boardService.getPublicFaqPosts(eq("account"), any(Pageable.class)))
                .willReturn(page);

        mockMvc.perform(get("/api/v1/boards/public-faqs")
                        .param("keyword", "account")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].pstSn").value(1))
                .andExpect(jsonPath("$.data.list[0].bbsId").value("BBSMSTR_AAAAAAAAAAAA"))
                .andExpect(jsonPath("$.data.list[0].useYn").value("Y"))
                .andExpect(jsonPath("$.data.list[0].scrtYn").value("N"))
                .andExpect(jsonPath("$.data.list[0].pstCn").doesNotExist())
                .andExpect(jsonPath("$.data.list[0].userId").doesNotExist());

        verify(boardService).getPublicFaqPosts(eq("account"), any(Pageable.class));
    }

    @Test
    @DisplayName("공개 FAQ 상세 요청은 비밀글 제외 전용 상세로 위임")
    void getPublicFaqDetail_UsesDedicatedClosedProjection() throws Exception {
        given(boardService.getPublicFaqDetail(42L))
                .willReturn(BoardDto.builder()
                        .pstSn(42L)
                        .bbsId("BBSMSTR_AAAAAAAAAAAA")
                        .pstCn("public answer")
                        .useYn("Y")
                        .scrtYn("N")
                        .build());

        mockMvc.perform(get("/api/v1/boards/public-faqs/42")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pstSn").value(42))
                .andExpect(jsonPath("$.data.pstCn").value("public answer"))
                .andExpect(jsonPath("$.data.bbsId").value("BBSMSTR_AAAAAAAAAAAA"))
                .andExpect(jsonPath("$.data.useYn").value("Y"))
                .andExpect(jsonPath("$.data.scrtYn").value("N"))
                .andExpect(jsonPath("$.data.userId").doesNotExist())
                .andExpect(jsonPath("$.data.userNm").doesNotExist())
                .andExpect(jsonPath("$.data.pswd").doesNotExist())
                .andExpect(jsonPath("$.data.atchFileSn").doesNotExist())
                .andExpect(jsonPath("$.data.qnaSttsCd").doesNotExist());

        verify(boardService).getPublicFaqDetail(42L);
    }

    @Test
    @DisplayName("게시판 통계 응답은 viewer-scoped 서비스 집계 필드를 그대로 노출한다")
    void getStats_UsesViewerScopedServiceResponse() throws Exception {
        given(boardService.getBoardStats("BBS_001")).willReturn(BoardStatsResponse.builder()
                .totalArticles(3L)
                .totalViews(305L)
                .topContributor("Visible contributor")
                .intelligenceScore(76)
                .build());

        mockMvc.perform(get("/api/v1/boards/BBS_001/stats")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalArticles").value(3))
                .andExpect(jsonPath("$.data.totalViews").value(305))
                .andExpect(jsonPath("$.data.topContributor").value("Visible contributor"))
                .andExpect(jsonPath("$.data.intelligenceScore").value(76));

        verify(boardService).getBoardStats("BBS_001");
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("게시글 생성 성공")
    void createPost_Success() throws Exception {
        // Given
        given(boardService.createPost(anyString(), any(BoardSaveRequest.class))).willReturn(1L);

        // When & Then
        mockMvc.perform(post("/api/v1/boards/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsId\":\"BBS_001\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("1"));
    }
}
