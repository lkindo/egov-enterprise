package nuri.api.controller.business.board;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.User;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import nuri.business.support.ControllerTestSupport;

/**
 * 첨부를 함께 올리는 게시글 등록·수정(multipart) 계약.
 *
 * <p>[2026-09-06 DEC-OPS-044] 종전 {@code BbsApiControllerTest} 를 대체한다. 그 컨트롤러의 목록·상세·삭제
 * 3본은 {@code /api/v1/boards} 와 같은 서비스 메서드를 부르는 순수 복제였고 소비자가 0건이라 제거했으므로
 * 해당 테스트도 함께 사라졌다. 남은 것은 <b>첨부를 붙일 수 있는 유일한 쓰기 경로</b>인 multipart 2본이며,
 * 이 테스트가 그 경로가 {@code /api/v1/boards} 네임스페이스에 있고 JSON 쓰기와 공존함을 고정한다.
 *
 * <p>경로 끝의 {@code /with-files} 가 첨부 동반 쓰기를 가른다. JSON 쓰기와 같은 URL 에 {@code consumes} 만
 * 다르게 두는 안은 springdoc 이 두 핸들러를 한 operation 으로 병합하고 생성기가 그것을 거부해 폐기했다.
 */
@WebMvcTest(BoardApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("게시글 multipart 쓰기 계약")
class BoardMultipartWriteApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private BoardService boardService;

    @BeforeEach
    void setUp() {
        var auth = nuri.business.support.AuthorizationTestPrincipal.authentication("user01", "user01", "USER");
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private static MockMultipartFile boardPart() {
        return new MockMultipartFile("board", "", "application/json",
                "{\"bbsId\":\"BBSMSTR_1\", \"pstTtl\":\"Subject\", \"pstCn\":\"Content\"}".getBytes());
    }

    @Test
    @DisplayName("게시글 등록 성공 (파일 미포함)")
    void createPostWithFiles_noFile_Success() throws Exception {
        given(boardService.createPost(anyString(), any(BoardSaveRequest.class))).willReturn(1L);

        mockMvc.perform(multipart("/api/v1/boards/BBSMSTR_1/posts/with-files")
                .file(boardPart())
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("1"));
    }

    @Test
    @DisplayName("게시글 등록 성공 (파일 포함)")
    void createPostWithFiles_withFile_Success() throws Exception {
        given(boardService.createPostWithFiles(anyString(), any(BoardSaveRequest.class), anyList())).willReturn(1L);

        MockMultipartFile filePart = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());

        mockMvc.perform(multipart("/api/v1/boards/BBSMSTR_1/posts/with-files")
                .file(boardPart())
                .file(filePart)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("1"));
    }

    @Test
    @DisplayName("게시글 수정 성공 (파일 미포함) — 첨부 없이 보내도 같은 경로로 처리된다")
    void updatePostWithFiles_Success() throws Exception {
        mockMvc.perform(multipart("/api/v1/boards/BBSMSTR_1/posts/1/with-files")
                .file(boardPart())
                .with(request -> { request.setMethod("PUT"); return request; })
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(boardService).updatePost(eq("BBSMSTR_1"), eq(1L), any(BoardSaveRequest.class));
    }

    @Test
    @DisplayName("게시글 수정 성공 (파일 포함)")
    void updatePostWithFiles_withFile_Success() throws Exception {
        MockMultipartFile filePart = new MockMultipartFile("file", "test.txt", "text/plain", "content".getBytes());

        mockMvc.perform(multipart("/api/v1/boards/BBSMSTR_1/posts/1/with-files")
                .file(boardPart())
                .file(filePart)
                .with(request -> { request.setMethod("PUT"); return request; })
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(boardService).updatePostWithFiles(eq("BBSMSTR_1"), eq(1L), any(BoardSaveRequest.class), anyList());
    }

    @Test
    @DisplayName("등록 작성자는 요청 본문이 아니라 인증 주체에서 온다")
    void createPostWithFiles_usesAuthenticatedPrincipal() throws Exception {
        given(boardService.createPost(eq("user01"), any(BoardSaveRequest.class))).willReturn(1L);

        mockMvc.perform(multipart("/api/v1/boards/BBSMSTR_1/posts/with-files")
                .file(boardPart())
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(boardService).createPost(eq("user01"), any(BoardSaveRequest.class));
    }
}
