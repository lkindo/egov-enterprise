package nuri.api.schema;

import nuri.business.service.system.policy.PolicyService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** core 전용 산출물에서도 새 정책 INSERT·중복 경합·캐시 정합을 실제 PostgreSQL로 확인한다. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class BusinessPolicyIntegrityIntegrationTest {
    @Autowired private PolicyService policies;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private org.springframework.cache.CacheManager cacheManager;

    private String key;

    @BeforeEach
    void authenticateOwnFixture() {
        key = "BP" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(java.util.Locale.ROOT);
        authenticate();
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_plcy_manage WHERE plcy_type_cd=?", key);
        var detailCache = cacheManager.getCache(PolicyService.CACHE_SYSTEM_POLICIES);
        if (detailCache != null) detailCache.evict(key);
        var listCache = cacheManager.getCache(PolicyService.CACHE_SYSTEM_POLICIES_ALL);
        if (listCache != null) listCache.clear();
    }

    @Test
    void policyCreateAppearsInListsAndRefusesExistingKeyWithoutOverwriting() {
        policies.getPolicies(); // 목록 캐시를 먼저 채운 뒤 생성의 무효화를 검증한다.
        policies.createPolicy(key, "처음 제목", "처음 본문");
        assertThat(policies.getPolicies()).anySatisfy(policy -> {
            assertThat(policy.getPlcyTypeCd()).isEqualTo(key);
            assertThat(policy.getPlcyTtl()).isEqualTo("처음 제목");
        });
        assertThatThrownBy(() -> policies.createPolicy(key, "덮어쓸 제목", "덮어쓸 본문"))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);
        assertThat(policies.getPolicy(key).orElseThrow().getPlcyCn()).isEqualTo("처음 본문");
        policies.updatePolicy(key, "정정 제목", "정정 본문");
        assertThat(policies.getPolicy(key).orElseThrow().getPlcyCn()).isEqualTo("정정 본문");
    }

    @Test
    void simultaneousPolicyInsertCannotMergeAndOverwriteTheWinningDocument() throws Exception {
        String application = "policy-create-" + key;
        try (var executor = Executors.newSingleThreadExecutor(); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var insert = blocker.prepareStatement("INSERT INTO tb_plcy_manage(plcy_type_cd,plcy_ttl,plcy_cn) VALUES (?,'먼저 등록','원래 본문')")) {
                insert.setString(1, key);
                insert.executeUpdate();
            }
            var pending = executor.submit(() -> {
                authenticate();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                        policies.createPolicy(key, "동시 등록", "덮어쓸 본문");
                    });
                    return null;
                } catch (DataIntegrityViolationException duplicate) { return duplicate; }
                finally { SecurityContextHolder.clearContext(); }
            });
            try { assertWaitingOnDatabaseLock(application); }
            finally { blocker.commit(); }
            assertThat(pending.get(20, TimeUnit.SECONDS)).isInstanceOf(DataIntegrityViolationException.class);
        }
        assertThat(jdbc.queryForObject("SELECT plcy_cn FROM tb_plcy_manage WHERE plcy_type_cd=?", String.class, key)).isEqualTo("원래 본문");
    }

    private void assertWaitingOnDatabaseLock(String application) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        int waiting;
        do {
            waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
            if (waiting == 0) Thread.sleep(20);
        } while (waiting == 0 && System.nanoTime() < deadline);
        assertThat(waiting).isEqualTo(1);
    }

    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(key).esntlId(key).enabled(true)
                .permissions(List.of("POLICY_UPDATE")).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
