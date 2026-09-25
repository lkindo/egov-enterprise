package nuri.api.schema;

import nuri.business.domain.auth.RefreshToken;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.service.auth.AuthService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;

/**
 * 리프레시 토큰 회전의 동시 재발급 계약 — 실제 PostgreSQL 잠금 경합으로 확인한다.
 *
 * <p><b>왜 필요한가.</b> 재발급은 조회한 엔티티를 그대로 덮어쓰고 있었다(dirty checking).
 * 같은 리프레시 토큰으로 <b>동시에</b> 두 번 재발급하면 두 트랜잭션이 같은 행을 읽고 각자 회전해
 * <b>둘 다 성공</b>하고 마지막 저장만 남는다 — 진 쪽 클라이언트는 서버가 이미 무효화한 토큰을 받아
 * 들고 있다가 다음 재발급에서 이유 없이 로그아웃된다. 액세스 토큰 수명(기본 1시간)만큼 뒤에야
 * 드러나므로 원인을 되짚을 단서가 남지 않는다.
 *
 * <p>프런트의 단일 실행 계약(frontend/src/lib/api/__tests__/reissue-single-flight.test.ts)은 이미
 * "같은 토큰의 두 번째 재발급은 401" 을 백엔드 계약으로 적어 두고 있었다. 그 계약은 <b>순차</b>
 * 호출에서만 참이었고 동시 호출에서는 집행되지 않았다 — 이 테스트가 그 사각을 닫는다.
 *
 * <p><b>왜 토큰 값을 고정하는가.</b> JWT 의 {@code iat} 는 초 단위라 같은 초에 일어난 두 회전은
 * 실제로 <b>같은 문자열</b>이 된다. 그대로 두면 경합이 우연히 가려져 결함이 재현되지 않으므로,
 * 두 회전이 서로 다른 값을 만드는 경우(초 경계를 걸친 경우)를 명시적으로 재현한다. 동시성과
 * 트랜잭션 경계는 전부 실제다 — 토큰 <b>문자열</b>만 결정적으로 고정한다.
 */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class RefreshTokenRotationConcurrencyIntegrationTest {

    /** R__seed_framework.sql 이 모든 환경에 넣는 기본 관리자(webmaster). */
    private static final String ESNTL_ID = "USRCNFRM_00000000001";

    @Autowired private AuthService authService;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;

    /** 회전 결과 문자열만 고정하기 위한 spy — 서명·검증 등 나머지 동작은 실제 구현 그대로다. */
    @MockitoSpyBean private JwtTokenProvider jwtTokenProvider;

    private String issuedToken;
    private Instant absoluteExpiry;

    @BeforeEach
    void seedSession() {
        jdbc.update("DELETE FROM tb_auth_rfsh_tk WHERE user_id=?", ESNTL_ID);
        absoluteExpiry = Instant.now().plus(Duration.ofDays(7));
        issuedToken = jwtTokenProvider.createRefreshToken(ESNTL_ID, Date.from(absoluteExpiry));
        store(issuedToken, absoluteExpiry);
    }

    @AfterEach
    void removeOwnFixture() {
        jdbc.update("DELETE FROM tb_auth_rfsh_tk WHERE user_id=?", ESNTL_ID);
    }

    @Test
    @DisplayName("동시 재발급은 저장되지 않은 리프레시 토큰을 돌려주지 않는다")
    void concurrentReissueNeverHandsOutATokenThatIsNotStored() throws Exception {
        doReturn("rotated-first", "rotated-second")
                .when(jwtTokenProvider).createRefreshToken(eq(ESNTL_ID), any(Date.class));

        List<String> outcomes = reissueConcurrently();

        String stored = jdbc.queryForObject(
                "SELECT rfsh_tkn FROM tb_auth_rfsh_tk WHERE user_id=?", String.class, ESNTL_ID);
        // 핵심 불변식 — 클라이언트가 받아 간 토큰은 **저장돼 있는 바로 그 값**이어야 한다(저장은 해시다, DIP D7).
        // 종전 구현에서는 두 요청이 각각 rotated-first·rotated-second 를 받아 갔고 DB 에는 하나만 남았다.
        assertThat(outcomes).contains("rejected").hasSize(2);
        String issued = outcomes.stream().filter(outcome -> !"rejected".equals(outcome)).findFirst().orElseThrow();
        assertThat(issued).isIn("rotated-first", "rotated-second");
        assertThat(stored).isEqualTo(nuri.business.domain.auth.RefreshTokenDigest.of(issued));
        // DB 에는 원문이 남지 않는다.
        assertThat(stored).isNotIn("rotated-first", "rotated-second").matches("[0-9a-f]{64}");
        // 회전이 절대 만료를 연장하지 않는다(슬라이딩 세션 금지). 회전 질의의 SET 절에 만료가 없음을 실 DB 로 본다.
        assertThat(jdbc.queryForObject(
                        "SELECT exprtn_dt FROM tb_auth_rfsh_tk WHERE user_id=?", Timestamp.class, ESNTL_ID)
                .toInstant()).isCloseTo(absoluteExpiry, within(1, ChronoUnit.SECONDS));
    }

    @Test
    @DisplayName("이미 회전된 토큰으로 다시 재발급하면 거부한다")
    void rejectsAReplayOfAnAlreadyRotatedToken() {
        // ⚠ 값을 고정하지 않으면 이 테스트는 **항상 통과할 수 없다** — 같은 초에 일어난 회전은
        //   seed 토큰과 글자까지 같은 JWT 를 만들어(iat 초 단위) 재사용과 원본이 구분되지 않는다.
        //   실제로 회전이 값을 바꾼 경우만 재사용이 성립하므로 그 경우를 고정한다.
        doReturn("rotated-once").when(jwtTokenProvider).createRefreshToken(eq(ESNTL_ID), any(Date.class));
        authService.reissue(issuedToken, "127.0.0.1");

        assertThatThrownBy(() -> authService.reissue(issuedToken, "127.0.0.1")).isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("저장된 만료가 지난 세션은 정리가 실제로 커밋된다")
    void expiredRowIsActuallyDeletedEvenThoughTheRequestFails() {
        // ⚠ 이 분기의 도달 조건: **토큰은 아직 유효한데 저장된 만료만 지난** 상태다.
        //   로그인은 DB 만료를 7일로 고정해 넣는 반면 토큰 수명은 JWT_REFRESH_TOKEN_VALIDITY_MS 설정값이라,
        //   토큰 수명을 7일보다 길게 잡은 환경에서 실제로 벌어진다(기본값 604800000 = 7일이면 JWT 검증이 먼저 막는다).
        //   그래서 여기서도 토큰은 미래 만료로 만들고 저장된 만료만 과거로 둔다 — 그 상태를 그대로 재현한다.
        String staleToken = jwtTokenProvider.createRefreshToken(
                ESNTL_ID, Date.from(Instant.now().plus(Duration.ofDays(30))));
        store(staleToken, Instant.now().minus(Duration.ofMinutes(1)));

        // 정리를 같은 트랜잭션에 두면 아래 예외(RuntimeException)의 롤백이 삭제까지 되돌린다 —
        // 종전에는 "삭제하고 거부한다" 고 적혀 있었으나 행은 한 번도 지워지지 않았다.
        assertThatThrownBy(() -> authService.reissue(staleToken, "127.0.0.1")).isInstanceOf(BusinessException.class);

        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM tb_auth_rfsh_tk WHERE user_id=?", Integer.class, ESNTL_ID)).isZero();
        // 같은 만료 토큰으로 동시에 두 번 들어오면 한쪽이 먼저 지운다. 그때 0 행은 실패가 아니어야 한다 —
        // 엔티티 delete 로는 Hibernate 가 행 수 불일치로 죽어 401 이어야 할 응답이 500 이 된다.
        assertThat(refreshTokenRepository.deleteIfCurrent(ESNTL_ID, staleToken)).isZero();
    }

    /** 두 재발급이 실제로 같은 행 잠금에서 만나도록 blocker 로 붙잡았다가 동시에 푼다. */
    private List<String> reissueConcurrently() throws Exception {
        var ready = new CountDownLatch(2);
        try (var executor = Executors.newFixedThreadPool(2);
             var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var statement = blocker.prepareStatement(
                    "SELECT user_id FROM tb_auth_rfsh_tk WHERE user_id=? FOR UPDATE")) {
                statement.setString(1, ESNTL_ID);
                statement.executeQuery().close();
            }
            var first = executor.submit(() -> reissue("reissue-first", ready));
            var second = executor.submit(() -> reissue("reissue-second", ready));
            try {
                assertThat(ready.await(30, TimeUnit.SECONDS)).isTrue();
                // 임의 sleep 으로 경합을 추정하지 않는다 — 두 트랜잭션이 실제 행 잠금에서 대기할 때 푼다.
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30);
                int waiting;
                do {
                    waiting = jdbc.queryForObject("""
                            SELECT count(*) FROM pg_stat_activity
                            WHERE datname=current_database() AND application_name LIKE 'reissue-%'
                              AND wait_event_type='Lock'
                            """, Integer.class);
                    if (waiting < 2) Thread.sleep(20);
                } while (waiting < 2 && System.nanoTime() < deadline);
                assertThat(waiting).as("두 실제 재발급 트랜잭션의 잠금 경합").isEqualTo(2);
            } finally {
                blocker.rollback();
            }
            return List.of(first.get(60, TimeUnit.SECONDS), second.get(60, TimeUnit.SECONDS));
        }
    }

    private String reissue(String name, CountDownLatch ready) {
        try {
            return new TransactionTemplate(transactionManager).execute(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, name);
                ready.countDown();
                return authService.reissue(issuedToken, "127.0.0.1").getRefreshToken();
            });
        } catch (BusinessException rejected) {
            return "rejected";
        }
    }

    private void store(String token, Instant expiry) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                refreshTokenRepository.save(RefreshToken.builder()
                        .userId(ESNTL_ID).rfshTkn(nuri.business.domain.auth.RefreshTokenDigest.of(token)).exprtnDt(expiry).build()));
    }
}
