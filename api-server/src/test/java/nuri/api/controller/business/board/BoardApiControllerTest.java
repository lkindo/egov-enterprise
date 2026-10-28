package nuri.api.controller.business.board;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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
                .pstSn(7L).bbsId("BBS_001").bbsTtl("업무게시판").pstTtl("연차 신청 안내").userNm("홍길동").inqCnt(3)
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
                // [2026-10-26 ADR-0043, NAV-10] 어느 게시판의 글인지 게시판 이름을 싣는다.
                .andExpect(jsonPath("$.data[0].bbsTtl").value("업무게시판"))
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
                anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class), any());
    }

    /**
     * [2026-10-23 ADR-0040 결정 11] 게시판 선택지도 {@code /{bbsId}} 와 같은 자리의 리터럴 경로다. 응답은 bare 배열이고 ID·이름만
     * 싣는다 — 사용 여부·커뮤니티 귀속은 서버가 이미 걸렀다.
     */
    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("게시판 선택지는 /options 리터럴 경로로 잡히고 게시판 목록 조회로 새지 않으며 ID·이름만 싣는다")
    void getBoardOptions_resolvesLiteralPathNotBbsId() throws Exception {
        given(boardService.getBoardOptions()).willReturn(List.of(
                new nuri.business.service.board.dto.BoardOptionDto("BBS_001", "공지사항")));

        mockMvc.perform(get("/api/v1/boards/options")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].bbsId").value("BBS_001"))
                .andExpect(jsonPath("$.data[0].bbsTtl").value("공지사항"))
                .andExpect(jsonPath("$.data[0].useYn").doesNotExist())
                .andExpect(jsonPath("$.data[0].cmntySn").doesNotExist())
                .andExpect(jsonPath("$.data.list").doesNotExist());

        verify(boardService).getBoardOptions();
        verify(boardService, org.mockito.Mockito.never()).getBoardPosts(
                anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class), any());
        verify(boardService, org.mockito.Mockito.never()).getBoardMeta(anyString());
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
        given(boardService.getBoardPosts(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class), any())).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/boards/BBS_001").param("dateBasis", "EVENT")
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
                // [2026-09-26 DIP V2] 늘 null 이던 등록자명은 계약에서 걷었다 — 작성자 이름은 userNm 이다.
                .andExpect(jsonPath("$.data.list[0].frstRegisterNm").doesNotExist());

        // 기간 기준(DIP V6)이 서비스까지 그대로 간다.
        verify(boardService).getBoardPosts(
                eq("BBS_001"), any(), any(), any(), any(), any(), any(), any(), eq("EVENT"), any(Pageable.class),
                eq(nuri.business.service.board.dto.BoardPostListFilter.NONE));
    }

    @Test
    @DisplayName("게시글 상세 조회 성공")
    void getPost_Success() throws Exception {
        // Given
        given(boardService.getPostDetail(anyString(), any(Long.class), eq(true))).willReturn(BoardDto.builder().pstSn(1L).build());

        // When & Then
        mockMvc.perform(get("/api/v1/boards/BBS_001/posts/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pstSn").value(1));
    }

    @Test
    @DisplayName("수정 화면용 상세 조회는 countView=false 를 서비스에 그대로 넘긴다 (DIP I8)")
    void getPost_withoutViewCount() throws Exception {
        given(boardService.getPostDetail("BBS_001", 1L, false)).willReturn(BoardDto.builder().pstSn(1L).build());

        mockMvc.perform(get("/api/v1/boards/BBS_001/posts/1").param("countView", "false")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pstSn").value(1));

        verify(boardService).getPostDetail("BBS_001", 1L, false);
    }

    @Test
    @DisplayName("질문 해결 표시는 서비스에 게시판·게시글을 넘긴다 (DIP I3)")
    void markQuestionSolved() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .patch("/api/v1/boards/QNA/posts/9/solved").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(boardService).markQuestionSolved("QNA", 9L);
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

    /**
     * [2026-10-29] 비밀 여부가 비어 있는(NULL) FAQ 한 건이 응답 계약(scrtYn 'N')을 깨 도움말 FAQ 목록 전체가 '불러오지 못했습니다'
     * 였다(격리 E2E 실측). 공개 FAQ 응답은 비어 있는 값을 'N' 으로 싣는다 — 열람 판정이 모두 NULL 을 공개 글로 보는 것과 같다.
     */
    @Test
    @DisplayName("공개 FAQ 목록·상세는 비밀 여부가 비어 있는 글도 계약대로 scrtYn N 으로 싣는다")
    void publicFaqs_NullSecretFlagHonoursContract() throws Exception {
        given(boardService.getPublicFaqPosts(eq(""), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(BoardDto.builder()
                        .pstSn(7L)
                        .bbsId("BBSMSTR_AAAAAAAAAAAA")
                        .pstTtl("API 로 만든 FAQ")
                        .useYn("Y")
                        .build())));
        given(boardService.getPublicFaqDetail(7L))
                .willReturn(BoardDto.builder()
                        .pstSn(7L)
                        .bbsId("BBSMSTR_AAAAAAAAAAAA")
                        .useYn("Y")
                        .build());

        mockMvc.perform(get("/api/v1/boards/public-faqs").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].scrtYn").value("N"));
        mockMvc.perform(get("/api/v1/boards/public-faqs/7").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scrtYn").value("N"));
    }

    @Test
    @DisplayName("게시판 통계 응답은 viewer-scoped 서비스 집계 필드를 그대로 노출한다")
    void getStats_UsesViewerScopedServiceResponse() throws Exception {
        given(boardService.getBoardStats("BBS_001")).willReturn(BoardStatsResponse.builder()
                .totalArticles(3L)
                .totalViews(305L)
                .topContributor("Visible contributor")
                .build());

        mockMvc.perform(get("/api/v1/boards/BBS_001/stats")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalArticles").value(3))
                .andExpect(jsonPath("$.data.totalViews").value(305))
                .andExpect(jsonPath("$.data.topContributor").value("Visible contributor"));

        verify(boardService).getBoardStats("BBS_001");
    }

    @Test
    @DisplayName("게시판 메타는 제목·템플릿·설정만 싣고 운영 필드는 싣지 않는다 (DIP V5)")
    void getBoardMeta_ReturnsReadOnlyMeta() throws Exception {
        given(boardService.getBoardMeta("BBS_001")).willReturn(new nuri.business.service.board.dto.BoardMetaDto(
                "BBS_001", "자유게시판", "설명", "BBST01", "TMPLT_FAQ", "Y", "Y", 3, 1048576L, "N", "Y", java.util.List.of(), false, "Y", "Y",
                "REQUIRED", "N", null));

        mockMvc.perform(get("/api/v1/boards/BBS_001/meta")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bbsTtl").value("자유게시판"))
                .andExpect(jsonPath("$.data.tmpltId").value("TMPLT_FAQ"))
                .andExpect(jsonPath("$.data.atchPsbltyFileQty").value(3))
                .andExpect(jsonPath("$.data.stsfdgYn").value("N"))
                .andExpect(jsonPath("$.data.ansYn").value("Y"))
                .andExpect(jsonPath("$.data.requiredEditPermissions").isEmpty())
                // [2026-10-23 ADR-0040 결정 1] 사용 여부는 원본 값이 아니라 화면이 쓰기 단추를 감출 판정(inUse)으로만 싣는다.
                .andExpect(jsonPath("$.data.inUse").value(false))
                // [2026-10-23 ADR-0040 결정 3·6] 작성 화면이 예약 게시 안내를 그릴 설정.
                .andExpect(jsonPath("$.data.rsvtPstgPsbltyYn").value("Y"))
                // [ADR-0040 결정 5·6] 운영 화면이 고정 단추를 안내할 설정.
                .andExpect(jsonPath("$.data.upendFixPsbltyYn").value("Y"))
                // [ADR-0040 결정 6·7] 작성 화면이 비밀글 선택·안내를, 목록·상세가 추천 단추를 정할 설정.
                .andExpect(jsonPath("$.data.prvtPstPlcyCd").value("REQUIRED"))
                .andExpect(jsonPath("$.data.rcmdtnUseYn").value("N"))
                .andExpect(jsonPath("$.data.frstRgtrId").doesNotExist())
                .andExpect(jsonPath("$.data.useYn").doesNotExist());

        verify(boardService).getBoardMeta("BBS_001");
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
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("1"));
    }

    // ── [2026-10-23 ADR-0040 B3] 추천 취소 ─────────────────────────────

    @Test
    @WithMockCustomUser(username = "user01", esntlId = "user01")
    @DisplayName("[ADR-0040 결정 6] 추천 취소는 DELETE …/like 이고 서비스가 돌려준 새 추천수를 200 으로 싣는다")
    void cancelLikePost_delegatesAndReturnsCount() throws Exception {
        given(boardService.cancelLike("BBS_001", 7L)).willReturn(4);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/boards/BBS_001/posts/7/like")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(4));

        verify(boardService).cancelLike("BBS_001", 7L);
        org.mockito.Mockito.verify(boardService, org.mockito.Mockito.never()).incrementLike(anyString(), anyLong());
    }

    // ── [2026-10-23 ADR-0040 B1] 게시 상태 조건·게시 기간 입력 계약·게시글 버전 ─────────────────────────────

    @Test
    @DisplayName("[ADR-0040 결정 3] 목록의 게시 상태 조건은 서비스까지 그대로 가고, 어휘 밖의 값은 서비스 전에 400 이다")
    void getPosts_passesPostingStatusAndRejectsUnknownValue() throws Exception {
        given(boardService.getBoardPosts(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class), any()))
                .willReturn(new PageImpl<>(List.of(BoardDto.builder().pstSn(1L)
                        .postingStatus(nuri.business.service.board.dto.PostingStatus.SCHEDULED).version(2).build())));

        mockMvc.perform(get("/api/v1/boards/BBS_001").param("postingStatus", "SCHEDULED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].postingStatus").value("SCHEDULED"))
                .andExpect(jsonPath("$.data.list[0].version").value(2));
        verify(boardService).getBoardPosts(eq("BBS_001"), any(), any(), any(), any(), any(), any(), any(), any(),
                any(Pageable.class), eq(new nuri.business.service.board.dto.BoardPostListFilter(
                        nuri.business.service.board.dto.PostingStatus.SCHEDULED, null)));

        mockMvc.perform(get("/api/v1/boards/BBS_001").param("postingStatus", "OPEN")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoMoreInteractions(boardService);
    }

    @Test
    @DisplayName("[ADR-0040 결정 5] 목록의 상단 고정 조건은 서비스까지 그대로 가고, 응답은 서버 판정 고정 여부와 종료일을 싣는다")
    void getPosts_passesPinnedFilterAndCarriesPinState() throws Exception {
        given(boardService.getBoardPosts(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(Pageable.class), any()))
                .willReturn(new PageImpl<>(List.of(BoardDto.builder().pstSn(1L).pinned(true).upendFixEndYmd("20261130").build())));

        mockMvc.perform(get("/api/v1/boards/BBS_001").param("pinned", "true")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].pinned").value(true))
                .andExpect(jsonPath("$.data.list[0].upendFixEndYmd").value("20261130"));
        verify(boardService).getBoardPosts(eq("BBS_001"), any(), any(), any(), any(), any(), any(), any(), any(),
                any(Pageable.class), eq(new nuri.business.service.board.dto.BoardPostListFilter(null, true)));

        mockMvc.perform(get("/api/v1/boards/BBS_001").param("pinned", "false").param("postingStatus", "POSTING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        verify(boardService).getBoardPosts(eq("BBS_001"), any(), any(), any(), any(), any(), any(), any(), any(),
                any(Pageable.class), eq(new nuri.business.service.board.dto.BoardPostListFilter(
                        nuri.business.service.board.dto.PostingStatus.POSTING, false)));
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("[ADR-0040 결정 12] 게시 기간은 8자리만 받고 달력·순서를 검사한다 — 서비스 전에 400")
    void createPost_rejectsMalformedOrReversedPostingPeriod() throws Exception {
        for (String period : List.of(
                "\"pstBgngYmd\":\"2026-11-01\"",
                "\"pstEndYmd\":\"20260230\"",
                "\"pstBgngYmd\":\"20261201\", \"pstEndYmd\":\"20261130\"")) {
            mockMvc.perform(post("/api/v1/boards/posts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"bbsId\":\"BBS_001\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\", " + period + "}")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
        org.mockito.Mockito.verifyNoInteractions(boardService);
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("[ADR-0040 결정 10] 수정 본문의 version 은 서비스까지 그대로 간다")
    void updatePost_passesVersionToService() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/boards/BBS_001/posts/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bbsId\":\"BBS_001\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\", "
                                + "\"pstBgngYmd\":\"20261101\", \"pstEndYmd\":\"20261130\", \"version\":4}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        verify(boardService).updatePost(eq("BBS_001"), eq(5L), argThat((BoardSaveRequest request) ->
                Integer.valueOf(4).equals(request.version()) && "20261101".equals(request.pstBgngYmd())));
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("[2026-10-26 ADR-0043] Q&A 상태는 OPEN·SOLVED 만 받는다 — 그 밖의 값은 등록·수정 모두 서비스 전에 400")
    void qnaStatusVocabularyIsCheckedBeforeService() throws Exception {
        for (String status : List.of("QA01", "open", "CLOSED")) {
            mockMvc.perform(post("/api/v1/boards/posts")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"bbsId\":\"BBS_001\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\", \"qnaSttsCd\":\"" + status + "\"}")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/boards/BBS_001/posts/5")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"bbsId\":\"BBS_001\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\", \"version\":1, \"qnaSttsCd\":\"" + status + "\"}")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
        org.mockito.Mockito.verifyNoInteractions(boardService);

        given(boardService.createPost(anyString(), any(BoardSaveRequest.class))).willReturn(1L);
        mockMvc.perform(post("/api/v1/boards/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bbsId\":\"BBS_001\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\", \"qnaSttsCd\":\"OPEN\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated());
    }
}
