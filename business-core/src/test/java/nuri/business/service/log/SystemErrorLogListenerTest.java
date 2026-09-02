package nuri.business.service.log;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.domain.log.SysLog;
import nuri.business.domain.log.SysLogRepository;
import nuri.foundation.core.event.AuditEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 🧾 시스템 오류 로그 <b>적재 경로</b> 검증 — {@link SystemErrorLogListener}.
 *
 * <p>[왜 이 테스트가 필요한가] 이 리스너가 생기기 전까지 {@code tb_sys_log} 에 쓰는 코드는
 * 저장소 전체에 <b>하나도 없었다</b>. 조회 API·관리 화면·보존 스케줄러만 있어 관리자는 언제나
 * 빈 표를 봤다. 그러므로 이 테스트의 본질은 "형식이 맞는가"가 아니라
 * <b>"실패한 요청이 실제로 기록되는가"</b>이며, 동시에 성공 요청까지 싸잡아 기록해
 * {@code tb_web_log} 를 복제하지 않는지도 함께 고정한다.
 */
@DisplayName("SystemErrorLogListener — 실패 요청 적재와 성공 요청 배제")
class SystemErrorLogListenerTest {

    private static AuditEvent event(int statusCode, String httpMethod) {
        return new AuditEvent(
                "/api/v1/things/9", httpMethod, statusCode, "webmaster", "USRCNFRM_0001", "10.0.0.1", 12L,
                LocalDateTime.of(2026, 8, 4, 12, 0), "ThingApiController", "updateThing");
    }

    private SystemErrorLogListener listener(SysLogRepository repository, MeterRegistry registry) {
        @SuppressWarnings("unchecked")
        ObjectProvider<MeterRegistry> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(registry);
        return new SystemErrorLogListener(repository, provider);
    }

    @Test
    @DisplayName("실패 요청은 상태코드·오류구분·처리구분과 함께 기록된다")
    void persistsFailureWithClassification() {
        SysLogRepository repository = mock(SysLogRepository.class);
        SystemErrorLogListener listener = listener(repository, new SimpleMeterRegistry());

        listener.onAuditEvent(event(500, "PUT"));

        ArgumentCaptor<SysLog> captor = ArgumentCaptor.forClass(SysLog.class);
        verify(repository).save(captor.capture());
        SysLog saved = captor.getValue();
        assertThat(saved.getRspnsCd()).isEqualTo("500");
        assertThat(saved.getErrSeCd()).isEqualTo("SERVER");
        assertThat(saved.getPrcsSeCd()).isEqualTo(ProcessTypeCode.UPDATE.code());
        assertThat(saved.getSrvcNm()).isEqualTo("ThingApiController");
        assertThat(saved.getMthdNm()).isEqualTo("updateThing");
        assertThat(saved.getDmndUserId()).isEqualTo("webmaster");
        assertThat(saved.getDmndUserIpAddr()).isEqualTo("10.0.0.1");
        assertThat(saved.getOcrnYmd()).isEqualTo("20260804");
        assertThat(saved.getPrcsTm()).isEqualTo(12L);
        assertThat(saved.getDmndId()).hasSize(20);
        // err_cd 는 지어내지 않는다 — 인터셉터 계층에 애플리케이션 오류 코드가 없다.
        assertThat(saved.getErrCd()).isNull();
    }

    @Test
    @DisplayName("4xx 는 CLIENT 로 구분한다")
    void classifiesClientError() {
        SysLogRepository repository = mock(SysLogRepository.class);
        SystemErrorLogListener listener = listener(repository, new SimpleMeterRegistry());

        listener.onAuditEvent(event(404, "GET"));

        ArgumentCaptor<SysLog> captor = ArgumentCaptor.forClass(SysLog.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getErrSeCd()).isEqualTo("CLIENT");
    }

    /**
     * 성공 요청까지 담으면 {@code tb_web_log} 와 같은 사실을 두 벌 쓰게 되고, 관리자는 여전히
     * 오류를 찾지 못한다. 이 배제가 이 로그의 존재 이유다.
     */
    @ParameterizedTest(name = "status {0} 은 기록하지 않는다")
    @ValueSource(ints = {200, 201, 204, 302, 304, 399})
    @DisplayName("성공 응답은 시스템 오류 로그에 기록하지 않는다")
    void ignoresSuccessfulRequests(int statusCode) {
        SysLogRepository repository = mock(SysLogRepository.class);
        SystemErrorLogListener listener = listener(repository, new SimpleMeterRegistry());

        listener.onAuditEvent(event(statusCode, "GET"));

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("적재 실패는 요청을 깨뜨리지 않고 유실 카운터와 메트릭으로 드러난다")
    void persistFailureIsCountedAndNotPropagated() {
        SysLogRepository repository = mock(SysLogRepository.class);
        when(repository.save(any(SysLog.class)))
                .thenThrow(new DataIntegrityViolationException("uk_tb_sys_log_dmnd_id"));
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        SystemErrorLogListener listener = listener(repository, registry);

        assertThatCode(() -> listener.onAuditEvent(event(500, "POST"))).doesNotThrowAnyException();

        assertThat(listener.getPersistFailureCount()).isEqualTo(1);
        assertThat(registry.find(SystemErrorLogListener.DROP_METRIC).counter()).isNotNull();
        assertThat(registry.find(SystemErrorLogListener.DROP_METRIC).counter().count()).isEqualTo(1.0d);
    }

    @Test
    @DisplayName("메트릭 레지스트리가 없어도 유실 계수는 계속된다")
    void countsWithoutMeterRegistry() {
        SysLogRepository repository = mock(SysLogRepository.class);
        when(repository.save(any(SysLog.class))).thenThrow(new IllegalStateException("boom"));
        SystemErrorLogListener listener = listener(repository, null);

        assertThatCode(() -> listener.onAuditEvent(event(503, "GET"))).doesNotThrowAnyException();

        assertThat(listener.getPersistFailureCount()).isEqualTo(1);
    }

    /**
     * {@code srvc_nm}·{@code mthd_nm} 은 varchar(100) 이다. 자르지 않으면 긴 핸들러명 하나가
     * 오류 로그 적재를 통째로 실패시킨다 — 정작 장애 상황에서 기록이 사라진다.
     */
    @Test
    @DisplayName("컬럼 폭을 넘는 서비스명은 100자로 잘라 적재한다")
    void truncatesOverlongNames() {
        SysLogRepository repository = mock(SysLogRepository.class);
        SystemErrorLogListener listener = listener(repository, new SimpleMeterRegistry());
        String longName = "A".repeat(180);

        listener.onAuditEvent(new AuditEvent(
                "/api/v1/x", "GET", 500, "u", "E1", "10.0.0.1", 1L,
                LocalDateTime.of(2026, 8, 4, 12, 0), longName, longName));

        ArgumentCaptor<SysLog> captor = ArgumentCaptor.forClass(SysLog.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getSrvcNm()).hasSize(100);
        assertThat(captor.getValue().getMthdNm()).hasSize(100);
    }

    /**
     * 매핑되지 않은 경로의 404 에는 핸들러가 없어 서비스·메서드명이 null 이다. 그때도 기록은
     * 남아야 한다 — 존재하지 않는 경로를 두드리는 것 자체가 조사 대상이기 때문이다.
     */
    @Test
    @DisplayName("핸들러가 없는 실패도 URL·HTTP 메서드로 대체해 기록한다")
    void fallsBackToUrlWhenHandlerUnknown() {
        SysLogRepository repository = mock(SysLogRepository.class);
        SystemErrorLogListener listener = listener(repository, new SimpleMeterRegistry());

        listener.onAuditEvent(new AuditEvent(
                "/api/v1/unmapped", "GET", 404, "ANONYMOUS", null, "10.0.0.1", 1L,
                LocalDateTime.of(2026, 8, 4, 12, 0), null, null));

        ArgumentCaptor<SysLog> captor = ArgumentCaptor.forClass(SysLog.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getSrvcNm()).isEqualTo("/api/v1/unmapped");
        assertThat(captor.getValue().getMthdNm()).isEqualTo("GET");
    }
}
