package nuri.business.service.log;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.log.UserLogRepository;
import nuri.foundation.core.event.AuditEvent;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 인증 사용자의 API 활동을 일자별로 집계해 {@code tb_user_log}에 누적하는 컴포넌트.
 *
 * <p><b>⚠ 종전에는 이 테이블에 쓰는 코드가 저장소에 하나도 없었다.</b> {@code UserLogRepository}에는
 * 조회·삭제·통계 집계만 있었고 저장 경로가 없어 {@code /admin/system/logs/user}는 <b>영원히 빈 표</b>였다.
 * 나아가 {@code ReportStatsService}가 이 테이블을 읽어 만드는 "날짜별 활동 통계"도 <b>언제나 0</b>이었다 —
 * 즉 빈 화면 하나가 아니라 통계 지표까지 함께 죽어 있었다.
 *
 * <p><b>왜 요청마다 쓰지 않고 모았다 쓰나.</b> {@code tb_user_log}는 (일자, 사용자, 서비스, 메서드)
 * 복합 PK의 <b>누적 카운터</b>다. 요청마다 UPSERT 하면 인기 엔드포인트의 같은 행에 쓰기가 직렬화되어
 * 경합이 생긴다. 메모리에 모아 주기적으로 한 번에 더하면 같은 결과를 훨씬 적은 쓰기로 얻는다
 * ({@code BoardViewCountService}가 조회수에 쓰는 방식과 같다).
 *
 * <p><b>유실 경계를 분명히 한다.</b> 버퍼는 프로세스 메모리다. 정상 종료 시에는
 * {@link #flushOnShutdown()}이 비우지만, <b>강제 종료·크래시에서는 마지막 주기분이 사라진다</b>.
 * 사용자 활동 통계는 집계 지표라 이 손실이 허용 가능하다고 보고 택한 설계이며, 건별 증적이
 * 필요한 축(로그인·개인정보 접근)은 각각 별도 테이블에 <b>건별로</b> 적재된다.
 */
@Slf4j
@Component
public class UserActivityLogAggregator {

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** {@code srvc_nm}·{@code mthd_nm} 컬럼 폭. */
    private static final int NAME_MAX = 100;

    /**
     * 버퍼가 감당할 최대 키 수. 초과분은 버리고 유실로 센다.
     *
     * <p>키는 (일자 × 사용자 × 핸들러)라 정상 트래픽에서는 유계지만, 상한이 없으면 비정상 상황에서
     * 감사 버퍼가 힙을 잠식해 <b>본 서비스를 죽인다</b>. 감사가 서비스를 무너뜨리지 않게 막는다.
     */
    private static final int MAX_BUFFERED_KEYS = 50_000;

    /** 유실 카운터 메트릭 이름 — 대시보드·알람이 이 이름에 결속한다. 바꾸면 관측이 끊긴다. */
    public static final String DROP_METRIC = "audit.useractivity.persist.failure";

    private final UserLogRepository userLogRepository;
    private final ObjectProvider<io.micrometer.core.instrument.MeterRegistry> meterRegistryProvider;

    private final Map<ActivityKey, ActivityCounters> buffer = new ConcurrentHashMap<>();
    private final AtomicLong persistFailureCount = new AtomicLong();
    private final AtomicLong droppedEventCount = new AtomicLong();

    public UserActivityLogAggregator(UserLogRepository userLogRepository,
            ObjectProvider<io.micrometer.core.instrument.MeterRegistry> meterRegistryProvider) {
        this.userLogRepository = userLogRepository;
        this.meterRegistryProvider = meterRegistryProvider;
    }

    /**
     * 감사 이벤트를 메모리 버퍼에 누적한다.
     *
     * <p>동기 리스너다 — 하는 일이 {@code ConcurrentHashMap} 병합뿐이라 비동기 풀에 태울 이유가 없고,
     * 요청마다 태스크를 만들면 감사가 발송·알림과 스레드를 다툰다. 대신 어떤 예외도 밖으로 던지지
     * 않는다(감사 실패가 요청 완료를 깨뜨리면 안 된다).
     */
    @EventListener
    public void onAuditEvent(AuditEvent event) {
        try {
            accumulate(event);
        } catch (Exception e) {
            droppedEventCount.incrementAndGet();
            log.warn("사용자 활동 집계 누적 실패(요청 처리에는 영향 없음): {}", e.toString());
        }
    }

    private void accumulate(AuditEvent event) {
        // 미인증 요청은 대상이 아니다 — dmnd_user_id 에 tb_user_info(esntl_id) FK 가 걸려 있어
        //   'ANONYMOUS' 같은 값을 넣으면 UPSERT 가 통째로 실패한다.
        if (!event.hasIdentifiedUser()) {
            return;
        }
        // 핸들러가 없는 요청(매핑되지 않은 경로의 404 등)은 귀속할 서비스가 없다.
        //   URL 로 대체하면 경로변수 때문에 키 카디널리티가 무한해진다(사용자당 요청 수만큼 행 생성).
        if (event.serviceName() == null || event.methodName() == null) {
            return;
        }
        ActivityKey key = new ActivityKey(
                event.occurredAt().format(YMD),
                event.esntlId(),
                truncate(event.serviceName()),
                truncate(event.methodName()));

        if (!buffer.containsKey(key) && buffer.size() >= MAX_BUFFERED_KEYS) {
            droppedEventCount.incrementAndGet();
            return;
        }
        buffer.computeIfAbsent(key, k -> new ActivityCounters()).add(event);
    }

    /**
     * 버퍼를 비우고 {@code tb_user_log}에 누적한다.
     *
     * <p>키마다 별도 트랜잭션으로 UPSERT 한다. PostgreSQL 은 트랜잭션 안에서 한 문장이 실패하면
     * 그 트랜잭션 전체가 중단되므로, 한 사용자의 FK 위반(집계 도중 탈퇴 등)이 <b>나머지 전부를
     * 함께 버리지 않게</b> 하려면 경계를 키 단위로 둬야 한다.
     */
    @Scheduled(
            initialDelayString = "${nuri.log.user-activity.flush-initial-delay-ms:60000}",
            fixedDelayString = "${nuri.log.user-activity.flush-interval-ms:60000}")
    public void flush() {
        if (buffer.isEmpty()) {
            return;
        }
        int flushed = 0;
        int failed = 0;
        for (ActivityKey key : Set.copyOf(buffer.keySet())) {
            ActivityCounters counters = buffer.remove(key);
            if (counters == null) {
                continue;
            }
            try {
                userLogRepository.upsertActivityCounts(
                        key.ocrnYmd(), key.esntlId(), key.srvcNm(), key.mthdNm(),
                        counters.create.get(), counters.update.get(), counters.read.get(),
                        counters.delete.get(), counters.output.get(), counters.error.get());
                flushed++;
            } catch (Exception e) {
                failed++;
                persistFailureCount.incrementAndGet();
                recordDropMetric();
                log.error("사용자 활동 로그 누적 실패 — key={}, 사유={}", key, e.toString());
            }
        }
        if (failed > 0) {
            log.warn("사용자 활동 로그 flush 완료 — 성공 {}건, 실패 {}건(누적 유실 {}건)",
                    flushed, failed, persistFailureCount.get());
        } else if (log.isDebugEnabled()) {
            log.debug("사용자 활동 로그 flush 완료 — {}건", flushed);
        }
    }

    /** 정상 종료 시 남은 버퍼를 비운다. 강제 종료에서는 마지막 주기분이 유실된다(클래스 javadoc 참조). */
    @PreDestroy
    public void flushOnShutdown() {
        flush();
    }

    private static String truncate(String value) {
        return value.length() <= NAME_MAX ? value : value.substring(0, NAME_MAX);
    }

    private void recordDropMetric() {
        io.micrometer.core.instrument.MeterRegistry registry = meterRegistryProvider.getIfAvailable();
        if (registry != null) {
            registry.counter(DROP_METRIC).increment();
        }
    }

    /** 테스트·운영 점검용 — 아직 DB 에 반영되지 않은 버퍼 키 수. */
    public int getBufferedKeyCount() {
        return buffer.size();
    }

    /** 테스트·운영 점검용 유실 누계(적재 실패). 외부 관측은 {@link #DROP_METRIC} 메트릭을 쓴다. */
    public long getPersistFailureCount() {
        return persistFailureCount.get();
    }

    /** 테스트·운영 점검용 유실 누계(버퍼 상한 초과·누적 예외). */
    public long getDroppedEventCount() {
        return droppedEventCount.get();
    }

    /** {@code tb_user_log} 복합 PK 와 같은 축의 집계 키. */
    record ActivityKey(String ocrnYmd, String esntlId, String srvcNm, String mthdNm) {
    }

    /**
     * 한 키의 누적 카운터.
     *
     * <p><b>실패한 요청도 해당 동작 카운터를 올린다</b> — {@code inq_cnt}는 "조회를 시도한 횟수",
     * {@code err_cnt}는 "그중 실패한 횟수"라는 뜻이다. 실패를 동작 카운터에서 빼면 시도 총량을
     * 알 수 없고, 두 컬럼을 더해 총 요청 수를 구하는 오독도 생긴다.
     */
    private static final class ActivityCounters {
        private final AtomicLong create = new AtomicLong();
        private final AtomicLong update = new AtomicLong();
        private final AtomicLong read = new AtomicLong();
        private final AtomicLong delete = new AtomicLong();
        private final AtomicLong output = new AtomicLong();
        private final AtomicLong error = new AtomicLong();

        void add(AuditEvent event) {
            switch (ProcessTypeCode.of(event.httpMethod())) {
                case CREATE -> create.incrementAndGet();
                case UPDATE -> update.incrementAndGet();
                case READ -> read.incrementAndGet();
                case DELETE -> delete.incrementAndGet();
                case OTHER -> { /* OPTIONS 등 — 어떤 업무 동작도 아니므로 세지 않는다 */ }
            }
            if (event.isFailure()) {
                error.incrementAndGet();
            }
        }
    }
}
