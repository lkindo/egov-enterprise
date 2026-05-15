package nuri.business.service.board;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.board.BoardRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 인메모리 기반 게시글 조회수 쓰기 지연(Write-behind) 서비스
 * - Redis 서버 없이 애플리케이션 메모리에서 조회수를 버퍼링한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BoardViewCountService {

    private final BoardRepository boardRepository;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;

    // 인메모리 버퍼: pstId -> 조회수 증가량
    private final Map<Long, AtomicInteger> viewCountBuffer = new ConcurrentHashMap<>();

    @jakarta.annotation.PostConstruct
    public void init() {
        // 버퍼 사이즈 모니터링을 위한 Gauge 등록
        io.micrometer.core.instrument.Gauge.builder("board.viewcount.buffer.size", viewCountBuffer, Map::size)
                .description("Number of articles pending view count synchronization")
                .register(meterRegistry);
    }

    /**
     * 조회수 증가 (인메모리 버퍼)
     */
    public void increaseViewCount(Long pstId) {
        viewCountBuffer.computeIfAbsent(pstId, k -> new AtomicInteger(0))
                .incrementAndGet();
    }

    /**
     * 버퍼링된 조회수를 DB로 동기화 (5분마다 실행)
     */
    @Scheduled(fixedDelay = 300000) // 5 minutes
    @Transactional
    public void syncViewCounts() {
        if (viewCountBuffer.isEmpty()) {
            return;
        }

        log.info("Starting view count synchronization from memory to DB...");
        
        int count = 0;
        // 동기화를 위해 현재 버퍼의 키셋을 순회
        for (Long pstId : viewCountBuffer.keySet()) {
            try {
                // 현재 누적된 조회수를 가져오고 버퍼에서 0으로 초기화 (또는 제거)
                AtomicInteger views = viewCountBuffer.remove(pstId);
                if (views != null && views.get() > 0) {
                    int increment = views.get();
                    boardRepository.findById(pstId).ifPresent(board -> {
                        for (int i = 0; i < increment; i++) {
                            board.increaseInqireCo();
                        }
                        boardRepository.save(board);
                    });
                    count++;
                }
            } catch (Exception e) {
                log.error("Failed to sync view count for ID: {}", pstId, e);
            }
        }
        
        // 동기화 성공 메트릭 기록
        meterRegistry.counter("board.viewcount.sync.total").increment(count);
        
        log.info("Finished view count synchronization. Updated {} articles.", count);
    }
}
