package nuri.api.harness;

import nuri.api.schema.SharedPostgresMigrationTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** PostgreSQL migration suite의 공유 서버·격리 database 구조를 보호하는 governance gate. */
@Tag("governance-harness")
class SharedPostgresMigrationHarnessContractTest {

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
    @DisplayName("35개 migration 검증은 개별 container lifecycle 없이 공용 PostgreSQL support를 사용한다")
    void migrationTestsUseSharedPostgresSupport() throws IOException {
        List<Path> migrationTests = HarnessSourceIndex.javaSources(schemaSourceRoot()).stream()
                .filter(SharedPostgresMigrationHarnessContractTest::isMigrationTest)
                .sorted()
                .toList();

        assertThat(migrationTests)
                .as("공용 서버로 이관해야 하는 migration 검증 클래스 census")
                .hasSize(35);

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
                .as("migration 클래스마다 PostgreSQLContainer를 다시 띄우면 35회 부팅으로 회귀한다")
                .isEmpty();
    }

    private static boolean isMigrationTest(Path path) {
        String name = path.getFileName().toString();
        return name.endsWith("BigintMigrationIntegrationTest.java")
                || name.equals("MenuIdentityMigrationIntegrationTest.java");
    }

    private static Path schemaSourceRoot() {
        return HarnessSourceIndex.repoRoot().resolve("api-server/src/test/java/nuri/api/schema");
    }
}
