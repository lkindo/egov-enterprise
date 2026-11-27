package nuri.business.service.mail;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("MailUserRateLimiter 단위 테스트")
class MailUserRateLimiterTest {

    @Test
    @DisplayName("기본 시간당 30건까지 허용하고 31번째 발송은 429(C015) 및 메트릭으로 차단한다")
    void allowsUpToHourlyLimitAndRejectsBeyondLimit() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        @SuppressWarnings("unchecked")
        ObjectProvider<io.micrometer.core.instrument.MeterRegistry> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(registry);
        MailUserRateLimiter limiter = new MailUserRateLimiter(MailUserRateLimiter.DEFAULT_DISPATCHES_PER_HOUR, provider);

        assertThat(limiter.dispatchesPerHour()).isEqualTo(30);
        for (int i = 0; i < 30; i++) {
            limiter.consumeOrThrow("user-a", 1);
        }

        assertThatThrownBy(() -> limiter.consumeOrThrow("user-a", 1))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);
        assertThat(registry.counter(MailUserRateLimiter.REJECTION_METRIC).count()).isEqualTo(1.0);

        // 다른 사용자는 독립 창을 사용한다.
        limiter.consumeOrThrow("user-b", 1);
    }

    @Test
    @DisplayName("한 요청의 수신자 수가 시간당 한도를 넘으면 잔여 한도를 깎지 않고 즉시 429로 거부한다")
    void rejectsOversizedBatchWithoutConsumingRemainingTokens() {
        MailUserRateLimiter limiter = new MailUserRateLimiter(30);
        limiter.consumeOrThrow("user-batch", 20);

        assertThatThrownBy(() -> limiter.consumeOrThrow("user-batch", 31))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);

        // 앞서 남은 10건은 보존된다.
        limiter.consumeOrThrow("user-batch", 10);
    }

    @Test
    @DisplayName("롤링 1시간 슬라이딩 창은 2분 경과에도 추가 보충하지 않고 만료분만 정확히 복구한다")
    void slidingWindowEnforcesStrictHourlyCapAcrossTimeBoundaries() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-27T00:00:00Z"));
        MailUserRateLimiter limiter = new MailUserRateLimiter(30, clock);

        limiter.consumeOrThrow("user-slide", 15);
        clock.advance(Duration.ofMinutes(2));
        // greedy 버킷이라면 2분 경과 시 1토큰이 보충되지만 슬라이딩 창은 정확히 15건만 남는다.
        limiter.consumeOrThrow("user-slide", 15);

        assertThatThrownBy(() -> limiter.consumeOrThrow("user-slide", 1))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);

        clock.advance(Duration.ofMinutes(57).plusSeconds(59)); // t+59m59s: 첫 15건도 아직 1시간 이내
        assertThatThrownBy(() -> limiter.consumeOrThrow("user-slide", 1))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);

        clock.advance(Duration.ofSeconds(1)); // t+60m00s: 첫 15건만 만료, +2분 분 15건은 유효
        limiter.assertWithinLimit("user-slide", 15);
        limiter.consumeOrThrow("user-slide", 15);

        assertThatThrownBy(() -> limiter.consumeOrThrow("user-slide", 1))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);
    }

    @Test
    @DisplayName("예약 해제는 멱등이며 이미 만료된 슬라이스를 해제해도 다른 슬라이스 한도를 늘리지 않는다")
    void reservationReleaseIsIdempotentAndDoesNotOverCreditAfterExpiry() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-27T01:00:00Z"));
        MailUserRateLimiter limiter = new MailUserRateLimiter(5, clock);

        MailUserRateLimiter.Reservation r1 = limiter.reserveOrThrow("user-res", 3);
        r1.release();
        r1.release(); // 2회 해제는 1회만 복구
        limiter.consumeOrThrow("user-res", 5); // 5건 전부 사용 가능해야 하며 6건은 불가
        assertThatThrownBy(() -> limiter.consumeOrThrow("user-res", 1))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);

        // 새 창에서 만료 후 이전 예약을 release해도 새 슬라이스를 깎지 않는다.
        clock.advance(Duration.ofHours(2));
        MailUserRateLimiter.Reservation stale = limiter.reserveOrThrow("user-res", 2);
        clock.advance(Duration.ofMinutes(61));
        limiter.consumeOrThrow("user-res", 4);
        stale.release();
        assertThatThrownBy(() -> limiter.consumeOrThrow("user-res", 2))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.TOO_MANY_REQUESTS);
        limiter.consumeOrThrow("user-res", 1);
    }

    @Test
    @DisplayName("동시 요청에서도 한도를 초과해 예약을 승인하지 않는다")
    void concurrentReservationsNeverExceedLimit() throws Exception {
        MailUserRateLimiter limiter = new MailUserRateLimiter(30);
        int threads = 10;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        try {
            List<Callable<Void>> tasks = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                tasks.add(() -> {
                    startGate.await();
                    try {
                        limiter.reserveOrThrow("user-concurrent", 5);
                        succeeded.incrementAndGet();
                    } catch (BusinessException ex) {
                        if (ex.getErrorCode() == CommonErrorCode.TOO_MANY_REQUESTS) {
                            rejected.incrementAndGet();
                        } else {
                            throw ex;
                        }
                    }
                    return null;
                });
            }
            List<Future<Void>> futures = new ArrayList<>();
            for (Callable<Void> task : tasks) {
                futures.add(pool.submit(task));
            }
            startGate.countDown();
            for (Future<Void> future : futures) {
                future.get();
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(succeeded.get()).isEqualTo(6);
        assertThat(rejected.get()).isEqualTo(4);
    }

    @Test
    @DisplayName("발송자 식별자가 비어 있으면 거부하고, 1 미만 한도는 기동에서 차단한다")
    void rejectsBlankActorAndNonPositiveLimit() {
        MailUserRateLimiter limiter = new MailUserRateLimiter(30);
        assertThatThrownBy(() -> limiter.consumeOrThrow("  ", 1))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.UNAUTHORIZED);
        assertThatThrownBy(() -> limiter.consumeOrThrow(null, 1))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.UNAUTHORIZED);

        assertThatThrownBy(() -> new MailUserRateLimiter(0))
                .isInstanceOf(IllegalStateException.class);
    }

    private static final class MutableClock extends Clock {
        private final AtomicReference<Instant> current;

        private MutableClock(Instant initial) {
            this.current = new AtomicReference<>(initial);
        }

        private void advance(Duration delta) {
            current.updateAndGet(now -> now.plus(delta));
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current.get();
        }
    }
}
