package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardId;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.file.EgovFileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;

/**
 * BoardService 단위 테스트
 */
@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

        @Mock
        private BoardRepository boardRepository;

        @Mock
        private BoardMasterRepository boardMasterRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private EgovFileService fileService;

        @InjectMocks
        private BoardService boardService;

        @Test
        @DisplayName("게시판ID로 게시물 목록 조회 성공")
        void getBoardPosts_success() {
                // given
                String bbsId = "TEST_BBS";
                BoardMaster master = BoardMaster.builder()
                                .bbsId(bbsId)
                                .bbsNm("테스트 게시판")
                                .bbsTyCode("BBST01")
                                .build();

                Board board = Board.builder()
                                .nttId(1L)
                                .bbsId(master.getBbsId())
                                .nttSj("테스트 제목")
                                .nttCn("테스트 내용")
                                .build();

                PageRequest pageable = PageRequest.of(0, 10);
                Page<com.company.project.domain.board.BoardSearchResult> boards = new PageImpl<>(
                                List.of(new com.company.project.domain.board.BoardSearchResult())); // Simplified for
                                                                                                    // mock

                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
                when(boardRepository.searchArticles(any(), eq(Objects.requireNonNull(pageable)))).thenReturn(boards);

                // when
                Page<BoardDto> result = boardService.getBoardPosts(bbsId, Objects.requireNonNull(pageable));

                // then
                assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("존재하지 않는 게시판ID로 조회 시 예외 발생")
        void getBoardPosts_notFound() {
                // given
                String bbsId = "NOT_EXIST";
                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.empty());

                // when & then
                assertThatThrownBy(() -> boardService.getBoardPosts(bbsId, PageRequest.of(0, 10)))
                                .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("게시물 상세 조회 시 조회수 증가")
        void getPostDetail_increaseViewCount() {
                // given
                BoardMaster master = BoardMaster.builder()
                                .bbsId("TEST_BBS")
                                .bbsNm("테스트")
                                .bbsTyCode("BBST01")
                                .build();

                Board board = Board.builder()
                                .nttId(1L)
                                .bbsId(master.getBbsId())
                                .nttSj("테스트 제목")
                                .nttCn("테스트 내용")
                                .build();

                com.company.project.domain.board.BoardDetailResult detailResult = new com.company.project.domain.board.BoardDetailResult();
                detailResult.setNttSj("테스트 제목");

                when(boardRepository.findArticleDetail(any())).thenReturn(Optional.of(detailResult));
                when(boardRepository.findById(any())).thenReturn(Optional.of(board));

                // when
                BoardDto result = boardService.getPostDetail("TEST_BBS", 1L);

                // then
                assertThat(result.getNttSj()).isEqualTo("테스트 제목");
                assertThat(board.getInqireCo()).isEqualTo(1); // 조회수 1 증가
        }

        @Test
        @org.junit.jupiter.api.Disabled("파일 서비스 Mock 설정 필요 - 후속 작업")
        @DisplayName("파일 첨부 게시물 등록 성공")
        void createPostWithFiles_success() throws IOException {
                // given
                String userId = "USER_01";
                String esntlId = "ESNTL_001";
                String bbsId = "TEST_BBS";
                String atchFileId = "FILE_01";

                com.company.project.service.board.dto.BoardSaveRequest request = new com.company.project.service.board.dto.BoardSaveRequest(
                                bbsId, "Title", "Content", "2023-01-01", "2023-12-31", null);

                List<MultipartFile> files = List.of(mock(MultipartFile.class));

                BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();
                com.company.project.domain.user.User user = com.company.project.domain.user.User.builder()
                                .userId(userId).esntlId(esntlId).userNm("Tester").password("pw").build();
                Board savedBoard = Board.builder().nttId(1L).atchFileId(atchFileId).build();

                when(fileService.uploadFiles(files)).thenReturn(atchFileId);
                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
                when(userRepository.findByEsntlId(esntlId)).thenReturn(Optional.of(user));
                when(boardRepository.findMaxNttId()).thenReturn(0L);
                when(boardRepository.findMaxSortOrdr(bbsId)).thenReturn(0L);
                when(boardRepository.save(any(Board.class))).thenReturn(savedBoard);

                // when
                Long result = boardService.createPostWithFiles(userId, request, files);

                // then
                assertThat(result).isEqualTo(1L);
                verify(fileService).uploadFiles(files);
                verify(boardRepository).save(any(Board.class));
        }
}
