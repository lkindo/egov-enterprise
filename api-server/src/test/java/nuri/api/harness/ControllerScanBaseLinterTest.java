package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧭 컨트롤러 린터 스캔 사각지대 차단 게이트.
 *
 * <p>[문제] 이 저장소의 컨트롤러 계열 하네스 린터들은 패키지 상수
 * {@code "nuri.api.controller"} 를 스캔 베이스로 쓴다. 그런데 api-server 의 프로덕션 소스는
 * {@code nuri} 아래에 <b>패키지 루트가 여러 개</b>로 갈라져 있다(2026-08-16 실측:
 * {@code nuri.api} 81파일 · {@code nuri.config} 6파일 · {@code nuri.apiserver} 2파일).
 * 즉 누군가 {@code nuri.config} 나 {@code nuri.apiserver} 아래에 컨트롤러를 새로 만들면
 * <b>그 컨트롤러는 컨트롤러 린터들의 시야 밖에서 조용히 살아간다</b> —
 * 인가 애노테이션 검사·핸들러 배선 검사·springdoc 선언 동기화 검사가 전부 그 파일을 보지 못한다.
 *
 * <p>실측 시점에 위반은 <b>0건</b>이다(컨트롤러 전량이 {@code nuri.api.controller} 하위).
 * 이 게이트는 그 상태를 <b>동결</b>하는 것이지 기존 위반을 고치는 것이 아니다.
 * "지금 위반이 없다"와 "앞으로도 위반이 생기지 않는다"는 다른 명제이고,
 * 후자를 보장하는 것은 규칙 서술이 아니라 실행되는 게이트뿐이다(AGENTS.md Evidence guardrails H5).
 *
 * <p>[규칙 1] 요청 처리 컨트롤러({@code @RestController} / {@code @Controller})는
 * {@code nuri.api.controller} 하위에만 선언한다.
 * {@code @RestControllerAdvice} / {@code @ControllerAdvice} 는 요청 매핑을 갖지 않는 횡단 관심사이므로
 * 대상이 아니다(실측: {@code nuri.api.advice.GlobalMenuAdvice} 가 여기 해당).
 *
 * <p>[규칙 2] api-server 의 {@code nuri} 직속 패키지 루트 census 를 동결한다.
 * 새 루트가 생기면 실패한다 — 루트가 늘어나는 것 자체가 위 사각지대를 넓히는 행위이기 때문이다.
 * 루트를 <b>줄이는</b> 방향(통합)도 실패시킨다: 개선분을 확정하지 않으면 census 가 낡아
 * 다음 사람이 낡은 목록을 근거로 판단하게 된다(양방향 래칫).
 *
 * <p>[왜 예외 목록이 없나] 정당한 비컨트롤러 설정 클래스는 규칙 1 에 애초에 걸리지 않는다
 * (컨트롤러 애노테이션이 없으므로). 그래서 allow-list 를 두지 않는다 — 없어도 되는 예외 목록은
 * 만들지 않는다(AGENTS.md Evidence guardrails H2: 목록 편집은 수정이 아니다).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 텍스트 스캔.
 * 경로 해석은 {@code HandlerReachesServiceLinterTest} 관행을 따른다.
 */
@Tag("governance-harness")
class ControllerScanBaseLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ControllerScanBaseLinterTest.class);

    /** 컨트롤러 린터들이 실제로 들고 있는 스캔 베이스. 이 값이 바뀌면 아래 규칙의 전제도 바뀐다. */
    private static final String CONTROLLER_SCAN_BASE = "nuri.api.controller";

    /** 요청 처리 컨트롤러. {@code @RestControllerAdvice}·{@code @ControllerAdvice} 는 뒤에 식별자 문자가 오므로 negative lookahead 로 제외된다. */
    private static final Pattern REQUEST_CONTROLLER =
            Pattern.compile("@(?:RestController|Controller)(?![A-Za-z0-9_$])");

    /** 소스의 package 선언. */
    private static final Pattern PACKAGE_DECL =
            Pattern.compile("^\\s*package\\s+([A-Za-z_$][\\w$.]*)\\s*;", Pattern.MULTILINE);

    /**
     * [동결 2026-08-16] api-server 프로덕션 소스의 {@code nuri} 직속 패키지 루트 census.
     * <p>{@code api}=81파일 · {@code config}=6파일 · {@code apiserver}=2파일.
     * <p>래칫의 정상 방향은 <b>감소</b>(루트 통합)다. 줄였다면 이 목록도 함께 줄일 것.
     */
    private static final Set<String> FROZEN_PACKAGE_ROOTS = new TreeSet<>(Set.of(
            "api",
            "apiserver",
            "config"
    ));

    /**
     * vacuity 하한 — 2026-08-16 실측 컨트롤러 68개(요청 컨트롤러 67 + advice 1 중 요청 컨트롤러만 68로 집계).
     * 실측값의 약 60% 로 둔다. 실측에 붙이면 정당한 삭제에도 red 가 되고, 너무 낮으면 스캔이
     * 붕괴해도 통과한다(= vacuous green).
     */
    private static final int MIN_REQUEST_CONTROLLERS = 40;

    @Test
    @DisplayName("🧭 요청 컨트롤러는 린터 스캔 베이스(nuri.api.controller) 안에만 존재한다")
    void auditControllersLiveInsideScanBase() throws IOException {
        Path apiServerSrc = resolveRepoRoot().resolve("api-server").resolve("src/main/java");
        if (!Files.isDirectory(apiServerSrc)) {
            fail("게이트 무결성 파손: api-server/src/main/java 를 찾지 못했습니다 (workingDir="
                    + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
        }

        int scanned = 0;
        List<String> violations = new ArrayList<>();

        for (Path file : HarnessSourceIndex.javaSources(apiServerSrc)) {
            String src = stripComments(HarnessSourceIndex.read(file));
            if (!REQUEST_CONTROLLER.matcher(src).find()) {
                continue;
            }
            scanned++;

            String pkg = packageOf(src);
            if (pkg == null) {
                violations.add(file + " — package 선언을 읽지 못했습니다(파싱 파손 의심)");
                continue;
            }
            if (!pkg.equals(CONTROLLER_SCAN_BASE) && !pkg.startsWith(CONTROLLER_SCAN_BASE + ".")) {
                violations.add(pkg + " → " + file.getFileName()
                        + "  (스캔 베이스 " + CONTROLLER_SCAN_BASE + " 밖 — 컨트롤러 린터가 이 파일을 보지 못합니다)");
            }
        }

        // 게이트 무결성: 컨트롤러 스캔이 조용히 붕괴하면 vacuous 통과가 된다.
        if (scanned < MIN_REQUEST_CONTROLLERS) {
            fail("게이트 무결성 파손: 요청 컨트롤러 스캔 건수(" + scanned + ")가 예상 하한("
                    + MIN_REQUEST_CONTROLLERS + ") 미만 — 경로/스캔 파손 의심 (workingDir="
                    + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
        }

        if (!violations.isEmpty()) {
            fail("🧭 [CONTROLLER SCAN BASE] 린터 스캔 베이스 밖에 요청 컨트롤러가 있습니다 ("
                    + violations.size() + "건).\n"
                    + "컨트롤러 계열 하네스 린터는 " + CONTROLLER_SCAN_BASE + " 를 스캔 베이스로 쓰므로,\n"
                    + "그 밖의 컨트롤러는 인가 애노테이션·핸들러 배선·springdoc 동기화 검사를 전부 우회합니다.\n"
                    + "해당 클래스를 " + CONTROLLER_SCAN_BASE + " 하위로 옮기십시오.\n  "
                    + String.join("\n  ", violations));
        }

        log.info("[CONTROLLER SCAN BASE] 요청 컨트롤러 {}개 전량이 {} 하위에 있습니다.", scanned, CONTROLLER_SCAN_BASE);
    }

    @Test
    @DisplayName("🧭 api-server 패키지 루트 census 동결 — 새 루트는 스캔 사각지대를 넓힌다")
    void auditPackageRootCensusIsFrozen() throws IOException {
        Path nuriRoot = resolveRepoRoot().resolve("api-server").resolve("src/main/java").resolve("nuri");
        if (!Files.isDirectory(nuriRoot)) {
            fail("게이트 무결성 파손: api-server/src/main/java/nuri 를 찾지 못했습니다 (workingDir="
                    + Paths.get("").toAbsolutePath() + ").");
        }

        // .java 파일을 실제로 품은 루트만 센다 — 빈 디렉터리는 패키지가 아니다.
        Set<String> actual = new TreeSet<>();
        try (Stream<Path> roots = Files.list(nuriRoot)) {
            for (Path dir : roots.filter(Files::isDirectory).toList()) {
                if (!HarnessSourceIndex.javaSources(dir).isEmpty()) {
                    actual.add(dir.getFileName().toString());
                }
            }
        }

        if (!actual.equals(FROZEN_PACKAGE_ROOTS)) {
            Set<String> added = new TreeSet<>(actual);
            added.removeAll(FROZEN_PACKAGE_ROOTS);
            Set<String> removed = new TreeSet<>(FROZEN_PACKAGE_ROOTS);
            removed.removeAll(actual);

            StringBuilder msg = new StringBuilder("🧭 [PACKAGE ROOT CENSUS] api-server 의 nuri 직속 패키지 루트가 동결 목록과 다릅니다.\n");
            msg.append("  동결: ").append(FROZEN_PACKAGE_ROOTS).append('\n');
            msg.append("  실측: ").append(actual).append('\n');
            if (!added.isEmpty()) {
                msg.append("  ➕ 신규 루트 ").append(added).append(" — 루트가 늘면 컨트롤러 린터의 스캔 사각지대가 넓어집니다.\n")
                   .append("     새 코드는 기존 루트(권장: nuri.api) 하위에 두십시오. 루트 신설이 정당하다면\n")
                   .append("     사유를 커밋 메시지에 남기고 FROZEN_PACKAGE_ROOTS 를 함께 갱신하십시오.\n");
            }
            if (!removed.isEmpty()) {
                msg.append("  ➖ 소멸 루트 ").append(removed).append(" — 통합했다면 개선분을 확정하도록\n")
                   .append("     FROZEN_PACKAGE_ROOTS 에서도 제거하십시오(양방향 래칫).\n");
            }
            fail(msg.toString());
        }

        log.info("[PACKAGE ROOT CENSUS] api-server nuri 직속 패키지 루트 {}개 동결 상태 일치.", actual.size());
    }

    /** 소스의 package 선언을 읽는다. 없으면 null. */
    private static String packageOf(String src) {
        var m = PACKAGE_DECL.matcher(src);
        return m.find() ? m.group(1) : null;
    }

    /**
     * 블록/라인 주석 제거 — 주석 안의 예시 코드가 애노테이션으로 오탐되는 것을 막는다.
     * 문자열 리터럴 안의 {@code //} 까지 정확히 다루지는 않지만, 이 게이트의 판정 축
     * (애노테이션·package 선언)에는 영향이 없다.
     */
    private static String stripComments(String src) {
        return src.replaceAll("(?s)/\\*.*?\\*/", " ").replaceAll("(?m)//.*$", " ");
    }

    /** cwd 또는 상위에서 settings.gradle 을 가진 저장소 루트를 찾는다(HandlerReachesServiceLinter 경로해석 관행). */
    private static Path resolveRepoRoot() {
        Path cur = Paths.get("").toAbsolutePath();
        for (int i = 0; i < 4 && cur != null; i++) {
            if (Files.exists(cur.resolve("settings.gradle")) || Files.exists(cur.resolve("settings.gradle.kts"))) {
                return cur;
            }
            cur = cur.getParent();
        }
        Path fallback = Paths.get("").toAbsolutePath().getParent();
        if (fallback != null && Files.exists(fallback.resolve("settings.gradle"))) {
            return fallback;
        }
        return Paths.get("").toAbsolutePath();
    }
}
