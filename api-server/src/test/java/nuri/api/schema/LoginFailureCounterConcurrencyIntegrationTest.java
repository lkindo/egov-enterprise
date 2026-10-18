package nuri.api.schema;

import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.LoginRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 로그인 실패 횟수가 동시 실패에서도 하나도 사라지지 않고, 임계값에서 정확히 잠기는지 실제 PostgreSQL 로 본다.
 *
 * <p><b>왜 필요한가.</b> 인증 제공자는 사용자 행을 잠금 없이 읽고 실패 횟수를 메모리에서 올려 저장했다. 같은 계정에 틀린
 * 비밀번호가 동시에 오면 모두 같은 횟수를 읽고(해시 검증 시간만큼 창이 넓다) 같은 값을 써서 증가가 사라졌다 — 임계값보다 많이
 * 시도해도 잠기지 않았다. 목 저장소 단위 테스트와 H2 순차 테스트({@code LoginLockoutPersistenceIntegrationTest})는 이 경합을
 * 원리적으로 볼 수 없다.
 *
 * <p><b>무엇을 고정하는가.</b> 실제 트랜잭션 경계({@code AuthService.login})를 동시에 통과시킨다.
 * ① 임계값 미만 N 회의 동시 실패는 정확히 N 으로 남고 잠기지 않는다. ② 임계값을 넘는 동시 실패는 정확히 임계값에서 잠기고,
 * 넘친 요청은 횟수를 더 올리지 않고 잠김으로 거부된다(고정창). ③ 잠긴 뒤에는 올바른 비밀번호도 거부된다.
 *
 * <p>tc 프로파일의 연결 풀은 4 개다. 동시성은 풀 크기로 묶이지만, 잠금이 없으면 한 번에 들어온 4 개만으로도 같은 0 을 읽어
 * 증가가 사라진다(해시 검증이 읽기와 쓰기 사이에 있다).
 */
@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("로그인 실패 횟수 동시성 (PostgreSQL)")
class LoginFailureCounterConcurrencyIntegrationTest {

    private static final String RIGHT_PASSWORD = "Correct1!pass";
    private static final String CLIENT_IP = "127.0.0.1";
    /** tc 프로파일의 Hikari 최대 연결 수 — 한 번에 실제로 겹치는 트랜잭션 수. */
    private static final int POOL_SIZE = 4;

    @Autowired private AuthService authService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwordEncoder;

    @Value("${nuri.security.login.max-failures:5}")
    private int maxFailures;

    private String loginId;
    private String esntlId;

    @BeforeEach
    void seedVictim() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        loginId = "lfc" + suffix;
        esntlId = "USR_LFC" + suffix;
        jdbc.update("""
                INSERT INTO tb_user_info (esntl_id, user_id, user_nm, pswd, user_stts_cd, lck_yn, lck_cnt, crt_dt, frst_rgtr_id)
                VALUES (?, ?, '동시실패', ?, 'P', 'N', 0, CURRENT_TIMESTAMP, 'SYSTEM')
                """, esntlId, loginId, passwordEncoder.encode(RIGHT_PASSWORD));
    }

    @AfterEach
    void removeVictim() {
        jdbc.update("DELETE FROM tb_auth_rfsh_tk WHERE user_id=?", esntlId);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", esntlId);
        jdbc.update("DELETE FROM tb_login_log WHERE user_id=?", loginId);
    }

    @Test
    @DisplayName("임계값 미만의 동시 실패 N 회는 정확히 N 으로 남고 잠기지 않는다")
    void concurrentFailuresBelowTheThresholdAllCount() throws Exception {
        int attempts = Math.min(POOL_SIZE, maxFailures - 1);
        assertThat(attempts).as("임계값이 2 이상이어야 이 시나리오가 성립한다").isPositive();

        List<Class<?>> outcomes = attemptConcurrently(attempts);

        assertThat(outcomes).as("모든 시도가 비밀번호 불일치로 끝나야 한다")
                .containsOnly(BadCredentialsException.class).hasSize(attempts);
        Map<String, Object> row = victimRow();
        assertThat(((Number) row.get("lck_cnt")).intValue())
                .as("동시 실패의 증가가 사라졌다 — 실패 횟수를 잠금 없이 읽어 올리고 있다").isEqualTo(attempts);
        assertThat(row.get("lck_yn")).as("임계 미달인데 잠겼다").isEqualTo("N");
    }

    @Test
    @DisplayName("임계값을 넘는 동시 실패는 정확히 임계값에서 잠기고, 넘친 시도는 횟수를 올리지 않고 잠김으로 거부된다")
    void concurrentFailuresLockExactlyAtTheThreshold() throws Exception {
        int attempts = maxFailures + 3;

        List<Class<?>> outcomes = attemptConcurrently(attempts);

        assertThat(outcomes.stream().filter(BadCredentialsException.class::equals).count())
                .as("비밀번호 불일치로 센 시도는 정확히 임계값만큼이어야 한다").isEqualTo(maxFailures);
        assertThat(outcomes.stream().filter(type -> AccountStatusException.class.isAssignableFrom(type)
                        && !DisabledException.class.isAssignableFrom(type)).count())
                .as("임계값을 넘친 시도는 잠김으로 거부돼야 한다").isEqualTo(attempts - maxFailures);
        Map<String, Object> row = victimRow();
        assertThat(((Number) row.get("lck_cnt")).intValue())
                .as("실패 횟수가 임계값과 다르다 — 증가가 사라졌거나(미만) 잠긴 뒤에도 올랐다(초과)").isEqualTo(maxFailures);
        assertThat(row.get("lck_yn")).as("임계값에 닿았는데 잠기지 않았다").isEqualTo("Y");
        assertThat(row.get("lck_last_pnttm")).as("잠금 시각이 없으면 자동 해제 기준이 없다").isNotNull();

        assertThatThrownBy(() -> login(RIGHT_PASSWORD))
                .as("잠긴 계정이 올바른 비밀번호로 열렸다")
                .isInstanceOf(AccountStatusException.class)
                .isNotInstanceOf(DisabledException.class);
    }

    private List<Class<?>> attemptConcurrently(int attempts) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch ready = new CountDownLatch(attempts);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Class<?>>> futures = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                String wrong = "wrong-password-" + i;
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    start.await();
                    try {
                        login(wrong);
                        return Void.class;
                    } catch (RuntimeException rejected) {
                        return rejected.getClass();
                    }
                }));
            }
            assertThat(ready.await(30, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<Class<?>> outcomes = new ArrayList<>();
            for (Future<Class<?>> future : futures) {
                outcomes.add(future.get(120, TimeUnit.SECONDS));
            }
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }

    private void login(String password) {
        authService.login(LoginRequest.builder().userId(loginId).password(password).build(), CLIENT_IP);
    }

    private Map<String, Object> victimRow() {
        return jdbc.queryForMap("SELECT lck_cnt, lck_yn, lck_last_pnttm FROM tb_user_info WHERE esntl_id=?", esntlId);
    }
}
