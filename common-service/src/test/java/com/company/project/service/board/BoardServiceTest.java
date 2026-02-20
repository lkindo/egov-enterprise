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
 * BoardService ?⑥쐞 ?뚯뒪??
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
        @DisplayName("寃뚯떆?륤D濡?寃뚯떆臾?紐⑸줉 議고쉶 ?깃났")
        void getBoardPosts_success() {
                // given
                String bbsId = "TEST_BBS";
                BoardMaster master = BoardMaster.builder()
                                .bbsId(bbsId)
                                .bbsNm("?뚯뒪??寃뚯떆??)
                                .bbsTyCode("BBST01")
                                .build();

                PageRequest pageable = PageRequest.of(0, 10);
                Page<com.company.project.domain.board.BoardSearchResult> boards = new PageImpl<>(
                                Objects.requireNonNull(
                                                List.of(new com.company.project.domain.board.BoardSearchResult()))); // Simplified
                                                                                                                     // for
                // mock

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
        @DisplayName("議댁옱?섏? ?딅뒗 寃뚯떆?륤D濡?議고쉶 ???덉쇅 諛쒖깮")
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
        @DisplayName("寃뚯떆臾??곸꽭 議고쉶 ??議고쉶??利앷?")
        void getPostDetail_increaseViewCount() {
                // given
                BoardMaster master = BoardMaster.builder()
                                .bbsId("TEST_BBS")
                                .bbsNm("?뚯뒪??)
                                .bbsTyCode("BBST01")
                                .build();

                Board board = Board.builder()
                                .nttId(1L)
                                .bbsId(Objects.requireNonNull(master.getBbsId()))
                                .nttSj("?뚯뒪???쒕ぉ")
                                .nttCn("?뚯뒪???댁슜")
                                .build();

                com.company.project.domain.board.BoardDetailResult detailResult = new com.company.project.domain.board.BoardDetailResult();
                detailResult.setNttSj("?뚯뒪???쒕ぉ");

                when(boardRepository.findArticleDetail(java.util.Objects.requireNonNull(any())))
                                .thenReturn(Optional.of(detailResult));
                when(boardRepository.findById(java.util.Objects.requireNonNull(any())))
                                .thenReturn(Optional.of(Objects.requireNonNull(board)));

                // when
                BoardDto result = boardService.getPostDetail("TEST_BBS", 1L);

                // then
                assertThat(result.getNttSj()).isEqualTo("?뚯뒪???쒕ぉ");
                assertThat(board.getInqireCo()).isEqualTo(1); // 議고쉶??1 利앷?
        }

        @Test
        @org.junit.jupiter.api.Disabled("?뚯씪 ?쒕퉬??Mock ?ㅼ젙 ?꾩슂 - ?꾩냽 ?묒뾽")
        @DisplayName("?뚯씪 泥⑤? 寃뚯떆臾??깅줉 ?깃났")
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
                com.company.project.domain.user.User user = com.company.project.domain.user.User.builder()
                                .userId(userId).esntlId(esntlId).userNm("Tester").password("pw").build();
                Board savedBoard = Board.builder().nttId(1L).atchFileId(atchFileId).build();

                when(fileService.uploadFiles(files)).thenReturn(atchFileId);
                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
                when(userRepository.findByEsntlId(esntlId)).thenReturn(Optional.of(Objects.requireNonNull(user)));
                when(boardRepository.findMaxNttId()).thenReturn(0L);
                when(boardRepository.findMaxSortOrdr(bbsId)).thenReturn(0L);
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
