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
import static org.hamcrest.Matchers.nullValue;
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

    /*
     * [2026-09-02] 통합 검색 컨트롤러 계약.
     *
     * 같은 컨트롤러에 @GetMapping("/{bbsId}") 가 있어 "/search" 가 bbsId="search" 로 잡힐 수 있는
     * 자리다. 리터럴 경로가 우선한다는 Spring 규칙에 기대지만, 그 사실을 여기서 고정한다 —
     * 누군가 매핑 순서나 패턴을 바꾸면 검색이 조용히 "search 라는 게시판 조회" 로 변한다.
     * 응답은 PageResponse 가 아니라 bare List 이며(페이지를 넘겨 전량 수집하는 경로를 만들지 않는다),
     * 좁힌 projection 이라 본문·비밀번호가 실리지 않는다.
     */
    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("통합 검색은 /search 리터럴 경로로 잡히고 게시판 목록 조회로 새지 않는다")
    void searchPosts_resolvesLiteralPathNotBbsId() throws Exception {
        Page<BoardDto> page = new PageImpl<>(List.of(BoardDto.builder()
                .pstSn(7L).bbsId("BBS_001").pstTtl("연차 신청 안내").userNm("홍길동").inqCnt(3)
                .pstCn("<p>본문</p>").pswd("secret")
                .build()));
        given(boardService.searchAcrossBoards(any(), any(Pageable.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/boards/search")
                        .param("keyword", "연차")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].pstSn").value(7))
                .andExpect(jsonPath("$.data[0].pstTtl").value("연차 신청 안내"))
                .andExpect(jsonPath("$.data[0].userNm").value("홍길동"))
                .andExpect(jsonPath("$.data[0].inqCnt").value(3))
                // 좁힌 projection — 본문 HTML 과 게시글 비밀번호는 목록 표면에 실리지 않는다.
                .andExpect(jsonPath("$.data[0].pstCn").doesNotExist())
                .andExpect(jsonPath("$.data[0].pswd").doesNotExist())
                // PageResponse 봉투가 아니다.
                .andExpect(jsonPath("$.data.list").doesNotExist());

        // 검색어가 그대로 서비스에 도달한다.
        org.mockito.ArgumentCaptor<String> keyword = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(boardService).searchAcrossBoards(keyword.capture(), any(Pageable.class));
        org.assertj.core.api.Assertions.assertThat(keyword.getValue()).isEqualTo("연차");
        // "/search" 가 bbsId 로 잡혔다면 이쪽이 불렸을 것이다.
        verify(boardService, org.mockito.Mockito.never()).getBoardPosts(
                anyString(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class));
    }

    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("통합 검색은 검색어가 없어도 400 이 아니라 빈 목록이다 — 판정은 서비스가 한다")
    void searchPosts_withoutKeywordDelegatesToService() throws Exception {
        given(boardService.searchAcrossBoards(any(), any(Pageable.class))).willReturn(Page.empty());

        mockMvc.perform(get("/api/v1/boards/search").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("게시글 목록 조회 성공")
    void getPosts_Success() throws Exception {
        // Given
        Page<BoardDto> page = new PageImpl<>(List.of(BoardDto.builder()
                .pstSn(1L)
                .bbsId("BBS_001")
                .pstTtl("Subject")
                .build()));
        given(boardService.getBoardPosts(anyString(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/boards/BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].pstSn").value(1))
                // 목록 projection이 선택하지 않거나 원본 DB에서 nullable인 응답 필드는
                // Jackson 기본 계약상 생략되지 않고 explicit null로 직렬화된다.
                .andExpect(jsonPath("$.data.list[0].pstCn").value(nullValue()))
                .andExpect(jsonPath("$.data.list[0].useYn").value(nullValue()))
                .andExpect(jsonPath("$.data.list[0].userId").value(nullValue()))
                .andExpect(jsonPath("$.data.list[0].fileCnt").value(nullValue()))
                .andExpect(jsonPath("$.data.list[0].frstRegisterNm").value(nullValue()));

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
                .andExpect(jsonPath("$.data.list[0].inqCnt").value(nullValue()))
                .andExpect(jsonPath("$.data.list[0].crtDt").value(nullValue()))
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
                .andExpect(jsonPath("$.data.pstTtl").value(nullValue()))
                .andExpect(jsonPath("$.data.inqCnt").value(nullValue()))
                .andExpect(jsonPath("$.data.crtDt").value(nullValue()))
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
