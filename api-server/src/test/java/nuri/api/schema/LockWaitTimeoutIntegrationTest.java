package nuri.api.schema;

import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.core.response.ApiResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.core.io.FileSystemResource;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.method.annotation.ExceptionHandlerMethodResolver;

import java.lang.reflect.Method;
import java.time.Duration;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 비관적 잠금의 대기 상한(`jakarta.persistence.lock.timeout`)이 실제 PostgreSQL 에서 동작하는지 본다.
 *
 * <p>[왜 필요한가] 종전에는 상한이 없어, 다른 트랜잭션이 행을 잡고 있으면 {@code @Lock(PESSIMISTIC_WRITE)} 조회가 끝없이
 * 기다렸다 — 요청 스레드와 DB 연결이 함께 묶였다. 상한을 넘기면 기다림을 끊고 기존 잠금 실패 응답(409
 * CONCURRENT_MODIFICATION)으로 끝나야 한다. 테스트 {@code application.yml} 이 main 을 가리므로 두 파일의 값이 같은지도 본다.
 */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("비관적 잠금 대기 상한 — 기다림을 끊고 409 로 끝난다")
class LockWaitTimeoutIntegrationTest {

    private static final String LOCK_TIMEOUT_KEY = "spring.jpa.properties.jakarta.persistence.lock.timeout";

    @Autowired private DeptManageRepository departments;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private Environment environment;

    private String department;

    @BeforeEach
    void insertDisposableDepartment() {
        department = "LKT" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        jdbc.update("INSERT INTO tb_ognz_info(ognz_id, ognz_nm, crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id) "
                + "VALUES (?, '잠금 대기 시험', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')", department);
    }

    @AfterEach
    void removeDisposableDepartment() {
        if (department != null) jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id = ?", department);
    }

    @Test
    @DisplayName("대기 상한은 main application.yml 과 테스트 설정이 같은 몇 초다")
    void lockTimeoutMatchesProductionConfiguration() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yml"));
        Properties production = yaml.getObject();

        assertThat(production).isNotNull();
        String configured = production.getProperty(LOCK_TIMEOUT_KEY);
        assertThat(configured).as("main application.yml %s", LOCK_TIMEOUT_KEY).isNotBlank();
        assertThat(Integer.parseInt(configured)).as("몇 초(1~10초) 안에서 끊는다").isBetween(1_000, 10_000);
        assertThat(environment.getProperty(LOCK_TIMEOUT_KEY)).as("테스트 컨텍스트 %s", LOCK_TIMEOUT_KEY)
                .isEqualTo(configured);
    }

    @Test
    @DisplayName("다른 트랜잭션이 행을 잡고 있으면 @Lock 조회는 상한에서 끊기고, 그 예외는 409 CONCURRENT_MODIFICATION 이다")
    void waitingPessimisticLockTimesOutAndMapsToConflict() throws Exception {
        long timeoutMillis = Long.parseLong(environment.getRequiredProperty(LOCK_TIMEOUT_KEY));
        CountDownLatch held = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        ExecutorService holder = Executors.newSingleThreadExecutor();
        try {
            // 다른 연결이 같은 행을 FOR UPDATE 로 잡고, 시험이 끝날 때까지 놓지 않는다.
            Future<?> holding = holder.submit(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                jdbc.queryForObject("SELECT ognz_id FROM tb_ognz_info WHERE ognz_id = ? FOR UPDATE", String.class, department);
                held.countDown();
                try {
                    if (!release.await(60, TimeUnit.SECONDS)) throw new IllegalStateException("잠금을 놓으라는 신호가 오지 않았다");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
            }));
            assertThat(held.await(30, TimeUnit.SECONDS)).as("다른 트랜잭션이 행을 잡았다").isTrue();

            long started = System.nanoTime();
            Throwable failure = null;
            try {
                new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                        departments.findByIdForUpdate(department));
            } catch (Throwable thrown) {
                failure = thrown;
            }
            Duration waited = Duration.ofNanos(System.nanoTime() - started);

            assertThat(failure).as("잠금을 얻지 못하면 기다림을 끊고 실패해야 한다(종전에는 무한 대기)").isNotNull()
                    .isInstanceOf(PessimisticLockingFailureException.class);
            assertThat(waited).as("상한(%dms) 근처에서 끊겼다", timeoutMillis)
                    .isGreaterThanOrEqualTo(Duration.ofMillis(timeoutMillis - 500))
                    .isLessThan(Duration.ofMillis(timeoutMillis + 10_000));
            ResponseEntity<ApiResponse<Void>> response = conflictResponse((Exception) failure);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().code()).as("기존 동시 수정 계약").isEqualTo("C013");

            release.countDown();
            holding.get(30, TimeUnit.SECONDS);

            // 잠금을 놓은 뒤에는 같은 조회가 정상으로 끝난다 — 상한이 잠금 자체를 깨뜨리지 않는다.
            Boolean lockedAfterRelease = new TransactionTemplate(transactionManager).execute(status ->
                    departments.findByIdForUpdate(department).isPresent());
            assertThat(lockedAfterRelease).isTrue();
        } finally {
            release.countDown();
            holder.shutdownNow();
        }
    }

    /** 실제 전역 예외 처리기가 이 예외를 고르는 규칙(가장 가까운 예외 타입의 처리기)으로 응답을 만든다. */
    @SuppressWarnings("unchecked")
    private static ResponseEntity<ApiResponse<Void>> conflictResponse(Exception failure) throws Exception {
        Method handler = new ExceptionHandlerMethodResolver(GlobalExceptionHandler.class).resolveMethod(failure);
        assertThat(handler).as("전역 예외 처리기가 이 예외를 처리한다").isNotNull();
        handler.setAccessible(true);
        return (ResponseEntity<ApiResponse<Void>>) handler.invoke(new GlobalExceptionHandler(), failure);
    }

    @Test
    @DisplayName("잠긴 행이 없으면 @Lock 조회는 기다리지 않는다(상한이 정상 경로를 늦추지 않는다)")
    void unlockedRowIsReturnedImmediately() {
        long started = System.nanoTime();
        Boolean locked = new TransactionTemplate(transactionManager).execute(status ->
                departments.findByIdForUpdate(department).isPresent());
        assertThat(locked).isTrue();
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(3));
    }
}
