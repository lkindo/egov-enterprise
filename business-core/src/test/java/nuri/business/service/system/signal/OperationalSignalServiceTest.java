package nuri.business.service.system.signal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.system.signal.OperationalSignalService.Kind;
import nuri.business.service.system.signal.OperationalSignalService.OperationalSignal;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

/**
 * [2026-10-20] 관리자 홈의 운영 신호 요약. 신호마다 그 원천의 조회 권한이 있을 때만 싣고(H3), 셀 수 없으면 0 이 아니라 null 이다.
 */
@DisplayName("OperationalSignalService — 운영 신호 요약")
class OperationalSignalServiceTest {

    /** 2026-10-20 08:30 KST = 2026-10-19 23:30 UTC — 서버 날짜와 UTC 날짜가 다른 시각이다. */
    private static final Instant NOW = Instant.parse("2026-10-19T23:30:00Z");
    private static final Clock SEOUL = Clock.fixed(NOW, ZoneId.of("Asia/Seoul"));

    private final DurableJobRepository durableJobs = mock(DurableJobRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final SysLogRepository sysLogs = mock(SysLogRepository.class);
    private final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
    private final OperationalSignalService service = new OperationalSignalService(durableJobs, users, sysLogs,
            transactionManager, SEOUL);

    @BeforeEach
    void counts() {
        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenAnswer(invocation -> new SimpleTransactionStatus());
        when(durableJobs.countByPrcsSttsNm("FAILED")).thenReturn(3L);
        when(users.countByLckYn("Y")).thenReturn(2L);
        when(sysLogs.countByOcrnYmd("20261020")).thenReturn(5L);
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void signIn(String... permissions) {
        var principal = CustomUserDetails.builder().userId("operator").esntlId("USRCNFRM_00000000099").userNm("operator")
                .password("test").groups(List.of("OPERATIONS_TEAM")).permissions(List.of(permissions)).enabled(true).lockAt("N")
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @Test
    @DisplayName("세 원천을 모두 조회할 수 있으면 세 신호를 고정 순서로, 관측 시각과 함께 싣는다")
    void allSourcesReadable() {
        signIn("DASHBOARD_ADMIN_READ", "DWORK_READ", "USER_READ", "SYS_LOG_READ");

        var snapshot = service.currentSignals();

        assertThat(snapshot.observedAt()).isEqualTo(NOW);
        assertThat(snapshot.signals()).extracting(OperationalSignal::kind, OperationalSignal::count).containsExactly(
                tuple(Kind.FAILED_DURABLE_JOBS, 3L), tuple(Kind.LOCKED_ACCOUNTS, 2L), tuple(Kind.FAILED_REQUESTS_TODAY, 5L));
    }

    /** 감사 담당 묶음(log-audit-viewer)은 관리자 홈·후속 작업·시스템 로그를 보지만 사용자 조회 권한이 없다. */
    @Test
    @DisplayName("원천 조회 권한이 없는 신호는 싣지 않고 그 원천을 세지도 않는다(H3)")
    void omitsSignalsWhoseSourceTheViewerCannotRead() {
        signIn("DASHBOARD_ADMIN_READ", "DWORK_READ", "SYS_LOG_READ");

        assertThat(service.currentSignals().signals()).extracting(OperationalSignal::kind)
                .containsExactly(Kind.FAILED_DURABLE_JOBS, Kind.FAILED_REQUESTS_TODAY);
        verify(users, never()).countByLckYn("Y");
    }

    @Test
    @DisplayName("관리자 홈 권한만 있으면 신호가 하나도 없다 — 원천을 하나도 세지 않는다")
    void dashboardPermissionAloneExposesNoCounts() {
        signIn("DASHBOARD_ADMIN_READ");

        assertThat(service.currentSignals().signals()).isEmpty();
        verifyNoInteractions(durableJobs, users, sysLogs);
    }

    @Test
    @DisplayName("인증 주체가 없으면 신호가 없다")
    void anonymousSeesNothing() {
        assertThat(service.currentSignals().signals()).isEmpty();
        verifyNoInteractions(durableJobs, users, sysLogs);
    }

    @Test
    @DisplayName("한 신호의 조회 실패는 0 이 아니라 null 이고, 다른 신호를 가리지 않는다")
    void failedCountIsNullAndIsolated() {
        signIn("DWORK_READ", "USER_READ", "SYS_LOG_READ");
        when(users.countByLckYn("Y")).thenThrow(new IllegalStateException("db down"));

        assertThat(service.currentSignals().signals()).extracting(OperationalSignal::kind, OperationalSignal::count).containsExactly(
                tuple(Kind.FAILED_DURABLE_JOBS, 3L), tuple(Kind.LOCKED_ACCOUNTS, null), tuple(Kind.FAILED_REQUESTS_TODAY, 5L));
    }

    @Test
    @DisplayName("음수 건수는 믿을 수 없는 값이라 null 로 낸다")
    void negativeCountIsUnknown() {
        signIn("DWORK_READ");
        when(durableJobs.countByPrcsSttsNm("FAILED")).thenReturn(-1L);

        assertThat(service.currentSignals().signals()).extracting(OperationalSignal::count).containsExactly((Long) null);
    }

    @Test
    @DisplayName("오늘은 기록과 같은 서버 시간대의 날짜다 — UTC 날짜(20261019)로 세지 않는다")
    void todayFollowsTheServerZoneThatWroteTheLog() {
        signIn("SYS_LOG_READ");

        service.currentSignals();

        verify(sysLogs).countByOcrnYmd("20261020");
        verify(sysLogs, never()).countByOcrnYmd("20261019");
    }
}
