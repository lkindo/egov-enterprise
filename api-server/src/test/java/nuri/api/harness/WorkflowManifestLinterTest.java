package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧾 GitHub Actions 워크플로 매니페스트 파싱 게이트.
 *
 * <p>[고친 결함 · 2026-08-03~04] {@code .github/workflows/secret-scan-history.yml} 은 {@code run: |}
 * 블록 스칼라 안의 heredoc 본문이 <b>컬럼 0</b> 에 있었다. 그러면 YAML 블록이 그 줄에서 끝나고
 * 파일 전체가 invalid 가 된다. GitHub 은 {@code on:} 을 읽지도 못해 <b>잡을 만들지 못한 채
 * startup_failure</b> 로 죽었고, push 마다 빨간 X 만 남겼다 — 그 워크플로는 <b>한 번도 실행된 적이 없다</b>.
 *
 * <p>[왜 게이트인가] 이 실패 양식이 고약한 이유는 <b>실패가 조용하다</b>는 데 있다. 워크플로 파일은
 * 컴파일되지 않고, 어떤 로컬 게이트도 읽지 않으며, 저장소 안에서는 정상으로 보인다. 결과적으로
 * "게이트가 있다" 는 서술만 남고 집행은 0 이 된다 — GEMINI.md §0.7-H5 가 지목한 바로 그 상태다.
 *
 * <p>[판정 축] {@code .github/workflows/*.yml|yaml} 전부에 대해
 * ① YAML 로 파싱될 것 ② 최상위가 매핑일 것 ③ {@code on}(트리거)과 {@code jobs} 가 있고
 * {@code jobs} 가 비어 있지 않을 것. 문법만 보는 얕은 검사이며 액션 스키마 전체를 검증하지는 않는다 —
 * 그래도 이번에 실제로 발생한 실패(파싱 불가·트리거 소실)는 정확히 이 축에서 잡힌다.
 *
 * <p><b>⚠ YAML 의 {@code on:} 함정</b>: YAML 1.1 은 {@code on} 을 불리언 {@code true} 로 읽는다.
 * SnakeYAML 도 그렇게 파싱하므로 키 조회 시 {@code "on"} 과 {@code Boolean.TRUE} 를 모두 본다.
 * (이 사실을 모르면 "트리거가 없다"는 거짓 위반이 난다.)
 */
class WorkflowManifestLinterTest {

    private static final Logger log = LoggerFactory.getLogger(WorkflowManifestLinterTest.class);

    private static final String WORKFLOW_DIR = ".github/workflows";

    @Test
    @DisplayName("🧾 모든 GitHub Actions 워크플로가 파싱되고 트리거·잡을 갖는다 — 조용히 실행되지 않는 워크플로 차단")
    void auditWorkflowManifestsParseAndDeclareJobs() throws IOException {
        Path dir = resolveRepoRoot().resolve(WORKFLOW_DIR);
        if (!Files.isDirectory(dir)) {
            fail("게이트 무결성 파손: 워크플로 디렉터리를 찾을 수 없습니다 — " + dir.toAbsolutePath());
        }

        List<Path> manifests;
        try (Stream<Path> stream = Files.list(dir)) {
            manifests = stream
                    .filter(p -> p.getFileName().toString().matches(".*\\.ya?ml$"))
                    .sorted()
                    .toList();
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0 에 수렴하면 vacuous 통과가 된다.
        if (manifests.size() < 5) {
            fail("게이트 무결성 파손: 워크플로 파일 스캔 건수(" + manifests.size()
                    + ")가 예상 하한(5) 미만 — 경로/스캔 파손 의심. 실측 기준값은 8건(2026-08-04)이다.");
        }

        List<String> violations = new ArrayList<>();
        for (Path manifest : manifests) {
            String name = manifest.getFileName().toString();
            Object parsed;
            try (Reader reader = Files.newBufferedReader(manifest, StandardCharsets.UTF_8)) {
                parsed = new Yaml().load(reader);
            } catch (RuntimeException ex) {
                violations.add(name + " — YAML 파싱 실패: " + firstLine(ex.getMessage()));
                continue;
            }

            if (!(parsed instanceof Map<?, ?> root)) {
                violations.add(name + " — 최상위가 매핑이 아님(빈 파일 또는 스칼라)");
                continue;
            }

            // YAML 1.1 에서 on 은 불리언 true 로 읽힌다.
            Object triggers = root.containsKey("on") ? root.get("on") : root.get(Boolean.TRUE);
            if (triggers == null) {
                violations.add(name + " — 트리거(on) 선언 없음: 어떤 이벤트로도 실행되지 않는다");
            }

            Object jobs = root.get("jobs");
            if (!(jobs instanceof Map<?, ?> jobMap) || jobMap.isEmpty()) {
                violations.add(name + " — jobs 가 없거나 비어 있음");
            }
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🧾 [WORKFLOW MANIFEST GATE] 실행될 수 없는 워크플로가 있습니다!\n");
            sb.append("========================================================================\n");
            violations.forEach(v -> sb.append("❌ ").append(v).append('\n'));
            sb.append("\n💡 invalid 워크플로는 GitHub 에서 startup_failure 로 죽는다 — 잡이 만들어지지도 않으므로\n");
            sb.append("   '게이트가 돌고 있다'는 전제가 통째로 거짓이 된다(§0.7-H5).\n");
            sb.append("   흔한 원인: run: | 블록 안의 heredoc 본문을 컬럼 0 으로 내려 블록 스칼라를 종료시킨 경우.\n");
            fail(sb.toString());
        }

        log.info("✅ 워크플로 매니페스트 {}건 전부 파싱·트리거·잡 선언 확인.", manifests.size());
    }

    /** api-server 모듈에서 실행되므로 저장소 루트는 한 단계 위다(다른 하네스 린터와 동일 관례). */
    private Path resolveRepoRoot() {
        Path cwd = Paths.get("").toAbsolutePath();
        return Files.isDirectory(cwd.resolve(WORKFLOW_DIR)) ? cwd : cwd.getParent();
    }

    private String firstLine(String message) {
        if (message == null) {
            return "(원인 메시지 없음)";
        }
        int idx = message.indexOf('\n');
        return idx < 0 ? message : message.substring(0, idx);
    }
}
