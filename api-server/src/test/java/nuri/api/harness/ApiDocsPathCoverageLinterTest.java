package nuri.api.harness;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 컨트롤러 @*Mapping ↔ api-docs.json 경로 커버리지 린터 — SSOT 계약체인 최상류(§2.D) 보호.
 *
 * <p>[근거] 계약체인 DB→DTO→<b>api-docs.json</b>→generated-api.d.ts/zod 중, 하류(api-docs→산출물)는
 * pre-push codegen:verify(+zod) 로 강제되나 <b>최상류(백엔드 Controller/DTO → api-docs.json)</b>는
 * live 서버로만 재생성돼 무보호였다(개발자가 DTO/엔드포인트를 바꾸고 api-docs 재생성을 잊으면 하류 전
 * 게이트가 GREEN 인 채 프론트가 stale 계약으로 동작). 이 게이트가 그 드리프트를 오프라인으로 차단한다.
 *
 * <p>[규칙 — fail-safe ⊆] api-server 의 각 {@code @RestController} 리터럴 경로(클래스 {@code @RequestMapping}
 * 접두 + 메서드 {@code @*Mapping})가 api-docs.json 의 paths 에 <b>존재(부분집합)</b>하는지 단언한다.
 * 경로 변수는 {@code {var}→{}} 로 정규화해 변수명 불일치 오탐을 제거한다. 매핑 없는 메서드·비-REST 는 자연 제외.
 * (필드레벨 스키마↔DTO 대조는 파싱복잡·오탐위험으로 스코프 밖 — 경로 존재만.)
 *
 * <p>[역방향 — api-docs ⊆ 컨트롤러, Phase 2 10c-2] api-docs.json 의 모든 경로도 남아 있는 컨트롤러의 경로여야 한다.
 * 재사용 생성물은 기능을 걷으면서 api-docs 를 같은 구성으로 투영한다(scripts/reusable-contract-projection.mjs).
 * 투영이 빠지면 지워진 컨트롤러의 연산이 계약과 생성 타입에 남아 화면이 없는 API 를 부를 수 있는데, 정방향만으로는
 * 그것을 보지 못했다. 원본에서는 두 방향이 모두 성립한다. 컨트롤러를 읽지 못해 스캔에서 빠지면 그 경로가 남는
 * 것으로 보이므로 이 방향은 붉다(조용히 통과하지 않는다).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(api-docs.json 파싱 + 컨트롤러 리플렉션).
 */
@Tag("governance-harness")
class ApiDocsPathCoverageLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ApiDocsPathCoverageLinterTest.class);
    private static final String CONTROLLER_SCAN_BASE = "nuri.api.controller";
    private static final Pattern PATH_VAR = Pattern.compile("\\{[^}]+\\}");

    @Test
    @DisplayName("🔗 컨트롤러 @*Mapping 리터럴 경로는 api-docs.json paths 의 부분집합이다 (SSOT 계약체인)")
    void auditControllerPathsSubsetOfApiDocs() throws IOException {
        Set<String> docPaths = loadApiDocsPaths();
        List<ControllerPath> scanned = scanControllerPaths();
        int checked = scanned.size();
        List<String> missing = new ArrayList<>();
        for (ControllerPath path : scanned) {
            if (!docPaths.contains(normalize(path.path()))) {
                missing.add(path.controller() + "  →  " + path.path());
            }
        }

        if (!missing.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [API-DOCS PATH GATE] 컨트롤러 경로가 api-docs.json 에 없습니다 — 계약 SSOT 드리프트!\n");
            sb.append("========================================================================\n");
            for (String m : new TreeSet<>(missing)) {
                sb.append("❌ ").append(m).append("\n");
            }
            sb.append("\n💡 백엔드 엔드포인트를 바꾼 뒤 api-docs.json 재생성을 잊으면 프론트가 stale 계약으로 동작합니다.\n");
            sb.append("   로컬 서버(:8080) 기동 후 `pnpm -C frontend codegen:ts` 로 api-docs.json 을 재생성해 커밋하십시오.\n");
            fail(sb.toString());
        } else {
            log.info("✅ 컨트롤러 리터럴 경로 {}건 전부 api-docs.json({} paths)의 부분집합. 계약 SSOT 정합.",
                    checked, docPaths.size());
        }
    }

    @Test
    @DisplayName("🔗 api-docs.json paths 는 남아 있는 컨트롤러 @*Mapping 경로의 부분집합이다 (역방향 — 생성물 계약 투영)")
    void auditApiDocsPathsSubsetOfControllers() throws IOException {
        Set<String> docPaths = loadApiDocsPaths();
        Set<String> controllerPaths = new TreeSet<>();
        for (ControllerPath path : scanControllerPaths()) {
            controllerPaths.add(normalize(path.path()));
        }
        List<String> orphaned = new ArrayList<>();
        for (String docPath : docPaths) {
            if (!controllerPaths.contains(docPath)) {
                orphaned.add(docPath);
            }
        }
        if (!orphaned.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [API-DOCS PATH GATE] api-docs.json 경로를 처리하는 컨트롤러가 없습니다 — 계약이 코드보다 넓다!\n");
            sb.append("========================================================================\n");
            for (String path : orphaned) {
                sb.append("❌ ").append(path).append("\n");
            }
            sb.append("\n💡 원본이면 컨트롤러를 지운 뒤 api-docs.json 재생성을 잊은 것입니다(`pnpm -C frontend codegen:ts`).\n");
            sb.append("   재사용 생성물이면 생성기의 api-docs 투영(scripts/reusable-contract-projection.mjs)이 빠졌거나 생성 뒤 바뀐 것입니다.\n");
            fail(sb.toString());
        }
        log.info("✅ api-docs.json 경로 {}건 전부 컨트롤러 경로({}건)의 부분집합.", docPaths.size(), controllerPaths.size());
    }

    // ---- 컨트롤러 @*Mapping 경로 스캔 ----------------------------------------------------

    /** 컨트롤러 이름과 정규화하기 전의 리터럴 경로. */
    private record ControllerPath(String controller, String path) {}

    /**
     * {@code @RestController} 의 리터럴 경로. 비-리터럴(정규화 후에도 이상 토큰)·공백 경로는 뺀다(부재 단언 금지 — fail-safe).
     * 읽지 못한 컨트롤러는 경고하고 뺀다 — 정방향에서는 그 경로가 검사되지 않고, 역방향에서는 그 경로가 남는 것으로 보여 붉다.
     */
    private List<ControllerPath> scanControllerPaths() {
        List<ControllerPath> result = new ArrayList<>();
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        int controllers = 0;
        for (var bd : scanner.findCandidateComponents(CONTROLLER_SCAN_BASE)) {
            try {
                Class<?> clazz = Class.forName(bd.getBeanClassName());
                controllers++;
                for (String full : collectMappingPaths(clazz)) {
                    if (full.isBlank() || full.contains("${")) {
                        continue;
                    }
                    result.add(new ControllerPath(clazz.getSimpleName(), full));
                }
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[ApiDocsPathGate] 컨트롤러 로드 실패(스캔 제외): {} ({})", bd.getBeanClassName(), ex.getMessage());
            }
        }
        // vacuous-green 방지: 컨트롤러/경로 스캔이 조용히 0이면 차단
        if (controllers < 20 || result.size() < 50) {
            fail("게이트 무결성 파손: 컨트롤러(" + controllers + ")/검사경로(" + result.size() + ") 스캔이 하한 미만 — 스캔/리플렉션 파손 의심.");
        }
        return result;
    }

    // ---- api-docs.json paths 로드 ------------------------------------------------------

    private Set<String> loadApiDocsPaths() throws IOException {
        Set<String> paths = readApiDocsPaths();
        if (paths.size() < 50) {
            fail("게이트 무결성 파손: api-docs.json paths(" + paths.size() + ")가 예상 하한(50) 미만 — 파일/파싱 파손 의심.");
        }
        return paths;
    }

    private Set<String> readApiDocsPaths() throws IOException {
        Path apiDocs = resolveApiDocs();
        JsonNode root = JsonMapper.builder().configureForJackson2().build().readTree(HarnessSourceIndex.read(apiDocs));
        JsonNode paths = root.get("paths");
        if (paths == null || !paths.isObject()) {
            fail("게이트 무결성 파손: api-docs.json 에 paths 객체가 없습니다 (" + apiDocs + ").");
            return Set.of();
        }
        Set<String> result = new TreeSet<>();
        for (Iterator<String> it = paths.propertyNames().iterator(); it.hasNext(); ) {
            result.add(normalize(it.next()));
        }
        return result;
    }

    private static Path resolveApiDocs() {
        // repo root/api-docs.json (codegen 규약). cwd 가 저장소 루트 또는 api-server 일 수 있음.
        for (Path base : new Path[]{Paths.get(""), Paths.get("").toAbsolutePath().getParent()}) {
            if (base == null) continue;
            Path candidate = base.resolve("api-docs.json");
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        fail("게이트 무결성 파손: api-docs.json 을 찾을 수 없습니다 (cwd=" + Paths.get("").toAbsolutePath()
                + "). 조용한 skip 은 false-green → 실패 처리.");
        return Paths.get("api-docs.json"); // unreachable
    }

    // ---- 컨트롤러 @*Mapping 경로 수집 --------------------------------------------------

    private List<String> collectMappingPaths(Class<?> clazz) {
        List<String> result = new ArrayList<>();
        RequestMapping classRm = AnnotatedElementUtils.findMergedAnnotation(clazz, RequestMapping.class);
        String[] prefixes = classRm != null ? firstNonEmpty(classRm.path(), classRm.value()) : new String[]{""};

        for (Method m : clazz.getDeclaredMethods()) {
            RequestMapping rm = AnnotatedElementUtils.findMergedAnnotation(m, RequestMapping.class);
            if (rm == null) {
                continue; // @*Mapping 없는 메서드 — 엔드포인트 아님
            }
            String[] methodPaths = firstNonEmpty(rm.path(), rm.value());
            for (String pre : prefixes) {
                for (String mp : methodPaths) {
                    result.add(join(pre, mp));
                }
            }
        }
        return result;
    }

    /** path()/value() 중 비어있지 않은 쪽 반환(둘 다 비면 {""}). */
    private static String[] firstNonEmpty(String[] a, String[] b) {
        if (a != null && a.length > 0) return a;
        if (b != null && b.length > 0) return b;
        return new String[]{""};
    }

    /** 접두 + 메서드경로 결합(중복 슬래시 정규화). */
    private static String join(String prefix, String methodPath) {
        String p = prefix == null ? "" : prefix.trim();
        String s = methodPath == null ? "" : methodPath.trim();
        String combined = (p + "/" + s).replaceAll("/{2,}", "/");
        if (combined.length() > 1 && combined.endsWith("/")) {
            combined = combined.substring(0, combined.length() - 1);
        }
        return combined;
    }

    /** 경로 변수 {name} → {} 정규화(변수명 불일치 오탐 제거). */
    private static String normalize(String path) {
        return PATH_VAR.matcher(path).replaceAll("{}");
    }
}
