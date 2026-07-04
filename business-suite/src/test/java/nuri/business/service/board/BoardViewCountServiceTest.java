package nuri.business.service.board;

import nuri.business.domain.board.BoardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

// syncViewCountsToDb 는 find+setInqCnt+save 대신 boardRepository.incrementInqCntAtomic(pstId, delta)
// 원자 UPDATE 를 사용한다(낙관적 잠금 충돌로 배치 전체가 유실되는 문제를 없애기 위함).
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
    @DisplayName("조회수 증가 요청 시 버퍼에 누적되어 합산된 delta 로 원자 UPDATE 호출 검증")
    void increaseViewCount_ShouldAccumulateInBuffer() {
        // given
        String pstId = "PST_001";

        // when
        boardViewCountService.increaseViewCount(pstId);
        boardViewCountService.increaseViewCount(pstId); // 두 번 호출 -> delta=2 로 합산
        boardViewCountService.syncViewCountsToDb();

        // then
        verify(boardRepository, times(1)).incrementInqCntAtomic(pstId, 2);
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
    @DisplayName("여러 게시글의 버퍼가 각각 독립적으로 원자 UPDATE 되는지 검증")
    void syncViewCountsToDb_WithMultiplePosts_ShouldUpdateEachIndependently() {
        // given
        boardViewCountService.increaseViewCount("PST_002");
        boardViewCountService.increaseViewCount("PST_003");
        boardViewCountService.increaseViewCount("PST_003");

        // when
        boardViewCountService.syncViewCountsToDb();

        // then
        verify(boardRepository, times(1)).incrementInqCntAtomic("PST_002", 1);
        verify(boardRepository, times(1)).incrementInqCntAtomic("PST_003", 2);
    }

    @Test
    @DisplayName("DB 동기화 중 예외 발생 시 실패한 항목만 버퍼에 롤백되어 다음 주기에 재시도되는지 검증")
    void syncViewCountsToDb_WhenExceptionOccurs_ShouldRollbackToBuffer() {
        // given
        String pstId = "PST_004";
        given(boardRepository.incrementInqCntAtomic(anyString(), anyInt()))
                .willThrow(new RuntimeException("DB Connection Error"));

        // when: 첫 번째 동기화 시도 — 실패하여 버퍼로 롤백됨
        boardViewCountService.increaseViewCount(pstId);
        boardViewCountService.syncViewCountsToDb();

        // then
        verify(boardRepository, times(1)).incrementInqCntAtomic(pstId, 1);

        // 두 번째 시도부터는 성공하도록 재설정
        reset(boardRepository);
        given(boardRepository.incrementInqCntAtomic(anyString(), anyInt())).willReturn(1);

        // when: 두 번째 동기화 시도 — 롤백된 delta(1)로 재시도됨
        boardViewCountService.syncViewCountsToDb();

        // then
        verify(boardRepository, times(1)).incrementInqCntAtomic(pstId, 1);
    }
}
