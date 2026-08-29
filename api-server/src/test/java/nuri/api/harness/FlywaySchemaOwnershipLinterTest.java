package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** 운영 스키마 소유권을 Flyway로 단일화하고 Spring SQL/Hibernate DDL 우회 경로를 차단한다. */
@Tag("governance-harness")
class FlywaySchemaOwnershipLinterTest {

    private static final Logger log = LoggerFactory.getLogger(FlywaySchemaOwnershipLinterTest.class);
    private static final Set<String> NON_MUTATING_DDL_AUTO = Set.of("none", "validate");
    private static final List<String> MODULES = List.of(
            "foundation", "business-core", "business-app", "api-server", "migration-tool");

    @Test
    @DisplayName("운영 설정은 Flyway 단독 소유이며 Hibernate DDL과 schema.sql/data.sql 초기화를 허용하지 않는다")
    void productionConfigurationKeepsFlywayAsTheOnlySchemaOwner() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        Path resources = root.resolve("api-server/src/main/resources");
        Map<String, String> effective = new LinkedHashMap<>(flattenYaml(resources.resolve("application.yml")));
        effective.putAll(flattenYaml(resources.resolve("application-prod.yml")));

        List<String> violations = productionOwnershipViolations(effective);
        violations.addAll(runtimeSchemaSqlViolations(root));

        assertThat(violations)
                .as("운영 스키마를 Flyway 밖에서 변경/초기화할 수 있는 경로가 있습니다.%n%s",
                        String.join(System.lineSeparator(), violations))
                .isEmpty();

        log.info("운영 스키마 소유권 OK — ddl-auto={}, sql.init.mode={}, flyway.locations={}",
                effective.get("spring.jpa.hibernate.ddl-auto"), effective.get("spring.sql.init.mode"),
                effective.get("spring.flyway.locations"));
    }

    @Test
    @DisplayName("부정 대조군: update/create DDL과 SQL init 활성화는 fail-closed 위반이다")
    void detectorRejectsHibernateMutationAndSqlInitializer() {
        Map<String, String> unsafe = new LinkedHashMap<>();
        unsafe.put("spring.jpa.hibernate.ddl-auto", "update");
        unsafe.put("spring.jpa.generate-ddl", "true");
        unsafe.put("spring.sql.init.mode", "always");
        unsafe.put("spring.sql.init.schema-locations", "classpath:schema.sql");
        unsafe.put("spring.flyway.enabled", "true");
        unsafe.put("spring.flyway.locations", "classpath:db/migration");
        unsafe.put("spring.flyway.baseline-on-migrate", "false");

        assertThat(productionOwnershipViolations(unsafe))
                .anyMatch(v -> v.contains("ddl-auto") && v.contains("update"))
                .anyMatch(v -> v.contains("generate-ddl"))
                .anyMatch(v -> v.contains("sql.init.mode") && v.contains("always"))
                .anyMatch(v -> v.contains("schema-locations"));
    }

    @Test
    @DisplayName("운영 런타임 none의 보완 preflight: 스키마 변경은 PostgreSQL+Flyway+Hibernate validate CI를 반드시 탄다")
    void schemaPreflightIsWiredToSchemaRelevantChanges() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        String apiBuild = HarnessSourceIndex.read(root.resolve("api-server/build.gradle"));
        String ci = HarnessSourceIndex.read(root.resolve(".github/workflows/ci.yml"));
        String scope = HarnessSourceIndex.read(root.resolve("scripts/ci-change-scope.mjs"));
        Map<String, String> tc = flattenYaml(root.resolve("api-server/src/test/resources/application-tc.yml"));

        List<String> violations = new ArrayList<>();
        if (!apiBuild.contains("tasks.register('schemaValidationTest', Test)")
                || !apiBuild.contains("includeTags 'schema-validation'")) {
            violations.add("api-server schemaValidationTest 전용 실행 태스크/태그 연결 누락");
        }
        if (!ci.contains("./gradlew :api-server:schemaValidationTest")
                || !ci.contains("needs.change-scope.outputs.schema == 'true'")) {
            violations.add("required CI의 schemaValidationTest 실행 또는 schema 조건 연결 누락");
        }
        if (!scope.contains("const SCHEMA_RELEVANT")
                || !scope.contains("business-core|business-app|foundation")
                || !scope.contains("src\\/main\\/java\\/.*\\/domain")
                || !scope.contains("api-server\\/src\\/main\\/resources\\/db\\/migration")) {
            violations.add("Entity domain/Flyway 변경을 schema=true로 분류하는 fail-closed 범위 누락");
        }
        if (!"validate".equals(normalize(tc.get("spring.jpa.hibernate.ddl-auto")))
                || !"true".equals(normalize(tc.get("spring.flyway.enabled")))
                || !"classpath:db/migration".equals(normalize(tc.get("spring.flyway.locations")))) {
            violations.add("application-tc.yml은 Flyway 전량 적용 + Hibernate ddl-auto:validate 계약이어야 함");
        }

        assertThat(violations)
                .as("운영 ddl-auto:none을 보완하는 실 PostgreSQL schema preflight가 실행 경로에서 끊겼습니다.%n%s",
                        String.join(System.lineSeparator(), violations))
                .isEmpty();
    }

    @Test
    @DisplayName("저장소 루트 sql/*.sql은 운영 자동화에서 직접 실행되지 않는다")
    void rootSqlScriptsAreNotAnAutomatedFlywayBypass() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        Path sqlDir = root.resolve("sql");
        List<Path> rootSql = Files.isDirectory(sqlDir)
                ? HarnessSourceIndex.filesUnder(sqlDir, path -> path.getFileName().toString().endsWith(".sql"))
                : List.of();

        List<Path> launchSurfaces = launchSurfaces(root);
        List<String> violations = new ArrayList<>();
        for (Path sql : rootSql) {
            String relative = root.relativize(sql).toString().replace('\\', '/');
            for (Path launch : launchSurfaces) {
                // 찾는 토큰은 ASCII 경로다. 일부 레거시 shell 파일이 UTF-8이 아니어도 byte-preserving
                // ISO-8859-1 디코딩이면 ASCII 경로 검사는 결정적으로 유지된다.
                String source = new String(Files.readAllBytes(launch), StandardCharsets.ISO_8859_1)
                        .replace('\\', '/');
                if (source.contains(relative)) {
                    violations.add(root.relativize(launch).toString() + " → Flyway 밖의 " + relative + " 직접 실행 참조");
                }
            }
        }

        assertThat(violations)
                .as("root sql 스크립트는 수동 참고 자산일 뿐 배포/기동 자동화가 실행해서는 안 됩니다.%n%s",
                        String.join(System.lineSeparator(), violations))
                .isEmpty();
        log.info("root sql 자동 실행 참조 없음 — sql/*.sql {}건 / launch surface {}건 정적 대조",
                rootSql.size(), launchSurfaces.size());
    }

    private static List<String> productionOwnershipViolations(Map<String, String> effective) {
        List<String> violations = new ArrayList<>();
        String ddlAuto = normalize(effective.get("spring.jpa.hibernate.ddl-auto"));
        if (!NON_MUTATING_DDL_AUTO.contains(ddlAuto)) {
            violations.add("spring.jpa.hibernate.ddl-auto=" + ddlAuto
                    + " — 운영은 none/validate만 허용하며 create/update/create-drop은 Flyway SSOT 우회");
        }
        if ("true".equals(normalize(effective.get("spring.jpa.generate-ddl")))) {
            violations.add("spring.jpa.generate-ddl=true — Hibernate DDL 생성 우회");
        }
        String hbm2ddl = normalize(effective.get("spring.jpa.properties.hibernate.hbm2ddl.auto"));
        if (!hbm2ddl.isEmpty() && !NON_MUTATING_DDL_AUTO.contains(hbm2ddl)) {
            violations.add("spring.jpa.properties.hibernate.hbm2ddl.auto=" + hbm2ddl + " — Hibernate DDL 우회");
        }
        String sqlInit = normalize(effective.get("spring.sql.init.mode"));
        if (!"never".equals(sqlInit)) {
            violations.add("spring.sql.init.mode=" + sqlInit + " — 운영은 명시적 never여야 함");
        }
        for (String key : List.of("spring.sql.init.schema-locations", "spring.sql.init.data-locations")) {
            if (effective.containsKey(key) && !normalize(effective.get(key)).isEmpty()) {
                violations.add(key + "=" + effective.get(key) + " — Flyway 밖 schema/data SQL 위치 선언 금지");
            }
        }
        if (!"true".equals(normalize(effective.get("spring.flyway.enabled")))) {
            violations.add("spring.flyway.enabled는 운영 effective config에서 명시적 true여야 함");
        }
        if (!"classpath:db/migration".equals(normalize(effective.get("spring.flyway.locations")))) {
            violations.add("spring.flyway.locations=" + effective.get("spring.flyway.locations")
                    + " — 운영 SSOT는 classpath:db/migration 단독이어야 함");
        }
        if (!"false".equals(normalize(effective.get("spring.flyway.baseline-on-migrate")))) {
            violations.add("spring.flyway.baseline-on-migrate는 prod overlay에서 false로 fail-closed해야 함");
        }
        if ("false".equals(normalize(effective.get("spring.flyway.validate-on-migrate")))) {
            violations.add("spring.flyway.validate-on-migrate=false — migration checksum 검증 우회");
        }
        return violations;
    }

    private static List<String> runtimeSchemaSqlViolations(Path root) throws IOException {
        List<String> violations = new ArrayList<>();
        for (String module : MODULES) {
            Path resources = root.resolve(module).resolve("src/main/resources");
            if (!Files.isDirectory(resources)) {
                continue;
            }
            for (Path file : HarnessSourceIndex.filesUnder(resources, path -> {
                String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
                return name.equals("schema.sql") || name.equals("data.sql");
            })) {
                violations.add(root.relativize(file).toString()
                        + " → main runtime classpath의 schema.sql/data.sql은 Flyway 우회 경로");
            }
        }
        return violations;
    }

    private static List<Path> launchSurfaces(Path root) throws IOException {
        List<Path> files = new ArrayList<>();
        for (String name : List.of("build.gradle", "settings.gradle", "Makefile", "package.json",
                "start-dev.ps1", "run-e2e-pipeline.ps1")) {
            Path candidate = root.resolve(name);
            if (Files.isRegularFile(candidate)) {
                files.add(candidate);
            }
        }
        for (String module : MODULES) {
            Path build = root.resolve(module).resolve("build.gradle");
            if (Files.isRegularFile(build)) {
                files.add(build);
            }
        }
        HarnessSourceIndex.filesUnder(root.resolve(".github/workflows"), FlywaySchemaOwnershipLinterTest::isLaunchText)
                .forEach(files::add);
        HarnessSourceIndex.filesUnder(root.resolve("scripts"), FlywaySchemaOwnershipLinterTest::isLaunchText)
                .forEach(files::add);
        HarnessSourceIndex.filesUnder(root, 1).stream()
                .filter(path -> path.getFileName().toString().startsWith("docker-compose"))
                .filter(FlywaySchemaOwnershipLinterTest::isLaunchText)
                .forEach(files::add);
        return files.stream().distinct().sorted().toList();
    }

    private static boolean isLaunchText(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".mjs")
                || name.endsWith(".js") || name.endsWith(".ps1") || name.endsWith(".sh")
                || name.equals("makefile") || name.endsWith(".gradle") || name.endsWith(".json");
    }

    /** 필요한 scalar만 읽는 결정적 YAML flattener. 같은 경로는 뒤 선언이 Spring처럼 우선한다. */
    private static Map<String, String> flattenYaml(Path yaml) throws IOException {
        assertThat(yaml).as("운영 설정 파일 부재").isRegularFile();
        Map<String, String> values = new LinkedHashMap<>();
        List<YamlParent> parents = new ArrayList<>();
        for (String raw : Files.readAllLines(yaml)) {
            String code = stripYamlComment(raw);
            if (code.isBlank() || code.trim().startsWith("-") || code.trim().equals("---")) {
                continue;
            }
            int indent = leadingSpaces(code);
            String trimmed = code.trim();
            int colon = trimmed.indexOf(':');
            if (colon <= 0) {
                continue;
            }
            String key = trimmed.substring(0, colon).trim();
            String value = trimmed.substring(colon + 1).trim();
            while (!parents.isEmpty() && parents.get(parents.size() - 1).indent() >= indent) {
                parents.remove(parents.size() - 1);
            }
            String prefix = parents.isEmpty() ? "" : parents.get(parents.size() - 1).path() + ".";
            String path = prefix + key;
            if (value.isEmpty()) {
                parents.add(new YamlParent(indent, path));
            } else {
                values.put(path, unquote(value));
            }
        }
        return values;
    }

    private static String stripYamlComment(String line) {
        int comment = line.indexOf(" #");
        return comment < 0 ? line : line.substring(0, comment);
    }

    private static int leadingSpaces(String line) {
        int count = 0;
        while (count < line.length() && line.charAt(count) == ' ') {
            count++;
        }
        return count;
    }

    private static String unquote(String value) {
        if (value.length() >= 2 && ((value.startsWith("\"") && value.endsWith("\""))
                || (value.startsWith("'") && value.endsWith("'")))) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record YamlParent(int indent, String path) {
    }
}
