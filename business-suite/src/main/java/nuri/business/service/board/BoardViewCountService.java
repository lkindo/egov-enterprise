package nuri.business.service.board;

import nuri.business.domain.board.BoardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
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
     * 주기적으로 버퍼의 내용을 DB에 반영 (1분마다).
     *
     * <p>과거에는 버퍼 전체를 스냅샷 뜨고 즉시 clear() 한 뒤, 단일 @Transactional 안에서
     * find→setInqCnt→save 를 반복했다. Board 는 @Version 을 갖고 있어 사이에 다른 요청(좋아요,
     * 게시글 수정 등)이 낙관적 락 버전을 올리면 commit 시점에 OptimisticLockException 이 나서
     * 이미 clear() 한 버퍼 전체가 통째로 유실됐다.
     *
     * <p>이제 항목별로 원자적 UPDATE(incrementInqCntAtomic)를 실행한다. 각 리포지토리 호출은
     * Spring Data 의 기본 트랜잭션 프록시로 독립 커밋되므로, 한 게시글 갱신이 실패해도 다른
     * 게시글에는 영향이 없다. 처리한 키만 버퍼에서 제거하므로, 처리 도중 들어온 새 증가분은
     * 유실되지 않고 다음 주기에 반영된다.
     */
    @Scheduled(fixedDelay = 60000)
    public void syncViewCountsToDb() {
        if (viewCountBuffer.isEmpty()) {
            return;
        }

        log.info(">>> Syncing view counts to DB: {} articles", viewCountBuffer.size());

        for (String pstId : List.copyOf(viewCountBuffer.keySet())) {
            Integer count = viewCountBuffer.remove(pstId);
            if (count == null || count <= 0) {
                continue;
            }
            try {
                boardRepository.incrementInqCntAtomic(pstId, count);
            } catch (Exception e) {
                log.error("Failed to sync view count for pstId {}: {}", pstId, e.getMessage());
                // 실패분만 버퍼에 되돌린다(다음 주기에 재시도).
                viewCountBuffer.merge(pstId, count, Integer::sum);
            }
        }
    }
}
