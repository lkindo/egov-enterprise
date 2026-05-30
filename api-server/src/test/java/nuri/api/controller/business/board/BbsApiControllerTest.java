package nuri.api.controller.business.board;

import nuri.business.service.board.EgovBoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.User;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(BbsApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("BbsApiController 테스트")
class BbsApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private EgovBoardService boardService;

    @BeforeEach
    void setUp() {
        UserDetails userDetails = User.withUsername("user01")
                .password("")
                .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
                .build();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("게시판 목록 조회 성공")
    void getBoardList_Success() throws Exception {
        // Given
        Page<BoardDto> page = new PageImpl<>(List.of(BoardDto.builder().pstId("1").pstTtl("Subject").build()));
        given(boardService.getBoardPosts(anyString(), anyString(), anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/bbs/BBSMSTR_1")
                .param("page", "0")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].id").value("1"));
    }

    @Test
    @DisplayName("게시판 목록 조회 성공 (검색어 포함)")
    void getBoardList_WithSearch_Success() throws Exception {
        Page<BoardDto> page = new PageImpl<>(List.of(BoardDto.builder().pstId("1").build()));
        given(boardService.getBoardPosts(anyString(), anyString(), anyString(), any(Pageable.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/bbs/BBSMSTR_1")
                .param("searchWrd", "test")
                .param("searchCnd", "0")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("게시글 상세 조회 성공")
    void getBoardDetail_Success() throws Exception {
        // Given
        given(boardService.getPostDetail(anyString(), anyString())).willReturn(BoardDto.builder().pstId("1").pstTtl("Subject").build());

        // When & Then
        mockMvc.perform(get("/api/v1/bbs/BBSMSTR_1/posts/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pstId").value("1"));
    }

    @Test
    @DisplayName("게시글 등록 성공 (파일 미포함)")
    void createBoard_Success() throws Exception {
        // Given
        given(boardService.createPost(anyString(), any(BoardSaveRequest.class))).willReturn("1");

        MockMultipartFile boardPart = new MockMultipartFile("board", "", "application/json", "{\"bbsId\":\"BBSMSTR_1\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\"}".getBytes());

        // When & Then
        mockMvc.perform(multipart("/api/v1/bbs/BBSMSTR_1")
                .file(boardPart)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("1"));
    }

    @Test
    @DisplayName("게시글 등록 성공 (파일 포함)")
    void createBoard_WithFiles_Success() throws Exception {
        given(boardService.createPostWithFiles(anyString(), any(BoardSaveRequest.class), anyList())).willReturn("1");

        MockMultipartFile boardPart = new MockMultipartFile("board", "", "application/json", "{\"bbsId\":\"BBSMSTR_1\", \"pstTtl\":\"S\", \"pstCn\":\"C\"}".getBytes());
        MockMultipartFile filePart = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());

        mockMvc.perform(multipart("/api/v1/bbs/BBSMSTR_1")
                .file(boardPart)
                .file(filePart)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("1"));
    }

    @Test
    @DisplayName("게시글 수정 성공")
    void updateBoard_Success() throws Exception {
        MockMultipartFile boardPart = new MockMultipartFile("board", "", "application/json", "{\"bbsId\":\"BBSMSTR_1\", \"pstTtl\":\"S\", \"pstCn\":\"C\"}".getBytes());

        mockMvc.perform(multipart("/api/v1/bbs/BBSMSTR_1/posts/1")
                .file(boardPart)
                .with(request -> { request.setMethod("PUT"); return request; })
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("게시글 삭제 성공")
    void deleteBoard_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/bbs/BBSMSTR_1/posts/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        verify(boardService).deletePost(eq("BBSMSTR_1"), eq("1"), anyString());
    }

    @Test
    @DisplayName("인증된 사용자의 게시글 등록")
    void createBoard_WithAuth_Success() throws Exception {
        given(boardService.createPost(eq("user01"), any(BoardSaveRequest.class))).willReturn("1");

        MockMultipartFile boardPart = new MockMultipartFile("board", "", "application/json", "{\"bbsId\":\"BBSMSTR_1\", \"pstTtl\":\"S\", \"pstCn\":\"C\"}".getBytes());

        mockMvc.perform(multipart("/api/v1/bbs/BBSMSTR_1")
                .file(boardPart)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
