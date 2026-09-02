package nuri.business.service.log;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.domain.log.UserLogRepository;
import nuri.foundation.core.event.AuditEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 🧾 사용자 활동 집계 <b>적재 경로</b> 검증 — {@link UserActivityLogAggregator}.
 *
 * <p>[왜 이 테스트가 필요한가] {@code tb_user_log} 에는 조회·삭제·통계 질의만 있고
 * <b>저장 경로가 없었다</b>. 그래서 관리 화면이 빈 표였을 뿐 아니라
 * {@code ReportStatsService} 의 날짜별 활동 통계도 <b>언제나 0</b>이었다.
 *
 * <p>이 테스트가 고정하는 두 가지 함정:
 * <ol>
 *   <li><b>미인증 요청 배제</b> — {@code dmnd_user_id} 에 {@code tb_user_info(esntl_id)} FK 가
 *       걸려 있어 'ANONYMOUS' 를 넣으면 UPSERT 가 전량 실패한다.</li>
 *   <li><b>핸들러 없는 요청 배제</b> — URL 로 키를 만들면 경로변수(예: {@code /users/1}) 때문에
 *       키가 무한히 늘어 사용자당 요청 수만큼 행이 생긴다.</li>
 * </ol>
 */
@DisplayName("UserActivityLogAggregator — 활동 집계와 키 폭발·FK 함정 차단")
class UserActivityLogAggregatorTest {

    private static final LocalDateTime AT = LocalDateTime.of(2026, 9, 2, 9, 30);

    private static AuditEvent event(String httpMethod, int status, String esntlId, String service, String method) {
        return new AuditEvent("/api/v1/things", httpMethod, status, "loginid", esntlId, "10.0.0.1", 5L,
                AT, service, method);
    }

    private UserActivityLogAggregator aggregator(UserLogRepository repository, MeterRegistry registry) {
        @SuppressWarnings("unchecked")
        ObjectProvider<MeterRegistry> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(registry);
        return new UserActivityLogAggregator(repository, provider);
    }

    @Test
    @DisplayName("같은 키의 요청은 모였다가 한 번의 UPSERT 로 누적된다")
    void accumulatesThenFlushesOnce() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.onAuditEvent(event("GET", 200, "E1", "ThingApiController", "list"));
        aggregator.onAuditEvent(event("GET", 200, "E1", "ThingApiController", "list"));
        aggregator.onAuditEvent(event("GET", 500, "E1", "ThingApiController", "list"));

        assertThat(aggregator.getBufferedKeyCount()).isEqualTo(1);
        verifyNoInteractions(repository);

        aggregator.flush();

        verify(repository).upsertActivityCounts(
                eq("20260902"), eq("E1"), eq("ThingApiController"), eq("list"),
                eq(0L), eq(0L), eq(3L), eq(0L), eq(0L), eq(1L));
        assertThat(aggregator.getBufferedKeyCount()).isZero();
    }

    /**
     * 실패한 요청도 동작 카운터를 올린다 — {@code inq_cnt} 는 '조회 시도', {@code err_cnt} 는
     * '그중 실패' 다. 위 테스트에서 조회 3건·오류 1건이 되는 이유가 이것이다.
     */
    @ParameterizedTest(name = "{0} → crt {1} / mdfcn {2} / inq {3} / del {4}")
    @CsvSource({
            "POST,   1, 0, 0, 0",
            "PUT,    0, 1, 0, 0",
            "PATCH,  0, 1, 0, 0",
            "GET,    0, 0, 1, 0",
            "HEAD,   0, 0, 1, 0",
            "DELETE, 0, 0, 0, 1"
    })
    @DisplayName("HTTP 메서드를 처리구분 카운터로 매핑한다")
    void mapsHttpMethodToCounter(String httpMethod, long crt, long mdfcn, long inq, long del) {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.onAuditEvent(event(httpMethod, 200, "E1", "C", "m"));
        aggregator.flush();

        verify(repository).upsertActivityCounts(
                anyString(), anyString(), anyString(), anyString(),
                eq(crt), eq(mdfcn), eq(inq), eq(del), eq(0L), eq(0L));
    }

    @Test
    @DisplayName("OPTIONS 같은 비업무 메서드는 어떤 동작 카운터도 올리지 않는다")
    void ignoresNonBusinessMethods() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.onAuditEvent(event("OPTIONS", 200, "E1", "C", "m"));
        aggregator.flush();

        verify(repository).upsertActivityCounts(
                anyString(), anyString(), anyString(), anyString(),
                eq(0L), eq(0L), eq(0L), eq(0L), eq(0L), eq(0L));
    }

    @Test
    @DisplayName("미인증 요청은 집계하지 않는다 — esntl_id FK 위반 차단")
    void skipsAnonymousRequests() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.onAuditEvent(event("GET", 200, null, "C", "m"));
        aggregator.onAuditEvent(event("GET", 200, "   ", "C", "m"));
        aggregator.flush();

        assertThat(aggregator.getBufferedKeyCount()).isZero();
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("핸들러가 없는 요청은 집계하지 않는다 — 키 카디널리티 폭발 차단")
    void skipsRequestsWithoutHandler() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.onAuditEvent(event("GET", 404, "E1", null, null));
        aggregator.onAuditEvent(event("GET", 404, "E1", "C", null));
        aggregator.flush();

        assertThat(aggregator.getBufferedKeyCount()).isZero();
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("서로 다른 사용자·핸들러는 각각의 키로 분리된다")
    void separatesKeysByUserAndHandler() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.onAuditEvent(event("GET", 200, "E1", "A", "m"));
        aggregator.onAuditEvent(event("GET", 200, "E2", "A", "m"));
        aggregator.onAuditEvent(event("GET", 200, "E1", "B", "m"));

        assertThat(aggregator.getBufferedKeyCount()).isEqualTo(3);
    }

    /**
     * 한 키의 FK 위반(집계 도중 탈퇴 등)이 나머지 전부를 함께 버리면 안 된다.
     * PostgreSQL 은 트랜잭션 안 한 문장의 실패로 트랜잭션 전체를 중단시키므로 키 단위 경계가 필요하다.
     */
    @Test
    @DisplayName("한 키의 적재 실패가 나머지 키의 적재를 막지 않는다")
    void oneFailingKeyDoesNotBlockOthers() {
        UserLogRepository repository = mock(UserLogRepository.class);
        when(repository.upsertActivityCounts(
                anyString(), eq("E-GONE"), anyString(), anyString(),
                anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong()))
                .thenThrow(new DataIntegrityViolationException("fk_tb_user_log_tb_user_info"));
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        UserActivityLogAggregator aggregator = aggregator(repository, registry);

        aggregator.onAuditEvent(event("GET", 200, "E-GONE", "A", "m"));
        aggregator.onAuditEvent(event("GET", 200, "E-OK", "A", "m"));

        assertThatCode(aggregator::flush).doesNotThrowAnyException();

        verify(repository).upsertActivityCounts(
                anyString(), eq("E-OK"), anyString(), anyString(),
                anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
        assertThat(aggregator.getPersistFailureCount()).isEqualTo(1);
        assertThat(aggregator.getBufferedKeyCount()).isZero();
        assertThat(registry.find(UserActivityLogAggregator.DROP_METRIC).counter()).isNotNull();
    }

    @Test
    @DisplayName("버퍼가 비어 있으면 저장소를 건드리지 않는다")
    void flushIsNoOpWhenEmpty() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.flush();

        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("종료 훅이 남은 버퍼를 비운다")
    void shutdownFlushesRemainingBuffer() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        aggregator.onAuditEvent(event("POST", 201, "E1", "C", "m"));
        aggregator.flushOnShutdown();

        verify(repository).upsertActivityCounts(
                anyString(), eq("E1"), anyString(), anyString(),
                eq(1L), eq(0L), eq(0L), eq(0L), eq(0L), eq(0L));
    }

    /**
     * 누적 중 예외가 밖으로 나가면 {@code publishEvent} 를 통해 요청 완료 경로를 깨뜨린다.
     * 감사가 서비스를 무너뜨리지 않는다는 계약을 고정한다.
     */
    @Test
    @DisplayName("누적 중 예외는 밖으로 나가지 않고 유실로만 센다")
    void accumulateExceptionIsContained() {
        UserLogRepository repository = mock(UserLogRepository.class);
        UserActivityLogAggregator aggregator = aggregator(repository, new SimpleMeterRegistry());

        AuditEvent brokenTimestamp = new AuditEvent(
                "/api/v1/x", "GET", 200, "loginid", "E1", "10.0.0.1", 1L, null, "C", "m");

        assertThatCode(() -> aggregator.onAuditEvent(brokenTimestamp)).doesNotThrowAnyException();

        assertThat(aggregator.getDroppedEventCount()).isEqualTo(1);
        verify(repository, never()).upsertActivityCounts(
                anyString(), anyString(), anyString(), anyString(),
                anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }
}
