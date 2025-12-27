package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.board.Board;
import com.company.project.domain.board.BoardId;
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
import static org.mockito.Mockito.when;

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
                Page<Board> boards = new PageImpl<>(List.of(board));

                when(boardMasterRepository.findById(bbsId)).thenReturn(Optional.of(master));
                // search(BoardSearchCondition condition, Pageable pageable) 호출에 맞게 any() 또는 구체적
                // 객체 사용
                when(boardRepository.search(org.mockito.ArgumentMatchers.any(),
                                org.mockito.ArgumentMatchers.eq(pageable)))
                                .thenReturn(boards);

                // when
                Page<BoardDto> result = boardService.getBoardPosts(bbsId, pageable);

                // then
                assertThat(result.getContent()).hasSize(1);
                assertThat(result.getContent().get(0).getNttSj()).isEqualTo("테스트 제목");
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

                when(boardRepository.findById(new BoardId(1L, "TEST_BBS"))).thenReturn(Optional.of(board));

                // when
                BoardDto result = boardService.getPostDetail("TEST_BBS", 1L);

                // then
                assertThat(result.getNttSj()).isEqualTo("테스트 제목");
                assertThat(board.getInqireCo()).isEqualTo(1); // 조회수 1 증가
        }
}
