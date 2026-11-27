package nuri.business.service.mail;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.util.SafeLog;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 사용자별 메일 발송 한도 제한기 (GAP-MAIL-001 ②).
 *
 * <p>외부 메일 발송은 수신자 1명당 1건의 SMTP 발송으로 이어지므로 요청 횟수가 아니라 수신자 건수 기준으로
 * 사용자당 롤링 1시간 슬라이딩 창 상한(기본 {@value #DEFAULT_DISPATCHES_PER_HOUR}건)을 적용한다.
 *
 * <p>한도 상태는 단일 API 노드 프로세스 메모리(Caffeine 유계 캐시)에 유지된다. 다중 API 노드로 수평 확장할 경우
 * 노드 간 공유 집계(DB/Redis)가 필요하다(known-gaps {@code GAP-MAIL-001} 잔여 경계).
 */
@Slf4j
@Component
public class MailUserRateLimiter {

    public static final int DEFAULT_DISPATCHES_PER_HOUR = 30;
    public static final String REJECTION_METRIC = "nuri.mail.rate_limit.rejected";

    private static final long WINDOW_MILLIS = Duration.ofHours(1).toMillis();
    private static final long MAX_BUCKETS = 100_000L;
    /** 슬라이딩 창(1시간)보다 길게 잡아 캐시 축출로 한도가 조기 초기화되지 않게 한다. */
    private static final long EXPIRE_AFTER_ACCESS_HOURS = 2L;

    /** 트랜잭션 롤백·차지 실패 등 발송이 성사되지 않았을 때 예약한 한도를 반환하는 핸들. */
    @FunctionalInterface
    public interface Reservation {
        Reservation NOOP = () -> {};

        void release();
    }

    private final int dispatchesPerHour;
    private final Clock clock;
    private final ObjectProvider<MeterRegistry> meterRegistryProvider;
    private final AtomicLong rejectedCount = new AtomicLong();
    private final Cache<String, UserWindow> windows = Caffeine.newBuilder()
            .maximumSize(MAX_BUCKETS)
            .expireAfterAccess(EXPIRE_AFTER_ACCESS_HOURS, TimeUnit.HOURS)
            .build();

    @Autowired
    public MailUserRateLimiter(
            @Value("${nuri.mail.rate-limit.dispatches-per-hour:" + DEFAULT_DISPATCHES_PER_HOUR + "}") int dispatchesPerHour,
            ObjectProvider<MeterRegistry> meterRegistryProvider) {
        this(dispatchesPerHour, meterRegistryProvider, Clock.systemDefaultZone());
    }

    public MailUserRateLimiter(int dispatchesPerHour) {
        this(dispatchesPerHour, null, Clock.systemDefaultZone());
    }

    MailUserRateLimiter(int dispatchesPerHour, Clock clock) {
        this(dispatchesPerHour, null, clock);
    }

    MailUserRateLimiter(int dispatchesPerHour, ObjectProvider<MeterRegistry> meterRegistryProvider, Clock clock) {
        if (dispatchesPerHour < 1) {
            throw new IllegalStateException(
                    "메일 발송 한도는 1 이상이어야 합니다: nuri.mail.rate-limit.dispatches-per-hour=" + dispatchesPerHour);
        }
        this.dispatchesPerHour = dispatchesPerHour;
        this.meterRegistryProvider = meterRegistryProvider;
        this.clock = Objects.requireNonNull(clock);
    }

    public int dispatchesPerHour() {
        return dispatchesPerHour;
    }

    /**
     * 한도를 차감하지 않고 현재 롤링 1시간 창에서 {@code dispatchCount}건 수용 가능한지만 사전 점검한다.
     */
    public void assertWithinLimit(String actorKey, int dispatchCount) {
        String normalizedActor = normalizeActorOrThrow(actorKey);
        if (dispatchCount < 1) {
            return;
        }
        if (dispatchCount > dispatchesPerHour) {
            reject(normalizedActor, dispatchCount, true);
        }
        UserWindow window = windows.getIfPresent(normalizedActor);
        if (window != null && !window.canConsume(dispatchCount, clock.millis(), dispatchesPerHour)) {
            reject(normalizedActor, dispatchCount, false);
        }
    }

    /**
     * 지정한 사용자 창에서 {@code dispatchCount}만큼 발송 한도를 예약하고, 초과 시 429 예외를 던진다.
     */
    public Reservation reserveOrThrow(String actorKey, int dispatchCount) {
        String normalizedActor = normalizeActorOrThrow(actorKey);
        if (dispatchCount < 1) {
            return Reservation.NOOP;
        }
        if (dispatchCount > dispatchesPerHour) {
            reject(normalizedActor, dispatchCount, true);
        }
        UserWindow window = windows.get(normalizedActor, key -> new UserWindow());
        DispatchSlice slice = window.tryReserve(dispatchCount, clock.millis(), dispatchesPerHour);
        if (slice == null) {
            reject(normalizedActor, dispatchCount, false);
        }
        return () -> window.release(slice);
    }

    /**
     * 지정한 사용자 창에서 {@code dispatchCount}만큼 발송 한도를 차감하고, 초과 시 429 예외를 던진다.
     */
    public void consumeOrThrow(String actorKey, int dispatchCount) {
        reserveOrThrow(actorKey, dispatchCount);
    }

    private static String normalizeActorOrThrow(String actorKey) {
        if (actorKey == null || actorKey.isBlank()) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        }
        return actorKey.trim();
    }

    private void reject(String normalizedActor, int dispatchCount, boolean oversizedBatch) {
        recordRejection(normalizedActor, dispatchCount);
        String message = oversizedBatch
                ? "시간당 메일 발송 한도(" + dispatchesPerHour + "건)를 초과하여 한 번에 "
                        + dispatchCount + "건을 발송할 수 없습니다."
                : "시간당 메일 발송 한도(" + dispatchesPerHour + "건)를 초과했습니다. 잠시 후 다시 시도해 주세요.";
        throw new BusinessException(CommonErrorCode.TOO_MANY_REQUESTS, message);
    }

    private void recordRejection(String actorKey, int dispatchCount) {
        long total = rejectedCount.incrementAndGet();
        MeterRegistry registry = meterRegistryProvider == null ? null : meterRegistryProvider.getIfAvailable();
        if (registry != null) {
            registry.counter(REJECTION_METRIC).increment();
        }
        log.warn("[MAIL-RATE-LIMIT] 429 거절 — actor={} requested={} limitPerHour={} 누적={}",
                SafeLog.text(actorKey), dispatchCount, dispatchesPerHour, total);
    }

    private static final class DispatchSlice {
        private final long epochMillis;
        private final int count;
        private boolean released;

        private DispatchSlice(long epochMillis, int count) {
            this.epochMillis = epochMillis;
            this.count = count;
        }
    }

    private static final class UserWindow {
        private final ArrayDeque<DispatchSlice> slices = new ArrayDeque<>();
        private int activeCount;

        synchronized boolean canConsume(int dispatchCount, long nowMillis, int limitPerHour) {
            evictExpired(nowMillis);
            return (long) activeCount + dispatchCount <= limitPerHour;
        }

        synchronized DispatchSlice tryReserve(int dispatchCount, long nowMillis, int limitPerHour) {
            evictExpired(nowMillis);
            if ((long) activeCount + dispatchCount > limitPerHour) {
                return null;
            }
            DispatchSlice slice = new DispatchSlice(nowMillis, dispatchCount);
            slices.addLast(slice);
            activeCount += dispatchCount;
            return slice;
        }

        synchronized void release(DispatchSlice slice) {
            if (slice.released) {
                return;
            }
            slice.released = true;
            activeCount -= slice.count;
            slices.remove(slice);
        }

        private void evictExpired(long nowMillis) {
            long cutoff = nowMillis - WINDOW_MILLIS;
            while (!slices.isEmpty() && slices.peekFirst().epochMillis <= cutoff) {
                DispatchSlice expired = slices.removeFirst();
                if (!expired.released) {
                    expired.released = true;
                    activeCount -= expired.count;
                }
            }
        }
    }
}
