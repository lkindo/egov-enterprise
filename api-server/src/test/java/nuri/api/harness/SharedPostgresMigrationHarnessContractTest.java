package nuri.api.harness;

import nuri.api.schema.SharedPostgresMigrationTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.MockedConstruction;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Answers.RETURNS_SELF;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.withSettings;

/** PostgreSQL migration suite의 공유 서버·격리 database 구조를 보호하는 governance gate. */
@Tag("governance-harness")
class SharedPostgresMigrationHarnessContractTest {

    /** schema-validation 게이트 원장. migration 검증 수의 확인 지점이다. */
    private static final String GATE_REGISTRY = "config/governance/gates.json";
    private static final String SCHEMA_GATE_SET = "GATESET-SCHEMA-VALIDATION";

    /**
     * 공용 PostgreSQL support 로 이관해야 하는 migration 검증 클래스 수의 기대값 — 게이트 원장에 등록된 수다.
     *
     * <p>디스크의 파일을 세어 기대값으로 쓰지 않는다 — 그러면 새 migration 검증이 무엇이든 census 가 조용히 따라 올라간다.
     * 기대값은 사람이 검토하는 원장(gates.json schema-validation 의 rules)에서 센다. 태그가 붙은 검증의 미등록과 등록만 남은
     * 유령은 레지스트리 계약(scripts/governance-gates-contract.mjs)이 막고, 태그 없이 들어온 검증은 아래 파일 수와 이 수가
     * 달라져 red 가 된다.
     *
     * <p>재사용 투영본은 이 수를 투영 하네스 프로필 census({@code migrationTests})에서 읽는다. 생성기가 역사적 migration
     * 검증을 걷은 뒤 남은 수를 세어 기록하므로 투영본에서는 0 이다.
     */
    static int registeredMigrationTestCount() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        JsonNode root = JsonMapper.builder().build().readTree(HarnessSourceIndex.read(repoRoot.resolve(GATE_REGISTRY)));
        int count = 0;
        boolean found = false;
        for (JsonNode set : root.path("gateSets")) {
            if (!SCHEMA_GATE_SET.equals(set.path("id").asString())) continue;
            found = true;
            for (JsonNode rule : set.path("rules")) {
                Path source = repoRoot.resolve(rule.path("source").asString()).normalize();
                if (source.startsWith(schemaSourceRoot()) && isMigrationTest(source)) count++;
            }
        }
        assertThat(found).as(GATE_REGISTRY + " 에 " + SCHEMA_GATE_SET + " 가 없습니다").isTrue();
        return count;
    }

    @Test
    @DisplayName("격리 database 이름은 병렬 클래스마다 고유하고 PostgreSQL 식별자 한도 안에서 안전하다")
    void isolatedDatabaseNamesAreSafeAndCollisionFree() {
        String first = SharedPostgresMigrationTestSupport.databaseNameFor(
                "InternetServiceGuidanceBigintMigrationIntegrationTest", "run-1");
        String second = SharedPostgresMigrationTestSupport.databaseNameFor(
                "InternetServiceGuidanceBigintMigrationIntegrationTest", "run-2");

        assertThat(first).matches("[a-z0-9_]+").hasSizeLessThanOrEqualTo(63);
        assertThat(second).matches("[a-z0-9_]+").hasSizeLessThanOrEqualTo(63);
        assertThat(first).isNotEqualTo(second);
        assertThat(first).doesNotContain("-", "\"", "'");

        assertThatThrownBy(() -> SharedPostgresMigrationTestSupport.databaseNameFor("Test", "x".repeat(64)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("식별자 한도");
    }

    @Test
    void sharedServerStartFailureStopsItsOwnedContainerAndPreservesTheFailure() throws Exception {
        int startsBefore = sharedServerStartCount();
        RuntimeException startFailure = new IllegalStateException("synthetic container start failure");
        var start = SharedPostgresMigrationTestSupport.class.getDeclaredMethod("startSharedServer");
        start.setAccessible(true);

        try (MockedConstruction<PostgreSQLContainer> construction = mockConstruction(
                PostgreSQLContainer.class, withSettings().defaultAnswer(RETURNS_SELF),
                (container, context) -> doThrow(startFailure).when(container).start())) {
            InvocationTargetException wrapper = assertThrows(InvocationTargetException.class, () -> start.invoke(null));

            assertThat(wrapper.getCause()).isSameAs(startFailure);
            assertThat(startFailure.getSuppressed()).isEmpty();
            assertThat(construction.constructed()).hasSize(1);
            PostgreSQLContainer owned = construction.constructed().getFirst();
            verify(owned).start();
            verify(owned).stop();
            assertThat(sharedServerStartCount()).isEqualTo(startsBefore);
        }
    }

    @Test
    void sharedServerCleanupFailureIsSuppressedWithoutReplacingTheStartFailure() throws Exception {
        int startsBefore = sharedServerStartCount();
        RuntimeException startFailure = new IllegalStateException("synthetic container start failure");
        RuntimeException cleanupFailure = new IllegalStateException("synthetic container cleanup failure");
        var start = SharedPostgresMigrationTestSupport.class.getDeclaredMethod("startSharedServer");
        start.setAccessible(true);

        try (MockedConstruction<PostgreSQLContainer> construction = mockConstruction(
                PostgreSQLContainer.class, withSettings().defaultAnswer(RETURNS_SELF), (container, context) -> {
                    doThrow(startFailure).when(container).start();
                    doThrow(cleanupFailure).when(container).stop();
                })) {
            InvocationTargetException wrapper = assertThrows(InvocationTargetException.class, () -> start.invoke(null));

            assertThat(wrapper.getCause()).isSameAs(startFailure);
            assertThat(startFailure.getSuppressed()).containsExactly(cleanupFailure);
            assertThat(construction.constructed()).hasSize(1);
            PostgreSQLContainer owned = construction.constructed().getFirst();
            verify(owned).start();
            verify(owned).stop();
            assertThat(sharedServerStartCount()).isEqualTo(startsBefore);
        }
    }

    private static int sharedServerStartCount() throws ReflectiveOperationException {
        var field = SharedPostgresMigrationTestSupport.class.getDeclaredField("SERVER_START_COUNT");
        field.setAccessible(true);
        return ((AtomicInteger) field.get(null)).get();
    }

    @Test
    @DisplayName("migration 검증은 개별 container lifecycle 없이 공용 PostgreSQL support를 사용한다")
    void migrationTestsUseSharedPostgresSupport() throws IOException {
        List<Path> migrationTests = HarnessSourceIndex.javaSources(schemaSourceRoot()).stream()
                .filter(SharedPostgresMigrationHarnessContractTest::isMigrationTest)
                .sorted()
                .toList();
        int expected = ReusableHarnessProfile.current().count("migrationTests", registeredMigrationTestCount());

        assertThat(migrationTests)
                .as("migration 검증 클래스 census %d — 원본은 %s 등록 수, 투영본은 하네스 프로필 census".formatted(expected, GATE_REGISTRY))
                .hasSize(expected);

        Pattern directLifecycle = Pattern.compile(
                "(?m)^import org\\.testcontainers|^\\s*@(?:Testcontainers|Container)\\b|new PostgreSQLContainer|\\bPOSTGRES\\.");
        List<String> violations = new ArrayList<>();
        for (Path source : migrationTests) {
            String code = HarnessSourceIndex.read(source);
            String name = source.getFileName().toString();
            if (!code.contains("extends SharedPostgresMigrationTestSupport")) {
                violations.add(name + ": shared support 상속 누락");
            }
            if (directLifecycle.matcher(code).find()) {
                violations.add(name + ": 개별 Testcontainers lifecycle/credential 참조 잔존");
            }
        }

        assertThat(violations)
                .as("migration 클래스마다 PostgreSQLContainer를 다시 띄우면 클래스 수만큼 부팅으로 회귀한다")
                .isEmpty();
    }

    private static boolean isMigrationTest(Path path) {
        String name = path.getFileName().toString();
        return name.endsWith("MigrationIntegrationTest.java");
    }

    private static Path schemaSourceRoot() {
        return HarnessSourceIndex.repoRoot().resolve("api-server/src/test/java/nuri/api/schema");
    }
}
