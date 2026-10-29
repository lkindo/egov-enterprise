package nuri.api.schema;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.system.signal.OperationalSignalService;
import nuri.business.service.system.signal.OperationalSignalService.Kind;
import nuri.business.service.system.signal.OperationalSignalService.OperationalSignal;
import nuri.business.service.system.signal.OperationalSignalService.OperationalSignals;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestReporter;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.assertj.core.api.Assertions.assertThat;

/** Actual PostgreSQL SQL failures, actual JPA COUNTs, and the production annotation transaction boundary. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("운영 신호 PostgreSQL 조회 실패 격리·원천 권한")
@Timeout(45)
class OperationalSignalIsolationIntegrationTest {
    @Autowired private DurableJobRepository durableJobs;
    @Autowired private UserRepository users;
    @Autowired private SysLogRepository sysLogs;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private Environment environment;
    @PersistenceContext private EntityManager entityManager;

    private final EnumSet<Kind> failNext = EnumSet.noneOf(Kind.class);
    private final List<QueryTrace> traces = new ArrayList<>();
    private final List<String> requestFailures = new ArrayList<>();
    private final List<String> requestIds = new ArrayList<>();
    private OperationalSignalService service;
    private String fixtureUser;
    private String fixtureJob;

    @BeforeEach
    void createOnlyOwnFixturesAndProductionAnnotationProxy() {
        assertThat(environment.getProperty("spring.datasource.url"))
                .startsWith("jdbc:tc:postgresql:17:");
        assertThat(transactionManager).isInstanceOf(JpaTransactionManager.class);
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        assertThat(jdbc.getDataSource()).isSameAs(dataSource);
        assertThat(AopUtils.isAopProxy(durableJobs)).isTrue();
        assertThat(AopUtils.isAopProxy(users)).isTrue();
        assertThat(AopUtils.isAopProxy(sysLogs)).isTrue();

        String prefix = "OS" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        fixtureUser = prefix + "U";
        fixtureJob = UUID.randomUUID().toString();
        jdbc.update("""
                INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd)
                VALUES (?,?,'test-only-unusable','Signal fixture','P','Y',to_char(CURRENT_DATE,'YYYYMMDD'))
                """, fixtureUser, fixtureUser);
        jdbc.update("""
                INSERT INTO tb_sys_job(job_mng_no,job_se_nm,job_cn,prcs_stts_nm,rtry_nmtm,job_prnmnt_dt)
                VALUES (?,'SIGNAL_TEST_ONLY','{}','FAILED',0,CURRENT_TIMESTAMP)
                """, fixtureJob);
        // Adjacent dates keep the nonzero fixture valid across a midnight boundary. Expected dates use observedAt.
        LocalDate today = LocalDate.now();
        for (int offset = -1; offset <= 1; offset++) {
            String requestId = prefix + "L" + (offset + 1);
            requestIds.add(requestId);
            jdbc.update("INSERT INTO tb_sys_log(dmnd_id,ocrn_ymd) VALUES (?,?)",
                    requestId, today.plusDays(offset).format(DateTimeFormatter.BASIC_ISO_DATE));
        }

        DurableJobRepository observedJobs = observing(DurableJobRepository.class, durableJobs,
                "countByPrcsSttsNm", Kind.FAILED_DURABLE_JOBS);
        UserRepository observedUsers = observing(UserRepository.class, users,
                "countByLckYn", Kind.LOCKED_ACCOUNTS);
        SysLogRepository observedLogs = observing(SysLogRepository.class, sysLogs,
                "countByOcrnYmd", Kind.FAILED_REQUESTS_TODAY);
        // Use the application JPA manager for both production annotation advice and the COUNT transactions.
        var target = new OperationalSignalService(observedJobs, observedUsers, observedLogs, transactionManager);
        var transactionAdvice = new TransactionInterceptor();
        transactionAdvice.setTransactionManager(transactionManager);
        transactionAdvice.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var proxy = new ProxyFactory(target);
        proxy.setProxyTargetClass(true);
        proxy.addAdvice(transactionAdvice);
        service = (OperationalSignalService) proxy.getProxy();
        signIn(EnumSet.allOf(Kind.class));
    }

    @AfterEach
    void reportOnlySafeTransactionFactsAndRemoveOnlyOwnFixtures(TestReporter reporter) {
        reporter.publishEntry("operational-signal-query-trace", traces.toString());
        reporter.publishEntry("operational-signal-request-failure-types", requestFailures.toString());
        try {
            for (String requestId : requestIds) {
                jdbc.update("DELETE FROM tb_sys_log WHERE dmnd_id=?", requestId);
            }
            if (fixtureJob != null) jdbc.update("DELETE FROM tb_sys_job WHERE job_mng_no=?", fixtureJob);
            if (fixtureUser != null) jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", fixtureUser);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void healthyCountsComeFromRealRepositoriesInReadOnlyTransactions() {
        Instant before = Instant.now();
        RequestOutcome outcome = request();
        Instant after = Instant.now();

        assertHealthy(outcome, EnumSet.allOf(Kind.class));
        assertThat(outcome.snapshot().observedAt()).isBetween(before, after);
        assertThat(outcome.snapshot().signals()).allSatisfy(signal -> assertThat(signal.count()).isPositive());
        assertThat(traces).extracting(QueryTrace::kind).containsExactly(Kind.values());
        assertThat(traces).allSatisfy(trace -> assertThat(trace.sqlState()).isEqualTo("OK"));
    }

    @ParameterizedTest
    @EnumSource(Kind.class)
    void aRealSqlFailureLeavesOnlyThatSourceUnknown(Kind failed) {
        failNext.add(failed);

        RequestOutcome outcome = request();

        assertIsolated(outcome, failed);
    }

    @ParameterizedTest
    @EnumSource(Kind.class)
    void unreadableSourceIsOmittedWithoutInvokingItsRepositoryOrFailureSql(Kind unreadable) {
        EnumSet<Kind> readable = EnumSet.allOf(Kind.class);
        readable.remove(unreadable);
        signIn(readable);
        failNext.add(unreadable);

        RequestOutcome outcome = request();

        assertHealthy(outcome, readable);
        assertThat(traces).extracting(QueryTrace::kind).containsExactlyElementsOf(readable);
        assertThat(failNext).containsExactly(unreadable);
        assertThat(traces).allSatisfy(trace -> assertThat(trace.sqlState()).isEqualTo("OK"));
    }

    @Test
    void dashboardPermissionAloneInvokesNoSource() {
        signIn(EnumSet.noneOf(Kind.class));
        failNext.addAll(EnumSet.allOf(Kind.class));

        RequestOutcome outcome = request();

        assertReturned(outcome);
        assertThat(outcome.snapshot().signals()).isEmpty();
        assertThat(traces).isEmpty();
        assertThat(failNext).containsExactly(Kind.values());
    }

    @Test
    void nextRequestRecoversOnTheSameServiceAndConnectionPool() {
        failNext.add(Kind.FAILED_DURABLE_JOBS);
        RequestOutcome failedRequest = request();
        List<QueryTrace> firstTraces = List.copyOf(traces);
        traces.clear();

        RequestOutcome recovered = request();
        List<QueryTrace> recoveredTraces = List.copyOf(traces);
        traces.addAll(0, firstTraces);

        // Execute recovery before evaluating the first request, so the red run also records pool recovery.
        assertHealthy(recovered, EnumSet.allOf(Kind.class));
        assertThat(recoveredTraces).extracting(QueryTrace::kind).containsExactly(Kind.values());
        assertThat(recoveredTraces).allSatisfy(trace -> assertThat(trace.sqlState()).isEqualTo("OK"));
        assertIsolated(failedRequest, Kind.FAILED_DURABLE_JOBS, firstTraces);
    }

    private void assertIsolated(RequestOutcome outcome, Kind failed) {
        assertIsolated(outcome, failed, traces);
    }

    private void assertIsolated(RequestOutcome outcome, Kind failed, List<QueryTrace> requestTraces) {
        assertThat(requestTraces).extracting(QueryTrace::kind).containsExactly(Kind.values());
        assertThat(requestTraces).filteredOn(trace -> trace.kind() == failed)
                .extracting(QueryTrace::sqlState).containsExactly("22012");
        assertThat(requestTraces).filteredOn(trace -> trace.kind() != failed)
                .as("healthy COUNTs must not inherit SQLState 25P02; traces=%s", requestTraces)
                .allSatisfy(trace -> assertThat(trace.sqlState()).isEqualTo("OK"));
        assertReturned(outcome);
        assertThat(outcome.snapshot().signals()).extracting(OperationalSignal::kind).containsExactly(Kind.values());
        for (OperationalSignal signal : outcome.snapshot().signals()) {
            if (signal.kind() == failed) assertThat(signal.count()).isNull();
            else assertThat(signal.count()).isEqualTo(actualCount(signal.kind(), outcome.snapshot().observedAt()));
        }
    }

    private void assertHealthy(RequestOutcome outcome, EnumSet<Kind> readable) {
        assertReturned(outcome);
        assertThat(outcome.snapshot().signals()).extracting(OperationalSignal::kind).containsExactlyElementsOf(readable);
        for (OperationalSignal signal : outcome.snapshot().signals()) {
            assertThat(signal.count()).isEqualTo(actualCount(signal.kind(), outcome.snapshot().observedAt()));
        }
    }

    private void assertReturned(RequestOutcome outcome) {
        assertThat(outcome.failureType()).as("service completion; query traces=%s", traces).isNull();
        assertThat(outcome.snapshot()).isNotNull();
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
    }

    private RequestOutcome request() {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        try {
            return new RequestOutcome(service.currentSignals(), null);
        } catch (RuntimeException failure) {
            String type = failure.getClass().getSimpleName();
            requestFailures.add(type);
            return new RequestOutcome(null, type);
        }
    }

    private long actualCount(Kind kind, Instant observedAt) {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        return switch (kind) {
            case FAILED_DURABLE_JOBS -> jdbc.queryForObject(
                    "SELECT count(*) FROM tb_sys_job WHERE prcs_stts_nm='FAILED'", Long.class);
            case LOCKED_ACCOUNTS -> jdbc.queryForObject(
                    "SELECT count(*) FROM tb_user_info WHERE lck_yn='Y'", Long.class);
            case FAILED_REQUESTS_TODAY -> jdbc.queryForObject(
                    "SELECT count(*) FROM tb_sys_log WHERE ocrn_ymd=?", Long.class,
                    LocalDate.ofInstant(observedAt, ZoneId.systemDefault()).format(DateTimeFormatter.BASIC_ISO_DATE));
        };
    }

    private <T> T observing(Class<T> repositoryType, T realRepository, String countMethod, Kind kind) {
        return repositoryType.cast(Proxy.newProxyInstance(repositoryType.getClassLoader(), new Class<?>[]{repositoryType},
                (proxy, method, arguments) -> {
                    if (!method.getName().equals(countMethod)) return invoke(realRepository, method, arguments);
                    TransactionFacts facts = transactionFacts();
                    assertThat(facts.active()).as("%s requires an actual transaction", kind).isTrue();
                    assertThat(facts.readOnly()).as("%s must be read-only", kind).isTrue();
                    assertThat(facts.boundConnection()).as("%s JDBC must share the JPA transaction", kind).isTrue();
                    assertThat(facts.autoCommit()).isFalse();
                    String state = "OK";
                    try {
                        if (failNext.remove(kind)) {
                            if (kind == Kind.FAILED_REQUESTS_TODAY) {
                                // The last source has no following COUNT: exercise Hibernate's rollback-only
                                // state and the service transaction's completion, not just JDBC poisoning.
                                entityManager.createNativeQuery("SELECT 1 / CAST(?1 AS INTEGER)")
                                        .setParameter(1, 0).getSingleResult();
                            } else {
                                jdbc.queryForObject("SELECT 1 / CAST(? AS INTEGER)", Integer.class, 0);
                            }
                            throw new AssertionError("PostgreSQL division by zero unexpectedly succeeded");
                        }
                        return invoke(realRepository, method, arguments);
                    } catch (Throwable failure) {
                        state = sqlState(failure);
                        throw failure;
                    } finally {
                        traces.add(new QueryTrace(kind, facts, state));
                    }
                }));
    }

    private TransactionFacts transactionFacts() throws SQLException {
        Connection connection = DataSourceUtils.getConnection(dataSource);
        try {
            return new TransactionFacts(TransactionSynchronizationManager.isActualTransactionActive(),
                    TransactionSynchronizationManager.isCurrentTransactionReadOnly(),
                    DataSourceUtils.isConnectionTransactional(connection, dataSource), connection.getAutoCommit());
        } finally {
            DataSourceUtils.releaseConnection(connection, dataSource);
        }
    }

    private static Object invoke(Object target, Method method, Object[] arguments) throws Throwable {
        try {
            return method.invoke(target, arguments);
        } catch (InvocationTargetException failure) {
            throw failure.getCause();
        }
    }

    private static String sqlState(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                for (SQLException next = sql; next != null; next = next.getNextException()) {
                    if (next.getSQLState() != null) return next.getSQLState();
                }
            }
        }
        return "NO_SQL_STATE";
    }

    private static void signIn(EnumSet<Kind> readable) {
        List<String> permissions = new ArrayList<>(List.of("DASHBOARD_ADMIN_READ"));
        for (Kind kind : readable) permissions.add(switch (kind) {
            case FAILED_DURABLE_JOBS -> "DWORK_READ";
            case LOCKED_ACCOUNTS -> "USER_READ";
            case FAILED_REQUESTS_TODAY -> "SYS_LOG_READ";
        });
        var principal = CustomUserDetails.builder().userId("signal-test-observer").esntlId("SIGNAL_TEST_OBSERVER")
                .enabled(true).lockAt("N").permissions(permissions).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private record TransactionFacts(boolean active, boolean readOnly, boolean boundConnection, boolean autoCommit) {}
    private record QueryTrace(Kind kind, TransactionFacts transaction, String sqlState) {}
    private record RequestOutcome(OperationalSignals snapshot, String failureType) {}
}
