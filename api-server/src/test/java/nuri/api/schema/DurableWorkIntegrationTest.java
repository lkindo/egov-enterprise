package nuri.api.schema;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.prometheusmetrics.PrometheusConfig;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.business.service.system.job.DurableJobAdministrationService;
import nuri.business.service.system.job.DurableWorkDispatcher;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import nuri.foundation.core.job.DurableWorkPort;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Real PostgreSQL transactions, committed leases, crash recovery, and concurrent worker fencing. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class DurableWorkIntegrationTest {
    @Autowired private DurableWorkPort port;
    @Autowired private DurableJobRepository repository;
    @Autowired private DurableJobAdministrationService administration;
    @Autowired private PlatformTransactionManager manager;
    @Autowired private JdbcTemplate jdbc;
    private DurableWork work;
    private String actor;
    private TransactionTemplate transaction;
    private final ControlledDelivery delivery = new ControlledDelivery();

    @BeforeEach
    void initialize() {
        transaction = new TransactionTemplate(manager);
        work = new DurableWork(UUID.randomUUID(), "TEST_DELIVERY", "immutable-reference");
        actor = "DW" + work.key().toString().substring(0, 8);
        authenticate(List.of());
    }

    @AfterEach
    void cleanup() {
        jdbc.execute("DROP TRIGGER IF EXISTS tr_test_durable_retry_audit_failure ON tb_sys_adt_log");
        jdbc.execute("DROP FUNCTION IF EXISTS test_durable_retry_audit_failure()");
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_sys_job WHERE job_mng_no=?", work.key().toString());
        jdbc.update("DELETE FROM tb_sys_adt_log WHERE job_nm='DURABLE_WORK_RETRY' AND frst_rgtr_id=?", actor);
    }

    @Test
    void intentRequiresBusinessTransactionAndRollsBackWithIt() {
        assertThatThrownBy(() -> port.enqueue(work))
                .isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
        transaction.executeWithoutResult(status -> {
            port.enqueue(work);
            status.setRollbackOnly();
        });
        assertThat(repository.findByJobMngNo(work.key().toString())).isEmpty();
    }

    @Test
    void repeatedIdenticalIntentIsIdempotentAndCannotChangePayload() {
        enqueue();
        transaction.executeWithoutResult(status -> port.enqueue(work));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_job WHERE job_mng_no=?", Long.class, work.key().toString())).isEqualTo(1L);
        assertThatThrownBy(() -> transaction.executeWithoutResult(status ->
                port.enqueue(new DurableWork(work.key(), work.type(), "different-reference"))))
                .isInstanceOf(IllegalStateException.class);
        assertThat(job().work()).isEqualTo(work);
    }

    @Test
    void deliveryFailureLeavesCommittedIntentAndSuccessfulRetryHasStableKey() {
        enqueue();
        delivery.fail = true;
        assertThat(dispatcher().dispatchOne()).isTrue();
        assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY");
        assertThat(job().getRtryNmtm().intValueExact()).isEqualTo(1);
        delivery.fail = false;
        makeDue();
        assertThat(dispatcher().dispatchOne()).isTrue();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(delivery.last).isEqualTo(work);
        assertThat(dispatcher().dispatchOne()).isFalse();
        assertThat(delivery.calls.get()).isEqualTo(2);
    }

    @Test
    void newWorkerRecoversExpiredCommittedLeaseAndRejectsOldAcknowledgement() throws Exception {
        enqueue();
        delivery.entered = new CountDownLatch(1);
        delivery.release = new CountDownLatch(1);
        delivery.fail = true;
        var replacement = new ControlledDelivery();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var expired = executor.submit(() -> dispatcher().dispatchOne());
            try {
                assertThat(delivery.entered.await(10, TimeUnit.SECONDS)).isTrue();
                String oldAttempt = job().getJobNo();
                // Expire a committed lease while its real handler is still executing.
                makeDue();
                assertThat(new DurableWorkDispatcher(repository, List.of(replacement), manager, false).dispatchOne()).isTrue();
                var completed = job();
                assertThat(completed.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
                assertThat(completed.getRtryNmtm().intValueExact()).isEqualTo(2);
                assertThat(completed.ownsAttempt(oldAttempt)).isFalse();
                delivery.release.countDown();
                assertThat(expired.get(10, TimeUnit.SECONDS)).isTrue();
                // The old worker's actual failure acknowledgement cannot replace the new success.
                var afterLateFailure = job();
                assertThat(afterLateFailure.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
                assertThat(afterLateFailure.getRtryNmtm()).isEqualTo(completed.getRtryNmtm());
                assertThat(afterLateFailure.getJobCmptnDt()).isEqualTo(completed.getJobCmptnDt());
            } finally {
                delivery.release.countDown();
            }
        }
        assertThat(delivery.calls.get()).isEqualTo(1);
        assertThat(replacement.calls.get()).isEqualTo(1);
    }

    @Test
    void expiredWorkersLateSuccessCannotCompleteTheNewRunningAttempt() throws Exception {
        enqueue();
        delivery.entered = new CountDownLatch(1);
        delivery.release = new CountDownLatch(1);
        var replacement = new ControlledDelivery();
        replacement.entered = new CountDownLatch(1);
        replacement.release = new CountDownLatch(1);
        replacement.fail = true;
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var expired = executor.submit(() -> dispatcher().dispatchOne());
            try {
                assertThat(delivery.entered.await(10, TimeUnit.SECONDS)).isTrue();
                String oldAttempt = job().getJobNo();
                makeDue();
                var current = executor.submit(() -> new DurableWorkDispatcher(repository, List.of(replacement), manager, false).dispatchOne());
                assertThat(replacement.entered.await(10, TimeUnit.SECONDS)).isTrue();
                String currentAttempt = job().getJobNo();
                assertThat(currentAttempt).isNotEqualTo(oldAttempt);
                delivery.release.countDown();
                assertThat(expired.get(10, TimeUnit.SECONDS)).isTrue();
                assertThat(job().getPrcsSttsNm()).isEqualTo("RUNNING");
                assertThat(job().getJobNo()).isEqualTo(currentAttempt);
                assertThat(job().getJobCmptnDt()).isNull();
                replacement.release.countDown();
                assertThat(current.get(10, TimeUnit.SECONDS)).isTrue();
                assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY");
                assertThat(job().getRtryNmtm().intValueExact()).isEqualTo(2);
                assertThat(job().getJobCmptnDt()).isNull();
            } finally {
                delivery.release.countDown();
                replacement.release.countDown();
            }
        }
    }

    @Test
    void unexpiredLeaseExcludesAnotherWorker() throws Exception {
        enqueue();
        delivery.entered = new CountDownLatch(1);
        delivery.release = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> dispatcher().dispatchOne());
            try {
                assertThat(delivery.entered.await(10, TimeUnit.SECONDS)).isTrue();
                assertThat(dispatcher().dispatchOne()).isFalse();
                assertThat(job().getPrcsSttsNm()).isEqualTo("RUNNING");
            } finally {
                delivery.release.countDown();
            }
            assertThat(first.get(10, TimeUnit.SECONDS)).isTrue();
        } finally {
            delivery.release.countDown();
        }
        assertThat(delivery.calls.get()).isEqualTo(1);
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
    }

    /**
     * 재시도 예산을 다 쓴 전이만 센다 — RETRY 는 세지 않는다. 경보 규칙(EgovDurableWorkFailed)이 이 노출 이름을 참조하므로
     * observability-alert-rules 계약이 아래 scrape 문자열을 증거로 대조한다.
     */
    @Test
    void exhaustedRetryBudgetIsCountedOnceForPrometheus() {
        var prometheus = new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
        var metrics = new StaticListableBeanFactory(Map.of("meterRegistry", prometheus)).getBeanProvider(MeterRegistry.class);
        var worker = new DurableWorkDispatcher(repository, List.of(delivery), manager, false, metrics);
        enqueue();
        delivery.fail = true;
        for (int attempt = 0; attempt < 7; attempt++) {
            makeDue();
            assertThat(worker.dispatchOne()).isTrue();
        }
        assertThat(job().getPrcsSttsNm()).isEqualTo("RETRY");
        assertThat(prometheus.scrape()).doesNotContain("nuri_durable_work_failed_total");
        makeDue();
        assertThat(worker.dispatchOne()).isTrue();
        assertThat(job().getPrcsSttsNm()).isEqualTo("FAILED");
        assertThat(prometheus.scrape()).contains("nuri_durable_work_failed_total{type=\"TEST_DELIVERY\"} 1.0");
        assertThat(worker.dispatchOne()).isFalse();
        assertThat(prometheus.scrape()).doesNotContain("nuri_durable_work_failed_total{type=\"TEST_DELIVERY\"} 2.0");
    }

    @Test
    void exhaustedRetryBudgetRequiresExplicitPermissionAndCommitsAudit() {
        enqueue();
        delivery.fail = true;
        for (int attempt = 0; attempt < 8; attempt++) {
            makeDue();
            assertThat(dispatcher().dispatchOne()).isTrue();
        }
        assertThat(job().getPrcsSttsNm()).isEqualTo("FAILED");
        assertThat(dispatcher().dispatchOne()).isFalse();
        assertThatThrownBy(() -> administration.retry(job().getJobSn())).isInstanceOf(BusinessException.class);
        assertThat(job().getPrcsSttsNm()).isEqualTo("FAILED");
        authenticate(List.of("DWORK_RETRY"));
        administration.retry(job().getJobSn());
        assertThat(job().getPrcsSttsNm()).isEqualTo("PENDING");
        assertThat(job().getRtryNmtm().intValueExact()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_adt_log WHERE job_nm='DURABLE_WORK_RETRY' AND frst_rgtr_id=?", Long.class, actor)).isEqualTo(1L);
        delivery.fail = false;
        dispatcher().dispatchOne();
        assertThat(job().getPrcsSttsNm()).isEqualTo("SUCCEEDED");
    }

    @Test
    void retryAuditInsertFailureRollsBackStateAndBudgetReset() {
        enqueue();
        delivery.fail = true;
        for (int attempt = 0; attempt < 8; attempt++) {
            makeDue();
            assertThat(dispatcher().dispatchOne()).isTrue();
        }
        var before = job();
        assertThat(before.getPrcsSttsNm()).isEqualTo("FAILED");
        authenticate(List.of("DWORK_RETRY"));
        jdbc.execute("CREATE FUNCTION test_durable_retry_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ "
                + "BEGIN IF NEW.job_nm = 'DURABLE_WORK_RETRY' AND NEW.frst_rgtr_id = TG_ARGV[0] "
                + "THEN RAISE EXCEPTION 'fixture retry audit storage failure'; END IF; RETURN NEW; END $$");
        // actor is generated here as DW + eight hexadecimal UUID characters; it is not user input.
        jdbc.execute("CREATE TRIGGER tr_test_durable_retry_audit_failure BEFORE INSERT ON tb_sys_adt_log "
                + "FOR EACH ROW EXECUTE FUNCTION test_durable_retry_audit_failure('" + actor + "')");
        assertThatThrownBy(() -> administration.retry(before.getJobSn()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.SERVER_OVERLOAD);
        var afterFailure = job();
        assertThat(afterFailure.getPrcsSttsNm()).isEqualTo("FAILED");
        assertThat(afterFailure.getRtryNmtm()).isEqualTo(before.getRtryNmtm());
        assertThat(afterFailure.getJobPrnmntDt()).isEqualTo(before.getJobPrnmntDt());
        assertThat(afterFailure.getJobNo()).isEqualTo(before.getJobNo());
        assertThat(afterFailure.getJobCmptnDt()).isEqualTo(before.getJobCmptnDt());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_adt_log WHERE job_nm='DURABLE_WORK_RETRY' AND frst_rgtr_id=?", Long.class, actor)).isZero();
        jdbc.execute("DROP TRIGGER tr_test_durable_retry_audit_failure ON tb_sys_adt_log");
        administration.retry(before.getJobSn());
        assertThat(job().getPrcsSttsNm()).isEqualTo("PENDING");
        assertThat(job().getRtryNmtm().intValueExact()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_sys_adt_log WHERE job_nm='DURABLE_WORK_RETRY' AND frst_rgtr_id=?", Long.class, actor)).isEqualTo(1L);
    }

    private void enqueue() {
        transaction.executeWithoutResult(status -> port.enqueue(work));
    }

    private DurableJob job() {
        return repository.findByJobMngNo(work.key().toString()).orElseThrow();
    }

    private void makeDue() {
        jdbc.update("UPDATE tb_sys_job SET job_prnmnt_dt=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE job_mng_no=?", work.key().toString());
    }

    private DurableWorkDispatcher dispatcher() {
        return new DurableWorkDispatcher(repository, List.of(delivery), manager, false);
    }

    private void authenticate(List<String> permissions) {
        var principal = CustomUserDetails.builder().userId(actor).esntlId(actor)
                .enabled(true).lockAt("N").groups(List.of()).permissions(permissions).authorizationVersion("test-v1").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static final class ControlledDelivery implements DurableWorkHandler {
        private final AtomicInteger calls = new AtomicInteger();
        private volatile boolean fail;
        private volatile DurableWork last;
        private CountDownLatch entered;
        private CountDownLatch release;
        @Override public String type() { return "TEST_DELIVERY"; }
        @Override public void execute(DurableWork work) {
            calls.incrementAndGet();
            last = work;
            if (entered != null) {
                entered.countDown();
                try {
                    if (!release.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("fixture release timed out");
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(interrupted);
                }
            }
            if (fail) throw new IllegalStateException("injected transport failure");
        }
    }
}
