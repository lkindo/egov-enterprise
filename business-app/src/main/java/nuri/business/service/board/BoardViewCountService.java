package nuri.business.service.board;

import nuri.business.domain.board.BoardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 게시글 조회수 관리 서비스
 * - Redis를 활용한 쓰기 지연(Write-Back) 전략 구현 (여기서는 메모리 맵으로 단순화)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BoardViewCountService {

    private final BoardRepository boardRepository;
    
    // In-memory buffer for view counts (Production should use Redis)
    private final Map<String, Integer> viewCountBuffer = new ConcurrentHashMap<>();

    /**
     * 조회수 증가 요청 (버퍼에 저장)
     */
    public void increaseViewCount(String pstId) {
        viewCountBuffer.merge(pstId, 1, (a, b) -> Integer.sum(a, b));
    }

    /**
     * 주기적으로 버퍼의 내용을 DB에 반영 (1분마다)
     */
    /**
     * 주기적으로 버퍼의 내용을 DB에 반영 (1분마다).
     *
     * <p>[W1-17 재작성] 종전 구현에는 결함이 셋 있었다.
     * <ol>
     *   <li><b>비원자 증가</b> — findById → 필드 증가 → save 라 같은 게시글에 대한 동시 갱신에서
     *       증분이 유실됐다. 게다가 이 저장이 {@code @Version} 을 올려, 조회수가 오를 때마다
     *       <b>아무도 고치지 않았는데 인기글 편집이 409</b> 로 실패했다.</li>
     *   <li><b>배치 단위 트랜잭션</b> — 메서드에 {@code @Transactional} 이 있어 1건이 실패하면
     *       그 분(分)의 조회수 전체가 롤백됐다. catch 블록의 버퍼 재적립은 이미 롤백된 뒤라
     *       실효가 없었다.</li>
     *   <li><b>손실창</b> — 버퍼를 복사한 뒤 {@code clear()} 하는 사이에 들어온 조회는 그대로 사라졌다.</li>
     * </ol>
     * 이제 원자 UPDATE + 키별 remove + 건별 트랜잭션으로 셋 다 해소된다.
     */
    @Scheduled(fixedDelay = 60000)
    public void syncViewCountsToDb() {
        if (viewCountBuffer.isEmpty()) {
            return;
        }

        log.info(">>> Syncing view counts to DB: {} articles", viewCountBuffer.size());

        // 키를 하나씩 꺼낸다. 복사 후 clear() 하면 그 사이에 들어온 증분이 사라진다(손실창).
        // remove 는 원자적이라 꺼낸 값만 정확히 가져가고 이후 증분은 다음 주기로 넘어간다.
        for (String pstId : Set.copyOf(viewCountBuffer.keySet())) {
            Integer count = viewCountBuffer.remove(pstId);
            if (count == null || count == 0) {
                continue;
            }
            try {
                // 리포지토리 메서드가 자기 트랜잭션을 갖는다 — 한 건의 실패가 나머지를 되돌리지 않는다.
                int affected = boardRepository.increaseInqCntAtomic(pstId, count);
                if (affected == 0) {
                    // **물리 삭제된** 행의 조회수. 네이티브 UPDATE 는 softDeleteFilter 를 통과하지 않으므로
                    // 숨김(use_yn='N') 글은 affected=1 로 계속 증가한다 — 여기 걸리는 것은 행 자체가 없을 때뿐이다.
                    // 재적립하면 영원히 재시도하므로 버린다.
                    log.debug("View count target not found, dropping {} views for pstId {}", count, pstId);
                }
            } catch (Exception e) {
                log.error("Failed to sync view count for pstId {}: {}", pstId, e.getMessage());
                // 실패분만 되돌린다. 건별 트랜잭션이 된 지금에야 이 재적립이 실효를 갖는다.
                viewCountBuffer.merge(pstId, count, Integer::sum);
            }
        }
    }
}
