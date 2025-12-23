package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardMaster;
import com.company.project.domain.board.BoardMasterRepository;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.board.dto.BoardDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BoardService ?¨ìœ„ ?ŒìŠ¤??
 */
@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

        @Mock
        private BoardRepository boardRepository;

        @Mock
        private BoardMasterRepository boardMasterRepository;

        @Mock
        private UserRepository userRepository;

        @InjectMocks
        private BoardService boardService;

        @Test
        @DisplayName("ê²Œì‹œ?IDë¡?ê²Œì‹œë¬?ëª©ë¡ ì¡°íšŒ ?±ê³µ")
        void getBoardPosts_success() {
                // given
                String bbsId = "TEST_BBS";
                BoardMaster master = BoardMaster.builder()
                                .bbsId(bbsId)
                                .bbsNm("?ŒìŠ¤??ê²Œì‹œ??)
                                .bbsTyCode("BBST01")
                                .build();

                Board board = Board.builder()
                                .id(1L)
                                .boardMaster(master)
                                .nttSj("?ŒìŠ¤???œëª©")
                                .nttCn("?ŒìŠ¤???´ìš©")
                                .build();

                PageRequest pageable = PageRequest.of(0, 10);
                Page<Board> boards = new PageImpl<>(List.of(board));

                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
                when(boardRepository.findByBoardMasterAndUseAtOrderBySortOrdrDescNttNoAsc(master, "Y", pageable))
                                .thenReturn(boards);

                // when
                Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

                // then
                assertThat(result.getContent()).hasSize(1);
                assertThat(result.getContent().get(0).nttSj()).isEqualTo("?ŒìŠ¤???œëª©");
        }

        @Test
        @DisplayName("ì¡´ì¬?˜ì? ?ŠëŠ” ê²Œì‹œ?IDë¡?ì¡°íšŒ ???ˆì™¸ ë°œìƒ")
        void getBoardPosts_notFound() {
                // given
                String bbsId = "NOT_EXIST";
                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.empty());

                // when & then
                assertThatThrownBy(() -> boardService.getBoardPosts(bbsId, PageRequest.of(0, 10)))
                                .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("ê²Œì‹œë¬??ì„¸ ì¡°íšŒ ??ì¡°íšŒ??ì¦ê?")
        void getPostDetail_increaseViewCount() {
                // given
                BoardMaster master = BoardMaster.builder()
                                .bbsId("TEST_BBS")
                                .bbsNm("?ŒìŠ¤??)
                                .bbsTyCode("BBST01")
                                .build();

                Board board = Board.builder()
                                .id(1L)
                                .boardMaster(master)
                                .nttSj("?ŒìŠ¤???œëª©")
                                .nttCn("?ŒìŠ¤???´ìš©")
                                .build();

                when(boardRepository.findByNttId(1L)).thenReturn(Optional.of(board));

                // when
                BoardDto result = boardService.getPostDetail(1L);

                // then
                assertThat(result.nttSj()).isEqualTo("?ŒìŠ¤???œëª©");
                assertThat(board.getInqireCo()).isEqualTo(1); // ì¡°íšŒ??1 ì¦ê?
        }
}
