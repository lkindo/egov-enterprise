package nuri.business.service.board;

import nuri.business.domain.board.BoardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 조회수 쓰기 지연(write-back) 동기화 계약.
 *
 * <p>[W1-17 전면 재작성] 종전 테스트는 {@code findById → 엔티티 필드 변화 → save} 를 단언했다.
 * 그 구현은 <b>비원자 read-modify-write</b> 였고 저장 시 {@code @Version} 을 올려
 * "아무도 고치지 않았는데 인기글 편집이 409" 를 만들었다. 즉 이 테스트들은 결함을 계약으로 고정하고 있었다.
 *
 * <p>새 계약은 원자 UPDATE 다. 단언은 <b>호출 여부가 아니라 인자값까지</b> 확인한다 —
 * 누적 2회면 delta 가 정확히 2 여야 하고, 그래야 "호출은 됐는데 값이 틀린" false-green 을 막는다.
 */
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
    @DisplayName("버퍼에 누적된 조회수를 하나의 원자 UPDATE 로 반영한다 (delta 누적 검증)")
    void syncViewCounts_appliesAccumulatedDeltaAtomically() {
        Long pstSn = 1L;
        given(boardRepository.increaseInqCntAtomic(pstSn, 2)).willReturn(1);

        boardViewCountService.increaseViewCount(pstSn);
        boardViewCountService.increaseViewCount(pstSn);
        boardViewCountService.syncViewCountsToDb();

        // 2회 UPDATE 가 아니라 delta=2 인 1회 UPDATE 여야 한다.
        verify(boardRepository, times(1)).increaseInqCntAtomic(pstSn, 2);
        // 엔티티 로드·저장 경로는 더 이상 쓰지 않는다 — 그 경로가 version 을 올려 409 를 만들었다.
        verify(boardRepository, never()).findById(anyLong());
    }

    @Test
    @DisplayName("버퍼가 비어 있으면 DB 를 건드리지 않는다")
    void syncViewCounts_noopWhenBufferEmpty() {
        boardViewCountService.syncViewCountsToDb();

        verifyNoInteractions(boardRepository);
    }

    @Test
    @DisplayName("동기화 후 버퍼가 비워져 같은 증분이 두 번 반영되지 않는다")
    void syncViewCounts_doesNotDoubleApply() {
        Long pstSn = 2L;
        given(boardRepository.increaseInqCntAtomic(pstSn, 1)).willReturn(1);

        boardViewCountService.increaseViewCount(pstSn);
        boardViewCountService.syncViewCountsToDb();
        boardViewCountService.syncViewCountsToDb(); // 두 번째는 반영할 것이 없다

        verify(boardRepository, times(1)).increaseInqCntAtomic(pstSn, 1);
    }

    @Test
    @DisplayName("대상 게시글이 없으면(영향 0행) 증분을 버린다 — 재적립하면 영원히 재시도한다")
    void syncViewCounts_dropsWhenTargetMissing() {
        Long pstSn = 3L;
        given(boardRepository.increaseInqCntAtomic(pstSn, 1)).willReturn(0);

        boardViewCountService.increaseViewCount(pstSn);
        boardViewCountService.syncViewCountsToDb();
        boardViewCountService.syncViewCountsToDb();

        // 재시도하지 않는다(삭제된 글의 조회수는 갈 곳이 없다).
        verify(boardRepository, times(1)).increaseInqCntAtomic(eq(pstSn), anyInt());
    }

    @Test
    @DisplayName("동기화 실패 시 해당 증분만 버퍼로 되돌아가 다음 주기에 재시도된다")
    void syncViewCounts_restoresFailedDeltaToBuffer() {
        Long pstSn = 4L;
        given(boardRepository.increaseInqCntAtomic(pstSn, 1))
                .willThrow(new RuntimeException("DB Connection Error"));

        boardViewCountService.increaseViewCount(pstSn);
        boardViewCountService.syncViewCountsToDb(); // 실패 → 버퍼 재적립

        verify(boardRepository, times(1)).increaseInqCntAtomic(pstSn, 1);

        // 두 번째 주기에서 같은 delta 로 재시도되어야 한다(증분이 유실되지 않았다는 증거).
        reset(boardRepository);
        given(boardRepository.increaseInqCntAtomic(pstSn, 1)).willReturn(1);

        boardViewCountService.syncViewCountsToDb();

        verify(boardRepository, times(1)).increaseInqCntAtomic(pstSn, 1);
    }
}
