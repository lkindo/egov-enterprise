package nuri.business.service.board;

import nuri.business.domain.board.BoardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
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
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void syncViewCountsToDb() {
        if (viewCountBuffer.isEmpty()) {
            return;
        }

        log.info(">>> Syncing view counts to DB: {} articles", viewCountBuffer.size());

        Map<String, Integer> snapshot = new ConcurrentHashMap<>(viewCountBuffer);
        viewCountBuffer.clear();

        snapshot.forEach((pstId, count) -> {
            try {
                boardRepository.findById(pstId).ifPresent(board -> {
                    int currentCnt = board.getInqCnt() != null ? board.getInqCnt() : 0;
                    board.setInqCnt(currentCnt + count);
                    boardRepository.save(board);
                });
            } catch (Exception e) {
                log.error("Failed to sync view count for pstId {}: {}", pstId, e.getMessage());
                // Rollback to buffer on failure
                viewCountBuffer.merge(pstId, count, (a, b) -> Integer.sum(a, b));
            }
        });
    }
}
