package com.company.apiserver.config;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Hibernate 성능 분석 설정
 * 
 * 개발 환경에서 Hibernate 통계를 정기적으로 로그에 출력합니다.
 * 
 * 활성화 방법:
 * application-dev.yml 에 다음 속성 추가:
 * - egov.performance.logging.enabled=true
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(name = "egov.performance.logging.enabled", havingValue = "true")
public class HibernatePerformanceConfig {

    private final EntityManagerFactory entityManagerFactory;
    private Statistics statistics;

    @PostConstruct
    public void init() {
        SessionFactory sessionFactory = entityManagerFactory.unwrap(SessionFactory.class);
        this.statistics = sessionFactory.getStatistics();
        this.statistics.setStatisticsEnabled(true);
        log.info("Hibernate 성능 분석이 활성화되었습니다.");
    }

    /**
     * 5 분마다 Hibernate 통계 로그 출력
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void logStatistics() {
        if (statistics == null) {
            return;
        }

        log.info("=== Hibernate Performance Statistics ===");
        log.info("Start Time: {}", java.util.Date.from(statistics.getStart()));
        log.info("Transactions: {}", statistics.getTransactionCount());
        log.info("Successful Transactions: {}", statistics.getSuccessfulTransactionCount());
        log.info("Prepare Statements: {}", statistics.getPrepareStatementCount());
        log.info("Close Statements: {}", statistics.getCloseStatementCount());
        log.info("Flush Count: {}", statistics.getFlushCount());
        log.info("Connect Count: {}", statistics.getConnectCount());
        log.info("----------------------------------------");
        log.info("Entity Load Count: {}", statistics.getEntityLoadCount());
        log.info("Entity Fetch Count: {}", statistics.getEntityFetchCount());
        log.info("Entity Update Count: {}", statistics.getEntityUpdateCount());
        log.info("Entity Insert Count: {}", statistics.getEntityInsertCount());
        log.info("Entity Delete Count: {}", statistics.getEntityDeleteCount());
        log.info("----------------------------------------");
        log.info("Collection Load Count: {}", statistics.getCollectionLoadCount());
        log.info("Collection Fetch Count: {}", statistics.getCollectionFetchCount());
        log.info("Collection Update Count: {}", statistics.getCollectionUpdateCount());
        log.info("Collection Remove Count: {}", statistics.getCollectionRemoveCount());
        log.info("----------------------------------------");
        log.info("Query Execution Count: {}", statistics.getQueryExecutionCount());
        log.info("Query Cache Hit Count: {}", statistics.getQueryCacheHitCount());
        log.info("Query Cache Miss Count: {}", statistics.getQueryCacheMissCount());
        log.info("Query Cache Put Count: {}", statistics.getQueryCachePutCount());
        log.info("Second Level Cache Hit Count: {}", statistics.getSecondLevelCacheHitCount());
        log.info("Second Level Cache Miss Count: {}", statistics.getSecondLevelCacheMissCount());
        log.info("Second Level Cache Put Count: {}", statistics.getSecondLevelCachePutCount());
        log.info("========================================");

        // N+1 쿼리 감지 힌트
        long entityFetchCount = statistics.getEntityFetchCount();
        long entityLoadCount = statistics.getEntityLoadCount();
        
        if (entityLoadCount > 0 && entityFetchCount > entityLoadCount * 2) {
            log.warn("⚠️ N+1 쿼리 가능성이 감지되었습니다! (Fetch Count: {}, Load Count: {})", 
                     entityFetchCount, entityLoadCount);
            log.warn("   @BatchSize 또는 JOIN FETCH 를 고려해보세요.");
        }
    }

    /**
     * 통계 초기화 (필요시 수동 호출)
     */
    public void resetStatistics() {
        if (statistics != null) {
            statistics.clear();
            log.info("Hibernate statistics 이 초기화되었습니다.");
        }
    }
}
