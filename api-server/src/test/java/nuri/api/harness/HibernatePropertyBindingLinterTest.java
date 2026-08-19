package nuri.api.harness;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.boot.spi.SessionFactoryOptions;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

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
 * </ol>
 *
 * <p><b>[왜 운영 값을 런타임으로 단언하지 않는가 — 정직한 한계]</b>
 * {@code api-server/src/test/resources/application.yml} 이 존재해 <b>main 의 base 설정을 통째로
 * shadow</b> 한다(그 파일 자신의 주석도 그렇게 적고 있다). 따라서 테스트 컨텍스트가 들고 있는
 * 값은 <b>운영 값이 아니다</b>. 여기서 운영 값(25/true/true)을 단언하면 그것은 운영을 검증하는
 * 것처럼 보이지만 실제로는 테스트 리소스를 검증하는 <b>false-green</b> 이다. 그래서 운영 값은
 * 2번(파일 위치)으로, 전달 여부는 1번(기전)으로 나눠 판정한다.
 */
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        properties = {
                // 전달되는 경로 — Boot 는 spring.jpa.properties.* 를 Hibernate 에 그대로 넘긴다.
                "spring.jpa.properties.hibernate.jdbc.batch_size=42",
                // 무시되는 경로 — HibernateProperties 는 이 키를 모른다(대조군).
                "spring.jpa.hibernate.jdbc.batch_size=7"
        })
@ActiveProfiles("test")
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

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    @DisplayName("기전 증명: spring.jpa.properties.hibernate.* 만 Hibernate 에 도달한다 (양방향)")
    void onlyThePropertiesPrefixReachesHibernate() {
        SessionFactoryOptions options = entityManagerFactory
                .unwrap(SessionFactoryImplementor.class)
                .getSessionFactoryOptions();

        assertThat(options.getJdbcBatchSize())
                .as("""
                        Hibernate 가 받은 jdbc.batch_size 가 42(=spring.jpa.properties.hibernate.* 로 주입한 값)가 아닙니다.
                          · 7 이면   → spring.jpa.hibernate.* 가 바인딩된다는 뜻이므로 이 게이트의 전제가 무효입니다(Boot 판올림 확인).
                          · 15 이면  → 어느 쪽도 도달하지 않고 Hibernate 기본값이 쓰인 것입니다.
                        어느 경우든 application.yml 의 Hibernate 튜닝 키 위치 규칙을 다시 판정해야 합니다.""")
                .isEqualTo(42);
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

    // ── helpers ───────────────────────────────────────────────────────────────

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
