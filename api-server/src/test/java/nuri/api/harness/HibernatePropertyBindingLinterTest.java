package nuri.api.harness;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.boot.spi.SessionFactoryOptions;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 🧊 Hibernate 튜닝 설정이 <b>실제로 Hibernate 에 도달하는지</b> 를 검증하는 게이트.
 *
 * <p><b>[왜 있는가 — 2026-08-03 실측]</b> {@code application.yml} 에 아래가 선언돼 있었다.
 * <pre>
 * spring.jpa.hibernate.order-inserts: true
 * spring.jpa.hibernate.order-updates: true
 * spring.jpa.hibernate.batch-size: 25
 * spring.jpa.hibernate.jdbc.batch_size: 25
 * spring.jpa.hibernate.jdbc.fetch_size: 100
 * </pre>
 * 그런데 {@code spring.jpa.hibernate.*} 는 Boot 의 {@code HibernateProperties} 에 바인딩되며
 * <b>{@code ddl-auto} 와 {@code naming.*} 만</b> 받는다. 나머지 키는 <b>조용히 무시된다</b> —
 * 바인딩 실패도, 경고 로그도, 기동 오류도 없다.
 *
 * <p><b>⚠ 오해하기 쉬운 지점(정확히 적는다)</b>: 그렇다고 배치가 <b>꺼져</b> 있던 것은 아니다.
 * 실측하면 {@code getJdbcBatchSize()} 는 <b>15</b> 를 돌려준다 — Hibernate 자신의 기본값이다.
 * 즉 실제로 무효였던 것은 ① 배치 크기 25 라는 <b>의도</b>와 ② {@code order_inserts}/
 * {@code order_updates}(Hibernate 기본값 <b>false</b>)다. ②가 꺼져 있으면 여러 엔티티 종류가 섞인
 * flush 에서 같은 종류의 문장이 인접하지 않아 <b>배치가 잘게 쪼개진다</b> — 배치를 켠 효과가
 * 대부분 사라진다. "설정 파일에 적혀 있으니 적용되고 있다"는 이해와 실제가 갈라져 있었다는 것이
 * 이 결함의 본질이다.
 *
 * <p><b>[이 게이트가 판정하는 것]</b>
 * <ol>
 *   <li><b>기전(mechanism) 증명 — 양방향</b>: 이 테스트는 자기 컨텍스트에 두 값을 동시에 주입한다.
 *       {@code spring.jpa.properties.hibernate.jdbc.batch_size=42}(전달되는 경로)와
 *       {@code spring.jpa.hibernate.jdbc.batch_size=7}(무시되는 경로). Hibernate 가 42 를 보면
 *       전자는 도달하고 후자는 무시된다는 것이 <b>동시에</b> 증명된다. 어느 쪽도 서술이 아니라
 *       실행 결과다.</li>
 *   <li><b>운영 설정 파일의 위치</b>: 모든 {@code application*.yml} 의 {@code spring.jpa.hibernate:}
 *       블록에 Boot 가 바인딩하지 않는 키가 있는지 본다. 같은 실수의 <b>부류</b>를 막는다.</li>
 *   <li><b>앱이 같은 경로를 쓴다는 전제</b>: 운영 소스(foundation·business-core·business-app·api-server 의 main)에
 *       JPA 부트스트랩을 직접 다루는 타입(EMF 직접 정의·Hibernate 속성 커스터마이저)이 없는지 정적으로 본다.
 *       EMF 를 직접 정의하면 자동 설정이 물러나 1번의 경로가 이 앱의 경로가 아니게 되고, 커스터마이저는
 *       yml 의 값을 덮을 수 있다. 선언이 생기면 red 가 되어 이 게이트의 전제를 다시 판정하게 한다.</li>
 * </ol>
 *
 * <p><b>[왜 운영 값을 런타임으로 단언하지 않는가 — 정직한 한계]</b>
 * 기전 컨텍스트는 {@code application*.yml}을 읽지 않고 테스트 값을 직접 주입하므로 운영 설정의
 * 적용 결과를 주장하지 않는다. 운영 선언 위치는 2번, 전달 여부는 1번, 앱이 1번과 같은 경로를 쓴다는
 * 전제는 3번으로 나눠 판정한다. Boot의 DataSource/JPA 자동 설정과 실제 Hibernate SessionFactory만 띄우며,
 * 업무 엔티티·웹·보안 설정은 스캔하지 않는다. 3번은 실행이 아니라 선언 부재의 정적 확인이다 — 앱 전체를
 * 띄워 같은 사실을 간접적으로 보던 종전 방식 대신, 전제가 깨지는 지점을 직접 막는다.
 */
@Tag("governance-harness")
class HibernatePropertyBindingLinterTest {

    /**
     * {@code spring.jpa.hibernate.*} 아래에서 Boot 가 실제로 바인딩하는 키.
     * (org.springframework.boot.autoconfigure.orm.jpa.HibernateProperties 의 필드 — Boot 3.4 기준)
     * 이 목록 밖의 키가 그 위치에 있으면 무시되므로 <b>선언한 사람의 의도가 실행되지 않는다</b>.
     */
    private static final Set<String> BOOT_BOUND_JPA_HIBERNATE_KEYS = Set.of(
            "ddl-auto",
            "ddl_auto",
            "naming"
    );

    /** 스캔 대상 설정 파일 루트. 모듈이 늘어나면 여기에 추가한다. */
    private static final List<String> CONFIG_ROOTS = List.of(
            "api-server/src/main/resources",
            "business-core/src/main/resources",
            "business-app/src/main/resources",
            "foundation/src/main/resources"
    );

    /** vacuous 통과 방지 — 스캔 대상이 이 수 미만이면 경로가 바뀐 것이므로 실패시킨다. */
    private static final int MIN_SCANNED_FILES = 5;

    /**
     * 앱이 JPA 부트스트랩을 직접 다루는 타입. 운영 소스에 하나라도 나오면 기전 증명(Boot 자동 설정 경로)이
     * 이 앱의 전달 경로를 대표한다는 전제가 깨질 수 있다. 시험 전용 쿼리 계수 설정(testFixtures)은 대상이 아니다.
     */
    private static final List<String> JPA_BOOTSTRAP_OVERRIDE_TYPES = List.of(
            "HibernatePropertiesCustomizer",
            "LocalContainerEntityManagerFactoryBean",
            "EntityManagerFactoryBuilderCustomizer"
    );

    private static final Pattern JPA_BOOTSTRAP_OVERRIDE = Pattern.compile(
            "(?<![\\w$])(?:" + String.join("|", JPA_BOOTSTRAP_OVERRIDE_TYPES) + ")(?![\\w$])");

    /** 운영 소스 모듈. 판정은 각 모듈의 src/main/java 만 본다. */
    private static final List<String> PRODUCTION_MODULES = List.of(
            "foundation", "business-core", "business-app", "api-server");

    /** vacuous 통과 방지 — 운영 소스가 이 수 미만이면 경로가 바뀐 것이므로 실패시킨다. */
    private static final int MIN_SCANNED_SOURCES = 100;

    private final ApplicationContextRunner jpaContext = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(
                    DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class))
            .withBean(PersistenceManagedTypes.class, () -> PersistenceManagedTypes.of())
            .withPropertyValues(
                    "spring.datasource.generate-unique-name=true",
                    "spring.jpa.hibernate.ddl-auto=none");

    @Test
    @DisplayName("기전 증명: spring.jpa.properties.hibernate.* 만 Hibernate 에 도달한다 (양방향)")
    void onlyThePropertiesPrefixReachesHibernate() {
        jpaContext.withPropertyValues(
                "spring.jpa.properties.hibernate.jdbc.batch_size=42",
                "spring.jpa.hibernate.jdbc.batch_size=7").run(context -> {
            assertThat(context).hasNotFailed().hasSingleBean(EntityManagerFactory.class)
                    .doesNotHaveBean(nuri.ApiServerApplication.class);
            EntityManagerFactory factory = context.getBean(EntityManagerFactory.class);
            assertThat(factory.getMetamodel().getEntities()).as("업무 엔티티를 스캔하지 않는다").isEmpty();
            SessionFactoryOptions options = factory.unwrap(SessionFactoryImplementor.class)
                    .getSessionFactoryOptions();
            assertThat(options.getJdbcBatchSize())
                    .as("spring.jpa.properties.hibernate.jdbc.batch_size만 실제 Hibernate에 전달되어야 한다")
                    .isEqualTo(42);
        });
    }

    @Test
    @DisplayName("부정 대조군: 잘못된 prefix만 선언하면 Hibernate batch_size가 설정되지 않는다")
    void incorrectPrefixAloneDoesNotConfigureHibernate() {
        jpaContext.withPropertyValues("spring.jpa.hibernate.jdbc.batch_size=7").run(context -> {
            assertThat(context).hasNotFailed().hasSingleBean(EntityManagerFactory.class);
            SessionFactoryOptions options = context.getBean(EntityManagerFactory.class)
                    .unwrap(SessionFactoryImplementor.class).getSessionFactoryOptions();
            assertThat(options.getJdbcBatchSize())
                    .as("잘못된 prefix가 정상 prefix와의 우선순위 때문에 가려진 것이 아니라 무시되어야 한다")
                    .isNotEqualTo(7);
        });
    }

    @Test
    @DisplayName("운영 설정 파일의 spring.jpa.hibernate 블록에 조용히 무시되는 키가 없다")
    void noSilentlyIgnoredKeysUnderSpringJpaHibernate() throws IOException {
        List<String> violations = new ArrayList<>();

        for (Path yml : configFiles()) {
            for (String key : keysUnderSpringJpaHibernate(yml)) {
                if (!BOOT_BOUND_JPA_HIBERNATE_KEYS.contains(key)) {
                    violations.add(String.format(
                            "%s → spring.jpa.hibernate.%s 는 Boot 가 바인딩하지 않아 **무시**됩니다. "
                                    + "Hibernate 로 전달하려면 spring.jpa.properties.hibernate.%s 로 옮기십시오.",
                            yml, key, key.replace('-', '_')));
                }
            }
        }

        assertThat(violations)
                .as("조용히 무시되는 Hibernate 설정 키가 있습니다. 설정 파일만 읽은 사람은 그 값이 "
                        + "적용된다고 이해하므로, 무효 선언은 '없는 설정' 보다 나쁩니다.\n%s",
                        String.join("\n", violations))
                .isEmpty();
    }

    @Test
    @DisplayName("운영 소스가 JPA 부트스트랩을 직접 바꾸지 않는다 — 기전 증명이 이 앱의 경로라는 전제")
    void productionSourcesDoNotOverrideTheJpaBootstrap() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        List<Path> sources = HarnessSourceIndex.productionJavaSources(PRODUCTION_MODULES.toArray(String[]::new));
        assertThat(sources)
                .as("운영 소스를 거의 찾지 못했습니다 — 모듈 경로가 바뀌었다면 PRODUCTION_MODULES 를 갱신하십시오 "
                        + "(vacuous 통과 방지).")
                .hasSizeGreaterThanOrEqualTo(MIN_SCANNED_SOURCES);

        List<String> violations = new ArrayList<>();
        for (Path source : sources) {
            String label = repoRoot.relativize(source).toString().replace('\\', '/');
            violations.addAll(jpaBootstrapOverrides(label, HarnessSourceIndex.read(source)));
        }

        assertThat(violations)
                .as("운영 소스가 JPA 부트스트랩을 직접 다룹니다. 이 게이트의 기전 증명은 Boot 자동 설정 경로만 띄우므로 "
                        + "이제 이 앱의 전달 경로를 대표하지 않을 수 있습니다. 앱의 EMF·커스터마이저 경로에서 "
                        + "spring.jpa.properties.hibernate.* 가 Hibernate 에 닿는지(그리고 덮이지 않는지) 실행으로 증명하는 "
                        + "시험을 같은 변경에 더하고 이 단언을 다시 판정하십시오.\n%s", String.join("\n", violations))
                .isEmpty();
    }

    @Test
    @DisplayName("부정 대조군: 커스터마이저·EMF 직접 정의는 잡고, 주석·문자열·다른 이름의 일부는 잡지 않는다")
    void jpaBootstrapOverrideScanCatchesDeclarationsOnly() {
        assertThat(jpaBootstrapOverrides("Fixture.java",
                "import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;\n"
                        + "class Fixture {\n"
                        + "  @Bean HibernatePropertiesCustomizer tune() { return p -> p.put(\"k\", 3); }\n"
                        + "}\n"))
                .containsExactly("Fixture.java:1 → HibernatePropertiesCustomizer",
                        "Fixture.java:3 → HibernatePropertiesCustomizer");
        assertThat(jpaBootstrapOverrides("Fixture.java",
                "class Fixture {\n  @Bean LocalContainerEntityManagerFactoryBean emf() { return null; }\n"
                        + "  @Bean EntityManagerFactoryBuilderCustomizer builder() { return b -> { }; }\n}\n"))
                .containsExactly("Fixture.java:2 → LocalContainerEntityManagerFactoryBean",
                        "Fixture.java:3 → EntityManagerFactoryBuilderCustomizer");
        assertThat(jpaBootstrapOverrides("Fixture.java",
                "class Fixture {\n"
                        + "  // HibernatePropertiesCustomizer 는 쓰지 않는다\n"
                        + "  /* LocalContainerEntityManagerFactoryBean */\n"
                        + "  String note = \"EntityManagerFactoryBuilderCustomizer\";\n"
                        + "  class MyLocalContainerEntityManagerFactoryBeanHelper { }\n"
                        + "}\n"))
                .as("주석·문자열 언급과 다른 식별자의 일부는 선언이 아니다")
                .isEmpty();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** 주석·리터럴을 가린 코드에서 부트스트랩 타입 이름을 식별자 단위로 찾는다. 결과는 {@code 파일:행 → 타입}. */
    static List<String> jpaBootstrapOverrides(String label, String source) {
        String code = HarnessSourceIndex.maskNonCode(source);
        List<String> found = new ArrayList<>();
        Matcher matcher = JPA_BOOTSTRAP_OVERRIDE.matcher(code);
        while (matcher.find()) {
            long line = code.substring(0, matcher.start()).chars().filter(c -> c == '\n').count() + 1;
            found.add(label + ":" + line + " → " + matcher.group());
        }
        return found;
    }

    /**
     * YAML 을 들여쓰기 스택으로 훑어 {@code spring.jpa.hibernate} <b>직계 자식 키</b>만 돌려준다.
     *
     * <p>경로를 스택으로 추적하는 이유: {@code spring.jpa.properties.hibernate} 도 같은
     * {@code hibernate:} 토큰이라, 토큰만 보면 <b>정상 위치를 위반으로 오판</b>한다
     * (이 게이트의 초안이 실제로 그랬다 — 7개 파일에서 위양성).
     */
    private List<String> keysUnderSpringJpaHibernate(Path yml) throws IOException {
        List<String> keys = new ArrayList<>();
        Deque<int[]> indents = new ArrayDeque<>();   // [indent]
        Deque<String> path = new ArrayDeque<>();     // 대응하는 키 이름

        for (String raw : Files.readAllLines(yml, StandardCharsets.UTF_8)) {
            String line = stripComment(raw);
            if (line.isBlank() || line.trim().startsWith("-")) {
                continue;
            }
            int indent = indentOf(line);
            String trimmed = line.trim();
            int colon = trimmed.indexOf(':');
            if (colon < 0) {
                continue;
            }
            String key = trimmed.substring(0, colon).trim();

            while (!indents.isEmpty() && indents.peek()[0] >= indent) {
                indents.pop();
                path.pop();
            }

            if (String.join(".", reversed(path)).equals("spring.jpa.hibernate")) {
                keys.add(key);
            }

            indents.push(new int[]{indent});
            path.push(key);
        }
        return keys;
    }

    private static List<String> reversed(Deque<String> stack) {
        List<String> out = new ArrayList<>(stack);
        java.util.Collections.reverse(out);
        return out;
    }

    private List<Path> configFiles() throws IOException {
        Path repoRoot = resolveRepoRoot();
        List<Path> found = new ArrayList<>();
        for (String root : CONFIG_ROOTS) {
            Path dir = repoRoot.resolve(root);
            if (!Files.isDirectory(dir)) {
                continue;
            }
            HarnessSourceIndex.filesUnder(dir, 1).stream()
                        .filter(p -> {
                            String name = p.getFileName().toString();
                            return name.startsWith("application")
                                    && (name.endsWith(".yml") || name.endsWith(".yaml"));
                        })
                        .forEach(found::add);
        }
        assertThat(found)
                .as("스캔 대상 설정 파일을 하나도 찾지 못했습니다 — 경로가 바뀌었다면 CONFIG_ROOTS 를 "
                        + "갱신하십시오 (vacuous 통과 방지).")
                .hasSizeGreaterThanOrEqualTo(MIN_SCANNED_FILES);
        return found;
    }

    /** 테스트 작업 디렉터리가 모듈일 수도, 루트일 수도 있어 settings.gradle 로 루트를 찾는다. */
    private Path resolveRepoRoot() {
        Path cursor = Paths.get("").toAbsolutePath();
        while (cursor != null && !Files.exists(cursor.resolve("settings.gradle"))) {
            cursor = cursor.getParent();
        }
        assertThat(cursor).as("settings.gradle 을 찾지 못해 저장소 루트를 확정할 수 없습니다.").isNotNull();
        return cursor;
    }

    private static String stripComment(String line) {
        int hash = line.indexOf('#');
        return hash < 0 ? line : line.substring(0, hash);
    }

    private static int indentOf(String line) {
        int i = 0;
        while (i < line.length() && line.charAt(i) == ' ') {
            i++;
        }
        return i;
    }
}
