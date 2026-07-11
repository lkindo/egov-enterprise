package nuri.business.service.board;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@DisplayName("BoardViewCountService 단위 테스트")
class BoardViewCountServiceTest {

    @Mock
    private BoardRepository boardRepository;

    @InjectMocks
    private BoardViewCountService boardViewCountService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("조회수 증가 요청 시 버퍼에 정상 누적 검증")
    void increaseViewCount_ShouldAccumulateInBuffer() {
        // given
        String pstId = "PST_001";
        Board board = Board.builder()
                .pstId(pstId)
                .inqCnt(5)
                .build();
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));

        // when
        boardViewCountService.increaseViewCount(pstId);
        boardViewCountService.increaseViewCount(pstId); // 두 번 호출
        boardViewCountService.syncViewCountsToDb();

        // then
        verify(boardRepository, times(1)).findById(pstId);
        verify(boardRepository, times(1)).save(board);
        assertThat(board.getInqCnt()).isEqualTo(7); // 기존 5 + 누적 2
    }

    @Test
    @DisplayName("버퍼가 비어있을 때 DB 동기화 조기 반환 검증")
    void syncViewCountsToDb_WhenBufferIsEmpty_ShouldReturnImmediately() {
        // when
        boardViewCountService.syncViewCountsToDb();

        // then
        verifyNoInteractions(boardRepository);
    }

    @Test
    @DisplayName("기존 조회수가 null인 경우 0으로 취급하여 동기화 검증")
    void syncViewCountsToDb_WhenInqCntIsNull_ShouldTreatAsZero() {
        // given
        String pstId = "PST_002";
        Board board = Board.builder()
                .pstId(pstId)
                .inqCnt(null) // null 조회수
                .build();
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));

        // when
        boardViewCountService.increaseViewCount(pstId);
        boardViewCountService.syncViewCountsToDb();

        // then
        verify(boardRepository, times(1)).save(board);
        assertThat(board.getInqCnt()).isEqualTo(1); // 0 + 1
    }

    @Test
    @DisplayName("게시글이 존재하지 않을 때 동기화가 무시되는지 검증")
    void syncViewCountsToDb_WhenBoardNotFound_ShouldDoNothing() {
        // given
        String pstId = "PST_003";
        given(boardRepository.findById(pstId)).willReturn(Optional.empty());

        // when
        boardViewCountService.increaseViewCount(pstId);
        boardViewCountService.syncViewCountsToDb();

        // then
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("DB 동기화 중 예외 발생 시 실패한 항목 버퍼에 롤백 검증")
    void syncViewCountsToDb_WhenExceptionOccurs_ShouldRollbackToBuffer() {
        // given
        String pstId = "PST_004";
        
        // findById 호출 시 런타임 예외 발생 시뮬레이션
        given(boardRepository.findById(pstId)).willThrow(new RuntimeException("DB Connection Error"));

        // when
        boardViewCountService.increaseViewCount(pstId);
        boardViewCountService.syncViewCountsToDb(); // 첫 번째 동기화 시도 (실패 및 롤백)

        // then
        // 1회 호출 완료 확인 (예외 발생으로 save는 무시됨)
        verify(boardRepository, times(1)).findById(pstId);
        verify(boardRepository, never()).save(any(Board.class));

        // 롤백 확인을 위해 mock 설정 재조정 후 두 번째 동기화 기동
        reset(boardRepository);
        Board board = Board.builder().pstId(pstId).inqCnt(10).build();
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));

        boardViewCountService.syncViewCountsToDb(); // 두 번째 동기화 시도 (버퍼가 롤백되었으므로 재시도됨)

        // then
        verify(boardRepository, times(1)).findById(pstId);
        verify(boardRepository, times(1)).save(board);
        assertThat(board.getInqCnt()).isEqualTo(11); // 10 + 롤백된 1
    }
}
