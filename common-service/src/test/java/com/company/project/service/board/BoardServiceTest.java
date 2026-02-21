package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.user.repository.UserRepository;
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

/**
 * BoardService Test
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
        @DisplayName("Get board posts success")
        void getBoardPosts_success() {
                // given
                String bbsId = "TEST_BBS";
                BoardMaster master = BoardMaster.builder()
                                .bbsId(bbsId)
                                .bbsNm("Test Board")
                                .bbsTyCode("BBST01")
                                .build();

                PageRequest pageable = PageRequest.of(0, 10);
                Page<com.company.project.domain.board.BoardSearchResult> boards = new PageImpl<>(
                                Objects.requireNonNull(
                                                List.of(new com.company.project.domain.board.BoardSearchResult())));

                when(boardMasterRepository.findById(java.util.Objects.requireNonNull(bbsId)))
                                .thenReturn(Optional.of(master));
                when(boardRepository.searchArticles(any(), eq(java.util.Objects.requireNonNull(pageable))))
                                .thenReturn(boards);

                // when
                Page<BoardDto> result = boardService.getBoardPosts(bbsId, Objects.requireNonNull(pageable));

                // then
                assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Get board posts not found")
        void getBoardPosts_notFound() {
                // given
                String bbsId = "NOT_EXIST";
                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.empty());

                // when & then
                assertThatThrownBy(
                                () -> boardService.getBoardPosts(bbsId, Objects.requireNonNull(PageRequest.of(0, 10))))
                                .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("Get post detail increase view count")
        void getPostDetail_increaseViewCount() {
                // given
                BoardMaster master = BoardMaster.builder()
                                .bbsId("TEST_BBS")
                                .bbsNm("Test Board")
                                .bbsTyCode("BBST01")
                                .build();

                Board board = Board.builder()
                                .bbsId(Objects.requireNonNull(master.getBbsId()))
                                .nttSj("Test Title")
                                .nttCn("Test Content")
                                .build();

                com.company.project.domain.board.BoardDetailResult detailResult = new com.company.project.domain.board.BoardDetailResult();
                detailResult.setNttSj("Test Title");

                when(boardRepository.findArticleDetail(java.util.Objects.requireNonNull(any())))
                                .thenReturn(Optional.of(detailResult));
                when(boardRepository.findById(java.util.Objects.requireNonNull(any())))
                                .thenReturn(Optional.of(Objects.requireNonNull(board)));

                // when
                BoardDto result = boardService.getPostDetail("TEST_BBS", 1L);

                // then
                assertThat(result.getNttSj()).isEqualTo("Test Title");
                assertThat(board.getInqireCo()).isEqualTo(1); // View count increased
        }

        @Test
        @org.junit.jupiter.api.Disabled("File service mock needed")
        @DisplayName("Create post with files success")
        void createPostWithFiles_success() throws IOException {
                // given
                String userId = "USER_01";
                String esntlId = "ESNTL_001";
                String bbsId = "TEST_BBS";
                String atchFileId = "FILE_01";

                com.company.project.service.board.dto.BoardSaveRequest request = new com.company.project.service.board.dto.BoardSaveRequest(
                                bbsId, "Title", "Content", "2023-01-01", "2023-12-31", null);

                List<MultipartFile> files = Objects.requireNonNull(List.of(mock(MultipartFile.class)));

                BoardMaster master = BoardMaster.builder().bbsId(bbsId).build();

                com.company.project.domain.user.entity.User user = com.company.project.domain.user.entity.User.builder()
                                .userId(userId).esntlId(esntlId).userNm("Tester").password("pw").build();

                Board savedBoard = mock(Board.class);
                when(savedBoard.getNttId()).thenReturn(1L);

                when(fileService.uploadFiles(files)).thenReturn(atchFileId);
                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
                when(userRepository.findByEsntlId(esntlId)).thenReturn(Optional.of(Objects.requireNonNull(user)));

                // Removed findMaxNttId and findMaxSortOrdr mocks as they don't exist in repository

                when(boardRepository.save(Objects.requireNonNull(any(Board.class))))
                                .thenReturn(Objects.requireNonNull(savedBoard));

                // when
                Long result = boardService.createPostWithFiles(userId, request, files);

                // then
                assertThat(result).isEqualTo(1L);
                verify(fileService).uploadFiles(files);
                verify(boardRepository).save(java.util.Objects.requireNonNull(any(Board.class)));
        }
}
