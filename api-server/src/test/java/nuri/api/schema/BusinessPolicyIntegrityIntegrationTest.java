package nuri.api.schema;

import nuri.business.domain.system.policy.SystemPolicyRepository;
import nuri.business.service.system.policy.PolicyService;
import nuri.foundation.core.config.CacheConfig;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestReporter;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.aop.framework.Advised;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.AnnotationCacheOperationSource;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.interceptor.CacheInterceptor;
import org.springframework.cache.interceptor.SimpleKey;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** core 전용 산출물에서도 새 정책 INSERT·중복 경합·캐시 정합을 실제 PostgreSQL로 확인한다. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class BusinessPolicyIntegrityIntegrationTest {
    // Historical cache names remain test-local so reintroducing those caches exercises the same race.
    private static final String DETAIL_CACHE = "systemPolicies";
    private static final String LIST_CACHE = "systemPoliciesAll";
    @Autowired private PolicyService policies;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private org.springframework.cache.CacheManager cacheManager;
    @Autowired private SystemPolicyRepository policyRepository;
    @Autowired private Environment environment;

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
        var detailCache = cacheManager.getCache(DETAIL_CACHE);
        if (detailCache != null) detailCache.evict(key);
        var listCache = cacheManager.getCache(LIST_CACHE);
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

    @ParameterizedTest
    @EnumSource(AdviceOrder.class)
    void delayedDetailReadCannotRestoreThePolicyFromBeforeACommittedUpdate(AdviceOrder order, TestReporter reporter) throws Exception {
        try (var race = caffeineRace(ReadKind.DETAIL, order, reporter)) {
            race.service.createPolicy(key, "Before title", "Before content");

            Optional<PolicyService.Policy> delayed = finishReadAfterWrite(race,
                    () -> race.service.getPolicy(key),
                    () -> race.service.updatePolicy(key, "After title", "After content"), reporter);

            assertThat(delayed).get().extracting(PolicyService.Policy::getPlcyCn).isEqualTo("Before content");
            // The overlapping reader may return its old snapshot. A subsequent request must see the committed value.
            assertThat(race.service.getPolicy(key)).get().satisfies(policy -> {
                assertThat(policy.getPlcyTtl()).isEqualTo("After title");
                assertThat(policy.getPlcyCn()).isEqualTo("After content");
            });
        }
    }

    @ParameterizedTest
    @EnumSource(AdviceOrder.class)
    void delayedListReadCannotRestoreThePolicyListFromBeforeACommittedUpdate(AdviceOrder order, TestReporter reporter) throws Exception {
        try (var race = caffeineRace(ReadKind.LIST, order, reporter)) {
            race.service.createPolicy(key, "Before title", "Before content");

            List<PolicyService.Policy> delayed = finishReadAfterWrite(race,
                    race.service::getPolicies,
                    () -> race.service.updatePolicy(key, "After title", "After content"), reporter);

            assertThat(delayed).filteredOn(policy -> key.equals(policy.getPlcyTypeCd()))
                    .singleElement().extracting(PolicyService.Policy::getPlcyCn).isEqualTo("Before content");
            assertThat(race.service.getPolicies()).filteredOn(policy -> key.equals(policy.getPlcyTypeCd()))
                    .singleElement().satisfies(policy -> {
                        assertThat(policy.getPlcyTtl()).isEqualTo("After title");
                        assertThat(policy.getPlcyCn()).isEqualTo("After content");
                    });
        }
    }

    @ParameterizedTest
    @EnumSource(AdviceOrder.class)
    void delayedMissingDetailCannotHideACommittedFirstCreation(AdviceOrder order, TestReporter reporter) throws Exception {
        try (var race = caffeineRace(ReadKind.DETAIL, order, reporter)) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_plcy_manage WHERE plcy_type_cd=?", Integer.class, key))
                    .isZero();

            Optional<PolicyService.Policy> delayed = finishReadAfterWrite(race,
                    () -> race.service.getPolicy(key),
                    () -> race.service.createPolicy(key, "After title", "After content"), reporter);

            assertThat(delayed).isEmpty();
            assertThat(race.service.getPolicy(key)).get().satisfies(policy -> {
                assertThat(policy.getPlcyTtl()).isEqualTo("After title");
                assertThat(policy.getPlcyCn()).isEqualTo("After content");
            });
        }
    }

    private PolicyCacheRace caffeineRace(ReadKind readKind, AdviceOrder order, TestReporter reporter) {
        assertThat(policies).isInstanceOf(Advised.class);
        // This describes the injected test-context bean, not production CacheConfig wiring.
        reporter.publishEntry("injected-policy-advisors", Arrays.stream(((Advised) policies).getAdvisors())
                .map(advisor -> advisor.getAdvice().getClass().getSimpleName()).collect(Collectors.joining(" -> ")));
        assertThat(environment.getProperty("spring.datasource.url")).startsWith("jdbc:tc:postgresql:17:");
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        // Instantiate the actual production factory without replacing the application's shared test CacheManager.
        var caches = new CacheConfig().cacheManager();
        assertThat(caches).isInstanceOf(CaffeineCacheManager.class);
        Cache cache = caches.getCache(readKind == ReadKind.DETAIL
                ? DETAIL_CACHE : LIST_CACHE);
        assertThat(cache).isInstanceOf(CaffeineCache.class);
        assertThat(cache.getNativeCache()).isInstanceOf(com.github.benmanes.caffeine.cache.Cache.class);
        var gate = new ReadGate(readKind, order);
        var observed = (SystemPolicyRepository) Proxy.newProxyInstance(SystemPolicyRepository.class.getClassLoader(),
                new Class<?>[]{SystemPolicyRepository.class}, (proxy, method, arguments) -> {
                    Object result = invokeRepository(method, arguments);
                    boolean selectedRead = readKind == ReadKind.LIST
                            ? method.getName().equals("findAll") && method.getParameterCount() == 0
                            : method.getName().equals("findById") && method.getParameterCount() == 1 && key.equals(arguments[0]);
                    if (selectedRead && gate.armed.compareAndSet(true, false)) {
                        // SQL and entity materialization have completed, but the service/cache advice has not returned.
                        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                        assertThat(TransactionSynchronizationManager.isCurrentTransactionReadOnly()).isTrue();
                        gate.valueRead.countDown();
                        assertThat(gate.resume.await(15, TimeUnit.SECONDS)).as("resume the delayed policy reader").isTrue();
                    }
                    return result;
                });
        var caching = new CacheInterceptor();
        caching.setCacheOperationSources(new AnnotationCacheOperationSource());
        caching.setCacheManager(caches);
        caching.afterPropertiesSet();
        caching.afterSingletonsInstantiated();
        var transactions = new TransactionInterceptor();
        transactions.setTransactionManager(transactionManager);
        transactions.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var proxy = new ProxyFactory(new PolicyService(observed));
        proxy.setProxyTargetClass(true);
        if (order == AdviceOrder.CACHE_OUTER) {
            proxy.addAdvice(caching);
            proxy.addAdvice(transactions);
        } else {
            proxy.addAdvice(transactions);
            proxy.addAdvice(caching);
        }
        PolicyService service = (PolicyService) proxy.getProxy();
        assertThat(Arrays.stream(((Advised) service).getAdvisors())
                .map(advisor -> advisor.getAdvice().getClass().getName()).toList())
                .containsExactlyElementsOf(order == AdviceOrder.CACHE_OUTER
                        ? List.of(CacheInterceptor.class.getName(), TransactionInterceptor.class.getName())
                        : List.of(TransactionInterceptor.class.getName(), CacheInterceptor.class.getName()));
        return new PolicyCacheRace(service, caches, cache, readKind == ReadKind.DETAIL ? key : SimpleKey.EMPTY, gate);
    }

    private Object invokeRepository(Method method, Object[] arguments) throws Throwable {
        try {
            return method.invoke(policyRepository, arguments);
        } catch (InvocationTargetException failure) {
            throw failure.getCause();
        }
    }

    private <T> T finishReadAfterWrite(PolicyCacheRace race, Callable<T> read, Runnable write, TestReporter reporter)
            throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        var pending = executor.submit(() -> {
            authenticate();
            try {
                return read.call();
            } finally {
                SecurityContextHolder.clearContext();
            }
        });
        Throwable primaryFailure = null;
        try {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
            while (!race.gate.valueRead.await(25, TimeUnit.MILLISECONDS)) {
                if (pending.isDone()) {
                    pending.get(); // Surface the worker's original failure before reporting a gate timeout.
                    throw new AssertionError("policy reader completed without reaching the observed repository read");
                }
                assertThat(System.nanoTime()).as("actual policy value read before writer").isLessThan(deadline);
            }
            write.run();
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            // Both writer commit and its cache advice have returned before releasing the old reader.
            assertThat(jdbc.queryForObject("SELECT plcy_cn FROM tb_plcy_manage WHERE plcy_type_cd=?", String.class, key))
                    .isEqualTo("After content");
            assertThat(race.cache.get(race.cacheKey)).as("no completed reader cache entry after writer eviction").isNull();
            race.gate.resume.countDown();
            T result = pending.get(15, TimeUnit.SECONDS);
            Cache.ValueWrapper lateEntry = race.cache.get(race.cacheKey);
            reporter.publishEntry("policy-cache-race", "read=" + race.gate.kind + ", order=" + race.gate.order
                    + ", writerCommitted=true, lateCacheEntry=" + (lateEntry != null)
                    + ", lateNullValue=" + (lateEntry != null && lateEntry.get() == null));
            return result;
        } catch (Exception | Error failure) {
            primaryFailure = failure;
            throw failure;
        } finally {
            race.gate.resume.countDown();
            if (!pending.isDone()) pending.cancel(true);
            executor.shutdownNow();
            try {
                assertThat(executor.awaitTermination(15, TimeUnit.SECONDS)).as("policy reader worker terminates").isTrue();
            } catch (InterruptedException | AssertionError cleanupFailure) {
                if (cleanupFailure instanceof InterruptedException) Thread.currentThread().interrupt();
                if (primaryFailure != null) primaryFailure.addSuppressed(cleanupFailure);
                else throw cleanupFailure;
            }
        }
    }

    private enum ReadKind { DETAIL, LIST }
    private enum AdviceOrder { CACHE_OUTER, TRANSACTION_OUTER }

    private static final class ReadGate {
        private final ReadKind kind;
        private final AdviceOrder order;
        private final AtomicBoolean armed = new AtomicBoolean(true);
        private final CountDownLatch valueRead = new CountDownLatch(1);
        private final CountDownLatch resume = new CountDownLatch(1);

        private ReadGate(ReadKind kind, AdviceOrder order) {
            this.kind = kind;
            this.order = order;
        }
    }

    private static final class PolicyCacheRace implements AutoCloseable {
        private final PolicyService service;
        private final org.springframework.cache.CacheManager caches;
        private final Cache cache;
        private final Object cacheKey;
        private final ReadGate gate;

        private PolicyCacheRace(PolicyService service, org.springframework.cache.CacheManager caches, Cache cache,
                Object cacheKey, ReadGate gate) {
            this.service = service;
            this.caches = caches;
            this.cache = cache;
            this.cacheKey = cacheKey;
            this.gate = gate;
        }

        @Override
        public void close() {
            gate.resume.countDown();
            for (String name : caches.getCacheNames()) {
                Cache ownCache = caches.getCache(name);
                if (ownCache != null) ownCache.clear();
            }
        }
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
